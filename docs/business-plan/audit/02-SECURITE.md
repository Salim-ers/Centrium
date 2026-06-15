# Audit Sécurité — Centrium

**Auditeur** : RSSI senior, profil ex-OVH / ex-Stormshield
**Date** : 15 juin 2026
**Périmètre** : Centrium v1.0 (https://www.centrium-platform.com), code repo `quadcore-platform`, 62 migrations SQL, ~45 routes API, infrastructure Vercel + Supabase
**Objectif** : déterminer si l'app est vendable à des ESN françaises sans engager la responsabilité de QuadCore SAS au premier incident

---

## 1. Isolation multi-tenant (RLS + tests)

C'est le contrôle structurant. Centrium fait reposer son isolation cross-org sur **Row Level Security PostgreSQL**, pas sur du filtre applicatif. C'est la bonne approche : un bug Next.js ne peut pas suffire à faire fuiter des données entre ESN clientes.

**Ce qui est en place** :

- `supabase/migrations/002_rls_policies.sql` active RLS sur les 25 tables métier de la v0 (organizations, profiles, consultants, contacts, invoices…) et publie 2 helpers `SECURITY DEFINER` : `public.organization_id()` et `public.user_role()`. Toutes les policies reposent sur ces deux fonctions.
- `migration 060_security_hardening.sql` exécute `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` en boucle sur 38 tables critiques. Le `FORCE` est important : il fait respecter la RLS même au propriétaire de la table — seul le `service_role` peut bypasser. C'est la posture qu'attend un auditeur sérieux.
- Une vue d'audit `public._security_rls_audit` (migration 060) liste l'état RLS (`relrowsecurity`, `relforcerowsecurity`, `policy_count`) de toutes les tables `public.*`. Lisible par `authenticated`. Utilisable pour un monitoring synthétique : une ligne avec `rls_enabled = false` sur une table métier = trou.
- `migration 011_consultant_rls.sql` + `012_fence_admin_policies_from_consultant.sql` : le rôle `consultant` est explicitement *fencé* sur les policies admin (`AND public.user_role() <> 'consultant'`). C'est un détail invisible mais critique : sans ça, un consultant connecté pourrait lire tous les autres consultants de son ESN par effet de bord.
- `migration 014_organization_members.sql` introduit un trigger `enforce_profile_active_org_is_member` qui empêche un user de pivoter son `profiles.organization_id` vers une org dont il n'est pas membre (`RAISE EXCEPTION` ERRCODE `check_violation`). C'est la défense contre l'attaque "je m'auto-attribue l'org de la concurrence".
- `migration 061_security_invoker_views.sql` passe la vue `my_organizations` en `security_invoker = true`. Sans ça, la vue s'exécute avec les droits du créateur (SECURITY DEFINER par défaut) et bypass la RLS de l'appelant — c'est exactement le type de finding que remonte Supabase Advisor. La fix est minuscule mais signale une lecture sérieuse des advisors.

**Tests** :

- `tests/e2e/multi-tenant-isolation.spec.ts` couvre 7 scénarios via le client `@supabase/supabase-js` authentifié comme admin org A : SELECT consultants/contacts/invoices de org B → tableau vide attendu ; UPDATE de l'org B → 0 ligne retournée ; tentative de pivot `profiles.organization_id` vers org B → erreur DB attendue ; INSERT consultant avec `organization_id` de B → blocked. C'est exactement le bon niveau de test pour RLS multi-tenant.
- **Faiblesse réelle** : les tests sont `test.skip()` si les variables d'env de seed (`TEST_ORG_A_ADMIN_EMAIL`, etc.) ne sont pas posées. Donc en CI sans seed, le suite passe au vert sans rien tester. Il faut soit imposer ces variables en CI (avec un seed Supabase local), soit faire échouer la CI si elles manquent en environnement de release. En l'état, c'est un test "vert tant qu'on ne regarde pas".

**Note isolation : 8/10.** L'architecture est saine, le sprint hardening (060-062) est sérieux. Le point qui sépare le 8 du 9 : tests RLS qui passent sans rien tester, et zéro audit externe d'un pentester sur l'isolation.

---

## 2. Authentification & Identité

**Stack** : Supabase Auth (cookie-based) + middleware Next.js + MFA TOTP + politique mot de passe locale.

- `src/lib/supabase/middleware.ts` strip `maxAge`/`expires` sur tous les cookies (incl. `sb-*`) → cookies *session-only* qui meurent à la fermeture du navigateur. C'est explicitement documenté comme un choix pour machines partagées. Bien. Le cookie `qc_profile` (cache role + orgId, TTL 5 min) est en `httpOnly`, `sameSite: lax`, `path: /`. **Manque** : pas de flag `secure` explicite — en prod HTTPS Vercel le pose, mais à formaliser.
- MFA TOTP réel via Supabase Auth :
  - `/api/auth/mfa/enroll` (POST) → génère facteur, QR code, secret de récupération
  - `/api/auth/mfa/verify` (POST) → challenge + verify, log `mfa.enabled` dans `activities`
  - `/api/auth/mfa/unenroll` (POST) → bloque le désenrôlement si `org_security_settings.mfa_required_for_admin = true` et que le user est admin (403). C'est le bon pattern.
- Politique mot de passe (`src/lib/security/password.ts`) : 12 caractères mini par défaut, aligné NIST SP 800-63B (pas de rotation forcée, focus longueur). Validation locale + check HaveIBeenPwned via **k-anonymity** (5 premiers caractères du SHA-1 envoyés). Fail-open propre si HIBP est down. C'est la bonne implémentation, identique à 1Password / Okta.
- `org_security_settings` (migration 060) configurable par admin org : longueur min, classes de caractères, `session_timeout_min`, `mfa_required_for_admin`, `notify_new_device`. RLS écriture admin-only, lecture tout membre. Trigger `create_default_security_settings` créé automatiquement à la création d'une org.

**Trous restants** :

- Pas de **WebAuthn / Passkeys** — c'est l'attente 2026 pour un SaaS B2B sérieux. TOTP reste OK pour MVP mais le futur est passkey.
- Pas de **SSO SAML / OIDC** — bloquant pour les ESN > 100 consultants qui passent par Okta / Azure AD. À mettre en roadmap **explicite** sinon perte de deals Enterprise dès la première RFP.
- La pré-flight `/api/auth/throttle` (10/IP/5min, 5/email/15min) **n'est pas obligatoire** — un attaquant peut taper directement `supabase.auth.signInWithPassword`. Le whitepaper le reconnaît : il faut activer **Supabase Auth Rate Limiting** côté dashboard. Pas vérifiable depuis le code.

**Note auth : 7,5/10.** MFA + password policy + HIBP, c'est au-dessus de la moyenne du marché. Le manque de SSO est l'obstacle commercial majeur.

---

## 3. Protection contre attaques courantes

- **Rate limiting** (`src/lib/security/rate-limit.ts`) : Upstash Redis avec pipeline `INCR + EXPIRE NX + TTL` atomique. **Fallback in-memory** quand `UPSTASH_REDIS_REST_URL` absent — explicitement marqué "INSUFFISANT en prod multi-instance Vercel". Le risque est réel : si la prod tourne sans Upstash configuré, chaque serverless function Vercel a son propre compteur → rate limit contournable trivialement en faisant tourner les requêtes sur des cold starts différents. **À vérifier en Vercel env** : `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` posés en Production.
- `callerIp()` lit `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`. OK pour Vercel mais **trustless** : un client peut envoyer ces headers, le seul qui compte est celui injecté par Vercel/CloudFront. À documenter ; pas un risque en prod hébergée correctement.
- Headers HTTP (`next.config.js`) : HSTS `max-age=63072000; includeSubDomains; preload`, X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/microphone/geolocation/cohort/topics tous off), CSP complète.
- **CSP** : `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:` — c'est laxiste, mais le commentaire est honnête : `@react-pdf/renderer` fait de l'eval interne pour le layout PDF, et il y a du bootstrap inline (theme + session gate) en layout. `frame-ancestors 'self'` bloque clickjacking, `object-src 'none'` bloque les plugins legacy, `upgrade-insecure-requests` est activé. **À nonce-ifier** dans une prochaine itération pour passer en CSP3 strict, sinon un pentester compétent va siffler.
- **Vercel Firewall (WAF)** : référencé dans le runbook (action 11), pas vérifiable côté code. C'est une case à cocher Vercel — gratuit, à activer.
- Bot protection : aucun captcha sur `/login`, `/devis`, `/signup`. Cloudflare Turnstile ou hCaptcha à brancher au moins sur `/devis` pour éviter le spam de demandes de devis. Pas critique pour 0 client mais visible.
- Pas d'IDOR évident dans les routes API — la plupart vont chercher `requireUser()` puis lisent via `createClient()` (RLS-protégé), pas via `createAdminClient()`. Sur ~40 callsites de `createAdminClient`, chaque appel exige un `reason` whitelisté (`'webhook' | 'cross-org-query' | 'audit-log-write' | 'rgpd-export' | 'invitation' | 'onboarding' | 'system-cron' | 'data-migration'`) avec un log côté serveur. C'est le bon pattern défensif. **À auditer ligne par ligne** au prochain pentest : chaque `createAdminClient('cross-org-query')` doit refilter manuellement par `organizationId` venant du user authentifié, pas du body.

