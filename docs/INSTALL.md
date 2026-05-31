# Installation locale

## Pré-requis

- **Node.js** 18.17+ (recommandé : 20 LTS)
- **npm** 9+ (ou pnpm/bun équivalent)
- **Supabase CLI** : `npm install -g supabase` (ou via Homebrew/Scoop)
- **Git** 2.30+
- (Optionnel) **Docker Desktop** pour Supabase local en mode containers

## 1. Cloner le repo

```bash
git clone https://github.com/Salim-ers/quadcore-platform.git
cd quadcore-platform
npm install
```

## 2. Variables d'environnement

Copier le template et compléter :

```bash
cp .env.example .env.local
```

Variables minimales :

| Clé | Valeur | Où la trouver |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase | Dashboard Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (publique) | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (secret serveur) | idem |
| `ANTHROPIC_API_KEY` | Clé Claude API | console.anthropic.com |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (optionnel MVP) | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe | dashboard.stripe.com |

> ⚠️ **Ne JAMAIS commiter `.env.local`**. Le `.env.example` est commité,
> la vraie valeur ne l'est pas.

## 3. Supabase

### Option A — Local (recommandé pour dev)

```bash
npx supabase start
npx supabase db reset      # rejoue migrations + seed
npx supabase gen types typescript --local > src/types/database.ts
```

### Option B — Remote (Supabase Cloud)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push       # pousse les migrations
```

## 4. Lancer le dev server

```bash
npm run dev
```

L'app est accessible sur [http://localhost:3000](http://localhost:3000).

- Landing publique : `/`
- Auth : `/login`, `/signup`
- App : `/dashboard` (après login + onboarding)
- Admin (super_admin) : `/admin/clients`, `/admin/audit`

## 5. Comptes de test (seed)

Le fichier `supabase/seed/seed.sql` provisionne des comptes de démo. Voir
le fichier pour les identifiants.

## 6. Commandes utiles

```bash
npm run dev           # serveur Next dev
npm run build         # build production
npm run start         # serveur production local
npm run type-check    # vérification TypeScript
npm run test          # tests Vitest
npm run test:e2e      # tests Playwright

npx supabase db reset      # reset DB locale
npx supabase migration new # nouvelle migration
```

## Dépannage

| Symptôme | Solution |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY manquante` | Vérifier `.env.local` (côté serveur uniquement) |
| Redirection en boucle vers `/onboarding` | Cookie `qc_profile` expiré ou orga manquante — `/api/auth/logout` puis re-login |
| Type errors sur tables DB | Régénérer les types : `npx supabase gen types typescript --local > src/types/database.ts` |
| Build qui plante sur `framer-motion` ou `gsap` | `npm install` après pull |
