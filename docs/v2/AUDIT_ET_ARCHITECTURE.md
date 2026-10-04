# Centrium V2 — Audit de l'existant et architecture cible

> Document de travail de la refonte V2 (branche `feat/centrium-v2`).
> Il fixe l'état des lieux, les écarts avec le brief V2 et les décisions
> d'architecture. Toute la refonte s'y réfère.

---

## 1. État des lieux (octobre 2026)

### 1.1 Stack et volumétrie

| Élément | Constat |
|---|---|
| Framework | Next.js 14.2 (App Router), React 18, TypeScript strict |
| UI | Tailwind 3 + primitives shadcn maison (`src/components/ui`, `src/components/app`), framer-motion, gsap, three.js (vitrine) |
| Données | Supabase (Postgres + Auth + Storage + Realtime), 94 migrations, RLS sur toutes les tables |
| Pages | ~32 000 lignes dans `src/app`, quasi toutes `'use client'`, lecture directe Supabase sous RLS |
| i18n | FR/EN : `src/lib/i18n/app.ts` (app, ~120 Ko) + `landing.ts` (vitrine) |
| Paiement | Stripe Checkout + webhooks idempotents, plans en table `plans` |
| Alertes | Moteur quotidien (`/api/cron/alerts-engine`) : détecteurs purs (`lib/alerts/detectors.ts`), relances, digest, journal `notification_deliveries` |
| Sécurité | CSP, MFA admin, rate limiting, présence de session, garde anti-escalade de privilèges (086), clôture consultant (087), rôles d'écriture (091) |

### 1.2 Modèle de données existant (tables métier)

`organizations`, `profiles`, `organization_members`, `organization_invitations`,
`consultants` (+ `consultant_skills`, `_experiences`, `_educations`, `_documents`),
`cv_templates`, `cv_versions`, `companies`, `contacts` (+ `contact_interactions`, `tags`, `contact_tags`),
`job_offers`, `opportunities` (+ `opportunity_consultants`), `missions`,
`timesheets` (+ `timesheet_days`), `invoices` (+ `invoice_items`), `contracts` (+ `contract_versions`),
`alerts`, `alert_comments`, `dismissed_alerts`, `notifications`, `notification_preferences`,
`org_notification_settings`, `notification_deliveries`, `activities`, `notes`, `messages`,
`user_todos`, `plans`, `subscriptions`, `quote_requests` (demandes de devis *pour Centrium*),
`login_events`, `legal_acceptances`, `account_deletion_requests`, `cron_heartbeats`.

Rôles (`user_role`) : `admin`, `business_manager`, `recruiter`, `finance`, `viewer`,
`consultant`, `super_admin`.

### 1.3 Ce qui est solide et doit être conservé

- Isolation multi-tenant par RLS (`organization_id()`, `user_role()`, `is_member_of()`, `role_in()`).
- Les portails consultant (`/portal/*`) sont fencés côté middleware **et** RLS.
- Le workflow CRA (draft → submitted → client_validated / rejected) est vérifié par triggers (009).
- La facture auto à la validation d'un CRA (024) et la numérotation séquentielle (088).
- Le moteur d'alertes est idempotent, configurable par organisation et testé.
- Le scoring de matching (`lib/ai/matching/score.ts`) est déterministe et explicable (équivalences, synonymes).
- Les gabarits CV (standard / dense / executive) en PDF et DOCX.

### 1.4 Écarts avec le brief V2

