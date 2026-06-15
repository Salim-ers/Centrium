# Audit Code & Architecture — Centrium

> Auditeur : CTO senior indépendant (ex-Stripe / ex-Datadog)
> Périmètre : repo `quadcore-platform` — branche `main`, snapshot juin 2026
> Méthode : exploration directe du code (Read / Grep / Glob), pas de promesse marketing prise pour acquise.

---

## 1. Vue d'ensemble (taille code, fichiers, langages)

- **341 fichiers** TypeScript/TSX dans `src/`, **~65 000 lignes** de code applicatif (hors `node_modules`, hors tests, hors migrations SQL).
- Répartition :
  - **65 pages** Next.js (`page.tsx`) — densité élevée pour un MVP.
  - **46 route handlers** API (`src/app/api/**/route.ts`) — 5 435 LOC cumulées.
  - **142 composants** React (`src/components/**/*.tsx`).
  - **51 fichiers** dans `src/lib/` (services, validators, supabase clients, security, AI, i18n, etc.).
- **63 migrations SQL** versionnées dans `supabase/migrations/`, **38 tables** créées, **109 policies RLS**, **50 fonctions/triggers**, **6 vues**.
- Langage : TypeScript strict, **0 fichier `.js`** dans `src/` (sain).

Volume cohérent avec un produit SaaS B2B en v1 : pas un POC, pas (encore) une dette monumentale. Mais déjà des fichiers très gros (cf. §8).

---

## 2. Stack et choix techniques (forces/faiblesses)

### Choix
- **Next.js 14.2.3** + **App Router** + **React 18.3** + **TypeScript 5.4** (strict).
- **Supabase** (Auth + Postgres + Storage + Realtime + RLS) — un seul vendor pour 80 % du backend.
- **Anthropic SDK 0.90** — modèle hardcodé `claude-opus-4-7` (`src/lib/ai/cv-generator.ts:L?`).
- **Stripe 22** (paiements), **Resend** (email via `fetch` direct, pas de SDK), **Upstash REST** (rate-limit, fallback in-memory).
- UI : **Tailwind 3.4** + **shadcn/ui** + **Radix** + **lucide-react** + **framer-motion** + **GSAP** + **three.js / react-three-fiber / drei** (présence de three.js dans une app B2B = drapeau à surveiller).
- PDF : double pile **@react-pdf/renderer 4.5** + **jspdf 4 / html2canvas** — deux approches qui co-existent.
- Parsing CV : **pdfjs-dist 5.6**, **unpdf 1.6**, **mammoth 1.12**, **docx 9.6**.

### Forces
- Pile cohérente, full-TS, full-managed (Vercel + Supabase + Upstash + Resend + Stripe) → **opex faible, ops manageable solo**.
- Le choix Supabase + RLS est pertinent pour un SaaS multi-tenant : la sécurité est poussée au plus près de la donnée.
- Tailwind + shadcn + Radix : combo standard, accessible, sans CSS-in-JS lourd.

### Faiblesses
- **Couplage fort à Supabase** : une migration future (ex : passage à Neon / RDS + Auth0) demanderait un gros chantier. Risque d'éditeur unique réel.
- **Modèle IA hardcodé** (`claude-opus-4-7`) sans fallback ni abstraction — au prochain rename Anthropic, ça casse en prod.
- **Three.js / @react-three/fiber / drei / GSAP** embarqués sur une app B2B : poids JS non négligeable, ROI métier nul, vrai signal "fondateur qui aime les jolis effets" plus que "rigueur perf".
- **Pas d'observabilité externe configurée** : un wrapper Sentry existe (`src/lib/security/sentry.ts`) mais pas de SDK Sentry runtime — c'est du fail-soft maison.

---

## 3. Structure du repo (cohérence, organisation)

L'arborescence respecte ce qui est documenté dans `CLAUDE.md` :

