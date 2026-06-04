---
title: "Case Study Template"
subtitle: "Modèle de réussite client + exemple complet"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "case-study-template"
language: "fr-FR"
status: "Référence interne — actif éditorial"
---

# Case Study Template — Centrium

> Modèle éditorial pour produire les case studies clients de Centrium.
> Document interne, à diffusion limitée Marketing + Sales + Produit + Direction.
> Tout chiffre cité dans l'exemple de la section 6 est **fictif et illustratif**.

---

## 1. Pourquoi des case studies

### 1.1 L'enjeu commercial

Les case studies sont **le levier de conversion #1** des cycles de vente Enterprise B2B. Trois mécanismes opèrent :

1. **Validation par les pairs.** Un acheteur ESN ne croit pas un éditeur qui parle de lui-même. Il croit un autre dirigeant d'ESN qui décrit son propre vécu.
2. **Désamorçage du risque perçu.** "Si une ESN de taille comparable a déployé Centrium en 14 jours sans perdre de données, alors c'est possible pour nous."
3. **Ancrage du ROI.** Un chiffre vérifié, attribué à un client identifiable, surpasse n'importe quelle promesse marketing.

### 1.2 Le constat audit

L'audit interne `ENTERPRISE_AUDIT.md` (juin 2026) note la documentation commerciale **4,5 / 10**. Le commentaire est sans détour :

> "0 case study client. Pas un. Pour un acheteur ESN, la première question est : *qui utilise Centrium aujourd'hui dans ma situation ?*."

L'absence de case study est qualifiée de **risque commercial critique**. Sans correction, le seuil de signature des contrats > 20 k€ reste structurellement difficile à franchir.

### 1.3 La cible

| Échéance | Objectif |
|---|---|
| **Q3 2026** | 1 case study client réelle publiée |
| **Q4 2026** | 3 case studies cumulatives (1 ESN en croissance · 1 cabinet conseil · 1 groupe / multi-entités) |
| **Q1 2027** | Galerie clients publique avec logos + résumés courts |

Avec 3 case studies de qualité, l'objectif interne est de **remonter la documentation commerciale à ≥ 8 / 10**, et la confiance globale Enterprise à **9,5 / 10**.

### 1.4 Critères de qualité d'une case study Centrium

Une case study Centrium est valide si elle remplit **toutes** les conditions suivantes :