**Note attaques : 7/10.** Solide en headers et rate-limit en théorie. Le risque opérationnel = Upstash potentiellement non configuré + CSP laxiste à durcir.

---

## 4. Sécurité des données

- **Chiffrement** : TLS 1.2+ géré par Vercel/Supabase. AES-256 au repos Supabase (KMS managé). HSTS preload demandé. Rien d'inventé, c'est le baseline du marché.
- **Storage buckets** :
  - `consultant-documents` : `public = false`, file_size_limit 20 Mo, MIME types whitelistés (pdf/doc/docx/png/jpeg). Migration 060 ajoute un `RAISE EXCEPTION` si jamais le bucket bascule en public — *gardien automatique* contre la régression. Excellent.
  - `organization-assets` : public en lecture (logo embed dans CV diffusés), upload admin-only avec chemin contraint par `(storage.foldername(name))[1] = organization_id()::text`. OK.
- **VirusTotal** (`src/lib/security/virustotal.ts`) : SHA-256 → lookup hash → upload + poll si inconnu, seuil de 2 moteurs détectant pour bloquer. Fail-open documenté. Hooké sur upload CV + admin assets. Reporte un security event critical si malicious détecté. Bien — mais clé `VIRUSTOTAL_API_KEY` optionnelle, donc à vérifier qu'elle est posée en prod.
- **Exports massifs** (`src/lib/security/export-throttle.ts`) : 5 exports/h/user, 1000 rows max/req, log d'audit obligatoire (autorisé ou bloqué). Couvre le scénario "BM compromis qui aspire la base contacts en 2 minutes". **À vérifier** que c'est bien câblé sur toutes les routes qui exportent (CSV consultants, factures, contacts) — `import-csv` existe mais pas vu d'`export-csv`. Le sujet est partiellement traité, à compléter quand un client demandera "comment je sors ma base ?".
- **Secrets** : `.env.example` correctement structuré, `SUPABASE_SERVICE_ROLE_KEY` séparée des clés publiques. Pas vu de leaks accidentels en `git grep sk_live | ANTHROPIC_API_KEY = "sk-ant-`. À sécuriser avec **rotation programmée** (procédure dans le runbook §12) — pas de rotation automatisée.
- **Données IA → Anthropic** : `connect-src` autorise `https://api.anthropic.com`. Le DPA Anthropic est référencé dans `/legal/subprocessors` avec mention "n'entraîne pas ses modèles sur les requêtes API". Transfert hors UE encadré CCT 2021/914 — déclaration correcte mais l'acheteur RSSI ESN demandera le DPA signé QuadCore↔Anthropic et un addendum sur les flux. **Manque pratique** : pas de mention "on minimise les PII envoyées" — c'est un argumentaire à ajouter (anonymisation prompt côté CV Optimizer).

