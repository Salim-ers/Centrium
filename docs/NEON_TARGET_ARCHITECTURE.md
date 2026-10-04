# Architecture cible — Centrium sur Neon

> Phase 2 du chantier « Migration backend Supabase → Neon ». S'appuie sur
> l'inventaire [`SUPABASE_AUDIT.md`](./SUPABASE_AUDIT.md). Rien n'est encore
> migré : ce document fixe la cible, le plan et **les décisions à prendre avant
> de toucher à un environnement**.

## 1. Principes non négociables

1. **Aucune donnée perdue** : export complet, comptages comparés table par table
   et fichier par fichier avant toute bascule.
2. **Aucune régression de sécurité** : isolation des organisations, permissions
   par rôle, double authentification des administrateurs, documents privés.
3. **Staging d'abord**, production ensuite, Supabase conservé intact jusqu'à
   votre validation explicite.
4. **L'organisation vient de la session**, jamais d'un paramètre envoyé par le
   navigateur.

## 2. Chaîne d'une requête

```
Interface → Server Action / Route handler
          → Auth (session Better Auth)
          → Organisation (membership de la session)
          → Permission (RBAC existant : lib/auth/permissions)
          → Service (règles métier)
          → Repository (seul code qui parle à la base)
          → Neon Postgres  (transaction : SET LOCAL app.user_id, app.organization_id)
```

- **Plus aucune requête directe du navigateur vers la base.** Les 86 fichiers
  qui utilisent le client Supabase navigateur passeront par des routes ou des
  server actions.
- **La RLS reste en place, en défense en profondeur.** Les politiques
  n'utiliseront plus `auth.uid()` mais `app.current_user_id()` et
  `app.current_organization_id()`, lus depuis `current_setting(..., true)`,
  posés par le repository au début de chaque transaction. L'application se
  connecte avec un rôle **sans** `BYPASSRLS` et non propriétaire des tables.
- Un second rôle, réservé aux tâches système (webhook Stripe, crons, super
  console), contourne la RLS ; il n'est utilisable que depuis ces chemins.

## 3. Composants

| Besoin | Cible | Remarques |
|---|---|---|
| Base | **Neon Postgres**, région AWS Europe (Francfort, `aws-eu-central-1`) | Branches : `main` (prod), `staging`, une branche par PR pour les tests |
| Accès | `@neondatabase/serverless` (pool) depuis les fonctions Vercel | Connexion poolée pour l'app, directe pour les migrations |
| Requêtes typées | **Drizzle**, limité aux repositories | Schéma introspecté depuis la base ; les migrations SQL restent la source de vérité |
| Comptes | **Better Auth** (voir décision D1) | Données d'identité dans la base Neon |
| Fichiers | **Neon Object Storage** (API S3, buckets privés, liens présignés) | Disponible à Francfort ; annoncé en bêta par Neon — à confirmer au moment du go |
| Temps réel | Actualisation à intervalle et au retour sur l'onglet | Présence et curseurs partagés retirés (voir D3) |
| Serveur | Next.js sur Vercel, région **fra1** | À côté de la base |
| Paiement | Stripe, inchangé | Webhook déjà vérifié par signature ; identifiants migrés avec les données |
| Emails d'auth | Envoyés par l'application (Resend / Brevo) | Aujourd'hui envoyés par Supabase ; modèles à reprendre |

### StorageService

Une seule porte d'entrée pour les fichiers :

- `upload(org, key, body, meta)` : contrôle du type réel et de la taille,
  écriture, puis ligne `documents` et compteur dans **la même transaction** ;
