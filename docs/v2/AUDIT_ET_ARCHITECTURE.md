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
| Activité commerciale | CRM | `/crm` | `/crm`, `/contacts`, `/todos` (tâches) |
| | Clients | `/clients`, `/clients/[id]` | `/companies` |
| | Opportunités | `/opportunities`, `/opportunities/[id]` | `/offers`, `/responses` |
| Ressources | Consultants | `/consultants`, `/consultants/[id]` | `/prospects`, `/cv-pushed`, `/cv-optimizer` |
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

| Plan | Prix HT/mois | Managers | Consultants |
|---|---|---|---|
| Starter | 49 € | 2 | 10 |
| Team | 99 € | 5 | 30 |
| Growth | 179 € | 10 | 100 |
| Scale | dès 299 € (sur devis) | illimité | illimité |

Annuel : 10 mois facturés pour 12. Les utilisateurs `consultant` et `client` ne sont
pas comptés comme licences. Les nouveaux Price IDs Stripe sont à créer avec
`scripts/setup-stripe.ts` (action manuelle, environnement par environnement).

---

## 3. Plan d'exécution

1. Design system, tokens, mode clair, codemod des couleurs.
2. Shell : sidebar, header, palette de commandes, centre de notifications, navigation mobile.
3. Migrations V2 (rôles, entités, champs CRM, finances, portail client, permissions).
4. Modules : Dashboard, CRM, Clients 360, Opportunités, Consultants 360 + dossier,
   Staffing, Missions, CRA, Finance, Documents, Portails, Automatisations, Analytics, Paramètres.
5. Portails client et consultant (mobile-first).
6. Site vitrine : landing, tarifs, sécurité, FAQ, sans preuve sociale inventée.
7. Vérifications : type-check, lint, tests unitaires, build.

## 4. Déploiement des migrations

Les migrations V2 sont **additives** (aucune suppression de colonne ni de données) et
idempotentes (`IF NOT EXISTS`). Elles doivent être appliquées dans l'ordre, d'abord en
staging (`docs/runbook`), puis en production, **avant** le déploiement du front V2.