| Domaine | Existant | Écart |
|---|---|---|
| Identité | Dark mode par défaut, violet/magenta/néon, starfield, three.js, glow | Passer en clair uniquement, palette terracotta, retirer les effets |
| Navigation | 5 groupes repliables, « CV Optimizer », « Matching », « Réponses AO » au premier niveau | 8 sections métier, IA et CV en fonctions secondaires |
| Dashboard | KPI + alertes + graphique CA | Command Center : CA signé/prévisionnel, marge, occupation, intercontrat, pipeline pondéré, « À traiter aujourd'hui » |
| CRM | Kanban 9 statuts | 7 étapes (Prospect → Perdu), fiche opportunité complète |
| Client 360 | Liste sociétés + dialog | Page 360° complète |
| Consultants | Fiche + CV Optimizer séparé | Fiche 360 avec TJM/CJM/marge, dossier de compétences intégré |
| Staffing | Absent (matching séparé) | Planning visuel + matching explicable |
| Missions | Pas de page dédiée (`/en-mission` liste des consultants) | Page mission complète, marge, échéances 90/60/30/15 j |
| Finance | Factures + « comptabilité » | « Finance & préfacturation », aucune prétention e-facture, emplacements d'intégration |
| Documents | Contrats seuls | Bibliothèque : devis, propositions, BDC, contrats, dossiers, versions |
| Portail client | Absent | Espace client sécurisé + demandes → opportunités |
| RBAC | 7 rôles codés en dur | Owner, Admin, Direction, BM, Recruteur, Finance, Consultant, Client + permissions personnalisables |
| Automatisations | Règles du moteur d'alertes, non exposées | Centre d'automatisations activables |
| Recherche | Champ de recherche inactif dans le header | Palette de commandes Ctrl/Cmd + K |
| Tarifs | 74,99 / 149,99 / 299,99 € | 49 / 99 / 179 / 299+ € HT, licences managers uniquement |
| Preuve sociale | Témoignages et « TrustedBy » non vérifiables | À supprimer |

---

## 2. Décisions d'architecture

### 2.1 Identité visuelle et design system

- **Mode clair uniquement.** Suppression du script de thème, du `ThemeToggle`, des
  variables `.dark` et des fonds animés (starfield, aurora, three.js).
- **Tokens** (CSS variables + Tailwind) :

  | Token | Valeur | Usage |
  |---|---|---|
  | `--background` | `#FBFAF8` | Fond de page |
  | `--card` | `#FFFFFF` | Surfaces |
  | `--sand` | `#F4ECE6` | Surfaces secondaires, survols, sélection |
  | `--primary` | `#C65F46` | Terracotta : actions, liens, focus |
  | `--primary-deep` | `#9D4432` | Hover, texte d'accent (contraste AA) |
  | `--foreground` | `#191817` | Texte principal |
  | `--muted-foreground` | `#706A66` | Texte secondaire |
  | `--border` | `#E8E1DB` | Bordures fines |
  | `--success` / `--warning` / `--danger` | vert / ambre / rouge | États uniquement |

- **Typographie** : Inter (UI, chiffres tabulaires) + Inter Tight (titres), partagés
  par le site et l'application.
- **Migration des classes historiques** par codemod déterministe
  (`scripts/v2-recolor.mjs`) : violet/magenta/fuchsia/pink/indigo → `brand`,
  `text-white/x` → tokens de texte, `bg-white/[0.0x]` → surfaces. Les modules
  principaux sont ensuite réécrits sur les nouvelles primitives.
- **Primitives** (`src/components/ui`) : Button, Input, Textarea, Select, Combobox,
  DatePicker, Checkbox, Switch, Badge, StatusPill, Card, KpiCard, Tabs, DropdownMenu,
  Dialog, Drawer, CommandPalette, Toast (sonner), EmptyState, Skeleton, DataTable,
  KanbanCard, Timeline, MiniCalendar, charts (recharts sur tokens).

### 2.2 Navigation cible et plan des routes