- `getUrl(org, key)` : lien présigné de courte durée (60 s comme aujourd'hui),
  délivré après contrôle des droits ;
- `download`, `delete`, `getUsage(org)`.

Chaque organisation porte `storage_used_bytes` et `storage_limit_bytes`
(limite par offre) ; un dépôt qui dépasse la limite est refusé avant écriture.
La **signature de l'organisation** quitte le stockage public (constat de
l'audit) pour un bucket privé.

## 4. Plan de migration des données

1. **Gel** : fenêtre de maintenance annoncée, application en lecture seule.
2. **Export Supabase** : `pg_dump` des schémas applicatifs (hors `auth`,
   `storage`, schémas internes Supabase), export des utilisateurs, inventaire
   des objets de chaque bucket.
3. **Import Neon (staging d'abord)** : rejouer les migrations, charger les
   données, convertir `auth.users` vers les tables Better Auth **en conservant
   les mêmes UUID** (aucune clé étrangère à réécrire), copier les fichiers en
   conservant les clés.
4. **Contrôles** : comptage de chaque table et de chaque bucket des deux côtés,
   sommes de contrôle sur un échantillon de fichiers, tests RLS multi-organisations
   (au moins 15 ESN fictives), parcours E2E.
5. **Bascule** derrière un drapeau temporaire (`DATA_BACKEND=neon`), retour
   arrière possible tant que Supabase n'est pas supprimé.

Le plan de retour arrière détaillé sera rédigé en phase 15
(`MIGRATION_ROLLBACK.md`).

## 5. Décisions à prendre (avant la phase 3)

### D1 — Comptes : Managed Better Auth ou Better Auth auto-hébergé ?

Constats tirés de la documentation Neon (octobre 2026) :

- Managed Better Auth **n'importe pas les mots de passe Supabase** : « Existing
  password-based users cannot migrate due to different hashing algorithms ».
  Tous les utilisateurs devraient réinitialiser leur mot de passe.
- La **double authentification** figure encore **sur la feuille de route** de
  Managed Better Auth. Centrium l'impose aujourd'hui aux administrateurs : ce
  serait une régression de sécurité, et la page Sécurité deviendrait fausse.

| | A. Managed Better Auth (Neon Auth) | B. Better Auth auto-hébergé, sur Neon |
|---|---|---|
| Fournisseur | Neon | Aucun (bibliothèque open source, données dans votre base Neon) |
| Mots de passe existants | Perdus → réinitialisation forcée pour tous | **Conservés** (vérification bcrypt personnalisée, documentée par Better Auth) |
| TOTP administrateurs | **Indisponible** aujourd'hui | Disponible (plugin `twoFactor`), réinscription TOTP une fois |
| Organisations, rôles | Plugin partiel | Plugin complet + RBAC Centrium existant |
| Maintenance | Faible | Mises à jour de la bibliothèque à suivre |

**Recommandation : B maintenant**, avec un passage à A quand Neon livrera la
MFA. Les deux reposent sur Better Auth : le code applicatif reste le même.

### D2 — Région

Francfort (`aws-eu-central-1`) pour la base et les fichiers, Vercel en `fra1`.
Les données restent dans l'Union européenne, mais **passent de la Suède à
l'Allemagne** : la page Sécurité, la page Sous-traitants et `llms.txt` seront
mis à jour au moment de la bascule.

### D3 — Temps réel

Proposition : actualisation des listes au retour sur l'onglet et toutes les
30 s sur les écrans de suivi ; notifications en actualisation périodique ;
**retrait de la présence et des curseurs partagés**.

### D4 — Accès nécessaires

- Projet Neon (organisation, facturation) avec une branche `staging` ; chaînes
  de connexion poolée et directe ; identifiants Object Storage. Elles se
  placent dans les variables d'environnement Vercel et `.env.local`,
  **jamais dans Git**.
- **Réactivation des projets Supabase** (en pause) pour l'export : décision et
  coût à valider par vous.

### D5 — Fenêtre de bascule

Durée de gel acceptable et message aux clients (une réinscription TOTP des
administrateurs avec B ; une réinitialisation de mot de passe pour tous avec A).

## 6. Enchaînement des phases (après vos décisions)

| Phase | Contenu | Validation |
|---|---|---|
| 3 | Branche Neon `staging`, rôles, connexion | Connexion depuis une preview Vercel |
| 4 | Schéma : migrations rejouées, RLS réécrite (`app.current_*`) | `db:check` adapté + tests RLS |
| 5 | Données : export / import / comptages | Rapport de comptages identiques |
| 6 | Auth Better Auth, emails, TOTP | Connexion, reset, invitation, MFA admin |
| 7 | RBAC / RLS | Tests A/B sur 15 organisations |
| 8 | StorageService + copie des fichiers | Comptages et sommes de contrôle |
| 9–11 | Services, tableau de bord, portails sur les repositories | Parcours E2E |
| 12 | Stripe (webhook, portail, checkout) | Paiement test de bout en bout |
| 13 | Tests complets | CI verte |
| 14 | Bascule production | Votre go explicite |
| 15 | Rapport (`NEON_MIGRATION_REPORT.md`), retour arrière (`MIGRATION_ROLLBACK.md`) | Supabase conservé jusqu'à votre validation |
