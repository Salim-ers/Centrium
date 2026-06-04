---
title: "Manuel utilisateur — Centrium"
product: "Centrium"
publisher: "QuadCore SAS"
version: "1.0 Enterprise"
date: "2026-06-04"
language: "fr"
audience: "Administrateurs, Business Managers, Recruteurs, Finance, Consultants (Portal)"
type: "enterprise-user-manual"
---

# Manuel utilisateur — Centrium

> Plateforme métier pour ESN et cabinets de conseil
> Version 1.0 Enterprise — Juin 2026 — Édité par QuadCore SAS

Ce manuel couvre l'intégralité des fonctionnalités de Centrium dans la version 1.0. Il s'adresse aux **administrateurs**, **business managers**, **recruteurs**, **équipes finance** et aux **consultants** qui accèdent à leur portail dédié. Il est conçu pour être lu linéairement lors d'une prise en main, puis utilisé en référence ensuite.

Pour la sécurité technique détaillée et la conformité, consulter [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md). Pour les engagements de service contractuels, consulter [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md). Pour les paramètres de gouvernance plateforme, consulter [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md).

> **Note sur les captures d'écran.** Cette édition v1.0 Enterprise est délibérément textuelle. La galerie de captures d'écran annotées est planifiée **Q3 2026** et sera publiée dans le centre d'aide en ligne : `centrium-platform.com/aide`. Les vidéos tutorielles (parcours guidés de 90 s par module) suivront **Q4 2026**.

---

## Table des matières