| Section | Entrée | Route | Remplace |
|---|---|---|---|
| Pilotage | Dashboard | `/dashboard` | — |
| Activité commerciale | CRM | `/crm` (tableau), `/opportunities` (liste), `/opportunities/[id]`, `/contacts`, `/crm/tasks` | `/todos` (tâches), `/offers`, `/responses` |
| | Clients | `/clients`, `/clients/[id]` | `/companies` |
| Ressources | Consultants | `/consultants`, `/consultants/[id]` | `/prospects`, `/cv-pushed` |
| | CV Optimizer | `/cv-optimizer` (aussi depuis la fiche : `/consultants/[id]/dossier`) | — |
| | Staffing | `/staffing` | `/matching`, `/en-mission` |
| | Missions | `/missions`, `/missions/[id]` | — |
| Opérations | CRA | `/timesheets` | — |
| | Devis & documents | `/documents` | `/contracts`, `/templates` |
| | Finance | `/finance` | `/invoices`, `/accounting` |
| Collaboration | Portails | `/portals` | — |
| | Automatisations | `/automations` | `/alerts` (réglages) |
| Analyse | Analytics | `/analytics` | — |
| Administration | Paramètres | `/settings` | `/billing` (dans le hub) |

Les anciennes routes restent fonctionnelles ou redirigent (redirections 308 dans
`next.config.js`) : aucun lien externe ou favori ne casse.

### 2.3 Pipeline CRM sans migration de données

Les 7 étapes V2 sont projetées sur l'enum `opportunity_status` existant (aucune
réécriture de données, triggers et RPC inchangés) :

| Étape V2 | Statuts existants affichés | Statut écrit au dépôt |
|---|---|---|
| Prospect | `new`, `contacted` | `new` |
| Qualifié | `discussion` | `discussion` |
| Rendez-vous | `client_interview` | `client_interview` |
| Proposition | `cv_sent` | `cv_sent` |
| Négociation | `negotiation` | `negotiation` |
| Gagné | `won` | `won` |
| Perdu | `lost` | `lost` |

`on_hold` reste disponible comme filtre « En veille ».

**Simplification du CRM (4 octobre 2026).** Une seule entrée « CRM » dans la
navigation (visible avec `crm.view` ou `opportunities.view`) : onglets
Opportunités, Contacts, Tâches, et bascule Tableau / Liste. Le tableau n'affiche
que les cinq étapes de travail, chacune avec une phrase d'aide (« Premier
contact », « Besoin confirmé »…) et un bouton « Ajouter ». Gagnées, perdues et
en veille sortent du tableau : ce sont des zones de dépôt au-dessus des
colonnes, qui ouvrent la liste filtrée, et chaque issue peut être annulée.
Le formulaire d'opportunité ne montre d'abord que l'essentiel (intitulé, client,
étape, montant, prochaine relance, responsable) ; le reste est replié sous
« Plus de détails ».

### 2.4 Rôles et permissions