- [ ] Le client est nommément cité (sauf accord motivé d'anonymisation partielle).
- [ ] Au moins **3 métriques chiffrées** comparant avant / après, avec source et méthode de mesure.
- [ ] Au moins **2 quotes attribuables** (nom + rôle + organisation).
- [ ] Une mention honnête des **difficultés** rencontrées et de **ce qui reste à améliorer**.
- [ ] Validation juridique et communication interne du client formellement signée.
- [ ] Aucune donnée individuelle de consultant ESN visible (RGPD).
- [ ] Méthode de mesure expliquée (période, échantillon, baseline).

Si l'une de ces conditions manque, le document devient un **témoignage**, pas une case study, et bascule dans un format plus court.

---

## 2. Structure standard d'une case study

Le format ci-dessous est **prescriptif**. Toute case study Centrium suit cette structure, dans cet ordre. La longueur cible est de **1500 à 2500 mots** pour la version web, **2 pages A4** pour la version PDF imprimable, et **1 page** pour le format "one-pager" partageable.

### 2.1 Frontmatter YAML

Toute case study commence par un frontmatter YAML qui sert à l'indexation, la recherche et la génération automatique des éléments de méta (slug URL, balises Open Graph, JSON-LD).

```yaml
---
client: "Nom de l'ESN"
client_logo: "url ou chemin vers logo"
secteur: "ESN spécialisée X / Cabinet de conseil / Groupe multi-entités"
taille: "X consultants, X BMs, X recruteurs, X finance"
géographie: "France · X villes ou pays"
durée_partenariat: "depuis YYYY-MM"
date_publication: "YYYY-MM-DD"
modules_centrium:
  - bibliothèque
  - cv-optimizer
  - matching
  - crm
  - contrats
  - cra
  - facturation
  - assistant-ia
  - portal
contact_référence: "Nom Prénom, Rôle (ou anonymisé)"
contact_email: "email@client.fr (ou null)"
quote_principale: "Citation courte 1 phrase"
chiffre_phare: "Variation %, valeur absolue, ou multiple"
type_case_study: "ESN-croissance | Cabinet-conseil | Groupe-multi-entités"
---
```

### 2.2 Titre

Le titre **n'est jamais** "Cas client X". Il décrit le résultat principal :

- ✅ "Comment Octantis Consulting a divisé par 4 son temps de réponse aux AOs"
- ✅ "Pourquoi Hexalys a centralisé 220 consultants dans Centrium en 21 jours"
- ❌ "Cas client Octantis Consulting"
- ❌ "Octantis et Centrium"

### 2.3 Encadré "En une page" (Executive Summary)

Bloc situé en haut de page, lisible en 30 secondes. Composé de :

- **3 chiffres clés** mis en évidence (typographie XL, couleur d'accent).
- **1 quote courte** attribuable (1 phrase).
- **3 résultats principaux** sous forme de bullets.
- **1 mini-fiche client** sur la droite : logo, secteur, taille, ville, modules utilisés.

### 2.4 Section "Contexte"

300 à 500 mots. Décrit le client :

- Activité, ancienneté, périmètre.
- Effectif et géographie.
- Maturité technologique avant Centrium.
- Stack pré-existante (Notion, Excel, Boondmanager, dev interne…).
- Pression métier ou contexte stratégique (croissance, rachat, structuration, refonte digitale).

Le ton est **factuel, posé**. Pas de drame. On installe le décor.

### 2.5 Section "Le problème"

400 à 700 mots. **Narration**, pas une liste de doléances. Le lecteur doit s'identifier.

Structure recommandée :

1. **L'incident déclencheur** — un AO perdu, un consultant en intercontrat non détecté, une facture égarée. Une scène concrète.
2. **Les frictions quotidiennes** — temps perdu, doublons d'outils, désynchronisation des données.
3. **L'impact financier ou humain** — burn-out équipe, perte de marge, perte de réputation auprès des consultants.
4. **Une quote utilisateur** — citation du BM, du CEO ou de la finance sur le problème (50-80 mots).

### 2.6 Section "La décision"

300 à 500 mots.

- **Critères d'évaluation explicites** : sécurité, IA, hébergement EU, pricing, support, roadmap, modèle d'engagement.
- **Alternatives considérées** : Boondmanager, ConnectWise, Akuiteo, MakeIT, dev interne, statu quo. Au moins 2 alternatives nommées.
- **Le tipping point** — l'élément déterminant qui a basculé la décision. Souvent : une démo personnalisée, une recommandation d'un pair, la transparence sur la sécurité, ou la flexibilité contractuelle.

### 2.7 Section "Le déploiement"

400 à 600 mots. Le lecteur veut **se projeter** sur sa propre mise en œuvre.

| Élément | Détail attendu |
|---|---|
| Calendrier | Dates : J0 (cadrage) → J+14 ou J+21 (mise en production) → J+30 (premier mois utilisé en routine) |
| Volumétrie migrée | Nb consultants, nb opportunités, nb contrats, nb missions en cours |
| Équipe formée | Nb BMs, nb recruteurs, nb finance, nb consultants ayant activé leur portail |
| Difficultés rencontrées | **2 à 3 difficultés réelles**, honnêtes : qualité initiale des données, résistance d'un BM senior, paramétrage TVA spécifique, intégration comptable… |
| Résolution | Comment chaque difficulté a été levée, par qui, en combien de temps |

### 2.8 Section "Les résultats" (chiffrés)

C'est le cœur de la case study. Présentation en tableau **avant / après / variation**, avec source et période de mesure.

```markdown
| Métrique                       | Avant Centrium | Après Centrium  | Variation        |
|--------------------------------|----------------|-----------------|------------------|
| Temps de réponse AO            | 3 jours        | 30 minutes      | ÷ 144            |
| Taux d'AOs gagnés              | 12 %           | 18 %            | +50 % relatif    |
| Taux d'intercontrat            | 22 %           | 9 %             | -59 % relatif    |
| Erreurs facturation            | 4 / an         | 0 / an          | -100 %           |
| Productivité BM (mesure interne)| baseline       | +30 %           | +30 %            |
```

**Règles strictes** :

- Toujours mentionner **la période** de mesure (3 mois minimum après mise en production).
- Toujours mentionner **la méthode** (mesure interne, échantillon, baseline historique).
- Toujours mentionner **l'échantillon** si pertinent (sur 24 AO traités vs 18 l'année précédente).
- **Pas de chiffre flottant** sans contexte ("plus rapide" est interdit, "÷ 144 sur 24 AO mesurés Q1 2026" est valide).

### 2.9 Section "Top 3 modules à fort impact"

Le client identifie les 3 modules Centrium qui ont eu le plus fort impact dans son cas précis. Pour chacun :

- **Pourquoi ce module** — quel problème spécifique il a résolu.
- **Comment il est utilisé** — usage concret au quotidien.
- **Impact mesuré** — chiffre attribuable au module seul si possible.

### 2.10 Section "Ce qui reste à améliorer"

Section obligatoire de **150 à 250 mots**. Liste 1 à 2 limitations identifiées par le client, formulées sans complaisance.

Exemples acceptés :

- "Le module assistant comptable IA est utile pour les questions courantes, mais il ne remplace pas notre expert-comptable et nous le savions."
- "Nous attendons l'arrivée du SSO Azure AD prévu Q3 2026 pour le déployer auprès de nos 6 BMs."
- "La signature électronique des contrats n'est pas encore intégrée — nous utilisons DocuSign en parallèle."

L'honnêteté de cette section renforce la crédibilité des résultats positifs.

### 2.11 Section "Témoignage final"

Une quote longue (50 à 120 mots), signée :

- Nom + Prénom
- Rôle
- Organisation
- Photo (optionnel, sur accord)

Le contenu doit dépasser la satisfaction générique. On cherche un témoignage qui aborde **le changement** : ce qui se fait différemment depuis Centrium, ce que l'équipe a gagné en confort ou en confiance.

### 2.12 Section "Coordonnées de référence"

Si le client accepte :

- Nom + Prénom + Rôle
- Email professionnel
- Conditions d'usage (uniquement sur appel programmé par l'équipe Sales Centrium, sous NDA réciproque).