**Note données : 7,5/10.** Storage propre, exports throttlés, anti-virus en place. Le sujet "minimisation PII en prompt IA" reste implicite.

---

## 5. Audit & observabilité

- `src/lib/audit/log.ts` : helper `logAudit({organizationId, userId, entityType, entityId, action, details})` qui écrit dans `activities` via `createAdminClient('audit-log-write')`. Erreur silencieuse (l'audit ne casse jamais l'action métier). Schéma `AuditAction` typé (`created | updated | deleted | viewed | exported | invited | login | mfa.enabled | data.exported | data.deletion_requested | ai.requested...`). C'est exactement le bon design.
- Indexes performance (migration 060) : `(organization_id, created_at DESC)`, `(user_id, action, created_at DESC)`, `(entity_type, entity_id, created_at DESC)`. Évite que l'audit log devienne une bombe à retardement passé 100k entrées.
- Page admin `/admin/audit` qui lit `activities` (consultable côté admin org). Bien.
- `login_events` (migration 060) : journal des connexions avec device fingerprint (sha256 sur UA+lang+ch), IP, UA, `is_new_device`, `notified_at`. RLS : un user voit ses propres événements, insert WITH CHECK = false (oblige `service_role`). Notification email "nouvelle device" via Resend, template FR clair (`renderNewDeviceEmail`). C'est au niveau d'un Notion ou d'un GitHub.
- **Sentry** (`src/lib/security/sentry.ts`) : wrapper sans SDK, POST raw HTTP vers `/api/{projectId}/store/`. Si `SENTRY_DSN` absent, log structuré console (lisible dans Vercel Logs). 8 types d'événements typés (`rls.error`, `service_role.unexpected`, `auth.brute_force`, `cross_tenant.attempt`, `mfa.bypass_attempt`, `data.bulk_modification`…). Très bien — sauf que **Sentry n'est PAS installé** (`@sentry/nextjs` pas en dependency) → on n'a ni source maps, ni session replay, ni alerting natif. Pour un RSSI, le wrapper minimal seul = pas suffisant.
- Pas vu de **alerting** sur tentatives cross-tenant ou pics anormaux (BetterStack, Datadog, PagerDuty). Le runbook référence Better Stack pour le status page mais rien pour les incidents sécurité runtime.