- **Owner** : drapeau `organization_members.is_owner` sur un membre `admin`. Aucune
  policy RLS existante à réécrire, l'owner hérite de tous les droits admin, et seules
  les actions réservées (abonnement, suppression de l'organisation, transfert) le vérifient.
- **Direction** : nouvelle valeur d'enum. Lecture complète, écriture opérationnelle,
  accès finance. Les policies à liste explicite (factures, CRA) l'incluent.
- **Client** : nouvelle valeur d'enum. Un utilisateur client **n'a pas
  d'organisation active** (`profiles.organization_id = NULL`), donc toutes les policies
  `organization_id = organization_id()` le refusent par défaut. Son accès passe
  exclusivement par `client_portal_users (user_id, organization_id, company_id)` et des
  Server Components qui filtrent par société avec une liste blanche de colonnes.
- **Permissions personnalisables** : matrice par défaut dans
  `src/lib/auth/permissions.ts`, surcharges par organisation dans `role_permissions`,
  vérification serveur `requirePermission()` dans les route handlers. L'interface ne
  fait que refléter, jamais décider.

### 2.5 Confidentialité financière

- Les coûts (CJM) vivent dans des tables **internes uniquement**
  (`consultant_financials`, `mission_financials`), avec une RLS qui exclut `consultant` et `client`.
- Le consultant ne lit plus `missions` en direct : la policy `missions_self_select`
  est remplacée par la fonction `portal_my_missions()`, qui ne renvoie que des colonnes
  non sensibles (sans TJM de vente ni marge).

### 2.6 Nouvelles entités

| Entité | Table | Notes |
|---|---|---|
| Tâche | `tasks` | Rattachée à une entité (opportunité, client, mission…), source `manual` ou `automation`, `dedupe_key` |
| Demande client | `client_requests` | Créée depuis le portail client, crée une opportunité (transaction serveur) |
| Accès portail client | `client_portal_users` | Une société par utilisateur, révocable |
| Document | `documents` | Bibliothèque versionnée (`root_id`, `version`), visibilité interne / client / consultant, bucket privé + URL signées |
| Devis | `quotes` + `quote_items` | Numérotation, statut, validité, versions |
| Intégration | `integrations` | Pennylane, Sage, Sellsy, plateforme agréée, webhooks. Statut réel, aucune transmission simulée |
| Permissions | `role_permissions` | Surcharges par organisation |
| Finances | `consultant_financials`, `mission_financials` | CJM, marge cible, jours prévus |

Les champs CRM manquants sont ajoutés à `opportunities` (description, budget, date de
début, localisation, télétravail, compétences, prochaine action, source).
Automatisations : réglages dans `org_notification_settings.settings.automations`,
lus par le moteur existant.

### 2.7 Finance et facturation électronique

- Libellés : « Finance & préfacturation ». Une facture existante devient une
  **préfacture** tant qu'elle n'est pas validée.
- Workflow : CRA validé → éléments facturables → préfacture → validation →
  export (CSV/FEC existant) ou transmission via une intégration externe → suivi.
- Aucune mention de PDP/PPF ni de transmission réglementaire directe. Les intégrations
  non branchées sont affichées « Non connectée », sans bouton qui simulerait un envoi.

### 2.8 Tarification

| Plan | Prix HT/mois | Annuel HT | Managers | Consultants | Souscription |
|---|---|---|---|---|---|
| Starter | 49 € | 490 € | 2 | 10 | en ligne |
| Team (recommandé) | 99 € | 990 € | 5 | 30 | en ligne |
| Growth | 179 € | 1 790 € | 10 | 100 | en ligne |
| Scale | dès 299 € | sur devis | au-delà | au-delà | via /demo |

- Annuel : 10 mois facturés pour 12. Tous les modules sont inclus dans chaque offre :
  seules les limites de managers et de consultants changent (appliquées par
  `lib/billing/enforce.ts`). Aucun quota IA n'est annoncé tant qu'il n'est pas appliqué.
- Les utilisateurs `consultant` et `client` ne sont jamais comptés comme licences.
- Essai : 7 jours (inchangé depuis la migration 075).
- Les offres historiques (`starter`, `growth`, `enterprise`) restent actives pour les
  abonnés existants ; elles ne sont plus proposées et un abonné peut passer sur une
  offre V2 depuis la page Abonnement (changement en place, prorata Stripe).
- Catalogue partagé : `src/lib/billing/plans.ts`. Les Price IDs (mensuel et annuel)
  sont créés depuis la super-console (« Créer les prix Stripe ») et lus dans
  `plans.stripe_price_id` / `plans.stripe_price_yearly_id`.

---

## 3. Plan d'exécution (réalisé)

1. Design system, tokens, mode clair, codemod des couleurs.
2. Shell : sidebar, header, palette de commandes, centre de notifications, navigation mobile.
3. Migrations V2 095 → 103 (rôles, propriétaire, permissions, entités, portails,
   tarifs, cloisonnement, approbation client, portail consultant, automatisations).
4. Modules : Dashboard, CRM, Clients 360, Opportunités + matching, Consultants 360 +
   dossier de compétences, Staffing, Missions, CRA, Finance & préfacturation,
   Devis & documents, Portails, Automatisations, Analytics, Paramètres (rôles,
   permissions, propriété), onboarding.
5. Portails client (`/client`) et consultant (`/portal`), mobile-first.
6. Site : accueil, tarifs, sécurité (affirmations vérifiées uniquement), démo, essai.
7. Vérifications : type-check, lint, tests unitaires, rejeu des migrations + tests
   SQL (`npm run db:check`, désormais dans la CI), build de production.

## 4. Déploiement

### 4.0 État au 4 octobre 2026

- **Production** (`actpzvkorgxkgwutwaud`) : migrations **095 à 104 appliquées** le
  4 octobre 2026 via l'API de gestion Supabase, une par une, sur décision du
  fondateur (sans passage par le staging, toujours en pause).
- Avant application : sauvegarde physique Supabase du jour constatée (17:23 UTC) et
  export logique des 49 tables publiques (4 382 lignes), conservé hors du dépôt.
- Après application : comptages identiques sur les 49 tables, sauf `plans` (4 → 8,
  ajout attendu des offres V2) ; tables V2 présentes ; aucune alerte de sécurité
  Supabase de niveau « erreur ».
- Restent à faire : création des prix Stripe V2 (super-console, étape 4 ci-dessous).

### 4.1 Ordre

1. **Base de staging** (le projet est en pause : le réactiver est une décision
   d'exploitation) : appliquer les migrations **095 à 104** dans l'ordre. Elles sont
   additives et idempotentes ; aucune donnée n'est supprimée.
2. Contrôler en staging (voir 4.3), puis appliquer les mêmes migrations en production.
3. Déployer le front V2 **après** les migrations : plusieurs écrans et routes lisent les
   nouvelles colonnes (`timesheet_days.is_remote`, `missions.owner_id`, tables
   `quotes`, `documents`, `client_portal_users`…).
4. Super-console → « Créer les prix Stripe » (clé live) : crée les prix mensuels et
   annuels de Starter, Team et Growth.

### 4.2 Points connus

- Rejouer toutes les migrations sur une base vierge échoue déjà sur `main` (060, 062,
  064) à cause d'un écart historique entre le dépôt et la production. Le harnais
  `scripts/db-check.mjs` injecte cet écart pour valider la chaîne ; la production,
  elle, contient déjà ces objets.
- `next build` doit être lancé avec `NODE_ENV=production` (ou sans `NODE_ENV`) : une
  variable `NODE_ENV=development` dans le shell fait échouer le prérendu (erreur
  `<Html> should not be imported…`), sans lien avec le code.
- La migration 102 retire la lecture directe de la fiche consultant par le
  consultant : toutes les pages du portail passent par `portal_my_profile()` et
  `portal_my_missions()`.
- La migration 099 reste à 7 jours d'essai ; les descriptions d'offres ne citent que
  des différences réellement appliquées.

### 4.3 Recette en staging

- Rôles : un recruteur ne voit pas les CJM ; la surcharge d'une permission s'applique
  sans reconnexion côté serveur ; le propriétaire peut transférer la propriété.
- Portail client : invitation depuis Portails → mot de passe → `/client` ; vérifier qu'un
  client ne voit que sa société (missions, CRA à approuver, devis, documents) ; une
  demande crée l'opportunité (si l'automatisation est active) avec ses pièces jointes.
- Portail consultant : CRA avec télétravail, documents partagés, aucune donnée de vente.
- Devis : création, envoi, acceptation par le client, nouvelle version.
- Automatisations : lancer `/api/cron/alerts-engine` et vérifier fins de mission
  (90/60/30/15 j au responsable), CRA à valider, consultants compatibles, tâches de
  relance d'opportunité et de devis.
- Facturation : préfactures validées, export CSV comptable, webhook signé de test.

### 4.4 À arbitrer hors code

- Les pages légales (`/legal/*`) n'ont pas été modifiées : leurs engagements
  (sous-traitants, durées de conservation…) sont à relire par le responsable juridique.
- Les captures du site sont des reproductions de l'interface avec des données
  d'exemple, signalées comme telles.
