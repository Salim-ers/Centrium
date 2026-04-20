# QuadCore Platform — Documentation Claude Code

> Ce fichier est chargé automatiquement au démarrage de toute session Claude Code.
> Il contient les conventions, l'architecture et les commandes du projet.

---

## 1. Vue d'ensemble produit

**QuadCore Platform** est une plateforme métier SaaS B2B pour ESN (Entreprises de Services du Numérique). Elle centralise :

- Gestion des consultants (bibliothèque, CV, disponibilité)
- Optimisation CV par IA (template QuadCore propriétaire)
- Matching consultant ↔ mission
- Réponse aux appels d'offres
- CRM commercial (pipeline, opportunités)
- Carnet de contacts (recruteurs, clients, ESN partenaires)
- Comptes rendus d'activité (CRA) et facturation
- Centre d'alertes intelligent
- Dashboard de pilotage

---

## 2. Stack technique

### Frontend
- **Next.js 14** (App Router)
- **React 18** + **TypeScript 5**
- **Tailwind CSS 3** + **shadcn/ui**
- **lucide-react** (icônes)
- **Framer Motion** (animations)
- **react-hook-form** + **zod** (formulaires + validation)
- **recharts** (graphiques)
- **@react-pdf/renderer** ou `react-to-print` (export PDF)

### Backend
- **Supabase** (Postgres + Auth + Storage + Realtime + RLS)
- Edge Functions pour logique serveur

### Qualité
- **ESLint** + **Prettier**
- **Vitest** (tests unitaires)
- **Playwright** (tests E2E)

---

## 3. Architecture des dossiers

```
quadcore-platform/
├── .claude/              → Config Claude Code (rules, skills, agents)
├── supabase/             → Schéma SQL, migrations, seed
├── src/
│   ├── app/              → Pages Next.js (App Router)
│   ├── components/       → Composants React réutilisables
│   │   ├── ui/           → Composants shadcn/ui (Button, Card, etc.)
│   │   ├── layout/       → Sidebar, Header, Shell
│   │   ├── cv/           → Templates CV, éditeurs
│   │   ├── consultants/  → Fiches, formulaires
│   │   ├── crm/          → Kanban, pipeline
│   │   ├── dashboard/    → Widgets, KPIs
│   │   └── forms/        → Form generators
│   ├── lib/
│   │   ├── supabase/     → Clients (browser, server, admin)
│   │   ├── services/     → Logique métier (consultant.service, cv.service, …)
│   │   ├── validators/   → Schémas zod
│   │   ├── ai/           → Mock AI + interfaces pour LLM futur
│   │   └── utils/        → Helpers
│   ├── hooks/            → React hooks (useConsultants, useAuth, …)
│   ├── types/            → Types TS (Consultant, Mission, Invoice, …)
│   └── constants/        → Statuts, enums, labels
└── tests/
```

---

## 4. Conventions de code

- **TypeScript strict** — pas de `any` sauf exception documentée
- **Composants fonctionnels uniquement** (pas de class components)
- **Nommage** : PascalCase pour composants, camelCase pour fonctions, kebab-case pour fichiers de route
- **Imports** : absolus via alias `@/*`
- **Un composant par fichier** sauf petits sous-composants privés
- **Server Components par défaut** ; `'use client'` uniquement si nécessaire
- **Validation zod sur tous les formulaires** avant insertion DB

---

## 5. Modèle de données (résumé)

Tables principales Supabase :

- `profiles` (users étendus)
- `consultants` + `consultant_skills` + `consultant_documents`
- `cv_versions` + `cv_templates`
- `clients`, `companies`, `contacts`, `contact_tags`, `tags`
- `opportunities` + `opportunity_consultants`
- `job_offers`, `missions`
- `timesheets` + `timesheet_days`
- `invoices` + `invoice_items`
- `messages`, `alerts`, `activities`, `notes`

Rôles : `admin`, `business_manager`, `recruiter`, `finance`

---

## 6. Commandes utiles

```bash
# Dev
npm run dev                  # Démarrer en local (http://localhost:3000)
npm run build                # Build production
npm run lint                 # Linter
npm run type-check           # Vérif TS

# Supabase
npx supabase start           # Démarrer Supabase local
npx supabase db reset        # Reset DB + replay migrations + seed
npx supabase migration new   # Nouvelle migration
npx supabase gen types typescript --local > src/types/database.ts

# Tests
npm run test                 # Vitest
npm run test:e2e             # Playwright
```

---

## 7. Workflow Git

- Branche principale : `main`
- Branches : `feat/…`, `fix/…`, `chore/…`, `refactor/…`
- Commits conventionnels : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- PR obligatoire avec review avant merge

---

## 8. Sécurité

- **Jamais de secrets en clair dans le code** — `.env.local` uniquement, `.env.example` commité
- **RLS activé sur toutes les tables** Supabase
- **Service role key** utilisée uniquement côté serveur (Edge Functions / Route Handlers)
- Sanitize toute entrée utilisateur (zod)
- **Aucune donnée consultant ne doit fuiter entre organisations** (multi-tenant via `organization_id`)

---

## 9. Contraintes métier absolues (CV Optimizer)

Le moteur CV ne doit **JAMAIS** :
- Inventer une expérience, un client, une certification, une langue
- Modifier des dates ou un niveau d'expérience
- Ajouter une compétence absente du CV source

Le moteur peut :
- Reformuler, réorganiser, prioriser, densifier
- Aligner le wording avec l'offre client
- Produire un résumé commercial à partir des éléments réels

Voir `.claude/skills/cv-generation/SKILL.md` pour les règles détaillées.

---

## 10. Roadmap MVP → V1

**MVP (ce livrable)**
- Auth + RLS
- CRUD consultants, contacts, opportunités
- CV Optimizer (mode mock AI)
- Template CV QuadCore (3 variantes)
- CRA + facturation de base
- Dashboard KPIs
- Alertes

**V1 (post-MVP)**
- Intégration LLM réelle (Claude API) pour CV Optimizer
- Sync email (IMAP/Gmail/Outlook)
- Signature électronique des contrats
- Multi-tenant complet (mode SaaS)
- App mobile (React Native)