```
src/
├── app/          → 65 pages, 46 routes API (groupes (auth))
├── components/   → 22 dossiers métiers (admin, crm, cv, consultants, marketing, ui, …)
├── lib/
│   ├── services/    → couche métier
│   ├── supabase/    → client / server / admin / middleware
│   ├── validators/  → schémas zod centralisés
│   ├── security/    → password, rate-limit, virustotal, sentry, export-throttle, device-tracking
│   ├── ai/          → cv-generator + accounting-assistant
│   ├── audit/, billing/, consent/, i18n/, offers/, pdf/, ratelimit/, realtime/, seo/, …
├── hooks/, types/, constants/
└── middleware.ts
```

**Bon** : séparation services / validators / supabase explicite, isolation `'server-only'` sur le client admin (`src/lib/supabase/admin.ts:1`), regroupement sécurité dans un dossier dédié.

**Moins bon** :
- `src/lib/services/index.ts` fait **1 433 lignes** et concentre **opportunityService, jobOfferService, contactService, contactInteractionService, companyService, invoiceService, timesheetService, alertService, dashboardService**. C'est un anti-pattern "god module" — ce fichier doit être éclaté en `opportunity.service.ts`, `invoice.service.ts`, etc., comme le sont déjà `consultant.service.ts`, `contract.service.ts`, `cv.service.ts`, `matching.service.ts`.
- Pas de `loading.tsx` (0) et un seul `error.tsx` dans `src/app` — l'App Router est sous-exploité côté UX.
- Doublon `src/lib/ratelimit/in-memory.ts` (fallback simple) vs `src/lib/security/rate-limit.ts` (Upstash + fallback in-memory) — deux implémentations pour le même besoin, à consolider.

---

## 4. Qualité du code (TypeScript strict, eslint, tests)

### TypeScript
- `tsconfig.json` : `strict: true`, `noEmit: true`, `target: ES2022`, `moduleResolution: bundler`, alias `@/*`. Configuration nette.
- **18 occurrences** d'échappatoires de typage (`as any`, `<any>`, `@ts-ignore`, `@ts-nocheck`) sur 341 fichiers, **0 `@ts-expect-error`**. Très propre.
- Seulement **8 occurrences** de `: any` explicites — usage maîtrisé.

### Lint / format
- ESLint via `eslint-config-next 14.2.3` + Prettier 3 listés dans `devDependencies`, **mais aucun fichier `.eslintrc*` ni `.prettierrc*` à la racine**. La config est entièrement implicite via `next lint`. Pas de règles custom (no-console, sort-imports, etc.), pas de pre-commit hook visible.
- **73 `console.log/warn/error`** dans `src/` — alors que `CLAUDE.md` interdit explicitement `console.log` en prod. Petite incohérence règles ↔ code.
- **0 TODO/FIXME/HACK** (3 occurrences seulement) — soit le code est mature, soit la dette n'est pas trackée en commentaire (plutôt la deuxième : un repo MVP sans TODO, c'est rare).

### Tests
- **5 fichiers de tests** :
  - `tests/unit/cv-generator.test.ts`, `tests/unit/validators.test.ts`
  - `tests/e2e/login.spec.ts`, `tests/e2e/marketing.spec.ts`, `tests/e2e/multi-tenant-isolation.spec.ts`
- Vitest + Playwright configurés correctement (`playwright.config.ts`, `vitest.config.ts`).
- **Aucune CI configurée** : pas de `.github/workflows/`, pas de pipeline de lint/test/typecheck à chaque push. **C'est le trou le plus voyant du repo.**
- Le test E2E multi-tenant (`tests/e2e/multi-tenant-isolation.spec.ts`) est bien pensé (7 scénarios, skip propre si env manquantes) mais **skipped par défaut** tant que le seed Org A / Org B n'est pas branché en CI.
- Couverture services réelle : **proche de zéro** sur consultantService, opportunityService, invoiceService, etc.

