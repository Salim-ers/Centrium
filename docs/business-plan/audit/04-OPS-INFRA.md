# Audit Ops / Infra / DevOps — Centrium

> Auditeur : Head of Engineering / Ops (ex-Vercel / ex-Datadog).
> Date : juin 2026. Cible : décision GO/NO-GO commercialisation.
> Méthodologie : exploration repo `quadcore-platform`, lecture migrations, env vars, runbook, configs Next/Vercel.

---

## 1. Infrastructure (Vercel + Supabase + services tiers)

**Topologie réelle constatée**

| Couche | Fournisseur | Région | Plan supposé | État |
|---|---|---|---|---|
| Frontend / SSR / Route Handlers | Vercel | CDG1 (Paris) + global edge | Pro (présumé) | Configuré (`next.config.js` + redirects naked→www, CSP stricte) |
| DB + Auth + Storage + Realtime | Supabase | EU (Francfort/Paris à CONFIRMER) | Pro (présumé) | 63 migrations versionnées, RLS forcée sur 38 tables |
| LLM | Anthropic Claude API | US (Anthropic) | Pay-as-you-go | Intégré dans 5 routes (`cv/extract`, `cv/parse`, `cv/skills/suggest`, `offers/parse-image`, `responses/generate-email`) |
| Emails transactionnels | Resend | EU | Free → Pro | Utilisé pour notif device + purge archives (`RESEND_API_KEY`) |
| Paiement | Stripe | EU | Test mode | Webhook configuré (`/api/billing/webhook`), code prêt, **0 abonnement actif** |
| Rate limiting | Upstash Redis | EU (présumé) | Free | Configuré (`UPSTASH_REDIS_REST_URL/TOKEN`) — fallback in-memory si absent |
| Monitoring | Sentry (wrapper HTTP brut, **pas le SDK**) | EU | Free | DSN optionnel — log console fallback |
| Anti-virus uploads | VirusTotal | US | Free 4 req/min | `VIRUSTOTAL_API_KEY` optionnel, fail-open |
| Forms public | Formspree | US | Free | `/devis` — à internaliser Q3 2026 |
| Status page | Better Stack (recommandé runbook) | — | Free | **PAS encore branché** (action #10 runbook ouverte) |

**Verdict** : stack moderne, serverless, propre. Aucun K8s, aucun Docker custom à maintenir. Le couple Next/Supabase tient sans SRE jusqu'à plusieurs centaines de tenants. **Mais 6 dépendances tierces critiques** dont 4 dont l'activation prod n'est pas tracée (Supabase EU à confirmer, Sentry DSN, Upstash, Resend domaine vérifié).

---

## 2. Variables d'environnement requises (recensement exhaustif)

Recensement issu de `grep process.env` (résultat brut). **22 variables uniques** détectées.

**Bloc obligatoire (sinon build cassé)**

```
NEXT_PUBLIC_SUPABASE_URL              # client + middleware + server + admin
NEXT_PUBLIC_SUPABASE_ANON_KEY         # idem
SUPABASE_SERVICE_ROLE_KEY             # admin client confiné, rotation 90j
NEXT_PUBLIC_APP_URL                   # invitations, billing portal, portal-access
NEXT_PUBLIC_APP_NAME                  # branding
```

**Bloc IA (obligatoire pour features IA)**

```
ANTHROPIC_API_KEY                     # 5 routes l'utilisent — fallback heuristique partiel
# OPENAI_API_KEY commenté — non utilisé
```

**Bloc Stripe (obligatoire pour billing)**

```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

**Bloc sécurité prod (CRITIQUE — actuellement marqué optionnel)**

```
UPSTASH_REDIS_REST_URL                # sans → rate limit inopérant en serverless multi-instance
UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN                            # sans → events sécu visibles seulement dans Vercel logs
RESEND_API_KEY                        # sans → notif device et purge silencieuses
VIRUSTOTAL_API_KEY                    # sans → upload accepte tout sans scan
CRON_SECRET                           # protège /api/admin/purge-archives — OBLIGATOIRE
```

**Bloc Vercel runtime (injecté automatiquement)**

```
VERCEL_ENV
VERCEL_GIT_COMMIT_SHA
VERCEL_GIT_COMMIT_DATE
NODE_ENV
```

**Bloc dev/CI**

```
SUPABASE_ACCESS_TOKEN                 # MCP local
GITHUB_TOKEN                          # MCP local
PLAYWRIGHT_BASE_URL                   # E2E
CI                                    # Playwright retries
NEXT_PUBLIC_SITE_URL                  # SEO config
```

**Gap critique** : aucun fichier `.env.production.example` ou `.env.preview.example`. Le `.env.example` actuel mélange dev local et prod sans distinction → risque de copier-coller des URLs `localhost:54321` en prod. **À splitter avant onboarding du 2e dev.**

---

## 3. Pipeline CI/CD (build, lint, test, deploy)

**État réel : il n'y a PAS de pipeline CI.**

- Aucun `.github/workflows/` dans le repo (Glob retourne vide).
- Aucun fichier GitLab CI, CircleCI, Buildkite.
- Aucun `vercel.json` (les crons mentionnés dans le runbook ne sont **pas branchés**).
- Le déploiement repose sur l'**auto-deploy Vercel sur push main** (présumé — à confirmer côté dashboard Vercel).

**Scripts NPM disponibles** (`package.json`) :
- `dev`, `build`, `start`, `lint`, `type-check` ✅
- `test` (Vitest), `test:e2e` (Playwright) ✅
- `db:reset`, `db:types`, `db:seed` ✅
- `docs:pdf` (génération PDF des docs entreprise) ✅

**Tests présents** :
- Unitaires : 2 fichiers (`validators.test.ts`, `cv-generator.test.ts`) → couverture **très faible**
- E2E : 3 specs (`login`, `marketing`, `multi-tenant-isolation`)
- Le test d'isolation cross-tenant est le seul test "sécurité" automatisé. Bon mais insuffisant.

**Conséquence directe** :
1. Un push avec un type error ne se voit qu'en lisant le build Vercel à la main.
2. Aucune garantie que `npm run type-check` passe avant déploiement.
3. Aucune barrière entre une régression RLS et la prod.
4. Le test E2E d'isolation **n'est jamais exécuté** sauf à la main.

**Bloquant pour vendre à une ESN sérieuse** qui demandera un Security Questionnaire mentionnant "CI/CD pipeline & automated security tests".

---

## 4. Monitoring & observabilité

**Sentry** : `src/lib/security/sentry.ts` est un **wrapper HTTP brut, pas le SDK officiel**. Avantages : 0 dépendance, footprint nul. Inconvénients :
- Pas de traces de perf, pas de source maps, pas de session replay.
- Pas de capture automatique des erreurs React/Next.
- Aucun monitoring "applicatif" — uniquement les events sécurité émis manuellement (`reportSecurityEvent`).

**Vercel Logs** : disponibles, mais rétention limitée (1j sur Hobby, 7j sur Pro, 30j sur Enterprise). Pas d'export structuré.

**Supabase logs + advisors** : disponibles via MCP. Pas d'alerting branché.

**Pas branché** :
- Pas de Vercel Analytics réellement utilisé (CSP autorise `va.vercel-scripts.com` → setup OK, à confirmer activation).
- Pas de monitoring uptime externe (Better Stack annoncé runbook, pas activé).
- Pas de page `/api/health` détectée (Glob `**/health/route.ts` = 0 résultat) → **à créer avant branchement Better Stack**.
- Aucun dashboard métier (KPIs activation, erreurs Stripe, latence Anthropic).

**Verdict observabilité : 3/10**. Suffisant pour un MVP solo, **insuffisant dès le 1er client payant**.

---

## 5. Backups & disaster recovery

**Backups Supabase** :
- Plan Pro = backup quotidien 7 jours rétention + PITR optionnel.
- Plan Free = pas de backup automatique fiable → **doit être Pro avant client #1**.

**Runbook DR (docs/produit/SECURITY_RUNBOOK.md)** : très bien structuré.
- RTO cible 4h, RPO 24h annoncés.
- Restore drill mensuel documenté (étape #13).
- Procédure incident H/H+1/H+24/H+7j claire.
- **MAIS aucun drill n'a été exécuté à ce jour** (pas de trace de log/Notion mentionné).

**Manque critique** :
- Pas d'export régulier `pg_dump` chiffré hors-Supabase (lock-in si compte Supabase compromis ou résilié).
- Pas de stratégie de réplication Storage (les CV uploadés ne sont sauvegardés que par Supabase).
- Pas d'évidence de test de restore documentée.

**Action incontournable avant client #1** : exécuter UN restore drill réel et garder la capture d'écran. C'est ce que tout DSI demandera lors d'une RFP.

---

## 6. Performance & coûts

**Performance déclarée (docs/produit/ARCHITECTURE_OVERVIEW.md)** :
- First Load JS shared : **87.8 kB** → excellent (sous le seuil 100 kB de Next).
- LCP cible < 2.5s, INP < 200ms, CLS < 0.1.
- Pas de mesure Core Web Vitals réelle (CrUX) car trafic insuffisant.

**Couches lourdes** :
- `@react-pdf/renderer` (PDF), `pdfjs-dist`, `mammoth` (DOCX), `three`/`@react-three/fiber` (3D vitrine), `gsap`, `framer-motion`, `html2canvas`, `jspdf` → **bundle lourd côté client sur certaines routes**. À auditer avec `next build --analyze` (action ouverte).
- Anthropic API : appels synchrones côté serveur, **pas de cache**. Une parse de CV = 1 call Claude full = 5-15s. Risque de timeout Vercel serverless (10s par défaut, 60s sur Pro, 300s sur Enterprise).

**Coût Anthropic par opération (estimation Sonnet 4)** :
- Parse CV PDF : ~0.05-0.20 € / parse selon taille
- Extraction AO : ~0.03-0.10 € / extraction
- Matching IA : ~0.02-0.05 € / paire consultant/mission
- Génération email réponse : ~0.01-0.03 € / email

---

## 7. Scalabilité

**Multi-tenant via RLS** : architecture saine. Une seule base Postgres pour N tenants, scoping par `organization_id` injecté dans le JWT.

**Limites avérées de l'archi actuelle** :

| Palier | État | Limite atteinte d'abord ? |
|---|---|---|
| **1 → 50 ESN** | ✅ Sans changement infra | Aucune limite technique, Supabase Pro tient ~100GB DB. |
| **50 → 200 ESN** | ⚠ Surveillance requise | Quota Anthropic (rate limit org), bande passante Vercel, connexions Postgres simultanées via Realtime. |
| **200 → 500 ESN** | ❌ Refonte partielle | Passage Supabase Team (PgBouncer, plus de connexions). Mise en cache Anthropic (Claude prompt caching). Possible besoin de queue async (Inngest / Trigger.dev) pour le parsing CV. |
| **500+ ESN** | ❌ Refonte | Sharding par région, lecture sur replicas, dedicated Postgres. |

**Bottleneck #1 réel** : **les Route Handlers serverless qui appellent Anthropic en synchrone** sur l'upload CV. À 50 ESN × 30 consultants × 2 parsings/mois = 3000 calls/mois. OK. À 200 ESN = 12 000 calls/mois et premiers timeouts visibles → introduire une queue async dès 30-50 ESN.

**Bottleneck #2** : Realtime Supabase (Realtime quota = 200 concurrent connections sur Pro, 500 sur Team). À 50 ESN × 5 users connectés simultanément = 250 → **dépassement Pro**, donc upgrade Team obligatoire à ce palier.

---

## 8. Maintenance & releases

**Modèle actuel** : Salim solo. Push main → auto-deploy Vercel.

- **Pas de branche `staging`** → tout va direct en prod.
- **Pas de feature flag system** → rollback = revert git + redeploy.
- **Pas de release notes structurées** (CHANGELOG.md absent).
- **Pas d'astreinte 24/7**.

**Checklist pre-release** (runbook §17) : pertinente mais **manuelle**. Devrait être un workflow CI.

**Risque opérationnel** : un seul humain (Salim) sait redéployer, rollback, restorer, rotation secret. **Bus factor = 1**. Avant client payant, écrire un `OPERATIONAL_RUNBOOK_EXTERNAL.md` minimum lisible par un dev externe.

---

## 9. Coûts infra estimés par palier

**Hypothèse modèle de prix** : 50€/consultant/mois facturé à partir de 20 consultants (1er palier 1000€/mois/ESN).

### 9.1 Aujourd'hui (0 client)

| Service | Plan | Coût mensuel |
|---|---|---:|
| Vercel | Pro | 20 € (20 $) |
| Supabase | Pro | 25 € (25 $) |
| Anthropic | Pay-as-you-go | 5-30 € (usage dev/demo) |
| Resend | Free | 0 € |
| Upstash | Free | 0 € |
| Sentry | Free | 0 € |
| VirusTotal | Free | 0 € |
| Domaine + DNS | OVH/Cloudflare | 2 € |
| Better Stack | Free | 0 € |
| **TOTAL** | | **~55-80 € / mois** |

### 9.2 À 10 ESN clientes (300 consultants total)

| Service | Plan | Coût mensuel |
|---|---|---:|
| Vercel | Pro | 20 € |
| Supabase | Pro | 25 € + storage overage ~10 € |
| Anthropic | Usage ~600 € (parsing CV + matching + AO) | 600 € |
| Resend | Pro | 20 € |
| Upstash | Pay-as-you-go | 10 € |
| Sentry | Team | 26 € |
| VirusTotal | Free (4 req/min OK) | 0 € |
| Better Stack | Free | 0 € |
| **TOTAL** | | **~710 € / mois** |

Coût infra par ESN = 71 €/mois. **Sur un prix de vente 1000-2000 €/mois/ESN → marge brute infra > 95%.**

### 9.3 À 50 ESN clientes (1500 consultants total)

| Service | Plan | Coût mensuel |
|---|---|---:|
| Vercel | Pro + bandwidth overage | 80 € |
| Supabase | Team (PgBouncer + 8GB DB inclus) | 599 € |
| Anthropic | Usage ~3000 € (avec prompt caching activé) | 3000 € |
| Resend | Pro | 20 € |
| Upstash | Pay-as-you-go | 30 € |
| Sentry | Team | 26 € |
| VirusTotal | Premium (1000 req/min) | 200 € |
| Better Stack | Team | 18 € |
| **TOTAL** | | **~4000 € / mois** |

Coût infra par ESN = 80 €/mois. **Marge brute infra > 92%** sur 50k€/mois ARR.

### 9.4 À 200 ESN clientes (6000 consultants)

Coût ~12-15 k€/mois (Supabase Team upgrades, Vercel Enterprise possible, Anthropic dominant à 10k€+). Coût par ESN ~75 €/mois. **Marge brute infra > 90%**.

**Conclusion coûts** : l'infra ne sera JAMAIS le goulot d'étranglement économique. Le poste #1 est Anthropic (75-80% du total infra à partir de 10 ESN). **Lever stratégique : activer le prompt caching Anthropic et batch les opérations non-critiques.**

---

## 10. Verdict ops /10 + sub-scores

| Sub-score | Note | Justification |
|---|---:|---|
| Infrastructure (choix techno) | 9/10 | Stack moderne, réversible, faibles coûts d'ops |
| Sécurité applicative & RLS | 9/10 | 63 migrations, RLS forcée 38 tables, MFA, audit log, CSP stricte |
| CI/CD | 2/10 | Aucun pipeline. Tout dépend de la rigueur manuelle de Salim |
| Observabilité | 3/10 | Wrapper Sentry HTTP, pas de SDK, pas de Better Stack actif, pas de `/api/health` |
| Backups & DR | 5/10 | Runbook excellent, mais **0 drill exécuté**, pas d'export hors-Supabase |
| Scalabilité | 8/10 | Tient jusqu'à 50 ESN sans refonte ; bottlenecks identifiés au-delà |
| Coûts & marges | 9/10 | Marge brute >90% dès le 1er client |
| Documentation ops | 8/10 | SECURITY_RUNBOOK + ARCHITECTURE_OVERVIEW solides ; manque CHANGELOG et OPERATIONAL_RUNBOOK externe |
| Maintenance/Bus factor | 3/10 | Solo. Pas de redondance humaine. |

**NOTE GLOBALE OPS : 6.2 / 10**

Le produit est très bien construit côté code et architecture. **Le delta vient de l'opérationnel non encore activé** (CI absente, monitoring partiel, drill non exécuté, dépendance à un seul humain).

---

## 11. Top 5 actions ops à faire avant le 1er client payant

**Effort estimé : 2-3 jours dev cumulés. Bloquantes pour vendre.**

### 1. Créer un pipeline CI minimal (.github/workflows/ci.yml) — 4h
Lint + type-check + Vitest + Playwright marketing+login sur chaque PR.
Bloque le merge si type-check échoue. Une ESN qui demande un Security Questionnaire avec "Do you run automated tests on every change?" doit pouvoir répondre OUI documenté.

### 2. Activer Sentry réel + créer `/api/health` + brancher Better Stack — 4h
- Ajouter `SENTRY_DSN` dans Vercel env (compte gratuit suffit).
- Créer `src/app/api/health/route.ts` retournant `{ status: 'ok', db: <ping>, version: process.env.VERCEL_GIT_COMMIT_SHA }`.
- Configurer 2 monitors Better Stack (login + health).
- Publier `status.centrium-platform.com` — élément vendable.

### 3. Exécuter le restore drill #1 et le documenter — 2h
Suivre le runbook §13 à la lettre. Garder capture d'écran + entrée Notion datée. C'est la preuve qu'on demande en SOC 2 / ISO 27001 et que tout DSI sérieux vérifiera.

### 4. Activer Upstash + Resend + rotation initiale SUPABASE_SERVICE_ROLE_KEY — 1h
Actions #4-9 + #12 du runbook. Le code est déjà branché ; il manque les credentials Vercel env. **Sans Upstash, le rate limit ne tient PAS en multi-instance serverless.**

### 5. Brancher le cron Vercel pour purge-archives + ajouter `vercel.json` — 30 min
Le code existe (`/api/admin/purge-archives` protégé par CRON_SECRET) mais aucun `vercel.json` ne déclare le cron. RGPD art. 17 (droit à l'oubli) impose ce mécanisme actif, pas seulement codé.

```json
{
  "crons": [
    { "path": "/api/admin/purge-archives", "schedule": "0 3 1 * *" }
  ]
}
```

**Bonus #6 (non-bloquant mais utile)** : splitter `.env.example` en `.env.development.example` et `.env.production.example` pour limiter le risque de fuite ou de mauvaise config quand le 2e dev arrivera.

---

## Synthèse pour décideur

L'infrastructure est **solide à l'os mais inachevée dans la couche opérationnelle**. Le code de sécurité est en place ; les services tiers sont identifiés ; les coûts sont maîtrisés et la marge brute infra dépassera 90% dès le 1er client payant. Ce qui manque est exclusivement **du brancher-l'existant et industrialiser** : CI, monitoring, drill DR. 2-3 jours de travail concentré. **L'archi tient 5-10 clients sans refonte ; elle tient 50 clients avec un upgrade Supabase Team prévisible à ~6k€/mois total ; elle nécessite repenser à 200+**. Le seul vrai risque opérationnel structurel est le bus factor = 1 (Salim solo), à mitiger via runbook externalisable et premier recrutement avant le 5e client payant.
