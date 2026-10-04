# Audit Supabase — inventaire avant migration vers Neon

> Phase 1 du chantier « Migration backend Supabase → Neon ». Ce document décrit
> **tout ce qui dépend de Supabase aujourd'hui**, tel que le code du dépôt le
> montre (branche `feat/refonte-premium`, 4 octobre 2026). Aucune modification
> du backend n'a été faite pour l'établir.

## 0. Ce que cet audit ne couvre pas (à mesurer sur l'environnement réel)

- **Volumétrie** : les projets Supabase de production (`actpzvkorgxkgwutwaud`,
  eu-north-1) et de staging (`uedmmqkkqgtuncexfjcq`) sont **en pause**. Aucun
  comptage de lignes, de fichiers ou d'utilisateurs n'a pu être fait. Il faudra
  le faire après réactivation, table par table, avant et après migration.
- **Migrations réellement appliquées** : le dépôt contient 106 fichiers de
  migration ; **095 à 104 ne sont appliquées sur aucun environnement**. La
  base de production est donc en retard sur le code.
- **Sauvegardes** : aucune sauvegarde n'a été réalisée ni vérifiée dans le cadre
  de cet audit (pas d'accès aux projets en pause).

## 1. Clients Supabase utilisés par l'application

| Client | Fichier | Fichiers qui l'importent | Portée |
|---|---|---|---|
| Navigateur (`anon` + session) | `src/lib/supabase/client.ts` | 86 | Lectures/écritures directes depuis l'interface, **protégées par la RLS** |
| Serveur (session par cookies) | `src/lib/supabase/server.ts` | 30 | Route handlers et pages serveur, sous la session de l'utilisateur (RLS) |
| Admin (`service_role`) | `src/lib/supabase/admin.ts` | 93 | Opérations serveur qui **contournent la RLS** (audit, invitations, portails, webhooks, crons, super console…) |
| Middleware (`@supabase/ssr`) | `src/lib/supabase/middleware.ts` | 1 | Rafraîchit la session à chaque requête, routage par rôle, gating abonnement |

Conséquence clé : **une grande partie de l'isolation des organisations repose
sur la RLS de Postgres**, appliquée parce que le navigateur interroge la base
directement (client `anon` + JWT Supabase). Côté serveur, les 93 fichiers
`service_role` appliquent leurs propres contrôles (`apiPermission`,
`requireOrg`, filtres `organization_id` dérivés de la session).

## 2. Authentification (Supabase Auth / GoTrue)

Appels relevés dans `src/` :

| Appel | Occurrences | Usage |
|---|---|---|
| `auth.getUser()` | 28 | Vérification de session côté serveur (guards, routes, middleware) |
| `auth.getSession()` / `onAuthStateChange` / `setSession` / `refreshSession` | 5 | Contexte d'organisation côté navigateur, liens email |
| `auth.signInWithPassword()` | 1 | Connexion email + mot de passe |
| `auth.signInWithOtp()` / `verifyOtp()` | 3 | Lien magique / code |
| `auth.resetPasswordForEmail()` / `updateUser()` | 4 | Mot de passe oublié, changement de mot de passe |
| `auth.exchangeCodeForSession()` | 1 | Retour de lien email (`/auth/callback`) |
| `auth.signOut()` | 2 | Déconnexion |
| `auth.mfa.*` (enroll, challenge, verify, unenroll, listFactors, AAL) | 10 | **Double authentification TOTP**, obligatoire pour les administrateurs (middleware) |
| `auth.admin.inviteUserByEmail()` / `generateLink()` | 5 | Invitations d'équipe et de portails |
| `auth.admin.createUser()` / `getUserById()` / `listUsers()` | 3 | Inscription self-service, super console |
| `auth.admin.deleteUser()` | 7 | Suppression de compte (RGPD), nettoyage |

Autres dépendances d'authentification :

- **Trigger `on_auth_user_created`** (`AFTER INSERT ON auth.users`,
  migration 001) : crée la ligne `profiles` à l'inscription.
- **13 clés étrangères vers `auth.users`** et **81 appels `auth.uid()`** dans les
  politiques et fonctions SQL.
- Cookies de session gérés par `@supabase/ssr` (domaine partagé dans
  `cookie-domain.ts`), drapeau de présence `centrium-session-active`
  (session fermée à la fermeture du navigateur), cookie court
  `centrium-fresh-auth` pour les liens email.
- Mots de passe : hachés en **bcrypt** par Supabase (`auth.users.encrypted_password`).

## 3. Base de données

| Élément | Nombre |
|---|---|
| Fichiers de migration | 106 |
| Tables créées | 65 |
| Fonctions SQL | 53 (dont 70 occurrences `SECURITY DEFINER`) |
| Triggers | 33 |
| Politiques RLS créées | 132 |
| Vues | 3 |
| Extensions | `pgcrypto`, `uuid-ossp` |

Fonctions d'aide de la RLS : `public.organization_id()`, `public.user_role()`,
`public.has_permission()`, `public.effective_role()`, `public.is_member_of()` —
toutes fondées sur `auth.uid()`.

Fonctions appelées par l'application (`.rpc`) : `compute_org_alerts` (2),
`count_org_alerts`, `transfer_org_ownership`, `portal_my_profile`,
`portal_my_missions`, `dashboard_kpis`, `dashboard_revenue_chart`,
`admin_org_overview`.

Tests : `npm run db:check` rejoue les 106 migrations sur PGlite (avec un schéma
`auth` simulé) puis exécute `supabase/tests/v2_rls.test.sql` (isolation des
organisations, rôles, portails, dispositions du tableau de bord).

## 4. Stockage de fichiers (Supabase Storage)

| Bucket | Public | Contenu | Accès |
|---|---|---|---|
| `documents` | non | Devis, contrats, documents clients et consultants, pièces jointes des demandes | Liens signés de 60 s délivrés par le serveur après contrôle des droits |
| `consultant-documents` | non | CV et pièces des consultants (KYC) | Liens signés |
| `organization-assets` | **oui** | Logos et **signature** de l'organisation | URL publique permanente |
| `quote-attachments` | **oui** | Logos envoyés depuis l'ancien formulaire public de devis | URL publique permanente |

Opérations relevées : `upload` (8), `createSignedUrl` (7), `list` (16),
`remove` (22), `getPublicUrl` (3). Politiques sur `storage.objects` dans 8
migrations.

**Constat à corriger pendant la migration** : la **signature** de
l'organisation est servie par une URL publique permanente. Elle devrait
rejoindre un stockage privé avec liens signés, comme les documents.

## 5. Temps réel (Supabase Realtime)

- Publication `supabase_realtime` (migration 056) sur 14 tables : `missions`,
  `consultants`, `contacts`, `invoices`, `invoice_items`, `timesheets`,
  `timesheet_days`, `alerts`, `job_offers`, `user_todos`, `companies`,
  `contracts`, `consultant_skills`, `consultant_documents` (+ `notifications`, 084).
- Usages : rechargement automatique des pages (`useRealtimeReload`,
  `useCrmRealtime`), centre de notifications, **présence** et curseurs partagés
  (`useOrgPresence`, `useOrgCursors`), fil d'activité de l'organisation.
- 8 abonnements `.channel(...)`, 6 `postgres_changes`, 2 `track()` (présence).

**Neon ne fournit pas d'équivalent au Realtime de Supabase.** Ces usages
devront être remplacés (actualisation à intervalle, Server-Sent Events) ou
retirés (présence et curseurs).

## 6. Fonctions serveur et tâches planifiées

- **Aucune Edge Function Supabase** (pas de dossier `supabase/functions`).
- 95 route handlers Next.js (`src/app/api/**/route.ts`).
- Crons Vercel (`vercel.json`) : `/api/cron/alerts-engine` (quotidien),
  `/api/admin/purge-archives` (mensuel).

## 7. Paiement (Stripe)

- Webhook : `src/app/api/billing/webhook/route.ts`, **signature vérifiée côté
  serveur** (`stripe.webhooks.constructEvent`).
- Identifiants client et abonnement Stripe stockés en base (migration 016 et
  suivantes) : ils migrent avec les données, sans dépendance à Supabase.
- Prix V2 à créer dans la super console (étape manuelle, déjà documentée).

## 8. Variables d'environnement liées à Supabase

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`. Aucune n'est commitée
(`.env.local` ignoré, `.env.example` sans valeur).

## 9. Ce qui changera forcément avec Neon

| Sujet | Supabase aujourd'hui | Point d'attention Neon |
|---|---|---|
| Isolation des organisations | RLS + JWT Supabase, requêtes directes du navigateur | Plus de requête directe navigateur → base : toutes les lectures passent par le serveur, l'organisation est dérivée de la session et posée pour chaque transaction (RLS conservée en défense en profondeur) |
| Comptes | Supabase Auth, bcrypt | Better Auth (Neon). **La version gérée n'importe pas les hachages Supabase** (documentation Neon) |
| Double authentification | TOTP obligatoire pour les admins | **La MFA est encore sur la feuille de route de Managed Better Auth** (documentation Neon) : risque de régression |
| Fichiers | Supabase Storage, liens signés | Neon Object Storage (S3, liens présignés), disponible à Francfort |
| Temps réel | Realtime + présence | Pas d'équivalent : à remplacer ou retirer |
| Hébergement | Suède (eu-north-1, Vercel arn1) | Région Neon européenne (Francfort pour le stockage) : **la page Sécurité devra être mise à jour** au moment de la bascule |
| 93 fichiers `service_role` | Contournent la RLS | Deviennent la couche service/repository, avec contrôle d'organisation explicite |

Suite : architecture cible et décisions à prendre dans
[`NEON_TARGET_ARCHITECTURE.md`](./NEON_TARGET_ARCHITECTURE.md).
