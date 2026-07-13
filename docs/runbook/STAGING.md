# Environnement de staging — Centrium

> Demande de l'équipe QA (Hasan) : « un environnement propre aux tests pour qu'on
> puisse tous tester dessus — actuellement on teste en production ».
> Le staging est une copie de Centrium branchée sur une **base séparée** : on y
> casse ce qu'on veut, la prod et ses clients ne voient rien.

---

## Architecture

| Brique | Production | Staging |
|---|---|---|
| Base Supabase | `actpzvkorgxkgwutwaud` (Centrium Project) | `uedmmqkkqgtuncexfjcq` (**centrium-staging**, Stockholm) |
| Déploiement Vercel | branche `main` → centrium-platform.com | branche **`staging`** → URL de preview Vercel |
| Données | Vraies données clients | Données de démo, réinitialisables |
| Schéma | migrations 001→093 | **mêmes migrations, rejouées à l'identique** |

## Ce qui est déjà fait (automatisé)

- [x] Projet Supabase `centrium-staging` créé (région `eu-north-1`, comme la prod).
- [x] Les 95 migrations du repo rejouées sur le staging.
- [x] URL + clé anon récupérées (ci-dessous).

## ⚠️ À faire par Salim AVANT d'utiliser la branche `staging` (une fois, ~3 min)

Sans cette étape, les déploiements de la branche `staging` utiliseraient les
variables Preview par défaut → **la base de PROD**. C'est exactement ce qu'on
veut éviter.

Dans **Vercel → Project → Settings → Environment Variables**, ajouter ces
variables avec l'environnement **Preview** restreint à la branche **`staging`**
(champ « Branch » lors de l'ajout) :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uedmmqkkqgtuncexfjcq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZG1tcWtrcWd0dW5jZXhmamNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTY0NjQsImV4cCI6MjA5OTUzMjQ2NH0.f-O6wjYcel9cDdAVCwZbOmCZ0blHQ-TD_q230omLaIQ` |
| `SUPABASE_SERVICE_ROLE_KEY` | À copier depuis [le dashboard staging](https://supabase.com/dashboard/project/uedmmqkkqgtuncexfjcq/settings/api) → « service_role » (⚠️ secret, jamais commité) |
| `NEXT_PUBLIC_APP_URL` | l'URL de preview de la branche staging (ex. `https://centrium-git-staging-<team>.vercel.app`) — ajustable après le 1er déploiement |

Optionnel (pour tester paiement/emails/IA sur staging) :

| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clés Stripe **TEST** (`sk_test_…` / `pk_test_…`) — jamais les clés live |
| `RESEND_API_KEY` | Peut rester vide : sans clé, les emails sont loggés au lieu d'être envoyés (comportement dev-friendly de `send.ts`) |
| `ANTHROPIC_API_KEY` | La même qu'en prod si on veut tester le CV Optimizer |
| `CRON_SECRET`, `FOUNDER_EMAILS`, etc. | Reprendre les valeurs prod si besoin des fonctionnalités associées |

Puis prévenir (moi/Claude) pour pousser la branche `staging` — ou la créer
manuellement : `git checkout -b staging && git push origin staging`.

## Utilisation quotidienne (équipe)

- **URL de test** : celle du déploiement Vercel de la branche `staging`.
- **Compte de test** : voir la section Seed ci-dessous (ou créer un compte via
  `/essai` si les clés Stripe TEST sont configurées).
- **Tout casser est permis** : la base staging peut être réinitialisée à la
  demande (reset + re-migrations + re-seed).
- **Workflow d'évolution** : les correctifs risqués se mergent d'abord dans
  `staging`, l'équipe valide, puis on merge dans `main` (prod).

## Seed de démo (déjà injecté)

- **Organisation** : « ESN Démo » (plan Medium, abonnement **exempté de
  facturation** → aucun Stripe requis pour se connecter).
- **Compte admin de test** : `admin@centrium-staging.test` / `Staging-2026!`
  (⚠️ compte de staging uniquement, données fictives).
- **Données** : 4 consultants (QA, Fullstack, Data, DevOps), 1 société cliente,
  2 contacts, 1 offre ouverte.
- Comptes supplémentaires pour l'équipe : dashboard Supabase staging →
  Auth → « Add user » (ou inscription classique).

### Réparations appliquées au replay (drift connu)

91/94 migrations sont passées telles quelles. 3 réparations documentées :
- `060` ré-appliquée après `084` (l'index sur `activities.user_id` dépendait
  d'une colonne ajoutée plus tard — quirk d'ordre, prod avait le même historique).
- `062_archive_purge` remplacée par **la définition réelle de la prod**
  (colonnes `archived_at` sur 7 tables + trigger `sync_archived_at` + vue
  `_archives_to_purge` + fonction de purge avec `actor_id`/`metadata`) — le
  fichier 062 du repo n'a jamais été applicable (drift historique).
- `064` ré-appliquée (dépendait des deux précédentes).

## Limites connues du staging

- **Auth email** : sans SMTP custom, Supabase envoie via son mailer intégré
  (limité à ~4 emails/heure) — suffisant pour créer les comptes de l'équipe.
- **Webhooks Stripe** : nécessitent un endpoint de webhook TEST distinct dans
  le dashboard Stripe si on veut tester le billing de bout en bout.
- **Crons Vercel** (alertes, purge) : ne tournent que sur la prod ; sur
  staging, déclencher manuellement via les routes `/api/cron/*` avec le
  `CRON_SECRET` staging.

---
*Créé le 13 juillet 2026 — projet staging : `uedmmqkkqgtuncexfjcq` (10 $/mois, org QuadCore).*
