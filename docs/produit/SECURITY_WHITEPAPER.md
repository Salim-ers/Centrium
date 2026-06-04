---
title: "Security Whitepaper"
subtitle: "Architecture, contrôles et conformité de la plateforme Centrium"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "security-whitepaper"
---

# Security Whitepaper — Centrium

> Document destiné aux RSSI, DSI, équipes Achats, juristes et auditeurs qui évaluent
> Centrium avant signature. Il décrit comment la plateforme est construite, opérée,
> sauvegardée et auditée, sans jargon inutile mais avec le niveau de précision attendu
> d'un fournisseur SaaS B2B européen.
>
> Toutes les affirmations factuelles sont reliées à une décision d'architecture ou à un
> contrôle effectivement implémenté dans le code de production. Les éléments en
> roadmap sont datés explicitement, jamais marqués « à venir » sans échéance.

---

## 1. Synthèse exécutive

Centrium est une plateforme SaaS B2B pour ESN, éditée par **QuadCore SAS** (France). Elle est conçue dès l'origine pour être déployable en environnement réglementé européen : données et traitements en **région UE**, **multi-tenant isolé en base** par Row Level Security PostgreSQL, **chiffrement TLS 1.2+ en transit** et **AES-256 au repos**, **conformité RGPD** assumée avec DPA signable.

Trois choix structurants permettent à un acheteur de comprendre rapidement le niveau de maturité visé :

1. **L'isolation des données entre clients est faite en base de données, pas dans le code applicatif.** Nous nous appuyons sur le mécanisme natif PostgreSQL de Row Level Security : toute requête, même dans une fonction serveur, est filtrée par PostgreSQL avant exécution. Un bug applicatif ne peut pas, à lui seul, faire fuiter des données entre organisations.
2. **L'authentification est entièrement cookie-based, httpOnly et session-only.** Aucun token sensible n'est exposé au JavaScript navigateur, et les cookies meurent à la fermeture du navigateur. Pour les machines partagées, c'est un comportement attendu et documenté.
3. **Aucune donnée client n'est utilisée pour entraîner un modèle d'IA.** L'IA Claude d'Anthropic est appelée en mode API stateless, sans rétention pour entraînement, et uniquement sur les payloads strictement nécessaires à la tâche demandée par l'utilisateur.

Centrium n'est aujourd'hui pas certifiée SOC 2 ni ISO 27001. **La certification SOC 2 Type I est planifiée pour Q4 2026**, suivie de Type II en 2027 (cf. §15). Nous préférons documenter cette trajectoire plutôt que la laisser à deviner.

**Contact RSSI** : `security@centrium-platform.com` — réponse sous 24h ouvrées.

---

## 2. Principes directeurs

Trois principes guident toutes nos décisions de sécurité, à valeur de contrat moral avec nos clients.

### 2.1 Compliance by default

Aucune action de l'utilisateur n'est requise pour être en conformité. L'hébergement est en UE par défaut. Le chiffrement est actif par défaut. Le RLS est actif par défaut. Les headers de sécurité sont posés par défaut. Si un client souhaite désactiver un contrôle, cela passe par une procédure explicite côté QuadCore, jamais par une case à décocher dans une interface.

### 2.2 Zero invention IA

Les modules d'intelligence artificielle (CV Optimizer, extraction d'AO, matching) sont contraints par règles métier strictes : ils **reformulent, organisent et priorisent** des informations existantes, mais ne créent **jamais** d'expérience, de certification, de compétence, de date ou de client. Cette contrainte est appliquée dans le prompting système et vérifiée dans les tests de régression. Voir `.claude/skills/cv-generation/SKILL.md` pour le règlement intérieur du moteur CV.

### 2.3 Transparency by default

Roadmap publique, sous-traitants nommément cités, post-mortems publics pour incidents > 1h, journal des changements public. Quand un contrôle n'est pas encore en place, nous indiquons une date. Quand une certification n'est pas obtenue, nous le disons. Cette posture est un choix commercial assumé : nous préférons perdre une vente en transparence que la gagner par omission.

---

## 3. Architecture sécurité

### 3.1 Vue d'ensemble

Centrium est une application Next.js 14 (App Router) hébergée sur **Vercel** (CDN edge mondial, fonctions serveur exécutées en région Paris par défaut), avec un backend **Supabase** (PostgreSQL managé, Auth, Storage, Realtime) hébergé en **région UE**. L'ensemble est multi-tenant logique, isolé par `organization_id` au niveau base.