0. [Premiers pas en 15 minutes](#0-premiers-pas-en-15-minutes)
1. [Premiers pas](#1-premiers-pas)
2. [Module Consultants](#2-module-consultants)
3. [CV Optimizer](#3-cv-optimizer)
4. [Matching et appels d'offres](#4-matching-et-appels-doffres)
5. [CRM commercial](#5-crm-commercial)
6. [Carnet de contacts](#6-carnet-de-contacts)
7. [Contrats](#7-contrats)
8. [CRA — Comptes-rendus d'activité](#8-cra--comptes-rendus-dactivité)
9. [Facturation](#9-facturation)
10. [Assistant comptable IA](#10-assistant-comptable-ia)
11. [Dashboard et pilotage](#11-dashboard-et-pilotage)
12. [Portal consultant](#12-portal-consultant)
13. [Paramètres organisation](#13-paramètres-organisation)
14. [Raccourcis clavier](#14-raccourcis-clavier)
15. [Mobile et tablette](#15-mobile-et-tablette)
16. [Limites connues actuelles](#16-limites-connues-actuelles)
17. [Aller plus loin](#17-aller-plus-loin)
18. [Glossaire métier](#18-glossaire-métier)

---

## 0. Premiers pas en 15 minutes

Cette section condense le parcours type d'un Business Manager qui ouvre Centrium pour la première fois et veut, en quinze minutes, **importer un consultant, créer une opportunité, pousser un CV et voir le pipeline bouger**.

### Checklist 15 minutes

| Étape | Durée | Action | URL |
|---|---|---|---|
| 1 | 2 min | Créer le compte et activer par e-mail | `/login` puis `/onboarding` |
| 2 | 3 min | Importer un consultant via parsing CV IA | `/consultants` |
| 3 | 2 min | Créer une première opportunité dans le CRM | `/crm` |
| 4 | 3 min | Pousser le CV vers cette opportunité | depuis la fiche consultant |
| 5 | 1 min | Vérifier la bascule de la carte CRM en "CV envoyé" | `/crm` |
| 6 | 4 min | Configurer le branding (logo, couleur, signature) | `/settings/branding` |

### Étape 1 — Créer le compte (2 minutes)

1. Rendez-vous sur `centrium-platform.com` et cliquez sur **Créer un compte**.
2. Renseignez votre adresse e-mail professionnelle et un mot de passe (12 caractères minimum, majuscule + chiffre + caractère spécial).
3. Cliquez sur le lien reçu par e-mail. Le lien expire après 24 heures.
4. À la première connexion, vous arrivez sur `/onboarding` : saisissez la raison sociale de votre ESN, son SIREN et sa forme juridique.

> 💡 **Astuce** — Si vous n'avez pas le SIREN sous la main, saisissez "À compléter" temporairement. Vous compléterez plus tard dans `/settings/branding`. Les factures ne pourront pas être émises tant que les mentions légales ne sont pas complètes (cf. [§9.2](#92-mentions-légales-obligatoires)).

> ⚠️ **Attention** — N'utilisez pas une adresse e-mail personnelle pour le compte administrateur. Si la personne quitte l'organisation, l'accès devient ingérable. Préférez `admin@votre-esn.fr` ou un alias de groupe.

### Étape 2 — Importer un premier consultant (3 minutes)

1. Allez sur `/consultants`. Cliquez sur **Importer un CV**.
2. Glissez-déposez un PDF ou DOCX (le CV d'un consultant que vous souhaitez référencer).
3. Patientez 30 à 60 secondes : l'IA extrait l'identité, le titre, les compétences, les expériences, les formations et les langues.
4. **Vérifiez chaque champ** dans la fiche pré-remplie qui s'ouvre. Le parsing atteint 85 % de précision en moyenne — il reste 15 % à corriger manuellement.
5. Cliquez sur **Enregistrer**.

> 💡 **Astuce** — Un CV bien structuré (sections claires, dates en format ISO ou jj/mm/aaaa) augmente la précision du parsing à 95 %. Pour les CV scannés en image, l'OCR ajoute environ 10 secondes de traitement.

> ⚠️ **Attention** — Le parsing IA ne valide pas la cohérence métier. Vérifiez systématiquement la **séniorité**, les **dates** et le **TJM cible** avant d'enregistrer. Une erreur ici se propage dans tous les CV générés ultérieurement.

> 🔒 **Sécurité** — Le CV source est stocké dans Supabase Storage, bucket privé, accessible uniquement aux membres de votre organisation ayant le rôle Admin, BM ou Recruteur. Détails dans [`SECURITY_WHITEPAPER.md §6.3`](./SECURITY_WHITEPAPER.md).

### Étape 3 — Créer une première opportunité (2 minutes)

1. Allez sur `/crm`. Cliquez sur **Nouvelle opportunité**.
2. Renseignez : intitulé du poste, client, type de besoin (régie / forfait / sourcing), TJM cible, date de démarrage souhaitée.
3. Validez. La carte apparaît en colonne **Nouveau** du kanban.

> 💡 **Astuce** — Saisissez le **CA prévisionnel** (`expected_revenue`) dès la création. Il alimente le total pipeline affiché en haut de page et permet au dashboard de calculer le potentiel CA mensuel.

### Étape 4 — Pousser le CV vers l'opportunité (3 minutes)

1. Retournez sur `/consultants`. Ouvrez la fiche du consultant importé à l'étape 2.
2. Cliquez sur **Pousser CV**.
3. Dans la boîte de dialogue : sélectionnez l'offre ou l'opportunité créée à l'étape 3, ajustez le TJM proposé (pré-rempli avec le TJM cible), confirmez.

Une mission au statut `proposed` est créée. Le profil disparaît automatiquement de `/consultants` et apparaît dans `/cv-pushed`. L'opportunité associée bascule **automatiquement** au statut **CV envoyé** dans le CRM.

> 💡 **Astuce** — Vous pouvez pousser le **même** profil sur plusieurs opportunités en parallèle. Chaque push crée une mission `proposed` distincte. Le profil reste affiché dans `/cv-pushed` pour chacune.

### Étape 5 — Vérifier la bascule CRM (1 minute)

Retournez sur `/crm`. La carte de l'opportunité a glissé automatiquement dans la colonne **CV envoyé** (violet). Si plusieurs collègues sont connectés, ils voient également la carte se déplacer en temps réel (Supabase Realtime, latence typique < 300 ms).

### Étape 6 — Configurer le branding (4 minutes)

1. Allez sur `/settings/branding`.
2. Téléversez votre **logo** (PNG ou SVG, fond transparent, 512×512 px minimum).
3. Sélectionnez votre **couleur primaire** (boutons, accents) et votre **couleur d'accent** (highlights).
4. Téléversez votre **signature** scannée (PNG transparent).
5. Saisissez votre **tagline de pied de page** (phrase courte sur les documents générés).
6. Choisissez le **template CV par défaut** : Standard, Dense ou Executive.

Le branding s'applique immédiatement aux CV, contrats, factures, e-mails et favicons générés.

> 💡 **Astuce** — La bannière violette "Branding incomplet" du dashboard disparaît dès que le logo et la couleur primaire sont définis.

### Et après ?

À ce stade, vous êtes opérationnel. Pour aller plus loin :

- **Inviter votre équipe** → [§1.3](#13-inviter-votre-équipe)
- **Importer en masse votre bibliothèque consultants** → [§2.1](#21-importer-vos-consultants) (CSV ou parsing CV par lot)
- **Configurer l'export comptable Sage/Pennylane** → [§9.5](#95-export-sage--pennylane)
- **Activer le portal consultant** pour la saisie autonome des CRA → [§12](#12-portal-consultant)

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/premiers-pas` (Q3 2026)
- Guide administrateur complet : [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md)
- Contact support pour onboarding accompagné : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 1. Premiers pas

Centrium est une plateforme web. Aucune installation n'est requise. L'accès se fait depuis un navigateur récent (Chrome, Edge, Firefox, Safari) sur ordinateur, tablette ou smartphone. Les données sont hébergées en Europe sur infrastructure Supabase, et l'application est conforme RGPD.

### 1.1 Créer votre compte

Rendez-vous sur la page d'accueil de Centrium et cliquez sur **Créer un compte**. Renseignez votre adresse e-mail professionnelle, un mot de passe robuste (12 caractères minimum, au moins une majuscule, un chiffre et un caractère spécial), puis vos nom et prénom.

Un e-mail de confirmation est envoyé à l'adresse fournie. Cliquez sur le lien reçu pour activer le compte. Le lien expire au bout de 24 heures.

> 🔒 **Sécurité** — Le mot de passe est haché côté serveur (Argon2). Centrium ne peut jamais le lire en clair. En cas de perte, utilisez **Mot de passe oublié** depuis la page de connexion. Détail des contrôles d'authentification dans [`SECURITY_WHITEPAPER.md §4`](./SECURITY_WHITEPAPER.md).

À votre première connexion, vous êtes redirigé vers `/onboarding` pour créer votre organisation. C'est ici que vous saisissez la raison sociale, le SIREN et la forme juridique. Ces informations apparaîtront automatiquement sur les contrats et factures générés.

### 1.2 Configurer votre organisation

L'onboarding se déroule en quatre étapes courtes accessibles depuis `/onboarding/setup` :

| Étape | Contenu | Section concernée |
|---|---|---|
| 1. Identité | Nom commercial, SIREN, TVA intracommunautaire, adresse | Mentions légales |
| 2. Identité visuelle | Logo (PNG/SVG), couleur primaire, couleur d'accent | Branding |
| 3. Signature et tagline | Signature scannée (PNG transparent), baseline pied de page | Documents générés |
| 4. Préférences CV | Template par défaut (Standard, Dense ou Executive) | CV Optimizer |

Ces réglages sont modifiables à tout moment depuis [§13.3](#133-identité-visuelle-logo-couleurs-mentions-signature). Tant qu'aucun logo ni couleur primaire n'est défini, une bannière violette apparaît sur le dashboard pour vous inviter à compléter le branding.

> 💡 **Astuce** — Préparez un logo carré de 512 px minimum, sur fond transparent. Il sera utilisé sur les CV, contrats, factures, e-mails et favicons générés.

### 1.3 Inviter votre équipe

Le module équipe se trouve dans `Paramètres > Équipe` (`/settings/team`). Seul un administrateur peut inviter ou retirer un membre. Une invitation est envoyée par e-mail avec un lien personnel valable 7 jours.

Six rôles cohabitent dans Centrium :

| Rôle | Permissions principales |
|---|---|
| **Admin** | Accès complet, gestion équipe, branding, facturation plateforme |
| **Business Manager** | Consultants, opportunités, missions, CRA, contrats |
| **Recruteur** | Consultants, contacts, opportunités (lecture/écriture limitée) |
| **Finance** | Factures, CRA validés, exports comptables |
| **Viewer** | Lecture seule sur l'ensemble de l'app |
| **Consultant** | Accès uniquement au [portal consultant](#12-portal-consultant) (jamais à l'app principale) |

> ⚠️ **Attention** — Le rôle **Consultant** est cloisonné. Un consultant ne voit jamais les autres consultants, ni le CRM, ni les contacts. Le rôle est attribué lors de la création de son accès portail depuis sa fiche.

> 🔒 **Sécurité** — La gestion fine des rôles et le détail des permissions par module sont décrits dans [`ADMIN_GUIDE.md §3`](./ADMIN_GUIDE.md). L'isolation entre organisations est garantie par Row Level Security PostgreSQL ; détails dans [`SECURITY_WHITEPAPER.md §3.2`](./SECURITY_WHITEPAPER.md).

### 1.4 L'interface : tour rapide

L'application repose sur un layout en trois zones :

- **Sidebar gauche** — Navigation principale, regroupée par sections : Pilotage (Dashboard, Alertes, Todos), Talents (Consultants, CV poussés, En mission, Prospects), Commerce (CRM, Offres, Matching, Réponses, Contacts), Production (Contrats, CRA, Factures, Assistant comptable), Paramètres.
- **Header** — Recherche globale, indicateur de synchronisation temps réel, sélecteur d'organisation (si vous appartenez à plusieurs orgs), avatar utilisateur.
- **Zone de contenu** — La page courante. Toutes les pages partagent un `PageHeader` (titre + sous-titre + actions) et des composants standardisés (`KPICard`, `AppCard`, `EmptyState`, `StatusBadge`) garantissant une expérience cohérente.

> 💡 **Astuce** — La sidebar se replie automatiquement sur écran étroit. Sur desktop, vous pouvez la réduire manuellement en cliquant sur la flèche en pied de menu.

### 1.5 Préférences personnelles

Trois axes de personnalisation sont disponibles dans `Paramètres > Apparence` (`/settings/appearance`) :

- **Thème** — Sombre ou clair. Le thème sombre est celui par défaut et reste recommandé pour les longues sessions.
- **Fond animé (Starfield)** — Active ou désactive l'arrière-plan dynamique. Désactivez-le si vous êtes sur batterie ou sur une machine légère.
- **Densité d'affichage** — Confortable (par défaut) ou compacte. La densité compacte affiche environ 30 % de contenu en plus à l'écran.

Les préférences sont stockées localement (`localStorage`) et liées à votre navigateur. Votre profil utilisateur (avatar, nom, e-mail, mot de passe, langue) se gère dans `Paramètres > Mon profil` (`/settings/profile`).

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/premiers-pas` (Q3 2026)
- Configuration SSO SAML/OIDC (entreprise) : **Q3 2026** — voir [`ADMIN_GUIDE.md §4`](./ADMIN_GUIDE.md)
- MFA TOTP : **Q3 2026** — voir [`SECURITY_WHITEPAPER.md §4.3`](./SECURITY_WHITEPAPER.md)
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 2. Module Consultants

Le module Consultants est le cœur de Centrium. Il centralise l'intégralité des profils que vous pouvez positionner : collaborateurs internes, freelances en réseau, candidats sourcés. Toutes les fiches vivent dans une bibliothèque unique, sans distinction "vivier vs actif" — la séparation est faite par le statut et la présence ou non d'une mission en cours.

### 2.1 Importer vos consultants

Trois méthodes sont disponibles depuis `/consultants` :

1. **Création manuelle** — Bouton **+ Ajouter un consultant**. Saisie d'une fiche vierge. Idéal pour entrer un profil rapidement avec uniquement les champs essentiels.
2. **Import CV (parsing IA)** — Bouton **Importer un CV**. Déposez un PDF ou un DOCX. L'IA extrait nom, titre, compétences, expériences, formations et langues, puis ouvre la fiche pré-remplie pour validation.
3. **Import CSV** — Bouton **Import CSV**. Téléchargez le modèle fourni, remplissez-le et déposez-le. Les colonnes attendues sont documentées dans le dialog d'import.

> ⚠️ **Attention** — Le parsing IA atteint en moyenne 85 % de précision sur des CV bien structurés. **Vérifiez systématiquement la fiche avant enregistrement.** Centrium ne valide pas automatiquement les données extraites. À ce jour, le parsing utilise un moteur IA en mode mock ; le passage en mode Claude API live est planifié **Q3 2026** avec déploiement progressif par lot d'organisations.

### 2.2 Fiche consultant complète

Une fiche consultant comporte les sections suivantes :

- **Identité** — Prénom, nom, e-mail, téléphone, ville, LinkedIn
- **Métier** — Intitulé de poste, séniorité (Junior, Confirmé, Senior, Expert, Lead, Architecte), corps de métier (Dev, QA, Data, DevOps, Cyber, PM, BA, Architect, Support, Design, Other)
- **Mobilité** — Ville de résidence, mobilité géographique, télétravail accepté
- **Tarification** — TJM cible en euros HT
- **Compétences** — Tags catégorisés (Langages, Frameworks, Bases de données, Cloud, CI/CD, Outils, Méthodologies, Data, Plateformes…)
- **Expériences** — Liste d'expériences avec client, rôle, dates, descriptif, technologies
- **Formations** — Diplômes et certifications
- **Langues** — Liste avec niveau (A1 à C2)
- **Documents** — CV source, références, attestations, stockés sur Supabase Storage

Le statut du consultant prend l'une des cinq valeurs suivantes :

| Statut | Sens |
|---|---|
| Disponible | Profil immédiatement positionnable |
| Bientôt dispo | Mission se terminant dans moins de 30 jours |
| En mission | Mission active en cours |
| Indisponible | Profil mis en pause (congé, refus, indispo longue) |
| Archivé | Profil masqué de la liste active (RGPD : conservé 3 ans maximum sans interaction) |

### 2.3 Vivier de prospection et bibliothèque active

Centrium ne sépare plus physiquement vivier et bibliothèque — toutes les fiches cohabitent dans `/consultants`. La distinction se fait par :

- **Présence d'une mission `proposed` ou `active`** → le profil bascule automatiquement vers `/cv-pushed` (CV envoyé en attente) ou `/en-mission` (mission active).
- **Profils sans mission en cours** → visibles dans `/consultants` (bibliothèque active).
- **Profils marqués prospects** → onglet **Prospects** ou page `/prospects` pour sourcing externe.

Un profil n'est jamais présent en double dans deux écrans. Vous suivez son cycle de vie depuis Consultants → CV poussés → En mission → retour Consultants en fin de mission.

### 2.4 Filtres et recherche avancée

La page `/consultants` propose quatre dimensions de filtre cumulables :

1. **Recherche textuelle** — Nom, prénom, e-mail, titre, compétences. Debounced à 200 ms.
2. **Corps de métier (Job Family)** — Sélection multiple : Dev, QA, Data, DevOps, Cyber, PM, BA, Architect, Support, Design.
3. **Ville** — Sélection multiple alimentée dynamiquement par les fiches déjà saisies.
4. **Archivés** — Toggle pour réintégrer ou non les profils archivés.

Le compteur de résultats est actualisé en temps réel. Une pagination en pied de page permet de choisir 10, 25, 50 ou 100 lignes par page (préférence mémorisée).

### 2.5 Suivi disponibilité et alertes intercontrat

Centrium calcule automatiquement quand un consultant approche de la fin de sa mission. Quinze jours avant la date de fin, une alerte **Intercontrat à anticiper** est générée dans le centre d'alertes ([§11.3](#113-alertes-prioritaires)) et le statut bascule en **Bientôt dispo**.

À J-0 (date de fin de mission atteinte), si aucune nouvelle mission n'est positionnée, le statut redevient **Disponible** et une alerte critique est levée.

> 💡 **Astuce** — Configurez l'intervalle d'anticipation dans `Paramètres > Apparence > Préférences métier` si vous travaillez avec des préavis plus longs.

### 2.6 Pousser un CV vers une mission

Depuis une fiche consultant ou la liste, cliquez sur **Pousser CV**. Une boîte de dialogue s'ouvre :

1. Sélectionnez une offre existante dans le menu déroulant (alimenté par `/offers`).
2. Ajustez le TJM proposé (pré-rempli avec le TJM cible du consultant).
3. Confirmez.

Une mission de statut `proposed` est créée. Le profil disparaît de `/consultants` et apparaît dans `/cv-pushed`. L'opportunité associée passe automatiquement au statut **CV envoyé** dans le CRM.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/consultants` (Q3 2026)
- Import en masse par parsing CV par lot : roadmap **Q4 2026**
- Sécurité du stockage CV : [`SECURITY_WHITEPAPER.md §6.3`](./SECURITY_WHITEPAPER.md)
- Contact support pour migration depuis Boondmanager / Excel : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 3. CV Optimizer

Le CV Optimizer est le moteur qui transforme une fiche consultant en CV commercial au format Centrium, optimisé pour une mission cible.

### 3.1 Comment fonctionne l'optimisation IA

Le CV Optimizer applique un ensemble de **règles métier strictes** héritées du livret de fabrication CV de QuadCore. Le moteur peut :

- Reformuler des phrases pour les rendre plus impactantes
- Réorganiser les expériences par pertinence vis-à-vis de l'offre
- Prioriser les compétences correspondant aux mots-clés de l'offre
- Densifier le résumé commercial à partir des éléments factuels

Le moteur **ne peut jamais** :

- Inventer une expérience, un client, une certification ou une langue
- Modifier les dates ou la durée d'une mission
- Ajouter une compétence absente du profil source
- Modifier un niveau (séniorité, langue, certification)

> 🔒 **Sécurité** — Cette contrainte est appliquée par un garde-fou côté serveur (`guardrails.noInvention`). Si une suggestion contient un élément non sourcé, elle est signalée comme `flaggedClaim` et n'est pas appliquée. Voir [`SECURITY_WHITEPAPER.md §2.2`](./SECURITY_WHITEPAPER.md) — "Zero invention IA".

Un score de confiance global (0 à 100) est affiché après chaque génération. Il combine la qualité de la source (richesse de la fiche), le matching avec l'offre, et le respect du principe de non-invention.

> ⚠️ **Attention** — Le moteur fonctionne aujourd'hui en mode **mock IA déterministe** (règles métier + heuristiques internes). Le passage en mode **Claude API live** (Anthropic) est planifié **Q3 2026** avec déploiement progressif. Le comportement de garde-fou reste identique dans les deux modes.

### 3.2 Les 3 templates

Centrium propose trois templates de rendu, chacun adapté à un cas d'usage différent :

| Template | Usage recommandé | Caractéristiques |
|---|---|---|
| **Centrium Standard** | Profil polyvalent, premier envoi | Équilibré, lisible, édition inline complète |
| **Centrium Dense** | Senior avec 8+ missions | Typographie serrée, header sombre, maximise le contenu |
| **Centrium Executive** | Lead, architecte, direction | Très aéré, typo large, met en valeur les responsabilités |

Le template par défaut de l'organisation se configure dans `Paramètres > Branding`. Vous pouvez le changer ponctuellement pour chaque CV depuis le sélecteur en haut à droite du preview.

### 3.3 Édition inline

Une fois le CV généré, activez le **mode édition** en cliquant sur l'icône crayon. Chaque champ du CV devient cliquable :

- **Titre**, **résumé**, **expériences**, **formations**, **compétences** — tous éditables directement sur le preview.
- Les **badges compétences** se réordonnent par drag-and-drop.
- Cliquez sur un badge pour le supprimer (uniquement de cette version du CV — la fiche source n'est pas modifiée).

Les modifications sont stockées comme `overrides` au-dessus du CV généré. Le bouton **Annuler les modifications** restaure la version IA d'origine. Vos overrides ne sont pas sauvegardés sur la fiche consultant — c'est délibéré, le CV optimisé est une vue commerciale, pas la source.

> 💡 **Astuce** — Pour propager une correction sur le profil de fond (par exemple un titre de mission corrigé), retournez sur la fiche consultant et éditez l'expérience.

### 3.4 Personnalisation par offre

La colonne de gauche du CV Optimizer accepte trois champs d'alignement :

1. **Sélection d'une offre existante** — Les champs ci-dessous se pré-remplissent automatiquement.
2. **Titre de l'offre** — Pour reformuler le titre du CV en miroir.
3. **Compétences attendues** — Liste séparée par des virgules. Le moteur priorise ces compétences dans la section Skills.
4. **Description / contexte mission** — Texte libre. Le moteur reformule le résumé pour s'aligner sémantiquement sans inventer.

Le **score de matching** s'affiche après génération, accompagné des compétences trouvées (`matchedSkills`) et manquantes (`missingSkills`). Pour les compétences manquantes, le moteur peut proposer des suggestions : pour chacune, un verdict est rendu — `strong` (preuves solides dans le profil), `plausible` (indices indirects), `unsupported` (aucune preuve, suggestion rejetée).

### 3.5 QR code vCard intégré

Chaque CV généré inclut en pied de page un QR code vCard pointant vers :

- Le profil LinkedIn du consultant si renseigné.
- Sinon, un fallback contact : nom + e-mail + téléphone, encodés directement dans le QR.

Le QR code est généré côté client en SVG, sans appel externe. Il fonctionne hors-ligne après scan.

### 3.6 Export PDF et DOCX

Deux exports sont proposés :

- **PDF** — Rendu fidèle au preview, fonts embedded, taille A4. Génération côté navigateur. Délai typique : **< 5 secondes** pour un CV de 2 à 3 pages. Idéal pour envoi par e-mail ou impression.
- **DOCX** — Document Word éditable. Utile lorsque le client final demande à pouvoir retoucher. Le DOCX perd certaines mises en forme typographiques fines (gradients, effets) par nature du format.

Le fichier est nommé automatiquement `CV_<Prénom>_<Nom>_<Template>_<Date>.<pdf|docx>`.

> ⚠️ **Attention** — L'export DOCX est limité au layout **Standard**. Les templates **Dense** et **Executive** sont exportés en PDF uniquement, pour préserver le rendu typographique fidèle. Une extension DOCX multi-layouts est étudiée pour **Q1 2027**.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/cv-optimizer` (Q3 2026)
- Règlement intérieur du moteur CV : `.claude/skills/cv-generation/SKILL.md` (interne)
- Politique "Zero invention IA" : [`SECURITY_WHITEPAPER.md §2.2`](./SECURITY_WHITEPAPER.md)
- Contact support pour personnalisation de template : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 4. Matching et appels d'offres

### 4.1 Capturer un AO

Centrium accepte un appel d'offres sous trois formes depuis `/offers > Nouvelle offre` :

- **Texte brut** collé depuis un e-mail ou un PDF.
- **Capture d'écran** (PNG, JPG) drag-and-droppée — l'IA fait du OCR puis extrait les champs.
- **Saisie manuelle structurée** champ par champ.

### 4.2 Extraction IA

L'extraction renvoie une fiche structurée contenant :

- Intitulé du poste
- Compétences requises (`required_skills`)
- Compétences appréciées (`nice_to_have`)
- TJM (fourchette si précisée)
- Lieu et télétravail
- Dates de démarrage et durée
- Client final (si mentionné)
- Source / contact recruteur

Les champs sont éditables avant validation. La fiche d'offre rejoint la liste `/offers`. **Délai typique de parsing** : moins de 60 secondes pour un AO standard, jusqu'à 90 secondes pour un AO scanné en image.

### 4.3 Génération de fiche de poste PDF

Depuis une offre, le bouton **Export PDF** produit une fiche de poste propre, brandée à votre identité visuelle, prête à envoyer à un consultant pour confirmer son intérêt avant push.

### 4.4 Score de matching

Depuis `/matching`, sélectionnez une offre puis cliquez sur **Lancer le matching**. Le moteur parcourt votre bibliothèque et retourne les consultants les plus pertinents, classés par score (0 à 100). Le score combine :

- Recouvrement des compétences (requises + appréciées)
- Séniorité demandée vs séniorité du profil
- Disponibilité (Disponible et Bientôt dispo en priorité)
- Localisation et mobilité
- Adéquation TJM

Chaque résultat affiche le détail des compétences matchées et manquantes, ainsi qu'un niveau de confiance qualitatif (Élevé, Moyen, Faible).

> 💡 **Astuce** — Privilégiez les profils avec un score supérieur à 70 et un niveau de confiance Élevé pour vos premiers envois. En-dessous, le risque d'écart vs attentes client augmente.

### 4.5 Workflow : proposer un consultant à une opportunité

Depuis la page Matching, sur la ligne d'un résultat, cliquez sur **Pousser ce profil**. Cela ouvre le même dialogue qu'au [§2.6](#26-pousser-un-cv-vers-une-mission) : confirmation du TJM, création d'une mission `proposed`, et basculement automatique de l'opportunité au statut **CV envoyé**.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/matching-ao` (Q3 2026)
- Réponse automatisée aux AO (post-MVP) : roadmap **Q1 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 5. CRM commercial

Le CRM Centrium est un pipeline kanban à 9 colonnes accessible depuis `/crm`. Chaque carte représente une opportunité commerciale (poste à pourvoir chez un client).

### 5.1 Pipeline kanban : les 9 statuts

| Statut | Sens | Couleur |
|---|---|---|
| **Nouveau** | Opportunité fraîchement saisie, pas encore actionnée | Gris |
| **Contacté** | Premier contact pris avec le donneur d'ordre | Bleu ciel |
| **En discussion** | Échanges en cours pour qualifier le besoin | Bleu |
| **CV envoyé** | Au moins un CV poussé au client | Violet |
| **Entretien client** | Consultant en entretien chez le client | Fuchsia |
| **Négociation** | Conditions discutées (TJM, démarrage, durée) | Ambre |
| **Gagné** | Mission signée | Vert |
| **Perdu** | Opportunité conclue négativement | Rouge |
| **En veille** | Suspendue (gel client, redémarrage prévu plus tard) | Gris foncé |

Les colonnes **Gagné**, **Perdu** et **En veille** sont visuellement séparées des étapes actives, et leurs montants ne sont pas comptabilisés dans le pipeline total affiché en haut de page.

### 5.2 Créer une opportunité

Bouton **Nouvelle opportunité**. Champs :

- Intitulé (obligatoire)
- Client (ESN intermédiaire ou client final, depuis le carnet de contacts)
- Type de besoin (régie, forfait, sourcing)
- TJM cible
- CA prévisionnel (`expected_revenue`)
- Date de démarrage souhaitée
- Tags
- Notes libres

L'opportunité atterrit en colonne **Nouveau** par défaut.

### 5.3 Glisser-déposer : changer le statut

Faites glisser une carte d'une colonne à l'autre. Le changement est appliqué immédiatement (optimistic update). Si le serveur rejette, la carte revient à sa position d'origine et un toast d'erreur s'affiche.

### 5.4 Suivi temps réel des collègues

Lorsque plusieurs membres de l'équipe travaillent simultanément sur le CRM :

- Vous voyez en direct les cartes saisies par les autres apparaître.
- Pendant qu'un collègue glisse une carte, un **ghost coloré** indique sa position en temps réel.
- Une bannière en bas indique "X collègue(s) en ligne sur le CRM".

Cette synchronisation utilise Supabase Realtime (canal `crm:org-<id>`). La latence typique est inférieure à 300 ms.

### 5.5 Activité de l'organisation

Chaque action significative (création, déplacement, suppression d'opportunité, push d'un CV, validation d'un CRA, paiement de facture) est broadcastée vers un canal d'activité d'organisation. La timeline de ces événements est consultable via la cloche d'activité dans le header.

### 5.6 Conversion : gagné / perdu / en veille

- **Gagné** → Une mission est créée automatiquement, le consultant proposé bascule en **En mission**, et le compteur "Consultants en mission" du dashboard est incrémenté.
- **Perdu** → Une raison de perte est demandée (budget, profil, timing, autre). Statistiques exploitables dans les rapports.
- **En veille** → Pas d'action automatique. Une alerte de relance peut être programmée pour J+30.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/crm` (Q3 2026)
- Personnalisation des colonnes du pipeline : roadmap **Q1 2027**
- Webhooks sortants sur changement de statut : roadmap **Q1 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 6. Carnet de contacts

Le carnet de contacts (`/contacts`) centralise toutes vos relations externes : recruteurs, commerciaux, managers, RH, clients finaux, ESN partenaires, acheteurs.

### 6.1 Recruteurs, clients, ESN partenaires

Chaque contact est typé selon une liste fermée :

| Type | Usage |
|---|---|
| Recruteur | Recruteur en cabinet ou interne |
| Commercial | Sales ESN |
| Manager | Manager opérationnel chez le client |
| Client final | Dirigeant ou décideur côté client |
| ESN partenaire | Société avec qui vous sous-traitez ou co-traitez |
| Acheteur | Achats / sourcing |
| RH | Ressources humaines |
| Consultant | Consultant en réseau (différent du module Consultants) |
| Autre | Cas non couverts |

Une fiche contact contient nom, e-mail, téléphone, entreprise, fonction, LinkedIn, et un journal d'interactions horodatées.

### 6.2 Tags personnalisés

Vous pouvez attacher autant de tags que nécessaire à chaque contact (par exemple : Banque, IDF, RegieJava, ContactChaud). Les tags sont propres à votre organisation. Filtrez la liste en cliquant sur un tag.

### 6.3 Rappels et interactions

Quatre actions rapides sont disponibles depuis la liste :

- **Contacté** — Stampe la date d'aujourd'hui sur `last_interaction`. Idéal après un appel rapide.
- **Rappel** — Programme une relance à une date donnée. Une alerte est levée le jour J.
- **Éditer** — Ouvre la fiche complète.
- **Supprimer** — Suppression définitive (irréversible).

### 6.4 Import CSV

Le bouton **Import CSV** accepte un fichier UTF-8 avec les colonnes : `last_name`, `first_name`, `email`, `phone`, `company`, `job_title`, `type`, `tags` (séparés par `;`). Un dry-run précède l'import : vous validez le mapping avant insertion. Les doublons (sur l'e-mail) sont signalés et ignorés par défaut.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/contacts` (Q3 2026)
- Synchronisation e-mail entrant (IMAP/Gmail/Outlook) : roadmap **Q2 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 7. Contrats

Le module Contrats (`/contracts`) gère le cycle de vie complet des engagements signés avec vos consultants et vos clients.

### 7.1 Générer un contrat depuis une mission

Depuis une mission active (issue d'une opportunité gagnée), cliquez sur **Générer le contrat**. Le contrat est pré-rempli avec :

- Vos mentions légales (raison sociale, SIREN, adresse, TVA)
- Les coordonnées du consultant
- Les coordonnées du client (depuis l'opportunité)
- Le TJM, la durée, la date de démarrage
- Les conditions de facturation et de paiement par défaut

### 7.2 Templates personnalisables

Plusieurs templates de contrats sont fournis : Régie ESN, Régie client direct, Sous-traitance. Vous pouvez surcharger le contenu en éditant le template depuis `/contracts/templates` (admin uniquement).

### 7.3 Statuts

Un contrat peut prendre 8 statuts :

| Statut | Sens |
|---|---|
| Brouillon | En cours de rédaction |
| À relire | En attente de validation interne |
| Envoyé | Transmis au signataire |
| Signé | Retourné signé |
| Actif | Mission en cours d'exécution |
| Terminé | Mission terminée à terme |
| Résilié | Rupture anticipée |
| Annulé | Contrat non exécuté |

### 7.4 Stockage et confidentialité

Les PDF de contrats signés sont stockés sur Supabase Storage dans un bucket privé. L'accès est protégé par les politiques RLS Centrium : seuls les membres de votre organisation ayant le rôle Admin, Business Manager ou Finance peuvent télécharger. Le consultant signataire peut accéder à son propre contrat depuis son portail ([§12.4](#124-contrats-signés)).

> 🔒 **Sécurité** — Les URLs de téléchargement sont signées et expirent au bout de 60 secondes. Ne pas les copier ni les partager. Détails dans [`SECURITY_WHITEPAPER.md §6.3`](./SECURITY_WHITEPAPER.md).

> ⚠️ **Attention** — La **signature électronique intégrée** (DocuSign / Yousign) n'est pas encore disponible dans la version 1.0. Roadmap : **Q1 2027**. Aujourd'hui, l'export PDF + signature externe + re-upload signé reste la procédure.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/contrats` (Q3 2026)
- Signature électronique intégrée : roadmap **Q1 2027**
- Conservation et durée légale : [`SECURITY_WHITEPAPER.md §7.2`](./SECURITY_WHITEPAPER.md)
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 8. CRA — Comptes-rendus d'activité

Le CRA (`/timesheets`) est le relevé mensuel des jours travaillés par un consultant chez un client. C'est la pièce déclencheur de la facturation.

### 8.1 Calendrier interactif jour par jour

Cliquez sur **Nouveau CRA** ou ouvrez un CRA existant pour accéder au calendrier. Chaque jour ouvré du mois est représenté par une case cliquable. Un clic cycle entre les types de journée disponibles. Les week-ends et jours fériés français sont pré-coloriés.

### 8.2 Types de jours

| Type | Couleur | Compte pour facturation |
|---|---|---|
| Travaillé (1 jour) | Violet | Oui |
| Demi-journée travaillée | Violet clair | Oui (0,5) |
| RTT | Bleu | Non |
| Maladie | Orange | Non |
| Congé payé | Vert clair | Non |
| Férié | Gris | Non |
| Absence | Rouge | Non |

Le total de jours travaillés se calcule en temps réel en bas du calendrier.

### 8.3 Validation côté Business Manager

Quatre statuts existent :

| Statut | Sens | Action suivante |
|---|---|---|
| Brouillon | Saisie en cours | Soumettre |
| Soumis | En attente de validation BM | Valider ou rejeter |
| Validé | Approuvé, facturable | Générer la facture |
| Rejeté | Refusé, retour saisie | Corriger et resoumettre |

À la validation, Centrium génère automatiquement une facture associée. Voir [§9.1](#91-génération-automatique-depuis-cra-validé).

### 8.4 Portal consultant : saisie autonome

Si le consultant a accès au [portal](#12-portal-consultant), il saisit lui-même son CRA depuis `/portal/cra`. Le CRA arrive en statut **Soumis** dans votre interface. Vous validez en un clic depuis `/timesheets`.

### 8.5 Export et historique

Chaque CRA validé est exportable en PDF (récapitulatif mensuel signé). L'historique annuel se filtre par consultant ou par client depuis la liste principale. La conservation est de 10 ans par défaut (durée légale de conservation des justificatifs en France).

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/cra` (Q3 2026)
- Validation en masse (multi-CRA) : roadmap **Q4 2026**
- Conservation légale et RGPD : [`SECURITY_WHITEPAPER.md §7.2`](./SECURITY_WHITEPAPER.md)
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 9. Facturation

### 9.1 Génération automatique depuis CRA validé

Dès qu'un CRA passe au statut **Validé**, Centrium crée une facture brouillon associée. Les éléments pré-remplis sont :

- Numéro de facture (séquentiel, format `YYYY-NNNN`)
- Date d'émission (jour de validation du CRA)
- Date d'échéance (par défaut J+30, configurable)
- Client (depuis la mission)
- Lignes : "Prestations consultant X — mois Y" × jours travaillés × TJM
- TVA appliquée (selon paramètres organisation)

Vous pouvez éditer la facture avant envoi : ajouter des lignes (frais, indemnités), modifier l'intitulé, l'échéance.

### 9.2 Mentions légales obligatoires

Les factures Centrium incluent automatiquement les mentions imposées par le Code de Commerce :

- Raison sociale, forme juridique, capital social (depuis branding)
- SIREN, RCS, TVA intracommunautaire
- Adresse du siège
- IBAN et BIC pour le paiement
- Conditions de paiement et pénalités de retard (taux légal × 3 par défaut)
- Indemnité forfaitaire de recouvrement (40 €)

Vérifiez ces mentions une fois pour toutes dans `Paramètres > Branding`.

### 9.3 Statuts factures

| Statut | Sens |
|---|---|
| Brouillon | En cours de rédaction, non envoyée |
| Envoyée | Transmise au client, en attente de paiement |
| Payée | Encaissée |
| En retard | Échéance dépassée sans paiement |
| Annulée | Annulée (avoir à produire si déjà envoyée) |

Les transitions principales :

- **Marquer envoyée** — Bouton sur la facture brouillon, fixe la date d'envoi.
- **Marquer payée** — Bouton sur facture envoyée/en retard, fixe la date d'encaissement.
- **Annuler paiement** — Retour à Envoyée. Utile en cas d'erreur de pointage.
- **Archiver** — Sort la facture de la liste active sans la supprimer (conservée pour la compta).

> ⚠️ **Attention** — Seules les factures en **Brouillon** peuvent être supprimées. Pour une facture envoyée ou payée, archivez plutôt, et émettez un avoir si nécessaire.

### 9.4 Alertes automatiques

Centrium calcule en continu les alertes suivantes :

- **Facture en retard** — Échéance dépassée + facture non payée → alerte priorité haute.
- **CRA en attente** — Soumis depuis plus de 7 jours sans validation → alerte priorité moyenne.
- **Mission se terminant** — Date de fin dans moins de 30 jours → alerte priorité moyenne.
- **Branding incomplet** — Pas de logo ni de couleur primaire → bannière dashboard.

Toutes ces alertes remontent dans `/alerts` et sur le widget Dashboard.

### 9.5 Export Sage / Pennylane

Depuis `/invoices`, le bouton **Exporter** propose deux formats compatibles :

- **Sage** — Format `.csv` mappé sur les écritures Sage 50 / Sage 100.
- **Pennylane** — Export `.csv` avec colonnes au standard Pennylane (date, libellé, débit, crédit, compte).

L'export inclut toutes les factures non encore exportées sur la période sélectionnée, avec un marquage en base pour éviter les doubles écritures.

> 💡 **Astuce** — Centrium ne se substitue pas à votre ERP comptable (Sage, Pennylane, Cegid). Il s'y intègre en complément. Voir la section "Positionnement vs alternatives" dans [`PRESENTATION_ENTREPRISE_ENTERPRISE.md`](./PRESENTATION_ENTREPRISE_ENTERPRISE.md).

### 9.6 Suivi encaissement

Le dashboard `/dashboard` affiche en encart **Facturation** :

- Nombre de factures en attente de paiement
- Nombre de factures en retard (surligné en rouge si > 0)
- Nombre de CRA à valider
- Lien direct vers `/invoices`

Une vue dédiée au cashflow prévisionnel est accessible depuis l'[assistant comptable IA](#10-assistant-comptable-ia).

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/facturation` (Q3 2026)
- Stripe Connect (encaissement direct) : roadmap **Q1 2027**
- Facturation électronique Chorus Pro : roadmap **Q2 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 10. Assistant comptable IA

L'assistant comptable (`/accounting`) est un chat conversationnel qui interroge en temps réel vos données de facturation, CRA et trésorerie.

### 10.1 Questions rapides

Cinq prompts pré-câblés sont accessibles depuis la colonne latérale :

- **Vue d'ensemble** — Synthèse mensuelle (CA, encaissé, en attente).
- **TVA du trimestre** — Calcul automatique de la TVA collectée et déductible.
- **Trésorerie 30 jours** — Projection des encaissements sur 30 jours glissants.
- **CRA à valider** — Liste des CRA soumis non validés avec ancienneté.
- **Factures en retard** — Top 10 des retards avec montants.

Vous pouvez aussi taper librement votre question. L'assistant répond en français, calcule depuis vos données, et propose des blocs copiables (tableaux, montants) pour insertion dans un e-mail.

### 10.2 Limitations

L'assistant comptable ne remplace pas un expert-comptable. Il ne produit pas de liasse fiscale, ne déclare pas votre TVA, et ne valide pas vos écritures. Il sert à :

- Préparer une réunion avec votre comptable (chiffres consolidés).
- Réagir vite à une question client ("où en est ma facture ?").
- Anticiper un trou de trésorerie.

> ⚠️ **Attention** — L'assistant comptable fonctionne aujourd'hui en mode **mock IA** (réponses déterministes calculées localement sur vos données). Le passage en mode **Claude API live** est planifié **Q3 2026** avec déploiement progressif. La logique de calcul reste identique dans les deux modes ; seul le naturel des réponses textuelles évolue.

### 10.3 Confidentialité

Toutes les analyses sont effectuées sur vos données stockées dans votre organisation Centrium, protégées par RLS. En mode mock, aucune information ne sort de votre instance.

> 🔒 **Sécurité** — Lorsque la version Claude API sera activée (**Q3 2026**), les requêtes seront chiffrées en transit (TLS 1.2+) et les données nominatives seront **anonymisées côté serveur** (noms remplacés par des identifiants) avant transmission. Aucune donnée n'est utilisée pour entraîner les modèles d'Anthropic. Détail dans [`SECURITY_WHITEPAPER.md §2.2 et §6.4`](./SECURITY_WHITEPAPER.md).

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/assistant-comptable` (Q3 2026)
- Mode Claude API live : déploiement progressif **Q3 2026**
- Politique IA et anonymisation : [`SECURITY_WHITEPAPER.md §6.4`](./SECURITY_WHITEPAPER.md)
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 11. Dashboard et pilotage

### 11.1 KPIs principaux

Le dashboard `/dashboard` affiche quatre cartes synthétiques en haut de page :

| KPI | Sens | Calcul |
|---|---|---|
| **Consultants en mission** | Profils avec mission `active` | Compte distinct sur `consultants` |
| **Disponibles** | Profils statut `available` ou `soon_available` | Compte sur statuts éligibles |
| **Opportunités ouvertes** | Cartes CRM hors `won`, `lost`, `on_hold` | Compte sur statuts actifs |
| **CA du mois** | Somme HT des factures émises ce mois | + sous-ligne "Encaissé : X €" |

Les chiffres sont animés (compteur progressif) et se mettent à jour automatiquement (Realtime sur `missions`, `invoices`, `timesheets`, `opportunities`, `job_offers`, `consultants`, `alerts`).

### 11.2 Chiffre d'affaires et missions

Sous les KPIs, un graphique `RevenueChart` couvre les 12 derniers mois : barres pour le CA mensuel HT, ligne pour le nombre de missions facturées. Les courbes sont interactives (hover pour les détails).

### 11.3 Alertes prioritaires

L'encart **Alertes prioritaires** affiche les 5 alertes les plus urgentes, triées par priorité (Critique > Important > Moyen > Faible) et par date d'échéance. Chaque alerte affiche :

- Icône colorée selon priorité (rouge, ambre, bleu, gris)
- Titre et description
- Échéance relative (par exemple "dans 3 jours")
- Lien direct vers l'item concerné (facture, CRA, mission)

Le bouton **Tout voir** mène à `/alerts` pour la liste complète.

### 11.4 Actions rapides

Quatre raccourcis en bas de page : **Ajouter consultant**, **Générer un CV**, **Nouvelle opportunité**, **Créer une facture**. Ils ouvrent directement le formulaire correspondant.

Un bouton **Réinitialiser** (admin uniquement) permet de purger les données transactionnelles (missions, CRA, factures, alertes) — utile en démo ou pour repartir d'une base propre.

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/dashboard` (Q3 2026)
- Dashboards personnalisables (widgets dragables) : roadmap **Q2 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 12. Portal consultant

Le portail consultant (`/portal`) est une interface séparée, cloisonnée, destinée aux consultants en mission via votre ESN. Ils n'ont aucun accès à l'application principale (CRM, autres consultants, contacts, etc.).

### 12.1 Espace dédié, accès, login

L'accès se crée depuis la fiche d'un consultant : bouton **Donner accès au portail**. Centrium envoie un e-mail d'invitation avec un lien d'activation. Le consultant définit son mot de passe et se connecte via la même page de login que les utilisateurs internes — le routage le redirige automatiquement vers `/portal/dashboard`.

### 12.2 Saisie CRA

Depuis `/portal/cra`, le consultant voit la liste de ses CRAs (un par mois et par mission). Il peut :

- Créer un nouveau CRA pour le mois en cours
- Saisir son calendrier jour par jour (mêmes types de journée que [§8.2](#82-types-de-jours))
- Soumettre au BM pour validation
- Consulter l'historique validé

### 12.3 Factures reçues

Depuis `/portal/invoices`, le consultant accède aux factures **émises par son ESN** le concernant (factures dont il est le prestataire référencé), au format PDF lisible. C'est utile pour qu'il puisse les rapprocher de ses propres bulletins ou versements de TJM.

### 12.4 Contrats signés

Depuis `/portal/contracts`, le consultant accède aux contrats le concernant : contrat de prestation, avenants, ordres de mission. Chaque document est téléchargeable en PDF.

### 12.5 Documents transmis par l'ESN

Depuis `/portal/documents`, l'ESN peut déposer des documents complémentaires à destination du consultant : notes de procédures, attestations, codes d'accès, fiches de poste. Le consultant les consulte et les télécharge depuis cet écran.

> 🔒 **Sécurité** — Toutes les ressources du portail sont protégées par RLS : un consultant ne peut accéder qu'aux entités où `consultant_id = son_id`. Aucune fuite croisée n'est possible. Détails dans [`SECURITY_WHITEPAPER.md §3.2`](./SECURITY_WHITEPAPER.md).

**Aller plus loin**
- Article centre d'aide : `centrium-platform.com/aide/portal` (Q3 2026)
- Notifications push consultant (mobile responsive) : roadmap **Q2 2027**
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 13. Paramètres organisation

### 13.1 Mon profil personnel

Dans `/settings/profile`, chaque utilisateur configure :

- Prénom, nom, e-mail (modifiable avec re-confirmation par lien)
- Avatar (PNG/JPG, recadré automatiquement)
- Mot de passe (changement)
- Langue d'interface (FR par défaut, EN disponible)
- Notifications par e-mail (alertes critiques, résumé hebdo)

### 13.2 Équipe

Voir [§1.3](#13-inviter-votre-équipe). En complément, l'admin peut :

- Retirer un membre (le membre conserve son compte Centrium mais perd l'accès à votre organisation).
- Changer le rôle d'un membre.
- Voir l'état des invitations en cours (en attente, acceptée, expirée).
- Re-générer un lien d'invitation expiré.

### 13.3 Identité visuelle (logo, couleurs, mentions, signature)

Depuis `/settings/branding`, l'admin configure :

- **Logo** — PNG ou SVG, 512×512 px minimum recommandé, fond transparent.
- **Nom commercial (Brand Name)** — Apparaît dans la sidebar, l'onglet navigateur, les e-mails.
- **Couleur primaire** — Boutons principaux, accents visuels.
- **Couleur d'accent** — Détails et highlights.
- **Tagline pied de page** — Phrase courte affichée sur les documents générés.
- **Signature** — Image PNG transparente, intégrée dans les contrats et e-mails commerciaux.
- **Template CV par défaut** — Standard, Dense ou Executive.

Les modifications sont visibles immédiatement après sauvegarde. Le logo s'applique à la sidebar, aux CV, contrats, factures, en-têtes d'e-mail et favicons.

### 13.4 Confidentialité et RGPD

`/settings/privacy` regroupe les fonctions RGPD :

- **Exporter mes données** — Génère un ZIP contenant l'ensemble des données vous concernant (profil, consultants saisis, opportunités, CRA, factures). Délai garanti : sous 7 jours pour les exports volumineux.
- **Droit à l'oubli** — Demande de suppression du compte. Un délai de 30 jours est appliqué (réversible pendant cette période). Au-delà, suppression définitive.
- **Politique de conservation** — Durées par catégorie (factures 10 ans, CRA 10 ans, fiches consultants 3 ans sans interaction).
- **Sous-traitants** — Liste publique versionnée dans [`TRUST_CENTER.md`](./TRUST_CENTER.md) (Supabase, Vercel, Anthropic, etc.) avec leurs garanties.

> 🔒 **Sécurité** — Le détail du programme de protection des données, des bases légales et des durées de conservation est documenté dans [`SECURITY_WHITEPAPER.md §7`](./SECURITY_WHITEPAPER.md) et publié sur le Trust Center.

### 13.5 Apparence et design

Voir [§1.5](#15-préférences-personnelles). En complément, l'admin peut :

- Définir le **thème par défaut de l'organisation** (sombre ou clair), appliqué aux nouveaux membres.
- Activer/désactiver le **fond animé** par défaut.

**Aller plus loin**
- Manuel administrateur complet : [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md)
- Article centre d'aide : `centrium-platform.com/aide/parametres` (Q3 2026)
- SSO SAML/OIDC : roadmap **Q3 2026**
- Audit log avancé pour DSI : voir [`ADMIN_GUIDE.md §6`](./ADMIN_GUIDE.md)
- Contact support : `support@centrium-platform.com`

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 14. Raccourcis clavier

Les raccourcis fonctionnent partout dans l'application, sauf lorsqu'un champ de saisie a le focus.

| Raccourci | Action |
|---|---|
| `Ctrl/Cmd` + `K` | Ouvrir la recherche globale |
| `G` puis `D` | Aller au Dashboard |
| `G` puis `C` | Aller aux Consultants |
| `G` puis `R` | Aller au CRM |
| `G` puis `O` | Aller aux Offres |
| `G` puis `M` | Aller au Matching |
| `G` puis `T` | Aller aux CRA |
| `G` puis `I` | Aller aux Factures |
| `G` puis `A` | Aller aux Alertes |
| `N` | Nouvelle entité contextuelle (selon la page) |
| `?` | Afficher l'aide raccourcis |
| `Esc` | Fermer un dialog / annuler une action |
| `Ctrl/Cmd` + `S` | Sauvegarder le formulaire actif |
| `Ctrl/Cmd` + `Enter` | Soumettre / valider |

> 💡 **Astuce** — Sur Mac, remplacez `Ctrl` par `Cmd`. Sur Linux et Windows, `Ctrl` s'applique.

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 15. Mobile et tablette

### 15.1 Fonctionnalités disponibles

L'application est responsive et utilisable sur tablette et smartphone. Toutes les pages s'adaptent. Les usages confortables en mobilité sont :

- Consultation du dashboard et des alertes.
- Lecture des fiches consultants.
- Consultation du CRM (lecture seule confortable, déplacement de cartes possible mais moins précis).
- Lecture des factures et CRA.
- Réception d'invitations et acceptation d'accès.

### 15.2 Limitations actuelles

Certaines actions sont conçues pour le desktop et restent fastidieuses sur mobile :

- **Saisie d'un CRA complet** — Le calendrier jour par jour est mieux utilisé sur écran ≥ 10 pouces.
- **Édition inline d'un CV dans le CV Optimizer** — Préférable sur desktop pour le drag-and-drop des badges.
- **Import CSV** — Le drag-and-drop fichier fonctionne mal sur iOS/Android selon les navigateurs.
- **Préview PDF haute résolution** — Le rendu PDF est conçu pour A4 et peut nécessiter un zoom sur smartphone.

> 💡 **Astuce** — Pour vos consultants en déplacement, recommandez l'usage du portail (`/portal`) sur tablette pour la saisie CRA en fin de mois.

> ⚠️ **Attention** — Centrium est **online-first par design**. **Aucun mode offline** n'est planifié à ce jour. **Aucune application native mobile** (iOS/Android) n'est planifiée à ce jour — la stratégie produit privilégie la responsivité web. Les améliorations de l'UX mobile responsive sont au programme **Q2 2027**.

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 16. Limites connues actuelles

L'honnêteté sur les limites fait partie de la posture Enterprise de Centrium. Voici la liste exhaustive et datée des éléments **non disponibles** dans la version 1.0, avec leur statut futur.

| Limite actuelle | Statut futur |
|---|---|
| Pas d'application native mobile (iOS / Android) | **Non planifié** — produit responsive web prioritaire |
| Pas de mode offline | **Non planifié** — produit online-first par design |
| DOCX export limité au layout Standard (Dense/Executive en PDF uniquement) | DOCX multi-layouts à l'étude **Q1 2027** |
| Assistant comptable IA en mode mock (réponses déterministes) | Passage Claude API live **Q3 2026** (déploiement progressif) |
| CV Optimizer en mode mock IA déterministe | Passage Claude API live **Q3 2026** (déploiement progressif) |
| Pas d'API publique REST | Roadmap **Q1 2027** |
| Pas de SDK officiel (TypeScript / Python) | Roadmap **Q2 2027** |
| Pas de webhooks sortants | Roadmap **Q1 2027** |
| Pas de SSO SAML / OIDC | Roadmap **Q3 2026** |
| Pas de MFA TOTP | Roadmap **Q3 2026** |
| Pas de signature électronique intégrée (DocuSign/Yousign) | Roadmap **Q1 2027** |
| Pas de Stripe Connect pour encaissement direct | Roadmap **Q1 2027** |
| Pas de facturation électronique Chorus Pro | Roadmap **Q2 2027** |
| Pas de status page publique opérationnelle | Q3 2026 — `status.centrium-platform.com` |
| Pas de captures d'écran dans le manuel | Q3 2026 — centre d'aide |
| Pas de vidéos tutorielles | Q4 2026 — centre d'aide |
| Pas d'attestation SOC 2 Type I | Q4 2026 |
| Pas d'attestation SOC 2 Type II | Q1 2027 |
| Pas d'évaluation ISO 27001 | Q2 2027 |
| Pas de réponse automatisée aux AO | Roadmap **Q1 2027** |
| Pas de personnalisation des colonnes du pipeline CRM | Roadmap **Q1 2027** |
| Pas de validation CRA en masse | Roadmap **Q4 2026** |
| Pas de dashboards personnalisables (widgets dragables) | Roadmap **Q2 2027** |
| Pas de sync e-mail entrant (IMAP/Gmail/Outlook) | Roadmap **Q2 2027** |

> Cette liste est révisée à chaque release majeure. La version la plus récente reste celle du fichier `docs/produit/MANUEL_UTILISATEUR_ENTERPRISE.md` dans le repo Centrium. La roadmap publique trimestrielle est également consultable dans [`PRESENTATION_ENTREPRISE_ENTERPRISE.md`](./PRESENTATION_ENTREPRISE_ENTERPRISE.md) — section "Roadmap publique 12 mois".

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 17. Aller plus loin

| Vous voulez… | Document à consulter |
|---|---|
| Maîtriser les paramètres administrateur, audit log, gouvernance | [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md) |
| Présenter la sécurité à votre RSSI / DPO | [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md) |
| Comprendre les engagements SLA et les niveaux de support | [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md) |
| Présenter l'architecture technique à votre DSI | [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) |
| Calculer le ROI Centrium pour votre ESN | [`ROI_GUIDE.md`](./ROI_GUIDE.md) |
| Consulter le Trust Center (sous-traitants, certifications, RGPD) | [`TRUST_CENTER.md`](./TRUST_CENTER.md) ou `centrium-platform.com/trust` (Q3 2026) |
| Présenter Centrium à un acheteur 50-100k€ | [`PRESENTATION_ENTREPRISE_ENTERPRISE.md`](./PRESENTATION_ENTREPRISE_ENTERPRISE.md) |
| Accéder au centre d'aide en ligne | `centrium-platform.com/aide` (Q3 2026) |
| Rejoindre la communauté utilisateurs | Annoncée **Q4 2026** (forum + sessions trimestrielles) |
| Contacter le support | `support@centrium-platform.com` — sous 24 h ouvrées |
| Signaler un incident sécurité | `security@centrium-platform.com` — sous 1 h, 24/7 |
| Demander un DPA signé | `dpo@centrium-platform.com` — modèle PDF disponible immédiatement |
| Démarrer un onboarding accompagné | `sales@centrium-platform.com` |

*Section mise à jour le 2026-06-04 — v1.0 Enterprise.*

---

## 18. Glossaire métier

| Terme | Définition |
|---|---|
| **AO** | Appel d'offres. Demande d'un client pour un profil ou une mission précis. |
| **BM** | Business Manager. Responsable du suivi commercial des consultants chez les clients. |
| **CRA** | Compte-rendu d'activité. Relevé mensuel des jours travaillés par un consultant. |
| **DPA** | Data Processing Agreement. Accord de sous-traitance RGPD signé entre responsable de traitement et sous-traitant. |
| **DPO** | Data Protection Officer. Délégué à la protection des données. |
| **ESN** | Entreprise de Services du Numérique. Société qui place des consultants chez des clients. |
| **HT / TTC** | Hors Taxes / Toutes Taxes Comprises. Le TJM est généralement exprimé en HT. |
| **Intercontrat** | Période entre deux missions pendant laquelle le consultant est disponible. |
| **ISO 27001** | Norme internationale de management de la sécurité de l'information. Évaluation Centrium prévue Q2 2027. |
| **JEH** | Jour-Homme. Unité de mesure de la facturation (1 JEH = 1 journée de travail). |
| **KPI** | Key Performance Indicator. Indicateur clé de performance. |
| **MFA** | Multi-Factor Authentication. Authentification à plusieurs facteurs (mot de passe + code TOTP, etc.). Roadmap Centrium Q3 2026. |
| **PITR** | Point-in-Time Recovery. Capacité à restaurer la base de données à un instant T précis (Centrium : 7 derniers jours). |
| **Régie** | Mode de prestation au temps passé, facturé en jours. |
| **RLS** | Row-Level Security. Mécanisme PostgreSQL natif qui restreint l'accès aux lignes selon l'utilisateur et l'organisation. Pilier de l'isolation multi-tenant Centrium. |
| **RPO** | Recovery Point Objective. Perte de données maximale tolérée en cas de sinistre (Centrium : ≤ 24 h grâce aux backups quotidiens + PITR). |
| **RTO** | Recovery Time Objective. Délai maximal de remise en service après sinistre. |
| **SOC 2** | Standard d'audit américain (AICPA) pour les contrôles de sécurité, disponibilité, confidentialité. Centrium : Type I prévu Q4 2026, Type II prévu Q1 2027. |
| **Sourcing** | Activité de recherche et de qualification de nouveaux candidats. |
| **SSO** | Single Sign-On. Authentification unique via un fournisseur d'identité (Azure AD, Okta, Google Workspace). Roadmap Centrium Q3 2026. |
| **TJM** | Taux Journalier Moyen. Prix de vente quotidien d'une prestation, généralement en € HT. |
| **TVA** | Taxe sur la Valeur Ajoutée. 20 % en France pour les prestations de services standard. |
| **Vivier** | Base de consultants qualifiés non encore positionnés. |
| **Push CV** | Envoi proactif d'un CV à un client ou intermédiaire pour une opportunité. |

*Glossaire mis à jour le 2026-06-04 — v1.0 Enterprise.*

---

## Crédits et version

| Élément | Valeur |
|---|---|
| Produit | Centrium |
| Éditeur | QuadCore SAS |
| Version du manuel | 1.0 Enterprise |
| Date de publication | 4 juin 2026 |
| Audience | Administrateurs, Business Managers, Recruteurs, Finance, Consultants (Portal) |
| Langue | Français |
| Contact support | `support@centrium-platform.com` (sous 24 h ouvrées) |
| Contact sécurité | `security@centrium-platform.com` (sous 1 h, 24/7) |
| Contact RGPD / DPO | `dpo@centrium-platform.com` |
| Contact commercial | `sales@centrium-platform.com` |
| Documents complémentaires | [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md), [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md), [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md), [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md), [`ROI_GUIDE.md`](./ROI_GUIDE.md), [`TRUST_CENTER.md`](./TRUST_CENTER.md), [`PRESENTATION_ENTREPRISE_ENTERPRISE.md`](./PRESENTATION_ENTREPRISE_ENTERPRISE.md) |
| Centre d'aide en ligne | `centrium-platform.com/aide` (Q3 2026) |

Ce manuel est mis à jour à chaque release majeure. La version la plus récente est toujours disponible dans le repo Centrium, sous `docs/produit/MANUEL_UTILISATEUR_ENTERPRISE.md`.