**Note audit : 7/10.** Très bon design d'audit log applicatif. Manque le tooling SRE/SecOps (Sentry réel, alerting, SIEM minimal).

---

## 6. Conformité RGPD

- Pages publiques en place : `/legal/privacy`, `/legal/dpa`, `/legal/subprocessors`, `/legal/responsible-disclosure`, `/legal/cgu`, `/legal/cookies`, `/legal/mentions`. C'est le minimum, c'est présent.
- **Sous-traitants** (`/legal/subprocessors`) listés nommément avec finalité / données / localisation / transfert hors UE / DPA / certifications : Supabase EU (Francfort SOC 2 II + ISO 27001), Vercel EU (Paris CDG1), Anthropic US (CCT 2021/914), Stripe IE, Resend US (CCT). Engagement "notification 30 jours avant changement". C'est conforme art. 28.
- **DPA modèle** : composant `<DPA />` exposé sur `/legal/dpa`. À lire ligne par ligne (pas fait dans cet audit) mais structure présente.
- **Droits utilisateur** :
  - Export RGPD self-service `/api/me/export` (art. 20) : JSON contenant `profile`, `personal`, `todos`, `recent_activity` (500 dernières) — données *personnelles* uniquement, pas les données métier de l'org (correct juridiquement, l'org est le responsable de traitement pour ses consultants/clients). Loggué dans `activities`.
  - Suppression compte `/api/me/delete-request` (art. 17) : différé 30 jours avec confirmation email exact retapé. Loggué. Mention rétention comptable (10 ans facturation) signalée dans la doc. Manque : pas vu le job qui exécute effectivement la suppression au bout des 30j — c'est manuel d'après le runbook.