```
                          ┌──────────────────────────────────┐
                          │   Utilisateur (navigateur HTTPS) │
                          └──────────────┬───────────────────┘
                                         │  TLS 1.2+, HSTS preload
                                         ▼
                       ┌─────────────────────────────────────┐
                       │   Vercel CDN edge (UE)              │
                       │   • Headers sécurité (HSTS, CSP…)   │
                       │   • Static assets, ISR cache        │
                       └──────────────┬──────────────────────┘
                                      │
                ┌─────────────────────┼──────────────────────┐
                ▼                                            ▼
      ┌────────────────────┐                    ┌────────────────────────┐
      │ Next.js Server     │                    │ API Route Handlers     │
      │ Components / SSR   │                    │ src/app/api/**         │
      │ (Vercel Functions) │                    │ (auth + Zod + service) │
      └─────────┬──────────┘                    └────────────┬───────────┘
                │                                            │
                │  Cookies httpOnly, Secure, SameSite=Lax    │
                └────────────────────┬───────────────────────┘
                                     │
                                     ▼
                       ┌─────────────────────────────────────┐
                       │   Supabase (UE)                     │
                       │   • Auth (PKCE, Argon2 password)    │
                       │   • PostgreSQL + RLS                │
                       │   • Storage chiffré (AES-256)       │
                       │   • Realtime (WebSocket TLS)        │
                       └──────────────┬──────────────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────────────┐
                       │  Sauvegardes PITR 7 jours (UE)      │
                       │  + snapshots quotidiens chiffrés    │
                       └─────────────────────────────────────┘
```

### 3.2 Isolation multi-tenant via PostgreSQL Row Level Security

Chaque ligne de donnée porte un `organization_id`. Une politique RLS est attachée à toutes les tables sensibles (`consultants`, `clients`, `opportunities`, `contacts`, `missions`, `timesheets`, `invoices`, `cv_versions`, etc.) et impose la condition `organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())`. Cette politique est évaluée **par PostgreSQL avant exécution de la requête**, indépendamment du code applicatif.

Conséquences pratiques :

- Une requête mal écrite ne peut pas franchir la frontière d'organisation : PostgreSQL refuse silencieusement les lignes interdites.
- Le `service_role` Supabase (qui contourne RLS) n'est instancié que dans des Route Handlers serveur explicitement marqués `'server-only'` (cf. `src/lib/supabase/admin.ts`) et n'est jamais utilisable depuis un Server Component, un client browser ou un middleware.
- Il n'existe pas de « rôle joker » côté admin produit qui aurait accès à toutes les organisations. L'équipe QuadCore opère sur une console séparée (`super_admin`) qui n'a pas de `organization_id` et qui n'expose qu'un sous-ensemble réduit de tables (clients, abonnements, métriques agrégées).

### 3.3 Stack et hébergement

| Couche | Fournisseur | Région | Rôle |
|---|---|---|---|
| Application Next.js | Vercel | Paris (CDN edge mondial) | Rendu SSR, API Routes, ISR |
| Base de données | Supabase / AWS RDS | UE (Francfort) | PostgreSQL 15+, RLS |
| Storage fichiers | Supabase Storage / AWS S3 | UE (Francfort) | CV, contrats, factures, AES-256 |
| Auth | Supabase Auth | UE | Sessions PKCE, mots de passe Argon2 |
| Realtime | Supabase Realtime | UE | WebSocket TLS, presence, postgres_changes |
| IA générative | Anthropic (Claude API) | UE / US (selon endpoint) | Stateless, sans rétention entraînement |

