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

### Barre latérale (7 destinations)

| | Destination | Contenu (onglets internes, jamais de 3ᵉ niveau) | Routes regroupées |
|---|---|---|---|
| 1 | Dashboard | Direction · Commercial · Staffing · Finance | `/dashboard`, `/todos`, `/alerts` |
| 2 | CRM | Pipeline · Clients · Contacts | `/crm`, `/opportunities`, `/clients`, `/contacts`, `/crm/tasks`, `/offers`, `/responses` |
| 3 | Talents | Consultants (+ dossier de compétences depuis la fiche) | `/consultants`, `/prospects`, `/cv-pushed`, `/cv-optimizer` |
| 4 | Staffing | Planning · Matching | `/staffing`, `/matching`, `/en-mission` |
| 5 | Missions | Liste · cockpit mission | `/missions` |
| 6 | Opérations | CRA · Documents · Finance | `/timesheets`, `/documents`, `/contracts`, `/templates`, `/finance`, `/invoices`, `/accounting` |
| 7 | Analytics | Business · Staffing · Finance · Performance | `/analytics` |

En bas : Paramètres, Aide, bloc organisation / utilisateur (menu : profil,
changer d'organisation, paramètres, confidentialité, déconnexion).
Les portails (accès clients et consultants, demandes) se gèrent dans
Paramètres → Portails ; `/portals` reste valide et allume « Paramètres ».

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
| 7 | Talents (un écran, 3 indicateurs, barre unique, filtres en tiroir, 25 / page, aperçu) | fait |
| 8 | Dossiers de compétences : quatre modèles neutres (Minimal, Consulting, Executive, Compact) en aperçu et en PDF, habillés par le branding de l’organisation (repli neutre, plus aucun logo ni nom d’un autre éditeur) ; atelier réglages à gauche, aperçu zoomable (50 / 75 / 100 %, largeur, page) à droite | fait |
| 9 | Staffing (planning plein écran, 3 indicateurs, mode plein écran, couleurs revues) et centre de matching (opportunité → profils expliqués → positionner ou générer le dossier) | fait |
| 10 | Missions (liste compacte, périmètres et échéances segmentés, aperçu en tiroir, état vide utile, transformation d’une opportunité gagnée), cockpit mission (TJM, CJM, marge, jours, fin ; frise mois par mois, CRA, documents, historique) et question du renouvellement à J-30 (oui → prolongation, non → libération, à confirmer → rappel BM) | fait |
| 11 | CRA : 3 indicateurs (à valider, manquants, validés ce mois), centre de validation rapide (valider, rejeter, ouvrir en ligne ; sélection et validation par lot ; aperçu du mois en tiroir), relance groupée des manquants | fait |
| 12 | Documents sur un écran (devis, bibliothèque, contrats, modèles) ; configurateur de devis (éditeur compact à sections repliables, lignes en mini-tableau réordonnables, aperçu A4 zoomable toujours visible) ; impression propre (sans la coque) ; documents (contrats, factures, CRA, affiche) sans logo ni couleurs d’un autre éditeur en repli | fait |
| 13 | Pilotage financier : 4 indicateurs, grand graphique, signaux à droite (concentration, intercontrat, marges sous l’objectif, encours), répartition commutable clients / consultants / missions ; préfacturation en 4 étapes (à préparer, à contrôler, prêtes à exporter, exportées) ; export CSV au format configurable, journaux, webhook ; connecteurs simulés retirés | fait |
| 14 | Analytics en 4 vues sur un écran : business (transformation, pipeline par étape, origine, gagnées / perdues, cycle de vente), staffing (occupation, intercontrat, disponibilités à venir, fins de mission, positionnements), finance (CA, marge, prévision, CA par client et consultant, concentration), performance (CRA à l’heure, acceptation des devis, délai de staffing, intercontrat moyen, renouvellements) | fait |
| 15 | Portails : accueil client très simple (bouton « Nouveau besoin », 5 tuiles : missions, consultants, CRA à approuver, documents, demandes ; liste « à traiter » plafonnée) — un besoin déposé crée l’opportunité dans le CRM (automatisation active par défaut, sinon notification de l’équipe commerciale) ; accueil consultant mobile d’abord en 4 cartes (ma mission, mon CRA, mes documents, disponibilité), sans finance ni CRM (« Factures » retirée du menu, la page reste accessible par lien) | fait |
| 16 | Paramètres : navigation interne compacte (organisation, branding, équipe, rôles, abonnement, notifications, automatisations, portails, intégrations, sécurité, mon compte), contenu à droite ; branding avec aperçu en direct (dossier, devis, portail) | fait |
| 17 | Responsive : balayage automatique des pages (390, 834, 1024, 1194, 1376 px) sans débordement horizontal ; barre latérale dès 1024 px, tiroir en dessous (tablette portrait) ; dashboard Bento adapté à la tablette paysage par requête de conteneur (12 colonnes dès que le tableau de bord mesure 56rem, quelle que soit la barre latérale) ; cockpit mission corrigé sur mobile ; cibles tactiles élargies (cases de sélection, liens des portails) ; une case cochée sur une carte mobile n’ouvre plus la fiche | fait |
| 18 | Performance : plus d’écart d’hydratation au rechargement (session, permissions, caches et préférences appliqués avant la peinture, plus pendant le premier rendu — React ne jette plus le HTML du serveur) ; export Word chargé au clic (−94 kB gzip sur l’atelier des dossiers, l’optimiseur de CV et les réponses) ; animation d’entrée des sections en CSS, sans attendre l’hydratation. Déjà en place et vérifié : routes préchargées (statiques), cache stale-while-revalidate, déplacements CRM optimistes, pagination des tableaux, aucune requête par ligne | fait |

Chaque phase : TypeScript, lint, tests, build, vérification visuelle
(1440, 1920, 2560, mobile), permissions, états vides / chargement / erreur.

## 6. Fonctions complémentaires (brief, sections 65 à 81)

| § | Fonction | État |
|---|---|---|
| 65 | Notifications classées Urgent / À faire / Information (d’après leur priorité) | fait |
| 66 | Centre « À faire » (page /todos, tuile « À traiter » du dashboard) | existant |
| 67 | Automatisations en recettes activables (Paramètres → Automatisations) | existant |
| 68 | Prévision de capacité à 30 / 60 / 90 jours : disponibles, fins de mission, occupation prévue, risque d’intercontrat (Analytics → Staffing), d’après les missions signées | fait |
| 69 | Simulateur de marge sur l’opportunité (TJM, CJM du consultant positionné ou saisi ; marge par jour, en %, par mois ; faible, correcte, bonne) ; objectifs réglables dans Paramètres → Organisation | fait |
| 70 | Alerte de rentabilité : « Marge sous votre objectif de N % » au cockpit mission et dans le pilotage financier, jamais bloquante ; objectif du consultant, sinon celui de l’organisation | fait |
| 71 | Concentration client (pilotage financier, analytics), présentée comme indicateur | existant |
| 72 | Widget « Intercontrat en détail » : nombre, durée moyenne, coût estimé à partir des CJM connus, profils, opportunités compatibles | fait |
| 73 | Doublons probables (contacts, clients, consultants) : fusion des contacts après confirmation (historique rattaché, fiche doublon archivée) ; clients et consultants : archivage du doublon après confirmation, rien n’est déplacé | fait (voir limite ci-dessous) |
| 74 | Import CSV des consultants : correspondance des colonnes ajustable, aperçu, erreurs par ligne, compétences importées et classées | fait (CSV ; XLSX non pris en charge) |
| 75 | Vues enregistrées (talents, missions), sur l’appareil | fait |
| 76 | Activité de l’organisation : faits métier des 30 derniers jours (page /activity, lien depuis la tuile d’activité) | fait |
| 77 | Notes et tâches sur les clients, consultants, opportunités et missions | existant |
| 78 | Favoris : étoile sur les fiches, en tête de la recherche rapide | fait |
| 79 | Récemment consulté dans la palette (recherches et fiches ouvertes) | fait |
| 80 | Actions rapides : positionner et relancer (opportunités), CRA, prolonger et documents (missions), positionner et dossier (consultants) | fait |
| 81 | Raccourcis : ⌘K / Ctrl K, C, G puis D / C / T / M, « ? » pour l’aide | fait |

Limite : la fusion complète de deux clients ou de deux consultants
(missions, CRA, factures, contrats) doit se faire dans une seule
transaction en base. Elle demande une fonction SQL dédiée, donc une
migration à valider explicitement ; en attendant, le doublon est archivé
sans que rien ne soit déplacé.

## 7. Itération de finalisation (octobre 2026)

| Étape | Livré | Commit |
|---|---|---|
| Site vitrine | Page d'accueil « Une ESN ne devrait pas se piloter en morceaux » | fef2cd6 |
| Navigation | Barre latérale cohérente, onglets de section | 71f3490 |
| CRM | Cartes lisibles, tiroir d'action, relances (une tâche par affaire), motifs de perte, santé des affaires, tri et filtres | f144788 |
| Talents | Filtres avancés en tiroir, compétences lisibles, disponibilité réelle | ec7d5d6 |
| Matching IA | Score expliqué et déterministe (plafonds sur compétences obligatoires, séniorité, disponibilité), dans les deux sens | fd75668 |
| CV Optimizer | Besoin, score d'adéquation, éditeur par blocs, versions, quatre modèles habillés par l'ESN | 44fb71c |
| Missions | Santé de chaque mission (CRA, échéance, marge, contrat), relève et renfort par le matching | a35ab71 |
| CRA | Export CSV, commentaires internes, contrôles du mois (jours sans saisie, hors mission, fériés), pré-remplissage aligné sur la mission, saisie mobile (glissé au doigt, barre d'envoi), parcours de correction | 3025b77 |
| Portail consultant | Missions (à venir / en cours / passées), documents (à signer, pièces selon le statut, fichiers), profil (disponibilité cohérente, facturation pour les indépendants), vouvoiement, nom de l'ESN partout | aeaabe2 |
| Rôles | Commercial et Opérations (migrations 105-106 préparées), base alignée sur la matrice, routes par permission, équipe « qui voit quoi », tableau de bord par rôle | 521917b |
| Mobile | PWA installable (manifeste, icônes, service worker sans données en cache, page hors ligne) | b1d1663 |
| Démo | « Démo ESN » et « Démo Consultant » sur /demo, seed réaliste rejouable, bandeau de démonstration | 1cd7e0d |

### Décisions en attente

- **Migrations 105-106** (rôles Commercial et Opérations, policies et
  trigger des CRA par permission) : préparées et testées (PGlite,
  `supabase/tests/v3_roles.test.sql`), non appliquées. Elles corrigent
  aussi la Direction, à qui la matrice accorde la validation des CRA que
  la base lui refuse aujourd'hui.
- **Démo** : seed et comptes à créer sur le staging, puis `DEMO_ACCESS=on`
  (voir `docs/runbook/DEMO.md`) ; en production seulement sur décision.
- **Session et PWA** : la déconnexion à la fermeture du navigateur
  s'applique aussi à l'application installée (reconnexion à chaque
  ouverture). À arbitrer si l'usage mobile le justifie.