Si refus partiel : "Référence anonymisée à la demande du client. Disponible sur demande qualifiée."

---

## 3. Règles éditoriales

### 3.1 Chiffres

- **Toujours sourcer** : la source de chaque chiffre est nommée (mesure interne CRM, export ERP, audit interne, rapport finance).
- **Toujours dater** : la période de mesure est explicite (Q1 2026 vs Q1 2025).
- **Toujours qualifier** : "+30 %" se complète de "sur les 6 BMs principaux".
- **Pas de moyennes trompeuses** : si la médiane est plus parlante que la moyenne, on utilise la médiane et on le dit.

### 3.2 Quotes

- **Citations approuvées explicitement** par le client (e-mail de validation conservé).
- **Aucune retouche** sans accord. Les fautes mineures peuvent être corrigées, le sens jamais.
- **Attribuables** : nom, rôle, organisation. L'anonymat doit être justifié (clause client, NDA, contexte sensible).

### 3.3 Honnêteté

- Signaler les **difficultés rencontrées** et la **manière de les résoudre**.
- Mentionner au moins **un point négatif ou limite** ("Ce qui reste à améliorer").
- Pas d'embellissement : si Centrium n'a pas réduit le temps de réponse de 90 %, on n'écrit pas 90 %.

### 3.4 Marketing toléré, marketing interdit

| ✅ Toléré | ❌ Interdit |
|---|---|
| "Centrium a permis de…" | "Avec Centrium, tout devient simple." |
| Mise en évidence des chiffres clés en typographie | Superlatifs non sourcés ("le meilleur", "le plus rapide") |
| Quote enthousiaste du CEO | Réécriture marketing d'une quote |
| Encart pédagogique sur un module | Détournement d'une case study en argumentaire produit |

### 3.5 RGPD et données