Les **données applicatives** (consultants, contacts, CV, factures, CRA, contrats) restent en région UE en permanence. Seuls les **assets statiques publics** (page d'accueil vitrine, polices, images marketing) transitent par le CDN edge mondial pour des raisons de performance.

### 3.4 Flux d'authentification

```
   Navigateur                  Vercel/Next                 Supabase Auth (UE)
       │                            │                              │
       │   POST /auth/login         │                              │
       │   (email + password)       │                              │
       ├───────────────────────────►│                              │
       │                            │   signInWithPassword (PKCE)  │
       │                            ├─────────────────────────────►│
       │                            │                              │
       │                            │   { access_token,            │
       │                            │     refresh_token,           │
       │                            │     user }                   │
       │                            │◄─────────────────────────────┤
       │                            │                              │
       │  Set-Cookie: sb-...        │                              │
       │   (httpOnly, Secure,       │                              │
       │    SameSite=Lax,           │                              │
       │    pas de Max-Age)         │                              │
       │◄───────────────────────────┤                              │
       │                            │                              │
       │  markSessionActive()       │                              │
       │  → sessionStorage flag     │                              │
       │                            │                              │
       │  GET /dashboard            │                              │
       ├───────────────────────────►│                              │
       │                            │  middleware updateSession    │
       │                            │  → vérif cookie + RLS profil │
       │                            ├─────────────────────────────►│
       │                            │◄─────────────────────────────┤
       │  200 OK (page rendue)      │                              │
       │◄───────────────────────────┤                              │
```

Trois protections superposées garantissent l'autologout à la fermeture du navigateur (cf. §5.3) :

1. Les cookies Supabase sont stripés de `maxAge` et `expires` côté client, server, et middleware → ils meurent avec le processus navigateur.
2. Un flag `centrium-session-active` est posé dans `sessionStorage` (per-tab, mort à la fermeture de l'onglet).
3. Un script inline en `<head>` vérifie au chargement la présence du flag. Si absent et qu'aucun autre onglet Centrium ne répond via `BroadcastChannel` sous 80ms, un `navigator.sendBeacon('/api/auth/logout')` est envoyé et l'utilisateur est redirigé hors zone authentifiée.

---

## 4. Chiffrement

### 4.1 Chiffrement en transit

- **TLS 1.2 minimum**, TLS 1.3 préféré, négocié automatiquement par Vercel et Supabase.
- **HSTS preload activé** : `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` posé sur toutes les réponses Next.js (cf. `next.config.js`). Le domaine `centrium-platform.com` est soumis pour inclusion à la HSTS preload list.
- **ALPN** négocié vers HTTP/2 par défaut, HTTP/3 disponible sur le CDN Vercel.
- **Redirection HTTP → HTTPS** systématique au niveau Vercel et redéclarée dans la CSP via `upgrade-insecure-requests`.

### 4.2 Chiffrement au repos

- **PostgreSQL** : chiffrement AES-256 transparent au niveau disque par AWS RDS (sous-jacent à Supabase).
- **Storage** (CV, contrats, factures) : AES-256 côté serveur, géré par S3/AWS-KMS.
- **Sauvegardes** : chiffrement AES-256 sur snapshots et exports PITR.
- **Logs** : les logs serveur sont chiffrés au repos chez Vercel et Supabase ; les payloads sensibles (mot de passe, token, PII complet) ne sont jamais loggués (cf. règles `.claude/rules/code-style.md`).

### 4.3 Gestion des clés

Les clés de chiffrement disque, storage et sauvegarde sont gérées par les **KMS des hébergeurs sous-jacents** (AWS KMS pour la stack Supabase, Vercel-managed KMS pour les déploiements applicatifs). La rotation est automatique et opérée par l'hébergeur. QuadCore ne détient pas physiquement les clés et n'a pas accès aux mécanismes de re-chiffrement.

Les **secrets applicatifs** (clé `SUPABASE_SERVICE_ROLE_KEY`, clé Anthropic, clé Stripe future) sont stockés dans le coffre Vercel Environment Variables, jamais commités, jamais exposés au runtime client, et rotables manuellement par l'équipe DevOps QuadCore.

---

## 5. Authentification & autorisation

### 5.1 Comptes utilisateurs

- **Création** : par invitation email signée (token unique, valide 7 jours) ou par signup self-service avec validation email.
- **Mot de passe** : minimum 12 caractères, validation côté client par schéma Zod, hashage **Argon2id** côté Supabase Auth (paramètres recommandés OWASP).
- **Réinitialisation** : par lien magique email à usage unique, expiration 1h.
- **Suppression de compte** : sur demande utilisateur via `dpo@centrium-platform.com` ; effacement effectif sous 30 jours conformément à l'article 17 RGPD.

### 5.2 Sessions et cookies

Tous les cookies de session sont :

| Attribut | Valeur | Effet |
|---|---|---|
| `HttpOnly` | `true` | Inaccessible au JavaScript, immunité aux XSS de vol de token |
| `Secure` | `true` | Transmis uniquement sur HTTPS |
| `SameSite` | `Lax` | Protection CSRF par défaut |
| `Max-Age` / `Expires` | **stripé** | Session-only : meurt à la fermeture du navigateur |
| `Path` | `/` | Scoping global au domaine |

L'absence de `Max-Age` est un choix délibéré pour les environnements ESN où les postes peuvent être partagés. Le code de strip est lisible dans `src/lib/supabase/client.ts`, `server.ts` et `middleware.ts` (fonction `sessionOnly`).

### 5.3 Auto-logout instantané

Deux mécanismes complémentaires garantissent qu'un utilisateur n'est plus connecté après fermeture du navigateur, même si Chrome restaure les cookies via *Continue where you left off* :

1. **Script inline `<head>`** posé dans `layout.tsx` : exécuté en synchrone avant tout rendu, il vérifie le flag `sessionStorage` et invalide la session si nécessaire. Cible : la première seconde de chargement, avant qu'un Server Component ne soit rendu.
2. **Hook React `useSessionPresence`** (cf. `src/hooks/useSessionPresence.ts`) : monté sur toutes les pages authentifiées. Coordonne les onglets via `BroadcastChannel`, gère le timer 80ms, déclenche le beacon `/api/auth/logout` et redirige vers la home publique. Cible : les navigations client-side.

### 5.4 SSO et MFA

Centrium expose aujourd'hui une authentification mot-de-passe + email magique. Les fonctionnalités suivantes sont **planifiées Q3 2026** :

- **SSO SAML 2.0** (Azure AD, Okta, Google Workspace) avec provisioning SCIM 2.0
- **MFA TOTP** (Google Authenticator, 1Password, Authy)
- **Politique de mot de passe organisationnelle** (longueur, complexité, rotation imposée)

L'API d'authentification Supabase prend déjà en charge ces mécanismes ; l'effort restant porte sur l'interface admin et la configuration par organisation.

### 5.5 Rôles et autorisations

Six rôles sont définis au niveau `profiles.role`, chacun avec des politiques RLS et un routing middleware dédiés :

| Rôle | Scope | Exemples de permissions |
|---|---|---|
| `super_admin` | Console QuadCore (hors org) | Gestion clients, abonnements, métriques globales |
| `admin` | Organisation cliente | Gestion utilisateurs org, facturation, paramètres |
| `business_manager` | Organisation cliente | CRM, AO, matching, validation CRA |
| `recruiter` | Organisation cliente | Bibliothèque, sourcing, CV Optimizer |
| `finance` | Organisation cliente | Factures, CRA validés, export comptable |
| `viewer` | Organisation cliente | Lecture seule sur les modules autorisés |
| `consultant` | Portail consultant | Saisie CRA personnel, gestion CV personnel |

Le rôle `consultant` est cloisonné au sous-domaine logique `/portal/*` par le middleware (cf. `src/lib/supabase/middleware.ts`, lignes 178-190). Les rôles ESN sont cloisonnés hors `/portal`. Toute tentative de franchissement est redirigée serveur, jamais juste cachée côté client.

---

## 6. Isolation multi-tenant

### 6.1 Modèle de données

Chaque table sensible porte une colonne `organization_id` (uuid, NOT NULL, FK vers `organizations.id`). Les profils utilisateurs (`profiles`) portent également cet `organization_id`, ce qui permet au RLS de joindre le contexte utilisateur à la donnée demandée.

### 6.2 Politiques RLS standard

Pour chaque table sensible, quatre policies sont définies :

```sql
-- Lecture
CREATE POLICY "select_own_org" ON consultants FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Insertion : force organization_id à celui de l'utilisateur
CREATE POLICY "insert_own_org" ON consultants FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Update : même contrainte sur la ligne avant ET après
CREATE POLICY "update_own_org" ON consultants FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Suppression
CREATE POLICY "delete_own_org" ON consultants FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
```

### 6.3 Tests d'isolation en CI

Une suite de tests d'intégration (Vitest + Supabase local) déclenche les scénarios suivants à chaque pull request :

1. Un utilisateur de l'organisation A ne peut pas lire les consultants de l'organisation B.
2. Un utilisateur de l'organisation A ne peut pas créer une ligne avec un `organization_id` autre que le sien (la RLS rejette en `WITH CHECK`).
3. Un utilisateur de l'organisation A ne peut pas modifier le `organization_id` d'une ligne existante pour la transférer ailleurs.
4. Un utilisateur sans `organization_id` (compte fraîchement créé) n'a accès à aucune table métier ; il est forcé vers `/onboarding`.
5. Le rôle `super_admin` ne peut pas, par défaut, lire les données client (séparation stricte des consoles).

L'échec de l'un de ces tests bloque le merge.

---

## 7. Réseau & headers HTTP

Les headers suivants sont appliqués par `next.config.js` sur toutes les réponses :

| Header | Valeur | Objectif |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS sur 2 ans + sous-domaines, éligible HSTS preload list |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Anti-clickjacking (complète `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite la fuite d'URL vers tiers |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()` | Désactive APIs sensibles, opt-out FLoC / Topics |
| `Content-Security-Policy` | cf. ci-dessous | Anti-XSS, anti-injection, contrôle origines |
| `X-DNS-Prefetch-Control` | `on` | Performance contrôlée |

### Content-Security-Policy

La CSP de production est stricte et énumère explicitement les origines autorisées :

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:
   https://va.vercel-scripts.com https://*.vercel-insights.com;
worker-src 'self' blob:;
child-src 'self' blob:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in
   https://*.vercel.app;
connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co
   https://*.supabase.in wss://*.supabase.in https://api.anthropic.com
   https://formspree.io https://*.vercel-insights.com;
frame-ancestors 'self';
form-action 'self' https://formspree.io;
base-uri 'self';
object-src 'none';
upgrade-insecure-requests;
```

`'unsafe-inline'` et `'unsafe-eval'` sont aujourd'hui requis pour deux dépendances :

- Tailwind CSS injecte des styles inline en SSR.
- `@react-pdf/renderer` utilise de l'`eval` interne et spawne des Web Workers via `blob:` pour générer les PDF côté client en off-thread.

Le passage en **CSP3 strict avec nonces** (suppression de `unsafe-inline` script) est sur la roadmap **Q1 2027**, conditionné à la disponibilité d'une version de `@react-pdf/renderer` compatible CSP stricte.

---

## 8. Journalisation & audit

### 8.1 Audit applicatif

Toutes les opérations sensibles sont horodatées en base avec l'identité de l'auteur :

| Catégorie | Tables / colonnes | Conservation |
|---|---|---|
| Création / modification entité | `created_at`, `updated_at`, `created_by`, `updated_by` sur chaque table | Tant que l'entité existe |
| Authentification | `auth.audit_log_entries` (Supabase) — login, logout, password reset, signup | 90 jours |
| Activité métier | Table `activities` (timeline opportunités, missions, consultants) | Durée de vie organisation |
| Notifications / alertes | Table `alerts` (lu / non lu, type, destinataire) | 12 mois glissants |
| Logs serveur | Vercel + Supabase logs | 30 jours en chaud, 12 mois en archive |
| Logs d'accès CDN | Vercel | 30 jours |

### 8.2 Audit trail par utilisateur

Un export consolidé des actions d'un utilisateur donné est disponible sur demande RSSI sous 72h ouvrées via `security@centrium-platform.com`. Cet export couvre logins, créations / modifications / suppressions d'entités, et accès aux documents sensibles.

### 8.3 Logs interdits

La règle interne est claire : aucun log applicatif ne doit contenir mot de passe, token de session, contenu de CV utilisateur, ou PII complet (numéro de sécurité sociale, IBAN, RIB). Cette règle est appliquée via revue de code et un linter custom sur les patterns `console.log` en CI.

---

## 9. Sauvegardes & continuité

### 9.1 Stratégie de sauvegarde

| Couche | Mécanisme | Fréquence | Rétention |
|---|---|---|---|
| PostgreSQL | Point-in-Time Recovery (WAL continu) | Continu | **7 jours glissants** |
| PostgreSQL | Snapshot complet chiffré | Quotidien (3h UTC) | 30 jours |
| Storage (CV, contrats) | Versioning S3 + cross-region replica (UE seulement) | Continu | 30 jours versions, indéfini fichiers actifs |
| Configurations | Infrastructure as Code (Git) | À chaque commit | Indéfini |

Tous les artefacts de sauvegarde sont chiffrés AES-256 au repos. Le transit inter-régions UE est en TLS.

### 9.2 RTO et RPO contractuels

| Métrique | Engagement | Description |
|---|---|---|
| **RTO** (Recovery Time Objective) | **4 heures** | Délai maximum entre incident bloquant et reprise du service |
| **RPO** (Recovery Point Objective) | **24 heures** au pire | Perte maximale de données. Pratique PITR : 5 minutes en routine. |

### 9.3 Tests de restauration

Un test de restauration complet (base PITR + storage) est exécuté **chaque trimestre** sur un environnement isolé. Le rapport est archivé et fourni sur demande dans le cadre d'un audit fournisseur.

---

## 10. Gestion des incidents

### 10.1 Classification

| Sévérité | Définition | Exemple |
|---|---|---|
| **P1 — Critique** | Service indisponible, perte ou fuite de données, faille de sécurité exploitable | Application down, suspicion d'exfiltration |
| **P2 — Majeure** | Fonctionnalité critique dégradée pour plusieurs clients | Module CV indisponible, lenteurs > 5s sustained |
| **P3 — Mineure** | Bug fonctionnel impactant 1 client ou 1 fonctionnalité non critique | Erreur d'affichage, export PDF malformé |
| **P4 — Cosmétique** | Pas d'impact métier | Typo, désalignement UI |

### 10.2 Délais de réponse

| Sévérité | Première réponse | Résolution cible | Couverture |
|---|---|---|---|
| P1 | **< 1 heure** | 4 heures | 24/7 |
| P2 | < 4 heures (ouvrées) | 24 heures | Heures ouvrées 9h-19h FR |
| P3 | < 24 heures (ouvrées) | 5 jours ouvrés | Heures ouvrées |
| P4 | < 5 jours ouvrés | Selon roadmap | Heures ouvrées |

### 10.3 Communication client

- **P1 et P2** : notification par email à tous les admins clients concernés dans les délais de première réponse ci-dessus.
- **Status page** `status.centrium-platform.com` (mise en ligne **Q3 2026**) : updates en temps réel, abonnement RSS et email.
- **Post-mortem public** systématique pour tout incident P1 et pour tout incident P2 dont la durée dépasse 1h. Publié sous 5 jours ouvrés avec timeline, cause racine, actions correctives, et le cas échéant les régressions évitées.

---

## 11. Conformité RGPD

QuadCore SAS est responsable du traitement pour les données qu'elle traite en propre (compte utilisateur Centrium, facturation) et **sous-traitant** pour les données métier saisies par ses clients (consultants, contacts, CV).

### 11.1 Registre des traitements

Un registre interne au sens de l'article 30 RGPD est tenu et mis à jour à chaque évolution majeure. Il liste les finalités, catégories de données, durées de conservation, destinataires, et mesures de sécurité par traitement. Extrait fourni dans le DPA.

### 11.2 Bases légales

| Traitement | Base légale |
|---|---|
| Création compte utilisateur Centrium | Exécution du contrat |
| Données métier client (consultants, contacts, CV) | Sous-traitance pour le compte du client responsable |
| Facturation et comptabilité | Obligation légale |
| Email marketing optionnel | Consentement explicite, opt-in séparé |
| Logs sécurité et audit | Intérêt légitime (sécurité du SI) |

### 11.3 Droits des personnes

Les six droits RGPD sont opérationnels via `dpo@centrium-platform.com` :

| Droit | Délai de réponse | Modalité |
|---|---|---|
| Accès | 30 jours | Export consolidé JSON / PDF |
| Rectification | 30 jours | Édition directe ou via support |
| Effacement | 30 jours | Suppression + purge sauvegardes au-delà du PITR |
| Opposition | 30 jours | Désactivation des traitements optionnels |
| Portabilité | 30 jours | Export structuré (JSON, CSV) |
| Limitation | 30 jours | Gel du traitement le temps de l'instruction |

### 11.4 Notification CNIL

En cas de violation de données à caractère personnel, QuadCore SAS s'engage à notifier la **CNIL sous 72 heures** (article 33 RGPD) et les personnes concernées **sans délai injustifié** lorsque le risque est élevé pour leurs droits et libertés (article 34).

### 11.5 DPA signable

Un Data Processing Agreement (Accord de traitement) standard est disponible sur simple demande commerciale. Il couvre les sous-traitants ultérieurs, les durées, la localisation des données, les audits, et les modalités de fin de contrat.

### 11.6 Transferts hors UE

Aucun transfert de données applicatives hors UE n'est opéré dans le cadre du fonctionnement normal. Si une fonctionnalité IA requiert un appel vers un sous-traitant hors UE (Anthropic, qui opère également des endpoints US), le transfert est encadré par **Clauses Contractuelles Types** (CCT) de la Commission européenne, version 2021, et limité aux payloads strictement nécessaires à la tâche demandée par l'utilisateur.

---

## 12. Sous-traitants

| Sous-traitant | Service | Localisation | Données traitées | Garanties |
|---|---|---|---|---|
| **Supabase Inc.** | DB managée, Auth, Storage, Realtime | UE (Francfort) | Toutes données applicatives | SOC 2 Type II, HIPAA-ready, DPA standard, chiffrement AES-256 |
| **Vercel Inc.** | Hébergement Next.js, CDN edge | UE primaire + edge mondial pour assets statiques uniquement | Pas de PII traitée en propre ; logs d'accès anonymisés | SOC 2 Type II, DPA standard, CCT pour transferts |
| **Anthropic** | Claude API (modules IA : CV Optimizer, extraction AO, matching) | UE / US selon endpoint | Payloads ponctuels (texte de CV, AO) | Pas de rétention pour entraînement, CCT, DPA standard |
| **Stripe** (à venir Q4 2026) | Facturation produit Centrium | UE | Email, nom, données paiement (jamais en propre) | PCI-DSS Level 1, SOC 2 Type II, RGPD-compliant |
| **Formspree** | Collecte formulaires marketing site vitrine | UE | Email prospect | DPA standard |
| **Resend** | Envoi emails transactionnels | UE | Email destinataire, contenu transactionnel | DPA standard, CCT |

L'usage de l'API Anthropic est configuré explicitement avec l'option **opt-out de la rétention pour entraînement** (paramètre par défaut sur l'offre business). Les payloads ne contiennent jamais le PII complet du consultant — seuls les éléments nécessaires à la tâche (compétences, expérience, contexte AO).

### 12.1 Audit fournisseurs

Chaque sous-traitant fait l'objet d'une **revue annuelle** par l'équipe sécurité QuadCore portant sur :

- Maintien des certifications (SOC 2, ISO 27001 le cas échéant)
- Évolution du DPA
- Localisation des données
- Incidents de sécurité publics les concernant
- Plan de continuité

Un changement de sous-traitant ou l'ajout d'un nouveau est notifié aux clients par email avec un préavis de 30 jours, conformément au DPA.

---

## 13. Pratiques de développement

### 13.1 Cycle de développement sécurisé

| Pratique | Application |
|---|---|
| **Revue de code obligatoire** | Toute PR vers `main` requiert au moins 1 review approuvée |
| **CI bloquante** | Lint, type-check TypeScript strict, tests unitaires, tests d'isolation RLS |
| **Validation Zod** | 100 % des entrées API et formulaires passent par un schéma Zod avant insertion DB |
| **Secrets** | Jamais commités. `.env.example` versionné, `.env.local` ignoré. Coffre Vercel pour production. |
| **Dépendances** | `npm audit` en CI, alertes Dependabot, mises à jour mineures hebdomadaires, majeures planifiées |
| **TypeScript strict** | `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` |
| **Pas de `any`** | Sauf exception documentée avec commentaire `// eslint-disable-next-line` justifié |

### 13.2 Tests d'isolation multi-tenant en CI

Au-delà des tests fonctionnels classiques, une suite spécifique cible le RLS (cf. §6.3) et bloque tout merge en cas d'échec. Cette suite est exécutée à chaque PR et chaque nuit sur `main`.

### 13.3 Environnements

| Environnement | Usage | Données |
|---|---|---|
| Local | Développeur QuadCore | Supabase local Docker, données seed |
| Preview (par PR) | Revue de code, démos internes | Base Supabase éphémère, jamais de PII réel |
| Staging | Tests d'intégration, qualif clients pilotes | Base dédiée, anonymisée |
| Production | Clients | Base UE, sauvegardes PITR |

Aucune donnée de production n'est jamais copiée en local, preview ou staging.

---

## 14. Audits & certifications

### 14.1 État actuel

Centrium **n'est pas encore certifiée** SOC 2 ni ISO 27001. Cette posture est documentée plutôt que dissimulée : il s'agit d'un produit de moins de 18 mois, en croissance contrôlée, qui prépare sa certification dans une logique de maturité opérationnelle.

### 14.2 Roadmap certifications

| Échéance | Engagement |
|---|---|
| **Q4 2026** | **SOC 2 Type I** — pré-audit Q3, audit Type I Q4, rapport disponible début 2027 |
| **Q4 2026** | **Pentest externe annuel** — cabinet indépendant français, périmètre app + infra |
| **Q4 2026** | **Bug Bounty / VDP** — page `security.txt` + programme coordonné disclosure |
| **2027** | **SOC 2 Type II** — couvre 12 mois de contrôles continus |
| **2027** | **ISO 27001** — phase d'évaluation, certification visée 2028 si l'analyse coût/bénéfice est positive |

### 14.3 Sous-traitants déjà certifiés

À défaut de certification propre, Centrium s'appuie sur des sous-traitants déjà certifiés au plus haut niveau (Supabase SOC 2 Type II, Vercel SOC 2 Type II, AWS sous-jacent ISO 27001 / SOC 2 / HIPAA). Le périmètre infra est donc déjà couvert ; le pas restant à franchir porte sur les **contrôles organisationnels et processus QuadCore** (gestion des accès interne, gestion du changement, formation, gestion des risques).

---

## 15. Roadmap sécurité 12 mois

| Trimestre | Livrable |
|---|---|
| **Q3 2026** | SSO SAML 2.0 (Azure AD, Okta, Google Workspace) + provisioning SCIM 2.0 |
| **Q3 2026** | MFA TOTP + politique de mot de passe organisationnelle |
| **Q3 2026** | Mise en ligne `status.centrium-platform.com` |
| **Q3 2026** | Publication `security.txt` + clé PGP `security@centrium-platform.com` |
| **Q4 2026** | SOC 2 Type I — audit cabinet indépendant |
| **Q4 2026** | Pentest externe annuel — premier rapport |
| **Q4 2026** | Bug Bounty / VDP — programme coordonné disclosure |
| **Q1 2027** | SOC 2 Type II — début observation 12 mois |
| **Q1 2027** | CSP3 strict avec nonces (suppression `'unsafe-inline'` script) |
| **Q2 2027** | ISO 27001 — phase évaluation |

---

## 16. Contacts sécurité

| Sujet | Contact | Délai de réponse |
|---|---|---|
| Vulnérabilité, faille de sécurité | `security@centrium-platform.com` | < 24 h ouvrées |
| Question DPO / RGPD | `dpo@centrium-platform.com` | < 30 jours (réglementaire) |
| Demande de DPA, audit fournisseur | `security@centrium-platform.com` | < 5 jours ouvrés |
| Incident en cours côté client | `support@centrium-platform.com` | Selon SLA (cf. §10.2) |

**Clé PGP** : publiée Q3 2026 sur `https://www.centrium-platform.com/.well-known/security.txt`. En attendant, les communications sensibles sont possibles via tout canal de votre choix (email signé S/MIME, ProtonMail, etc.) — demandez-nous.

**Coordinated disclosure** : Centrium s'engage à ne pas poursuivre les chercheurs en sécurité ayant agi de bonne foi dans le cadre d'une divulgation responsable, à reconnaître publiquement leur contribution sur demande, et à publier un correctif dans des délais raisonnables.

---

## 17. Annexes

### 17.1 Glossaire

| Terme | Définition |
|---|---|
| **RLS** (Row Level Security) | Mécanisme PostgreSQL natif qui applique un filtre de visibilité ligne par ligne au niveau de la base de données, indépendamment du code applicatif. |
| **PITR** (Point-in-Time Recovery) | Capacité à restaurer une base PostgreSQL à n'importe quel instant T sur une fenêtre glissante, grâce à la conservation continue des journaux WAL. |
| **HSTS** (HTTP Strict Transport Security) | En-tête HTTP qui force le navigateur à utiliser HTTPS exclusivement pour un domaine, sur une durée donnée. Le « preload » inscrit le domaine dans une liste codée en dur dans Chrome / Firefox / Safari. |
| **CSP** (Content Security Policy) | En-tête HTTP qui restreint les origines de scripts, styles, images, et autres ressources qu'un navigateur peut charger pour une page. |
| **RGPD** | Règlement Général sur la Protection des Données (UE 2016/679). |
| **CCT** (Clauses Contractuelles Types) | Modèle contractuel approuvé par la Commission européenne pour encadrer les transferts de données hors UE. |
| **SOC 2** | Cadre d'audit américain (AICPA) attestant des contrôles d'un fournisseur SaaS sur cinq critères : sécurité, disponibilité, intégrité de traitement, confidentialité, vie privée. Type I = état à un instant T, Type II = sur 12 mois. |
| **ISO 27001** | Norme internationale de gestion de la sécurité de l'information (Système de Management de la Sécurité de l'Information). |
| **PKCE** (Proof Key for Code Exchange) | Extension OAuth 2.0 protégeant les flux d'autorisation contre l'interception du code. |
| **DPA** (Data Processing Agreement) | Accord contractuel encadrant le traitement de données personnelles entre responsable et sous-traitant au sens RGPD. |

### 17.2 Versions du document

| Version | Date | Changements |
|---|---|---|
| 1.0 | 2026-06-04 | Première publication. Établit la baseline architecture, contrôles, conformité et roadmap sécurité 12 mois. |

---

> **Pages liées** :
> - [Trust Center](./TRUST_CENTER.md) — vue publique synthétique
> - [Présentation Entreprise](./PRESENTATION_ENTREPRISE.md) — vue commerciale
> - [Manuel Utilisateur](./MANUEL_UTILISATEUR.md) — guide fonctionnel
