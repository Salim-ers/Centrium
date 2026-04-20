# QuadCore Platform

> **Plateforme métier pour ESN** — centralise consultants, CV, CRM commercial,
> CRA, facturation et alertes dans une seule app premium dark-mode.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![Stack](https://img.shields.io/badge/Supabase-Postgres-green) ![Stack](https://img.shields.io/badge/TypeScript-5-blue) ![Stack](https://img.shields.io/badge/Tailwind-3-cyan)

---

## ✨ Fonctionnalités

- **Dashboard** de pilotage avec KPIs en temps réel
- **CV Optimizer** — génération de CV QuadCore avec garde-fous anti-invention
- **3 templates CV premium** imprimables A4 (Standard / Dense / Executive)
- **Matching consultant ↔ mission** avec scoring automatique
- **CRM Kanban** — pipeline commercial drag & drop
- **Bibliothèque consultants** avec compétences, expériences structurées
- **Carnet de contacts** unifié (recruteurs, clients, ESN partenaires)
- **CRA & Facturation** — cycle complet de la prestation à l'encaissement
- **Centre d'alertes** — relances, échéances, consultants bientôt dispos
- **Multi-tenant** avec RLS Supabase + rôles (admin / BM / recruiter / finance)

---

## 🧱 Stack technique

- **Next.js 14** (App Router, React Server Components)
- **TypeScript 5** strict
- **Supabase** (Postgres + Auth + Storage + RLS + Realtime)
- **Tailwind CSS 3** + **shadcn/ui**
- **react-hook-form** + **zod** pour la validation
- **Framer Motion**, **lucide-react**, **recharts**, **sonner**
- **Vitest** (unit) + **Playwright** (E2E)

---

## 🚀 Démarrage rapide (5 minutes)

### Prérequis

```bash
node --version    # v18+
docker --version  # requis pour Supabase local
```

### Installation

```bash
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Installer les dépendances du projet
npm install

# 3. Copier .env.example en .env.local
cp .env.example .env.local

# 4. Démarrer Supabase local (Postgres + Studio sur http://localhost:54323)
npx supabase start
# → Copier l'API URL + anon key affichés dans .env.local

# 5. Appliquer les migrations + seed
npx supabase db reset
# → exécute 001_initial_schema.sql puis 002_rls_policies.sql puis seed.sql

# 6. Lancer le serveur de dev
npm run dev
# → http://localhost:3000
```

### Créer un utilisateur admin

1. Ouvrir Supabase Studio sur http://localhost:54323
2. Authentication → Add user → créer `admin@quadcore.fr` / `hunter2`
3. Table Editor → `profiles` → éditer le profil qui vient d'être auto-créé :
   - `organization_id` = `11111111-1111-1111-1111-111111111111`
   - `role` = `admin`

Se connecter sur http://localhost:3000/login avec ces identifiants.

---

## 🗂️ Arborescence du projet

```
quadcore-platform/
├── CLAUDE.md                          ← doc projet chargée par Claude Code
├── .mcp.json                          ← MCP servers (Supabase, GitHub)
├── .claude/                           ← config Claude Code
│   ├── settings.json                  ← permissions + hooks
│   ├── rules/                         ← code-style, testing, api-conventions
│   ├── commands/                      ← /review, /fix-issue
│   ├── skills/cv-generation/          ← règles absolues du moteur CV
│   ├── agents/                        ← code-reviewer, security-auditor
│   └── hooks/validate-bash.sh         ← bloque rm -rf, sudo, etc.
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     ← 25+ tables
│   │   └── 002_rls_policies.sql       ← RLS multi-tenant
│   └── seed/seed.sql                  ← données de démo réalistes
│
├── src/
│   ├── app/                           ← pages Next.js (App Router)
│   ├── components/
│   │   ├── ui/                        ← shadcn (Button, Card, Input, ...)
│   │   ├── layout/                    ← Sidebar, Header, AppShell
│   │   └── cv/                        ← 3 templates CV + renderer
│   ├── lib/
│   │   ├── supabase/                  ← clients browser/server/middleware
│   │   ├── services/                  ← logique métier (consultant, cv, ...)
│   │   ├── ai/cv-generator.ts         ← moteur CV avec garde-fous
│   │   ├── validators/                ← schémas zod
│   │   └── utils/
│   ├── hooks/
│   ├── types/
│   └── constants/
│
└── tests/
    ├── unit/                          ← Vitest
    └── e2e/                           ← Playwright
```

---

## 📋 Commandes

```bash
# Développement
npm run dev                 # Démarrer en local
npm run build               # Build production
npm run lint                # Linter
npm run type-check          # Vérif TypeScript

# Base de données
npx supabase start          # Démarrer Supabase local
npx supabase stop           # Arrêter
npx supabase db reset       # Reset + migrations + seed
npm run db:types            # Générer src/types/database.ts

# Tests
npm run test                # Tests unitaires Vitest
npm run test:watch          # Mode watch
npm run test:e2e            # Playwright E2E
```

---

## 🎨 Templates CV QuadCore

Trois variantes propriétaires pour couvrir tous les profils :

| Template | Cas d'usage | Particularités |
|----------|-------------|----------------|
| **Standard** | Profils confirmés (2-7 ans) | Équilibré, une page sobre, toutes sections |
| **Dense** | Seniors avec >4 expériences | 2 colonnes, sidebar sombre, tient en 2 pages |
| **Executive** | Directeurs, leads, architectes | Résumé exécutif proéminent, impact visuel |

Tous les templates sont en **React + CSS**, imprimables A4 via `window.print()`,
avec une feuille de style print dédiée dans `src/app/globals.css`.

**Preview** : http://localhost:3000/templates

---

## 🛡️ Garde-fous du moteur CV

Le moteur (`src/lib/ai/cv-generator.ts`) ne doit **JAMAIS** :

- Inventer une expérience, un client, une certification, une langue, une compétence
- Modifier des dates ou un niveau d'expérience
- Extrapoler au-delà du CV source

Le système exécute un **audit automatique** (`auditNoInvention`) qui compare le
CV généré au CV source et signale toute invention dans `guardrails.flaggedClaims`.

**Tests** : `npm run test` — la suite vérifie que l'invention est détectée.

---

## 👥 Rôles & permissions (RLS)

| Rôle | Permissions |
|------|-------------|
| `admin` | Tout |
| `business_manager` | Consultants, offres, opportunités, CV, matching |
| `recruiter` | Consultants, CV, matching, contacts |
| `finance` | CRA, factures, paiements |
| `viewer` | Lecture seule |

Les policies RLS garantissent l'isolation par `organization_id` — aucune donnée
ne peut fuiter entre organisations, ce qui rend la plateforme **prête pour le SaaS
multi-tenant** dès le MVP.

---

## 🤖 Utilisation avec Claude Code

Le projet est entièrement configuré pour être développé avec
[Claude Code](https://claude.com/product/claude-code) :

```bash
# Installer Claude Code
npm install -g @anthropic-ai/claude-code

# Lancer depuis la racine du projet
cd quadcore-platform
claude
```

Au démarrage, Claude Code lit automatiquement :

- `CLAUDE.md` — vision produit, stack, conventions
- `.claude/rules/*.md` — règles de style, tests, API
- `.claude/skills/cv-generation/SKILL.md` — règles absolues du moteur CV
- `.mcp.json` — connecte Supabase et GitHub
- `.claude/settings.json` — permissions, hooks anti-dangereux

Exemple d'utilisation :

> *« Finis la page /consultants/[id] qui affiche la fiche détaillée,
>    en respectant les conventions du projet. »*

Claude Code utilise les services existants et respecte toutes les règles.

---

## 🌐 Déploiement en production

### Vercel + Supabase Cloud (recommandé)

1. Créer un projet sur [Supabase Cloud](https://supabase.com) (gratuit pour commencer)
2. Appliquer les migrations : `npx supabase db push`
3. Copier l'URL + anon key dans les variables d'environnement Vercel
4. Connecter le repo GitHub à Vercel, déployer
5. Pointer `app.quadcore.fr` sur Vercel

### Coût indicatif pour démarrer

- **Vercel** : gratuit jusqu'à ~100 GB bande passante
- **Supabase** : gratuit jusqu'à 500 MB DB + 1 GB stockage
- **Domaine** : ~15€/an

Total : **0 € pour les 3 premiers mois**, puis ~25 €/mois pour le Supabase Pro.

---

## 💰 Mode SaaS — louer la plateforme

Le schéma est **multi-tenant dès le départ** via `organizations` + RLS. Pour
transformer en SaaS vendable :

1. **Onboarding** : ajouter une page `/signup` qui crée `organization` + user admin
2. **Stripe** : intégrer Stripe Checkout + webhook pour gérer les abonnements
3. **Quotas** : ajouter `plan_limits` à `organizations` (nb consultants max, etc.)
4. **White-label** : utiliser `organizations.logo_url` + thème par tenant

Paliers suggérés :

| Plan | Cible | Prix |
|------|-------|------|
| **Starter** | 1-3 users, 10 consultants | 49 €/mois |
| **Pro** | 5-15 users, 100 consultants | 149 €/mois |
| **Enterprise** | Illimité + SSO + support | 499 €/mois + |

---

## 🤝 Collaboration en équipe

1. Push le repo sur GitHub
2. Chaque collaborateur :
   ```bash
   git clone <repo>
   cd quadcore-platform
   npm install
   cp .env.example .env.local
   npx supabase start
   npx supabase db reset
   npm run dev
   ```
3. Workflow : branches `feat/*`, PR avec review, `/review` slash command via Claude Code
4. Les règles du dossier `.claude/` sont partagées automatiquement — tout le monde
   suit les mêmes conventions

---

## 📝 Roadmap

### MVP (livré ici)
- [x] Auth + RLS multi-tenant
- [x] CRUD consultants, contacts, opportunités
- [x] CV Optimizer avec moteur mock + garde-fous
- [x] 3 templates CV QuadCore premium
- [x] CRM Kanban
- [x] CRA + facturation
- [x] Dashboard KPIs
- [x] Centre d'alertes

### V1 (post-MVP)
- [ ] Intégration Claude API pour CV Optimizer (voir `cv-generator.ts` — code commenté prêt)
- [ ] Export PDF serveur (Puppeteer) pour CV sans impression navigateur
- [ ] Sync email (IMAP/Gmail/Outlook)
- [ ] Signature électronique des contrats
- [ ] Mode SaaS complet (onboarding + Stripe)
- [ ] App mobile (React Native + partage de logique)

---

## 📄 License

Propriétaire — QuadCore SAS — tous droits réservés.

---

## 🆘 Support

- Documentation : `/CLAUDE.md` (pour Claude Code) + ce README
- Issues : GitHub Issues du repo
- Email : contact@quadcore.fr