- **Rétention** : migration 062 `purge_archives_older_than_30_days()` purge automatiquement consultants/missions/offers/opportunities/contacts/invoices/contracts archivés depuis > 30 jours. SECURITY DEFINER, GRANT EXECUTE sur service_role uniquement, log dans `activities`. Schedule pg_cron commenté (à activer en dashboard) ou via Vercel cron. **C'est le seul mécanisme de rétention automatique** — pas de purge des logs `activities` (qui contient des PII userId/details indéfiniment). À documenter.
- **Localisation données** : annoncée Francfort/Paris. **À vérifier en console Supabase** que le projet est bien `eu-central-1` ou `eu-west-3` (action #1 du runbook). Sinon tout l'argumentaire RGPD s'effondre.

**Note RGPD : 8/10.** Documentation propre, droits user codés, sous-traitants listés. Faiblesse : la suppression effective de compte reste un process humain, et la rétention des logs d'audit n'a pas de TTL.

---

## 7. Réponse à incident

- `docs/produit/SECURITY_RUNBOOK.md` : runbook interne complet — 12 actions de mise en prod à exécuter (vérif région Supabase, MFA, Upstash, Sentry, Resend, DNS status page, Vercel Firewall, rotation `SERVICE_ROLE_KEY`). C'est honnête : le code est en place, ces actions externes restent à faire manuellement.
- Procédure de divulgation `/legal/responsible-disclosure` + `/.well-known/security.txt` conforme RFC 9116 : contact `security@centrium-platform.com`, SLA accusé 48h, triage 7j, correctif 24h-90j selon criticité. Hall of Fame planifié, bug bounty Q4 2026. **Bien**.
- Contacts CERT-FR et CNIL : référencés dans le runbook (à vérifier dans les chapitres au-delà des 120 premières lignes lues). Notification CNIL en cas de violation < 72h prévue.

**Trous opérationnels** :

- **Pas de PSIRT** structuré (pas d'équipe sécurité dédiée — Salim est seul).
- **Pas de pentest annuel** réalisé. Mentionné Q4 2026 dans le whitepaper. Sans pentest externe, aucun RSSI ESN sérieux ne signera un contrat > 30 k€/an.
- **Pas de restore drill** documenté comme exécuté — la procédure existe (mensuel selon runbook), pas la trace d'exécution.

**Note IR : 6,5/10.** Documentation propre, exécution non prouvée. Acceptable pour 1ers clients petits, insuffisant pour Enterprise.

---

## 8. Dépendances et chaîne d'approvisionnement

- Pas de `.github/workflows/*` détecté → **pas de CI GitHub Actions** visible, donc pas de `npm audit` automatisé, pas de `Dependabot`, pas de SBOM généré.
- Pas de `renovate.json` / `dependabot.yml`. C'est un trou — le code Next.js + Supabase tourne sur ~200 deps transitives, sans tracking de CVE c'est aveugle.
- Pas vu de signing des artifacts (SLSA, sigstore) — pas attendu à ce stade mais à mentionner pour un audit ISO 27001.
- Stack tiers documentée : Supabase, Vercel, Anthropic, Stripe, Resend, VirusTotal, Upstash, Sentry, Better Stack. Tous sont SOC 2 II minimum, c'est défendable.

**Note dépendances : 5/10.** L'absence de CI sécurité automatisée est le plus gros écart vs un SaaS B2B mature. À fixer en 1 journée (GitHub Actions + Dependabot + `npm audit --production`).

---

## 9. Documentation publique

- Trust Center `/trust` : 6 sections (sécurité, RGPD, sous-traitants, certifications, disponibilité, contact). Lien vers PDF `SECURITY_WHITEPAPER.pdf`. **Bien** — c'est rare à ce niveau de maturité.
- Whitepaper `SECURITY_WHITEPAPER.md` (~6000 mots, lu en partie) : synthèse exécutive, principes (compliance by default, zero invention IA, transparency by default), architecture détaillée, sous-traitants, roadmap certifications. C'est livrable directement à un RSSI ESN sans bricoler une réponse.
- VDP + `security.txt` conformes (vu §7).
- Status page `status.centrium-platform.com` annoncée mais pas vérifiable depuis le code (dépend Better Stack).
- Hall of Fame `/security/hall-of-fame` annoncé dans `security.txt` mais existence à vérifier en routing.

**Note doc publique : 8,5/10.** C'est largement au-dessus du marché ESN français — la plupart des concurrents (Boondmanager inclus) n'ont rien d'équivalent en transparence publique.

---

## 10. Comparaison vs standards

| Contrôle | Centrium | SOC 2 Type I | ISO 27001 | OWASP ASVS L2 |
|---|---|---|---|---|
| RLS multi-tenant en base | ✅ FORCE | requis | requis | A1 |
| MFA disponible | ✅ TOTP | requis | requis | V2.7 |
| SSO SAML/OIDC | ❌ | optionnel | optionnel | V2.6 |
| Password policy + HIBP | ✅ | requis | requis | V2.1 |
| Audit log immuable | ⚠ (immuabilité non garantie) | requis | requis | V7 |
| Backups + restore drill | ⚠ (procédure, pas de trace) | requis | requis | V12 |
| Pentest externe annuel | ❌ Q4 2026 | requis | requis | bonus |
| Politique gestion incidents | ✅ runbook | requis | requis | V1.11 |
| Inventaire actifs / sous-traitants | ✅ | requis | requis | V1 |
| Chiffrement transit + repos | ✅ | requis | requis | V9, V6 |
| Gestion accès (least privilege) | ✅ rôles + `createAdminClient(reason)` | requis | requis | V4 |
| Revue code / SAST / dep scan | ❌ pas de CI sécurité | requis (Type II) | requis | V14 |
| WAF | ⚠ Vercel Firewall à activer | requis | requis | V13 |
| Continuité (RPO/RTO documentés) | ⚠ SLA annoncé, RPO/RTO non chiffrés | requis | requis | — |

**Verdict standards** : pour **SOC 2 Type I**, il manque structurellement le pentest, la CI sécurité, l'immuabilité du log d'audit et la preuve d'exécution des restore drills. Le calendrier annoncé (Type I Q4 2026) est tenable si Salim consacre 2 mois équivalent temps plein à l'audit + remediation + revue auditeur. **ISO 27001** demande en plus un SMSI documenté avec revue de direction — pas réaliste avant 2027.

---

## 11. Verdict global

### Note globale : **7,3 / 10**

Sub-scores :

| Axe | Note | Commentaire |
|---|---:|---|
| Isolation multi-tenant | 8,0 | RLS FORCE + tests E2E + audit view. Manque seed de test exécuté en CI. |
| Authentification & MFA | 7,5 | TOTP + password policy + HIBP. Manque SSO + passkeys. |
| Protection attaques | 7,0 | Headers + rate limit. CSP laxiste, Upstash optionnel = risque. |
| Sécurité des données | 7,5 | Storage propre, VT, export throttle. PII en prompts IA implicite. |
| Audit & observabilité | 7,0 | Log app propre. Sentry pas installé, pas d'alerting. |
| RGPD | 8,0 | Sous-traitants + DPA + droits user codés. Rétention logs non bornée. |
| Réponse incident | 6,5 | Runbook propre. Pas de pentest, pas de drill prouvé. |
| Supply chain | 5,0 | Pas de CI sécurité, pas de Dependabot. Trou flagrant. |
| Documentation publique | 8,5 | Trust Center + whitepaper + VDP. Au-dessus du marché ESN. |
| **Global** | **7,3** | Bien au-dessus de la moyenne ESN, sous le standard Enterprise. |

C'est une note de **SaaS B2B sérieux mais pas encore Enterprise-grade**. C'est cohérent avec l'auto-évaluation "9,4/10 Enterprise-ready" du repo, à condition de comprendre que le 9,4 reflète l'effort accompli vs typique startup, pas la conformité absolue à un référentiel.

---

## 12. Risques critiques restants (top 5)

1. **Upstash rate-limit potentiellement non actif en prod** → fallback in-memory inopérant sur Vercel multi-instance. Brute force facilité. *Action : vérifier `UPSTASH_REDIS_REST_URL` posé en Vercel env Production. 10 min.*
2. **Pas de CI sécurité** (npm audit, Dependabot, SAST) → exposition aux CVE upstream sans détection. *Action : GitHub Actions `npm audit --production --audit-level=high` + Dependabot weekly. 1 jour.*
3. **`SERVICE_ROLE_KEY` non rotée + Sentry pas installé** → en cas de leak code, fenêtre d'exploitation longue sans alerting. *Action : rotation initiale (runbook #12) + installer `@sentry/nextjs` réel pour avoir alerts source-mapped. 1 jour.*
4. **Pas de pentest externe réalisé** → on ne sait pas ce qu'on ne sait pas. Aucune ESN > 50 consultants ne signera sans rapport pentest sous NDA. *Action : commander un pentest boîte grise auprès d'un cabinet français accrédité PASSI (Synacktiv, Wavestone, AlmondJ, ~12-25 k€). 6 semaines.*
5. **Tests RLS E2E qui passent sans rien tester en CI** → fausse assurance sur la régression d'isolation. *Action : seed multi-tenant en CI + faire échouer la CI si les vars `TEST_ORG_*` absentes en env release. 2 jours.*

---

## 13. Recommandations 90 jours pour vendre à ESN B2B

### Sprint 0-30 jours (avant 1er devis signé)

1. **Activer en Vercel env Production** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `RESEND_API_KEY`, `VIRUSTOTAL_API_KEY` (runbook §0). Sans ça, tout l'argumentaire sécurité est cosmétique.
2. **Rotation initiale de `SUPABASE_SERVICE_ROLE_KEY`** + activer **Vercel Firewall** (WAF).
3. **Vérifier région Supabase = `eu-central-1` ou `eu-west-3`**. Si US → bloquant juridique, à régler avec support Supabase.
4. **CI GitHub Actions** : lint + type-check + `npm audit --audit-level=high` + Dependabot weekly. C'est 1 fichier `.github/workflows/ci.yml`.
5. **Activer le seed multi-tenant** + faire échouer les tests RLS s'ils skippent en release.
6. **Installer `@sentry/nextjs`** réel (5 k events/mois gratuit) + brancher source maps Vercel.

### Sprint 30-60 jours (pendant prospection)

7. **CSP nonce-ifiée** : sortir de `'unsafe-inline'` / `'unsafe-eval'` (le PDF eval peut être isolé dans une route dédiée).
8. **Captcha sur `/devis`** (Cloudflare Turnstile, gratuit) pour pré-qualifier les leads et bloquer le spam.
9. **Job de purge effective des comptes** au-delà des 30 jours `data.deletion_requested` (cron Vercel ou pg_cron).
10. **TTL sur `activities`** : purge ou archivage à 24 mois (sauf actions `data.exported`, `mfa.*`, `login` à 7 ans pour audit).
11. **Procédure restore drill exécutée et tracée** : 1 restore Supabase point-in-time documenté par mois avec timestamp + screenshot. C'est ce que demande tout RSSI.

### Sprint 60-90 jours (avant 5e client)

12. **Pentest externe PASSI** (Synacktiv / Wavestone / Almond) → rapport sous NDA livrable aux prospects RSSI.
13. **Roadmap SSO SAML / OIDC** affichée publiquement (Azure AD, Okta, Google Workspace). Même en "Q1 2027 sur demande", ça débloque les RFP.
14. **Lancer la procédure SOC 2 Type I** avec un cabinet français (Vanta + Drata + auditeur) — 6-9 mois pour le rapport final, c'est tenable pour fin Q1 2027.
15. **Politique de gestion des accès interne QuadCore** documentée : qui a accès `service_role`, MFA obligatoire sur Vercel/Supabase/GitHub, revue trimestrielle. Demandé en clause DPA par tout client > 30 k€.

---

**Conclusion auditeur** : le sprint sécurité récent est **réel et bien fait** — RLS FORCE, fence du rôle consultant, security_invoker views, audit log structuré, MFA TOTP, HIBP, VirusTotal, export throttle, login events, runbook, whitepaper, Trust Center, VDP. C'est très au-dessus du marché ESN français. Les manques restants (Upstash en prod, CI sécurité, pentest, SSO) sont **opérationnels et financiers, pas architecturaux** — donc fixables en 90 jours sans refactor. Centrium peut être vendu **dès maintenant à des PME ESN 10-50 consultants** avec un argumentaire honnête (les certifications sont en roadmap datée), à condition d'avoir bouclé le sprint 0-30j ci-dessus avant la première signature. Au-delà de 50 consultants client, attendre le pentest + SSO ou perdre les deals en RFP.