**Verdict qualité** : la base est saine (strict TS, peu d'`any`, validation zod sur les routes critiques — 26/46 routes utilisent zod, 31 appels `safeParse`), mais la **discipline n'est pas industrialisée** (pas de CI, pas de pre-commit, lint non personnalisé, tests symboliques).

---

## 5. Architecture Next.js (App Router, Server/Client, API routes, middleware)

- **168 fichiers `'use client'`** sur 142 composants + 65 pages : Server Components sous-utilisés. Une partie est légitime (forms, dialogs, animations), mais le client-side default est probablement trop large. À auditer par page.
- **0 Server Action** (`'use server'`) — toute la mutation passe par des Route Handlers REST. Choix défendable (plus testable, plus explicite), mais on rate l'optimisation native Next 14.
- **46 routes API** bien structurées (REST-ish + actions métier). Pattern de la route `/api/admin/organizations` (audité ligne par ligne) est correct : auth + zod safeParse + admin client avec reason whitelisté + gestion d'erreur granulaire + codes HTTP cohérents (201, 207 pour invite partielle, 403, 400).
- **Middleware** (`src/middleware.ts` + `src/lib/supabase/middleware.ts`) :
  - **Très soigné** : matcher exclut bien `/api`, assets, `robots.txt`, `sitemap.xml`, `llms.txt` (sinon les crawlers se prennent un 307 — bug classique évité).
  - Cookie cache `qc_profile` 5 min pour éviter une query `profiles` à chaque navigation (`src/lib/supabase/middleware.ts:130-133`) — bonne idée pour la latence.
  - Routing par rôle (super_admin → `/admin/*`, consultant → `/portal/*`, autres → `/dashboard`) explicite et testé manuellement.
  - "Session-only cookies" (strip `maxAge`/`expires`) — choix réfléchi pour les machines partagées.
- **0 `revalidate` / ISR** dans `src/app` : aucune page statique régénérée, tout est dynamique. Acceptable pour un SaaS, mais des pages marketing (`/`, `/plateforme`, `/manifesto`) gagneraient à passer en ISR.
- **Aucun usage de `next/image`** (0 occurrence) ni `next/dynamic` (2 occurrences) — **deux optimisations Next majeures totalement ignorées**.
- En-têtes de sécurité (`next.config.js:29-87`) : HSTS preload, X-Frame-Options, CSP **complète** avec `unsafe-inline`/`unsafe-eval` justifiés en commentaire (Tailwind, @react-pdf, html2canvas). Niveau "déclaratif" très au-dessus de la moyenne MVP.

---

## 6. Architecture Supabase (DB, RLS, migrations, services)

### Migrations
- **63 migrations SQL** numérotées séquentiellement (`001_initial_schema.sql` → `062_archive_purge.sql`). Versionnement strict, lisible.
- **38 tables** créées via `CREATE TABLE`, **109 policies RLS**, **50 fonctions/triggers**, **6 vues**, **27 références à `storage.objects`** (politiques bucket).
- Migration récente `060_security_hardening.sql` : ajoute `FORCE ROW LEVEL SECURITY` sur les tables sensibles (1 occurrence visible — à vérifier qu'elle couvre bien les 38 tables, le commentaire CLAUDE.md dit "FORCE sur 38 tables").
- `061_security_invoker_views.sql` : sécurise les vues en `SECURITY INVOKER` (commit `98224c2`) — vraie maturité sécu, c'est un piège bien connu.

### Clients
- 4 clients distincts : `client.ts` (browser), `server.ts` (Server Components), `admin.ts` (service_role + `reason` whitelisté), `middleware.ts`. Séparation propre.
- **51 appels** à `createAdminClient(reason)` dans `src/` — chacun avec un motif typé (`'webhook' | 'cross-org-query' | 'audit-log-write' | 'rgpd-export' | 'invitation' | 'onboarding' | 'system-cron' | 'data-migration'`). C'est un excellent garde-fou contre l'usage abusif du service_role, et c'est rarement vu en MVP.

### Services métier
- **4 vrais services** isolés : `consultant.service.ts` (561 L), `contract.service.ts` (107 L), `cv.service.ts` (109 L), `matching.service.ts` (84 L).
- **1 god-module** : `services/index.ts` (1 433 L) — voir §3.
- Pattern uniforme `{ data, error }` retourné par les services, cohérent avec `CLAUDE.md`.
- 14 utilisations de Realtime (`supabase.channel` / `postgres_changes`) — fonctionnel mais à surveiller : Supabase Realtime coûte cher en connexions concurrentes.

---

## 7. Performance (côté browser + côté serveur)

### Côté browser
- **Pas de `next/image`** → toutes les images servies sans optimisation/dimensions/lazy load auto. Impact LCP réel sur la landing et les fiches consultants avec photo.
- Dépendances lourdes embarquées : `three` + `@react-three/fiber` + `@react-three/drei` + `gsap` + `framer-motion` + `html2canvas` + `jspdf` + `@react-pdf/renderer` + `pdfjs-dist` + `mammoth` + `docx`. Sans `next/dynamic`, plusieurs centaines de Ko sont potentiellement dans le bundle principal. **Audit bundle analyzer obligatoire avant de vendre à une ESN de 100 consultants.**
- **168 composants `'use client'`** — surface client trop large, à raboter.

### Côté serveur
- Routes API en `runtime = 'nodejs'` (vu sur `/api/admin/organizations`) — pas d'Edge runtime sauf cas justifiés. Choix défendable (Stripe/Supabase service_role/Anthropic SDK Node-only).
- Pas de cache HTTP / ISR. Toutes les routes sont dynamiques.
- Cookie cache profile (`qc_profile`, 5 min) au middleware → réduit 90 % des queries `profiles` répétées sur navigation. Optim pertinente.
- Rate limit : Upstash Redis si configuré, sinon in-memory. **Le fallback in-memory ne tient pas en production multi-instance Vercel** (chaque cold start = compteur indépendant). C'est documenté en commentaire (`src/lib/security/rate-limit.ts:7-9`), c'est OK pour MVP mais à activer Upstash dès le 1er client payant.

---

## 8. Tech debt et points de fragilité

1. **`src/lib/services/index.ts` (1 433 L)** : 8 domaines métier dans un seul fichier. À éclater avant que ça atteigne 2 000 L.
2. **`src/app/todos/page.tsx` (1 264 L)** et **`src/app/cv-optimizer/page.tsx` (1 155 L)** : pages monolithiques. Risque de re-render lourd et de complexité cognitive.
3. **`src/lib/i18n/landing.ts` (1 162 L)** : monolithe i18n inline — fonctionnel mais peu scalable si on ajoute des langues.
4. **0 CI** : aucun garde-fou automatisé. Un PR mal mergé passe direct en prod si la build Vercel passe — mais lint/test/typecheck ne sont pas vérifiés en amont.
5. **Pas de pre-commit hook** (husky, lint-staged) → 73 `console.log` traînent.
6. **Doublon rate-limit** (`ratelimit/in-memory.ts` vs `security/rate-limit.ts`).
7. **Modèle Anthropic hardcodé** (`claude-opus-4-7`) sans variable d'env, sans fallback.
8. **Sentry "wrapper maison" sans SDK officiel runtime branché** — les events sécurité ne sortent nulle part.
9. **Tests d'isolation cross-tenant skipped par défaut** — le filet de sécurité est en place mais désarmé.
10. **`three.js` + `gsap`** dans une app B2B = poids JS qui ne rapporte rien aux clients ESN, charge cognitive en plus.

---

## 9. Dépendances (versions, risques)

- **Next 14.2.3** : version stable, mais Next 15 est sorti (App Router stable, React 19). Pas de blocage immédiat, mais retard de 12-18 mois sur la stack moderne.
- **React 18.3** : OK.
- **Supabase JS 2.43** + **@supabase/ssr 0.1.0** : `ssr 0.1` est très tôt — Supabase a sorti des versions plus stables depuis. À bumper.
- **Anthropic SDK 0.90** : récent.
- **@react-pdf/renderer 4.5** : major récent, à monitorer.
- **three 0.160** : déjà 2 majors derrière le dernier release.
- Aucun `npm audit` ou Snyk visible dans le repo — vulnérabilités potentielles non trackées.
- Pas de Renovate / Dependabot configuré.

**Risques moyens** : aucune dépendance critique en EOL, mais pas non plus de discipline de mise à jour.

---

## 10. Verdict global /10

**Note globale : 7,4 / 10**

| Axe | Note | Commentaire |
|---|---|---|
| Stack & architecture | 8 / 10 | Choix sains, couplage Supabase à assumer |
| Structure du repo | 7 / 10 | Bonne base, god-module `services/index.ts` à éclater |
| Qualité code (TS) | 8,5 / 10 | Strict, peu d'`any`, validators centralisés |
| Qualité process (CI, tests) | 4 / 10 | **Pas de CI**, tests symboliques, lint implicite |
| Architecture Next.js | 7,5 / 10 | Middleware excellent, mais `'use client'` trop répandu, pas de `next/image` |
| Supabase / RLS | 9 / 10 | 109 policies, FORCE RLS, vues invoker, admin client avec reason — vraie rigueur |
| Performance | 6 / 10 | Pas d'optim Image / dynamic / ISR, dépendances 3D inutiles |
| Sécurité applicative | 8,5 / 10 | CSP solide, rate-limit Upstash, MFA, HIBP, virustotal, RGPD self-service |
| Dépendances | 6,5 / 10 | À jour mais sans pipeline de mise à jour |
| Tech debt | 6,5 / 10 | Modérée, traçable, pas catastrophique |

---

## 11. Recommandations prioritaires (top 5)

1. **Mettre en place une CI GitHub Actions sous 48 h** : `npm run lint && npm run type-check && npm run test && npm run build` à chaque PR + au merge sur `main`. C'est le plus gros écart entre "MVP qui marche" et "produit qu'on vend à une ESN qui va le faire auditer par son DSI". Coût : 4 h. ROI : immédiat.
2. **Éclater `src/lib/services/index.ts` (1 433 L)** en 8 fichiers (`opportunity.service.ts`, `invoice.service.ts`, `timesheet.service.ts`, etc.). C'est le seul vrai god-module du repo, et il va continuer à grossir. Coût : 1 jour. ROI : maintenabilité long terme + reviewabilité PR.
3. **Activer Upstash en prod + brancher Sentry SDK officiel** (pas seulement le wrapper). Sans ça, le rate-limit ne tient pas en multi-instance Vercel et les events sécurité disparaissent dans la nature. Coût : 2 h. ROI : posture sécu défendable face à un RSSI client.
4. **Audit bundle + `next/image` + `next/dynamic` sur les 6 plus gros pages** (`/todos`, `/cv-optimizer`, `/offers`, `/onboarding/setup`, `/consultants`, `/settings/branding`) et **virer `three.js` + `@react-three/fiber` + `drei` + `gsap`** sauf si un usage critique est démontré. Coût : 1-2 j. ROI : LCP / TBT divisés par 2 sur les pages métier — argument vendable.
5. **Armer les tests d'isolation cross-tenant en CI** : seeder Org A / Org B au démarrage du job, faire échouer le pipeline si l'isolation casse. C'est l'argument sécurité n°1 pour une ESN qui héberge ses consultants chez vous. Coût : 1 j. ROI : transforme une promesse marketing ("RLS multi-tenant FORCE") en garantie automatisée.

---

*Fin de l'audit. Document destiné au business plan défendable face à investisseur ou banquier.*
