# Déploiement Centrium

## Stack recommandée

| Composant | Service | Région |
|---|---|---|
| Application Next.js | **Vercel** | global edge (origin EU) |
| Base de données + Auth + Storage | **Supabase** | Europe (eu-central-1 / eu-west-2) |
| Emails transactionnels | **Resend** ou **Postmark** | EU |
| Monitoring erreurs | **Sentry** | EU |
| Status page | **Better Stack** ou auto-hébergé | — |
| Paiements (optionnel) | **Stripe** | Irlande |

## Environnements

| Env | URL | Branche Git | Données |
|---|---|---|---|
| `dev` | localhost:3000 | feature/* | Supabase local |
| `preview` | *.vercel.app | PR | Supabase projet `preview` |
| `staging` | staging.centrium-platform.com | `main` | Supabase projet `staging` |
| `prod` | app.centrium-platform.com | `main` (tag release) | Supabase projet `prod` |

## Variables d'environnement (production)

Configurer dans Vercel Project Settings → Environment Variables :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # SECRET — server only

ANTHROPIC_API_KEY=sk-ant-...            # CV Optimizer V1

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

RESEND_API_KEY=re_...                   # ou POSTMARK_TOKEN
RESEND_FROM=hello@centrium-platform.com

SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...

NEXT_PUBLIC_SITE_URL=https://app.centrium-platform.com
```

## Process de déploiement

### Première mise en production

1. **Provisionner Supabase**
   - Créer projet sur supabase.com, région EU
   - Noter URL + anon key + service role key
   - Activer Email Auth + Magic Link
   - Configurer SMTP custom si nécessaire (sinon Supabase par défaut)

2. **Jouer les migrations**
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. **Seed minimal**
   - Créer le premier super_admin manuellement via SQL
   - Créer une organisation de démo si besoin

4. **Configurer Stripe** (si pricing actif)
   - Créer les produits/plans correspondant à `plans` table
   - Configurer webhook `https://app.centrium-platform.com/api/billing/webhook`
   - Copier le webhook secret

5. **Déployer sur Vercel**
   - Connecter le repo GitHub
   - Renseigner les env vars
   - Déclencher le premier deploy
   - Vérifier le build (`next build`)

6. **DNS**
   - Pointer `app.centrium-platform.com` vers Vercel
   - Vérifier le certificat TLS
   - Configurer `www.` redirect → `app.`

### Déploiements suivants

- `main` push → Vercel build automatique → preview URL
- Promote manuel ou automatique vers prod selon politique
- Migrations DB : revue obligatoire en PR + `supabase db push` manuel

## Sécurité production

- [ ] Service role key **jamais** côté client (audit grep)
- [ ] RLS activée sur **toutes** les tables (audit `supabase/migrations`)
- [ ] HTTPS strict (HSTS header)
- [ ] CSP headers configurés (`next.config.js`)
- [ ] Rate limiting actif sur routes publiques (à migrer vers Upstash)
- [ ] Logs Supabase + Vercel surveillés
- [ ] Sentry actif avec alerting

## Monitoring

- **Uptime** : Better Stack / UptimeRobot → ping `/`
- **Erreurs** : Sentry → seuil P95 / occurrences
- **Performance** : Vercel Analytics + Web Vitals
- **DB** : dashboard Supabase → slow queries, connection count

## Sauvegardes

- Supabase Pro : PITR (Point-in-Time Recovery) 7-14 jours selon plan
- Export quotidien `pg_dump` chiffré vers stockage EU (à mettre en place)
- Test de restauration trimestriel

## Rollback

- Vercel : « Promote previous deployment » en 30 secondes
- DB : restauration PITR depuis dashboard Supabase
- Toujours déployer un revert plutôt que rollback en cas de DB schema
  modifiée

Voir [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) pour la checklist
complète avant chaque mise en prod majeure.
