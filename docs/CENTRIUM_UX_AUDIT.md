# Centrium V2 — audit UX de l'application et plan de refonte

> Périmètre : **application connectée uniquement**. Le site vitrine est validé et
> n'est pas modifié. Backend inchangé (Supabase, RLS, RBAC serveur) : la refonte
> porte sur l'UX, l'UI et l'architecture produit. Aucune donnée inventée.
>
> Sources : code actuel (≈ 50 routes sous `src/app/(app)`), captures transmises
> au fil des échanges (tableau de bord, barre latérale, onglets CRM, présence).
> Les captures de référence annoncées dans le brief V2 ne sont pas parvenues :
> l'audit s'appuie sur leur description écrite.

## 1. Constat général

| Symptôme | Où | Conséquence |
|---|---|---|
| Navigation par accumulation : 11 entrées + 6 titres de section, plus « Voir aussi » et onglets | Sidebar, pages | L'utilisateur ne sait pas où chercher |
| Pages verticales : en-tête + 4 à 9 KPI + onglets + 3 à 5 filtres + tableau | Consultants, Finance, CRA, Staffing, Analytics | Scroll de page systématique, peu d'information au premier écran |
| Une page par objet, peu de panneaux latéraux | Opportunités, consultants, missions | On quitte son contexte à chaque clic |
| Modules hérités en doublon | offers / responses / cv-pushed / en-mission / companies / prospects / alerts / todos | Concepts concurrents, routes orphelines |
| Facturation ambiguë | `/invoices`, connecteurs « plateforme agréée » | Laisse croire à une émission réglementaire |
| Couleur rare | Cartes blanches partout (avant le passage en tuiles) | Pas de hiérarchie visuelle |

## 2. Architecture cible

### Barre latérale (8 destinations)

| | Destination | Contenu (onglets internes, jamais de 3ᵉ niveau) | Routes regroupées |
|---|---|---|---|
| 1 | Dashboard | Direction · Commercial · Staffing · Finance | `/dashboard`, `/todos`, `/alerts` |
| 2 | CRM | Pipeline · Clients · Contacts | `/crm`, `/opportunities`, `/clients`, `/contacts`, `/crm/tasks`, `/offers`, `/responses` |
| 3 | Talents | Consultants (+ dossier de compétences depuis la fiche) | `/consultants`, `/prospects`, `/cv-pushed`, `/cv-optimizer` |
| 4 | Staffing | Planning · Matching | `/staffing`, `/matching`, `/en-mission` |
| 5 | Missions | Liste · cockpit mission | `/missions` |
| 6 | Opérations | CRA · Documents · Finance | `/timesheets`, `/documents`, `/contracts`, `/templates`, `/finance`, `/invoices`, `/accounting` |
| 7 | Analytics | Business · Staffing · Finance · Performance | `/analytics` |
| 8 | Portails | Clients · Consultants · Demandes | `/portals` |