- **Aucune donnée individuelle de consultant ESN ne doit apparaître** : ni nom, ni e-mail, ni photo, ni CV, ni TJM individuel.
- Les chiffres agrégés sont autorisés (taux d'intercontrat, nb missions, marge globale).
- Si une capture d'écran de l'app est utilisée, elle est **anonymisée** (données de démo).

### 3.6 Référencement SEO

- Le titre de la page web suit la structure : `Comment [Client] a [Résultat] | Cas client Centrium`.
- Méta-description : 150-160 caractères, intègre le nom du client, le secteur, et le résultat principal.
- Slug URL : `/clients/[slug-client]` — court, sans accents, sans dates.
- Mots-clés cibles : "[client] ESN", "logiciel ESN", "[problème ESN] solution", "Centrium témoignage".
- Schema.org `Organization` + `Review` + `Article` sur la page web.

---

## 4. Processus de production

Une case study Centrium se produit en **4 à 6 semaines** entre le moment où le client est identifié et la publication. Voici les 7 étapes.

### Étape 1 — Identifier un client pilote (semaine 0)

**Qui** : Sales + Customer Success.

**Critères de sélection** :

- Le client utilise Centrium en production depuis **3 mois minimum**.
- Il a obtenu **des résultats mesurables** (NPS interne ≥ 8, métriques disponibles).
- Il dispose d'un **interlocuteur enthousiaste** : BM, CEO, COO ou directeur opérationnel.
- Il représente l'un des 3 archétypes ciblés (ESN croissance, cabinet conseil, groupe multi-entités).

**Livrable** : fiche d'identification (1 page) validée par Sales + Marketing.

### Étape 2 — Pitcher la case study (semaine 0)

**Qui** : Sales (l'interlocuteur de référence) + Marketing.

**Objectif** : convaincre le client de l'intérêt **réciproque**.

**Pitch type** :

> "Vous avez obtenu des résultats que peu d'ESN obtiennent. Nous aimerions raconter votre histoire — en respectant votre temps, vos données et votre confidentialité. La valeur pour vous : visibilité produit, recrutement renforcé, positionnement de référence sur votre marché. La valeur pour nous : crédibilité auprès de prospects comparables. Vous validez chaque ligne avant publication. Charge totale côté vous : 1 h d'interview + 1 h de relecture."

**Livrable** : accord verbal puis lettre d'engagement signée (clause de validation, périmètre de publication, droit de retrait à 30 jours).

### Étape 3 — Interview structurée (semaine 1)

**Qui** : Marketing produit + 1 personne tech (PM ou CS) pour rebondir.

**Durée** : 45 minutes à 1 heure. Enregistrée avec accord, transcrite.

**Méthode** : questions ouvertes (cf. section 5). Le but n'est pas de faire valider un argumentaire mais de **récolter de l'histoire**.

**Livrable** : transcription brute + 1 page de synthèse (chiffres récoltés, quotes intéressantes, axes narratifs identifiés).

### Étape 4 — Collecte des chiffres (semaines 1 à 3)

**Qui** : Customer Success côté Centrium + référent client.

**Mesures à récupérer** :

- Métriques internes du client (CRM, ERP, finance) sur 3 à 6 mois avant et après.
- Métriques Centrium (logs anonymisés, usage modules) sur la même période.
- Méthode de mesure documentée pour chaque chiffre.

**Livrable** : tableau Excel ou Notion partagé, chaque cellule documentée (source + date + méthode).

### Étape 5 — Rédaction du draft (semaines 3 à 4)

**Qui** : Tech writer ou Content strategist.

**Méthode** :

1. Plan détaillé en H2 / H3.
2. Premier draft écrit en 2 à 3 jours.
3. Relecture interne (Sales + PM + Direction) avant envoi client.

**Livrable** : draft v0 prêt à envoyer au client.

### Étape 6 — Validation client (semaines 4 à 5)

**Qui** : Référent client + son équipe juridique et communication interne si applicable.

**Cycle de validation** :

- Envoi du draft v0 → retour client à J+7.
- Intégration des commentaires → draft v1 → validation finale à J+14 maximum.
- Signature d'un BAT (bon à tirer) écrit, archivé.

**Livrable** : version finale signée + autorisation écrite de publication.

### Étape 7 — Publication et amplification (semaine 6)

**Qui** : Marketing produit + Growth + Sales.

**Canaux** :

1. Page dédiée `centrium-platform.com/clients/[slug]`.
2. PDF téléchargeable (one-pager + version longue).
3. Annonce LinkedIn (post organique + carousel).
4. Annonce newsletter Centrium.
5. Mise à disposition dans le pack commercial Sales (slide deck + version PDF).
6. Mention dans les RFP en cours.

**Livrable** : checklist de publication complétée, screenshots des canaux activés archivés.

### Récapitulatif

| Étape | Semaine | Charge interne | Charge client |
|---|---|---|---|
| 1. Identification | S0 | 0,5 j | — |
| 2. Pitch | S0 | 0,5 j | 30 min |
| 3. Interview | S1 | 1 j | 1 h |
| 4. Collecte chiffres | S1-S3 | 2 j | 2 h |
| 5. Rédaction draft | S3-S4 | 3 j | — |
| 6. Validation client | S4-S5 | 1 j | 1 h |
| 7. Publication | S6 | 1 j | — |
| **Total** | **6 semaines** | **9 j** | **5 h** |

---

## 5. Liste de questions d'interview standard

Ces questions sont posées en entretien semi-directif. L'ordre est indicatif. Le but est de **récolter de la matière narrative**, pas de remplir un questionnaire.

### 5.1 Contexte ESN (5 questions)

1. Pouvez-vous présenter votre ESN en 2 minutes ? Activité, taille, géographie, secteurs clients.
2. Quelle est votre séniorité moyenne et votre TJM moyen ?
3. Comment votre activité a-t-elle évolué ces 24 derniers mois ?
4. Quel est votre principal défi opérationnel aujourd'hui ?
5. Comment décririez-vous la maturité technologique de votre ESN avant Centrium ?

### 5.2 Problèmes vécus avant Centrium (6 questions)

6. Quels outils utilisiez-vous avant Centrium et pour quel besoin chacun ?
7. Quel était votre temps moyen pour répondre à un AO de qualité ?
8. Comment géreriez-vous l'intercontrat avant Centrium ?
9. Aviez-vous un cas récent où la non-coordination des outils vous a coûté une mission, un consultant, ou un client ?
10. Combien d'heures par semaine un BM passait-il en tâches administratives ?
11. Y a-t-il eu un événement déclencheur qui vous a fait chercher une solution ?

### 5.3 Décision (5 questions)

12. Quels critères avez-vous évalués lors du choix d'une plateforme ?
13. Quelles alternatives à Centrium avez-vous étudiées ?
14. Qu'est-ce qui vous a fait basculer vers Centrium plutôt qu'une autre solution ?
15. Y a-t-il eu des objections internes au moment de la décision ? Comment les avez-vous levées ?
16. Quel était le sponsor de la décision (CEO, COO, Direction des opérations, autre) ?

### 5.4 Déploiement (4 questions)

17. Comment s'est déroulée la phase de cadrage et de migration des données ?
18. Quelles ont été les principales difficultés rencontrées lors du déploiement ?
19. Combien de temps a-t-il fallu pour que votre équipe soit autonome au quotidien ?
20. Y a-t-il eu de la résistance au changement ? Comment l'avez-vous gérée ?

### 5.5 Résultats (5 questions)

21. Quelles sont les 3 métriques sur lesquelles vous avez le plus progressé depuis l'arrivée de Centrium ?
22. Avez-vous un exemple concret, daté, d'une opportunité gagnée grâce à Centrium ?
23. Comment vos consultants vivent-ils l'usage du portail dédié ?
24. Quel module a eu le plus fort impact dans votre quotidien ? Pourquoi ?
25. Y a-t-il une fonctionnalité dont vous ne pourriez plus vous passer ?

### 5.6 Conseils aux pairs et perspectives (4 questions)

26. Que diriez-vous à un dirigeant d'ESN qui hésite à choisir une plateforme ?
27. Qu'est-ce qui pourrait encore être amélioré dans Centrium pour votre activité ?
28. Quelles sont vos prochaines étapes avec Centrium dans les 12 mois ?
29. Si vous deviez résumer Centrium en une phrase, que diriez-vous ?

**Total** : 29 questions ouvertes, ~45 minutes d'interview à rythme calme.

---

## 6. Exemple complet : "Comment Octantis Consulting a divisé par 4 son temps de réponse aux AOs"

> ⚠️ **Avertissement** : l'exemple ci-dessous est **fictif**. Il sert uniquement à illustrer la mise en forme finale d'une case study Centrium. Les premières case studies réelles seront publiées **Q3 et Q4 2026**.
>
> Aucune donnée présentée n'engage Centrium ni un client réel. Tous les noms, chiffres, citations et entités cités sont inventés à des fins illustratives.

---

```yaml
---
client: "Octantis Consulting"
client_logo: "/cases/octantis/logo.svg"
secteur: "ESN spécialisée Banque & Assurance"
taille: "45 consultants, 6 business managers, 2 recruteurs, 1 finance"
géographie: "France · Paris · Nantes"
durée_partenariat: "depuis 2025-11"
date_publication: "2026-09-15"
modules_centrium:
  - bibliothèque
  - cv-optimizer
  - matching
  - crm
  - contrats
  - cra
  - facturation
  - assistant-ia
contact_référence: "Élise Bernard, Directrice des opérations"
contact_email: "e.bernard@octantis-consulting.fr"
quote_principale: "Centrium nous a fait passer de la débrouille au pilotage."
chiffre_phare: "÷ 4 sur le temps de réponse aux AOs"
type_case_study: "ESN-croissance"
---
```

# Comment Octantis Consulting a divisé par 4 son temps de réponse aux AOs

## En une page

> **« Centrium nous a fait passer de la débrouille au pilotage. En 6 mois, nous avons gagné 8 missions supplémentaires sur des AOs que nous aurions perdus par retard. »** — Élise Bernard, Directrice des opérations, Octantis Consulting.

| Chiffre clé | Valeur |
|---|---|
| Temps moyen de réponse aux AOs | **÷ 4** (de 3 jours à 30 min) |
| Taux d'AOs gagnés | **+50 %** (de 12 % à 18 %) |
| Taux d'intercontrat | **-59 %** (de 22 % à 9 %) |

**Top 3 résultats**

- 8 missions supplémentaires gagnées sur 6 mois.
- 79 000 € de marge additionnelle annualisée (mesure interne contrôle de gestion).
- Réduction de 30 % du temps administratif des BMs, redéployé en relation client.

**Mini-fiche client**

- **Secteur** — ESN spécialisée Banque & Assurance, fondée en 2017.
- **Effectif** — 45 consultants, 6 BMs, équipe support de 5 personnes.
- **Géographie** — Siège Paris, antenne Nantes.
- **Modules Centrium utilisés** — Bibliothèque, CV Optimizer, Matching, CRM, Contrats, CRA, Facturation, Assistant comptable.

## Contexte

Octantis Consulting est une ESN parisienne spécialisée sur les métiers de la banque et de l'assurance. Fondée en 2017 par deux anciens consultants senior d'un Big Four, l'ESN s'est rapidement positionnée sur des missions à forte valeur ajoutée : conformité réglementaire, transformation des SI bancaires, projets data sur les directions risques.

En 2024, Octantis franchit la barre des 40 consultants et ouvre une antenne à Nantes. L'équipe support, jusque-là composée de 3 personnes, monte à 5. Mais la croissance révèle ce qui jusqu'alors était absorbé par la débrouille : les outils ne suivent plus.

Avant Centrium, la stack ressemblait à ce qu'on rencontre dans la majorité des ESN qui passent de 20 à 50 consultants : **Notion** pour le pipeline commercial, **Excel** pour la bibliothèque de consultants et les CV, **WhatsApp et e-mail** pour les CRA, **Word et un PDF maison** pour les contrats, **un cabinet d'expertise comptable externe** pour la facturation. Chaque outil pris isolément fonctionnait correctement. Mais les frontières entre outils n'étaient gardées par personne.

Élise Bernard, Directrice des opérations depuis 2022, résume : *"Chaque BM était devenu son propre administrateur système. Quand l'un d'eux partait en congés, on perdait 3 jours à reconstituer ses dossiers."*

## Le problème

L'incident déclencheur remonte à octobre 2025. Octantis reçoit un AO d'une grande banque française pour 3 consultants senior — mission longue, marge attractive. Le BM en charge le découvre le mardi matin dans sa boîte mail. Le temps de retrouver les CVs Word des bons consultants, de les retoucher, de produire une proposition lisible et de l'envoyer, **3 jours et demi ont passé**. La banque a attribué la mission à un concurrent qui avait répondu en 6 heures.

Cet épisode n'était pas isolé. Octantis estimait qu'**environ 6 AOs sur 10 étaient perdus par retard plutôt que par non-pertinence du profil**. La bibliothèque de consultants existait, les profils étaient bons, le travail commercial était fait. Mais le **temps de traduction** entre l'AO reçu et la réponse client était devenu structurellement non compétitif.

À cela s'ajoutaient des frictions quotidiennes :

- Les BMs envoyaient des relances de CRA tous les 5 du mois par WhatsApp. Un consultant sur cinq répondait après le 10. Les factures partaient en retard, les paiements aussi.
- Le contrôle de gestion ne disposait pas d'une vision consolidée du pipeline. Le forecast mensuel reposait sur un appel téléphonique avec chaque BM.
- Deux fois en 2025, un consultant arrivait en intercontrat sans qu'aucune alerte ne soit levée. Coût direct : 18 000 € de salaire non refacturé.

> *"On savait qu'on avait un problème d'outillage. On ne mesurait pas qu'on perdait 70 000 € par an juste à cause de ça. C'est en démarrant Centrium qu'on a pu mettre un chiffre dessus."*
> — Hugo Tessier, CEO, Octantis Consulting

## La décision

Octantis a évalué quatre options entre août et octobre 2025 :

1. **Statu quo** + recrutement d'un assistant ops dédié. Coût : ~45 k€ / an. Bénéfice : marginal, ne résolvait pas la fragmentation outils.
2. **Boondmanager** — historique du marché. Fonctionnel mais lourd à paramétrer, esthétique vieillissante, modèle de pricing par utilisateur jugé peu lisible.
3. **Développement interne** sur Airtable + Make. Évalué pendant 3 semaines, abandonné — temps de mise en place estimé à 4 mois, dette technique anticipée.
4. **Centrium** — découvert via un dirigeant de cabinet de conseil partenaire d'Octantis.

Trois critères ont fait basculer la décision :

- **L'IA appliquée à des règles métier strictes**. Le CV Optimizer ne ré-écrit pas un CV : il le restructure à partir des éléments factuels existants. *"On craignait qu'une IA invente des compétences. Centrium est le premier outil qui m'a montré explicitement ses 'claims rejetés'. Ça a levé toutes les craintes en interne"*, explique Élise Bernard.
- **L'hébergement européen** et le DPA signé d'emblée. Octantis travaille avec des clients soumis à des contraintes ACPR fortes. Toute donnée hors UE était bloquante.
- **Le modèle d'engagement transparent** — devis sur mesure, engagement 12 mois, conditions claires, pas de surprise.

## Le déploiement

Le contrat est signé le 15 novembre 2025. La mise en production effective intervient **21 jours plus tard**, le 6 décembre.

| Étape | Date | Livrable |
|---|---|---|
| J0 — Kick-off | 17 novembre 2025 | Cadrage périmètre + nomination référents internes |
| J+3 — Atelier branding | 20 novembre 2025 | Identité visuelle Centrium configurée |
| J+7 — Migration consultants | 24 novembre 2025 | 45 fiches consultants importées (CSV + parsing IA) |
| J+10 — Migration CRM | 27 novembre 2025 | 23 opportunités migrées depuis Notion |
| J+14 — Formation équipe | 1er décembre 2025 | 6 BMs + 2 recruteurs + finance formés (3 sessions de 90 min) |
| J+21 — Mise en production | 6 décembre 2025 | Bascule officielle, ancien Notion archivé |

**Difficultés rencontrées** :

1. **Qualité des données initiales**. La bibliothèque Excel d'Octantis comportait des doublons (8 consultants présents 2 fois sous des graphies différentes). La migration a forcé un nettoyage qu'Octantis avait reporté depuis 18 mois. Résolu en 2 jours de travail conjoint avec l'équipe CS Centrium.
2. **Résistance d'un BM senior**. L'un des 6 BMs, en poste depuis 8 ans, utilisait un système de tags personnel dans Notion qu'il considérait comme un atout différenciant. La transition a été accompagnée par un travail d'écoute (2 entretiens individuels) et par la mise en place d'un système de tags personnalisés dans Centrium qui couvre 90 % de ses cas d'usage. L'adhésion s'est faite en 3 semaines.
3. **Paramétrage TVA spécifique** sur les missions facturées en sous-traitance à un client Luxembourg. Configuration ajoutée en 30 minutes par le support Centrium.

## Les résultats

Mesure réalisée par le contrôle de gestion d'Octantis sur la période **décembre 2025 à mai 2026** (6 mois pleins), comparée à la même période 12 mois plus tôt (décembre 2024 à mai 2025).

| Métrique | Avant (déc. 2024 – mai 2025) | Après (déc. 2025 – mai 2026) | Variation |
|---|---|---|---|
| Temps moyen de réponse à un AO | 3,2 jours | 32 minutes | **÷ 144** (sur 28 AOs traités) |
| Taux d'AOs gagnés | 12 % | 18 % | **+50 % relatif** |
| Taux d'intercontrat moyen | 22 % | 9 % | **-59 % relatif** |
| Erreurs facturation (avoirs émis) | 4 sur 6 mois | 0 sur 6 mois | **-100 %** |
| Temps administratif par BM / semaine | ~12 h | ~8 h | **-33 %** |
| Marge brute additionnelle (estimée) | baseline | +79 k€ annualisé | mesure contrôle de gestion |

**Méthode de mesure** : extraction Centrium + CRM Notion archivé + grand livre exporté du cabinet comptable. Échantillon : 100 % des AOs reçus sur les deux périodes, soit 28 AOs sur 6 mois côté Centrium et 24 AOs sur 6 mois pré-Centrium.

## Ce qui a marché en priorité

### 1. CV Optimizer — gain de temps massif sur les AOs

Avant Centrium, un BM mettait en moyenne **2 heures à 3 heures** pour préparer un dossier de réponse à un AO (sélection des profils, retouche des CVs, mise en page). Avec le CV Optimizer, le processus passe à **30 minutes**, dont 25 minutes de relecture humaine. Le BM ne perd plus de temps sur la forme — il se concentre sur le pitch commercial et la qualification du besoin.

### 2. CRM commercial — pilotage partagé en temps réel

L'équipe d'Octantis a basculé l'intégralité de son pipeline sur Centrium dès la fin du sprint de migration. Le mode Kanban et le drag-and-drop ont été adoptés naturellement par les 6 BMs. *"On a découvert qu'on avait un pipeline réel de 2,4 M€, alors qu'on l'estimait à 1,8 M€. La moitié des opportunités vivait dans la tête d'un BM, pas dans Notion"*, raconte Hugo Tessier.

### 3. CRA + Facturation — fin des retards

Le portail consultant a été déployé auprès des 45 consultants. La saisie de CRA en mode calendrier a été immédiatement adoptée. Conséquence : **100 % des CRA validés avant le 5 du mois** sur les 6 premiers mois (contre ~70 % avant). Les factures partent dans la foulée et le DSO moyen est passé de 47 jours à 38 jours.

## Ce qui reste à améliorer

> *"Centrium est encore en train de mûrir, et nous le savons. Trois choses nous manquent pour atteindre 100 % de notre besoin."*
> — Élise Bernard

1. **Signature électronique des contrats**. Octantis utilise DocuSign en parallèle. L'intégration native annoncée par Centrium pour Q4 2026 sera bienvenue.
2. **SSO Azure AD**. Octantis utilise Azure AD pour l'ensemble de ses outils. Le SSO est annoncé Q3 2026 chez Centrium — Octantis le déploiera dès qu'il sera disponible.
3. **Assistant comptable IA**. L'assistant est utile pour les questions courantes (TVA, mentions légales, échéances) mais ne remplace pas un expert-comptable. Octantis conserve son cabinet externe et utilise l'assistant comme premier niveau de réponse.

## Témoignage final

> *"Centrium n'a pas changé notre métier — il a changé notre rapport au métier. Avant, on subissait nos outils. Aujourd'hui, on pilote notre activité. Les BMs sont plus sereins, les consultants plus rassurés sur leur paie et leurs contrats, la direction a enfin une vue consolidée. Et surtout, on a arrêté de perdre des AOs par retard. Pour une ESN comme la nôtre, 79 000 € de marge supplémentaire la première année, c'est l'équivalent d'un BM additionnel. On a investi dans un outil, on a récupéré une marge — c'est rare."*
>
> **— Élise Bernard, Directrice des opérations, Octantis Consulting (45 consultants, Paris).**

## Coordonnées de référence

Élise Bernard accepte les appels qualifiés de dirigeants d'ESN comparables à Octantis Consulting.

- **Email** : e.bernard@octantis-consulting.fr
- **Conditions** : appel programmé par l'équipe Sales Centrium, sous accord réciproque de confidentialité.

---

> ⚠️ Rappel : tout le contenu de la section 6 ci-dessus est **fictif et illustratif**. Octantis Consulting, ses dirigeants, ses chiffres et son histoire sont inventés à des fins de modélisation éditoriale. Les premières case studies réelles de Centrium seront publiées **Q3 et Q4 2026**.

---

## 7. Format de publication

### 7.1 Page web dédiée

- **URL** : `centrium-platform.com/clients/[slug]`.
- **Layout** : page mono-colonne, largeur de lecture confortable (~720 px), images full-width entre sections.
- **Composants** : header sticky avec navigation interne (Contexte / Problème / Résultats / Témoignage), bloc CTA "Demander une démo" en pied.
- **Performance** : Core Web Vitals verts, images optimisées, LCP < 1,8s.
- **SEO** : balisage Schema.org `Article` + `Organization` + `Review`, méta-description optimisée, sitemap inclus.

### 7.2 PDF téléchargeable

Deux formats sont produits pour chaque case study :

- **One-pager (1 page A4 recto)** — synthèse en un coup d'œil, à imprimer ou envoyer en pièce jointe en amont d'un RDV.
- **Version longue (4 pages A4)** — équivalent print de la page web, avec mise en page éditoriale soignée.

Génération via `md-to-pdf` avec la feuille de style commune `pdf-style.css` du dossier `docs/produit/`.

### 7.3 Mini-fiches partageables

- **LinkedIn carousel** — 8 à 10 visuels (1 par chiffre clé + 1 par quote + 1 d'ouverture + 1 de fermeture CTA).
- **Twitter / X thread** — 6 à 8 tweets, structure : accroche + contexte + 3 résultats + quote + CTA.
- **Slide deck Sales** — 5 à 7 slides ré-utilisables dans les présentations commerciales.

### 7.4 Intégration dans le funnel commercial

- **Site vitrine** : section "Ils nous font confiance" + galerie de logos cliquables vers les case studies.
- **Pack Sales** : à minima 3 case studies à jour partagées dans la sales room.
- **RFP / RFI** : insertion systématique de 2 case studies pertinentes par appel d'offres reçu.

---

## 8. Mesure d'impact case study

Chaque case study est traitée comme un actif marketing pilotable. Indicateurs suivis sur 12 mois :

| Indicateur | Cible | Mesure |
|---|---|---|
| **Vues de la page** | ≥ 1500 / 6 mois | Analytics produit (Plausible ou GA4 anonymisé) |
| **Téléchargements PDF** | ≥ 200 / 6 mois | Tracking sur clic du bouton |
| **Mentions par prospects en RDV qualifié** | ≥ 1 par 4 RDV | Sales notes (CRM Centrium interne) |
| **Conversion vers démo** | ≥ 8 % des visiteurs | Bouton CTA en pied de page tracké |
| **Insertion dans RFP / RFI** | ≥ 80 % des RFP reçus | Suivi Sales |
| **Citations externes** | ≥ 3 (presse, blog, podcast) | Mention tracking + alertes Google |

Un dashboard interne consolide ces métriques par case study. Une revue trimestrielle décide des cas studies à actualiser (mise à jour chiffrée) ou à mettre en avant dans la roadmap marketing.

---

## 9. Calendrier de publication 2026 — 2027

| Échéance | Livrable | Type | Statut |
|---|---|---|---|
| **Q3 2026** (sept.) | 1ère case study publiée | ESN en croissance (40-60 consultants) | Identification du client en cours |
| **Q4 2026** (déc.) | 2 case studies supplémentaires | Cabinet de conseil + Groupe / multi-entités | À identifier |
| **Q1 2027** (mars) | Galerie clients publique | Logos + résumés courts (5 à 8 clients) | Dépend du pipeline commercial |
| **Q2 2027** (juin) | 4ᵉ et 5ᵉ case studies | Selon évolution du portefeuille | À planifier |

**Cible 12 mois** : 5 case studies publiées, 1 galerie publique, présence dans 80 % des RFP reçus.

---

## 10. Hypothèses et risques

### 10.1 Hypothèses

- Au moins 3 clients utilisateurs de Centrium auront atteint **3 mois d'usage en production** avant Q3 2026, avec des résultats mesurables.
- L'équipe Customer Success disposera des ressources pour piloter la collecte de chiffres côté clients.
- Le budget Marketing produit absorbera la production éditoriale (~9 j-homme par case study).
- Les clients pilotes accepteront la publication nominative — sinon, plan B sur format anonymisé partiel.

### 10.2 Risques

| Risque | Mitigation |
|---|---|
| Aucun client n'accepte la publication nominative en 2026 | Plan B : case study anonymisée (secteur + taille + chiffres uniquement) — moins puissant mais activable rapidement. |
| Les chiffres clients ne sont pas suffisamment mesurés | Customer Success met en place dès l'onboarding un baseline mesuré sur 5 KPIs cibles. |
| Le format prend trop de temps à produire | Industrialisation du template (ce document) + outillage rédactionnel + checklist de validation. |
| Décalage entre la promesse case study et la réalité produit | Validation client obligatoire, signature BAT systématique. |

---

## 11. Conclusion

La case study est l'actif éditorial **à plus fort effet de levier** dans la trajectoire de maturité commerciale de Centrium. L'audit interne identifie son absence comme le risque #1 sur les cycles de vente Enterprise. Le présent document fournit le modèle, le processus et l'exemple complet pour produire les 3 premières case studies réelles d'ici fin 2026.

Le succès se mesure simplement : **fin Q4 2026, 3 case studies publiées avec chiffres vérifiés, quotes attribuables, validation client signée, et présence systématique dans les RFP**. À cette condition, la documentation commerciale Centrium passera de 4,5 / 10 à ≥ 8 / 10 — et la confiance globale Enterprise atteindra l'objectif de 9,5 / 10.
