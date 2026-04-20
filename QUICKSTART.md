# 🚀 QuadCore Platform — Installation express

## 1. Prérequis (5 min)

```bash
node --version    # v18+ requis
docker --version  # requis pour Supabase local
npm i -g supabase
```

## 2. Installation (2 min)

```bash
# Depuis le dossier quadcore-platform/
npm install
cp .env.example .env.local
```

## 3. Base de données (2 min)

```bash
# Démarrer Supabase local
npx supabase start
```

Dans la sortie, **copier dans `.env.local`** :
- `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

```bash
# Appliquer migrations + seed
npx supabase db reset
```

## 4. Créer un utilisateur admin (1 min)

Aller sur http://localhost:54323 (Supabase Studio), puis :

1. **Authentication** → **Add user** → `admin@quadcore.fr` / `hunter2`
2. **Table Editor** → **profiles** → éditer le profil nouvellement créé :
   - `organization_id` = `11111111-1111-1111-1111-111111111111`
   - `role` = `admin`

## 5. Lancer la plateforme

```bash
npm run dev
```

→ Ouvrir **http://localhost:3000**

Se connecter avec `admin@quadcore.fr` / `hunter2`.

---

## 🧪 Lancer les tests

```bash
npm run test          # Tests unitaires Vitest
npm run test:e2e      # Tests E2E Playwright
```

---

## 🐛 Problèmes fréquents

**"supabase: command not found"**
→ `npm install -g supabase`

**"Error: connect ECONNREFUSED" au démarrage**
→ Docker n'est pas lancé. Démarre Docker Desktop puis `npx supabase start`.

**Login ne marche pas**
→ Vérifier que le profil a bien `organization_id` + `role` renseignés dans Supabase Studio.

**"Module not found: @/lib/..."**
→ Tu as lancé la commande depuis un mauvais dossier. Assure-toi d'être dans `quadcore-platform/`.

---

## 📖 Pour aller plus loin

- **README.md** — documentation complète
- **CLAUDE.md** — conventions & architecture (chargé par Claude Code)
- **.claude/skills/cv-generation/SKILL.md** — règles absolues du moteur CV

---

## 🤖 Utiliser Claude Code pour finir le projet

```bash
npm install -g @anthropic-ai/claude-code
cd quadcore-platform
claude
```

Exemples de prompts :

- *« Ajoute la page /consultants/[id] qui affiche la fiche détaillée avec onglets Infos / Compétences / Expériences / CV générés. »*
- *« Crée un formulaire de création de consultant avec react-hook-form + zod dans src/components/consultants/. »*
- *« Ajoute l'export PDF server-side via Puppeteer pour les CV générés. »*
- *« Connecte le vrai Claude API dans cv-generator.ts en décommentant le hook LLM. »*

Claude Code connaît déjà :
- La structure du projet (via CLAUDE.md)
- Les conventions (via .claude/rules/)
- Les règles du moteur CV (via .claude/skills/)
- Le schéma Supabase (via .mcp.json)