En bas : Paramètres, Aide, bloc organisation / utilisateur (menu : profil,
changer d'organisation, paramètres, confidentialité, déconnexion).

### Coque

- `100dvh` : barre latérale fixe (sombre, 64 / 228 px), barre supérieure fixe,
  espace de travail qui défile seul. Les écrans « un écran » (CRM, consultants,
  CRA, staffing, finance) occupent `calc(100dvh - topbar)` et font défiler
  leurs zones internes (colonnes, tableaux), jamais la page entière.
- Barre supérieure : fil d'Ariane léger · recherche (⌘K) · **+ Créer**
  (feuille de création : client, contact, opportunité, consultant, mission,
  CRA, devis, document) · À faire / notifications.
- Palette ⌘K : navigation, actions, récents, recherche d'objets.

## 3. Audit écran par écran

| Écran | Verdict | Aujourd'hui | Cible |
|---|---|---|---|
| Dashboard | **SIMPLIFY** | Bonne base Bento, trop haut ; check-list de mise en route au-dessus | Grille compacte qui tient dans `100dvh`, 4 vues, personnalisation conservée, mise en route repliée |
| CRM | **MERGE + REDESIGN** | Kanban + liste + contacts + tâches ; clients à part | Une section, onglets Pipeline / Clients / Contacts ; kanban plein écran, colonnes à défilement interne, cartes compactes, **tiroir de détail** à droite |
| Clients | **MERGE** dans CRM | Page + fiche 360 à 9 onglets | Onglet CRM ; fiche : Aperçu · Opportunités · Missions · Documents |
| Contacts | **MERGE** dans CRM | Page à part, 4 KPI | Onglet CRM, tableau compact |
| Fiches de poste, réponses AO | **MOVE** | Pages autonomes | Accessibles depuis l'opportunité ; plus dans la navigation |
| Consultants | **SIMPLIFY → Talents** | 5 KPI + 4 onglets + 5 filtres + tableau | 3 indicateurs, une barre d'outils (recherche, compétence, disponibilité, « Plus de filtres » en tiroir), tableau à en-tête collant, 25 / page, tiroir rapide |
| CV Optimizer | **MOVE → Dossier de compétences** | Entrée de menu | Action « Générer un dossier » depuis consultant, opportunité, matching ; studio contrôles / aperçu zoomable |
| Modèles CV | **REDESIGN** | Modèles marqués QuadCore | 4 modèles neutres (Minimal, Consulting, Executive, Compact), branding de l'ESN |
| CV poussés, en mission, vivier | **REMOVE** (routes conservées en redirection) | Onglets hérités | Positionnements dans Staffing / Matching |
| Staffing | **SIMPLIFY** | 5 KPI + onglets + 4 filtres | 3 KPI, barre d'outils, planning plein écran, mode plein écran, couleurs revues ; vues Planning / Matching |
| Matching | **REDESIGN** | Page autonome | Centre de matching : opportunité → profils, score expliqué, Positionner / Profil / Dossier |
| Missions | **SIMPLIFY** | 4 KPI, grand vide sans données | Liste compacte, état vide utile ; cockpit mission (TJM, CJM, marge, jours, fin), renouvellement |
| CRA | **SIMPLIFY** | 5 KPI + onglets | 3 KPI (à valider, manquants, validés), validation rapide en ligne et par lot |
| Devis & documents | **REDESIGN** | Éditeur vertical | Éditeur compact à gauche (sections repliables), aperçu à droite, lignes en mini-tableau |
| Finance | **SIMPLIFY → Pilotage financier** | 9 KPI + graphique + 3 tableaux | 4 KPI, grand graphique, alertes à droite, tableau commutable (clients / consultants / missions) |
| Factures, journal comptable | **REMOVE** de la navigation | Laissent croire à une facturation native | CRA validé → préfacturation → export ; plus de connecteurs simulés ni de « plateforme agréée » |
| Analytics | **REDESIGN** | Blocs verticaux | 4 vues : Business, Staffing, Finance, Performance |
| Paramètres | **REDESIGN** | 12 grandes cartes | Navigation interne compacte + contenu ; branding avec aperçu |
| Portails | **KEEP + SIMPLIFY** | Page d'administration | Entrée principale ; portails client / consultant épurés, mobile d'abord |
| À faire, alertes | **MERGE** | Deux pages | Centre « À faire » unique (urgent / à faire / information) |

## 4. Design system

Jetons centralisés (`tailwind.config.ts`, `globals.css`) : fond `#F7F4F1`,
carte `#FFFFFF`, terracotta `#C65F46` / `#A64735` / `#7E3528`, pêche
`#F2D8CF` / `#F9EBE6`, sable `#EFE6E0`, charbon `#191817`, texte `#292522`,
atténué `#837A75`, bordure `rgba(35,25,20,.08)`. Rayons 16–22 px (cartes),
8–12 px (contrôles). Ombres très diffuses. Mouvement 150–300 ms, respect de
`prefers-reduced-motion`.

Composants partagés : AppShell, Sidebar, Topbar, CommandPalette, QuickCreate,
Workspace, BentoGrid / Tile, StatCard (KPICard), DataTable, FilterBar,
DetailDrawer, SegmentedControl / tabs, EmptyState, StatusBadge, Avatar.

## 5. Phases et avancement

| Phase | Module | État |
|---|---|---|
| 1 | Design system (jetons, surfaces, tuiles) | fait |
| 2–3 | App Shell 100dvh, barre latérale sombre, barre supérieure | fait |
| 4 | Palette ⌘K (récents, actions), Créer (touche C) | fait |
| 5 | Dashboard un écran (grille 12 × 6, 4 vues, mise en route compacte) | fait |
| 6 | CRM (onglets, kanban plein écran, tiroir d’aperçu, liste, clients, contacts, fiche client 4 onglets) | fait |
| 7 | Talents | à faire |
| 8 | Dossiers de compétences, modèles neutres | à faire |
| 9 | Staffing, matching | à faire |
| 10 | Missions, cockpit | à faire |
| 11 | CRA, validation rapide | à faire |
| 12 | Documents, devis | à faire |
| 13 | Pilotage financier, préfacturation, export | à faire |
| 14 | Analytics 4 vues | à faire |
| 15 | Portails | à faire |
| 16 | Paramètres | à faire |
| 17–18 | Responsive, performance | à faire |

Chaque phase : TypeScript, lint, tests, build, vérification visuelle
(1440, 1920, 2560, mobile), permissions, états vides / chargement / erreur.
