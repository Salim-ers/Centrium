---
title: "Guide ROI"
subtitle: "Modélisation du retour sur investissement Centrium"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "roi-guide"
audience: "CFO · CEO d'ESN · Directeur des opérations · Achats"
---

# Centrium — Guide ROI

> Modélisation chiffrée du retour sur investissement pour une ESN type.
> Document destiné aux décideurs financiers (CFO, CEO, Directeur des opérations,
> Achats) qui veulent **valider en interne** le business case Centrium avant
> de signer.

---

## 1 · Synthèse exécutive

### 1.1 Hypothèses de cadrage

L'ensemble de ce document repose sur le profil d'**ESN type** suivant,
représentatif du segment principal de Centrium :

| Variable | Valeur retenue |
|---|---|
| Consultants gérés | 30 (mix interne + portage + freelance) |
| Business managers (BM) | 5 |
| Profil finance / comptabilité | 1 |
| Profil admin / office | 1 |
| Missions actives en moyenne | 25 |
| Opportunités traitées par an | 100 |
| Missions converties par an | 50 |
| TJM moyen facturé client | 450 € |
| Marge brute moyenne | 20 % (90 €/jour) |
| CA annuel | 5,5 M€ |

### 1.2 Gain net modélisé

| Scénario | Gain annuel modélisé | ROI | Payback |
|---|---|---|---|
| Optimiste (modélisation complète) | **~275 000 €/an** | 818 % | 1,3 mois |
| **Conservateur (-50 % sur axes risqués)** | **~190 000 €/an** | **533 %** | **1,9 mois** |
| Pessimiste (-50 % supplémentaire) | ~95 000 €/an | 217 % | 3,8 mois |

> **Scénario de référence pour la décision : conservateur.**
> Gain net annuel ~190 000 € pour un coût Centrium estimé 30 000 €/an
> (plan ESN 30 consultants). ROI = 533 %. Payback < 2 mois.

### 1.3 Avertissement honnête

Les chiffres présentés sont issus d'une **modélisation** fondée sur :

- Statistiques publiques (Syntec Numérique, INSEE, APEC, baromètres
  ANDRH 2024-2025)
- Coûts marché ESN (salaires bruts chargés, coûts de remplacement,
  temps consacré à l'administratif par les BMs)
- Observations qualitatives lors de démonstrations et entretiens
  prospects (juin 2025 — mai 2026)

**Ils ne sont pas issus de case studies clients réelles** — Centrium étant
en phase de mise en marché commerciale, le portefeuille de clients actifs
est insuffisant pour publier des études chiffrées avant Q3 2026.

Toute hypothèse considérée comme à risque est explicitement notée **"à
valider en case study"** dans le document. Les sections concernées feront
l'objet d'une mise à jour basée sur les premières études clients réelles
publiées Q3 2026 (`CASE_STUDY_TEMPLATE.md`).

---

## 2 · Méthodologie

### 2.1 Sources

| Source | Usage | Citation |
|---|---|---|
| **Syntec Numérique** | TJM moyen ESN par séniorité, taux d'intercontrat moyen secteur | Baromètre ESN 2024 |
| **INSEE** | Coût total chargé d'un salarié cadre en France | Estimations annuelles Insee + Urssaf |
| **APEC** | Salaire médian business manager IT France | Étude Cadres APEC 2024 |
| **ANDRH** | Coût de remplacement d'un consultant tech | Baromètre attractivité 2024 |
| **Observations Centrium** | Temps moyen passé sur tâches administratives (entretiens prospects) | Démos & POCs internes |

### 2.2 Quatre axes de gain

Centrium agit sur quatre leviers économiques distincts :

1. **Temps Business Manager** — réduire le "plumbing" administratif
   (préparation CV, suivi pipeline, coordination contrat, validation CRA,
   facturation, relances).
2. **Revenus commerciaux** — accélérer la réponse aux AO et augmenter le
   taux de gain sur appels d'offres concurrentiels.
3. **Erreurs et risques** — réduire les incidents (CV non conforme,
   facture rejetée, fin de mission non anticipée).
4. **Rétention consultants** — diminuer l'attrition liée à la fatigue
   administrative en améliorant l'expérience consultant.

Chaque axe est quantifié séparément puis additionné en synthèse.

### 2.3 Hypothèses transparentes

| Hypothèse | Valeur retenue | Source / justification |
|---|---|---|
| Coût chargé horaire d'un BM | 35 €/h | TCC ~65 k€ + charges, divisé par ~1 850 h/an |
| Semaines travaillées effectives par an | 47 | 52 - 5 (CP + RTT + jours fériés moyens) |
| AO perdus pour cause de retard (avant Centrium) | 30 % | Modélisation — secteur AO concurrentiel |
| AO récupérés grâce à Centrium | 50 % des perdus | À valider en case study |
| Marge brute par mission moyenne | 9 900 € | TJM 450 € × 110 j × marge 20 % |
| Coût de remplacement d'un consultant | 8 000 € | Recrutement + onboarding (sources ANDRH) |

### 2.4 Calculs reproductibles

Toutes les formules sont explicites dans chaque section. Aucune
"black box". Vous pouvez **refaire vos propres calculs** en remplaçant
les variables par vos chiffres réels (cf. § 14 et § 15).

---

## 3 · Profil ESN type pour les calculs

| Élément | Valeur | Coût annuel chargé |
|---|---|---|
| 30 consultants (mix interne + portage + freelance) | — | (CA généré 5,5 M€) |
| 5 business managers | TCC 65 k€ moyen | 325 000 € |
| 1 finance / comptable | TCC 45 k€ | 45 000 € |
| 1 admin / office | TCC 50 k€ | 50 000 € |
| **Total masse salariale "opérations"** | | **420 000 €** |
| CA annuel | 5,5 M€ | |
| Marge brute moyenne | 20 % | 1,1 M€ |
| Coût Centrium estimé (plan 30 consultants) | | **24 000 – 36 000 €/an** |

L'objectif de Centrium est d'**augmenter la productivité de la masse
salariale "opérations" et d'augmenter la marge brute** sans embauche
proportionnelle à la croissance.

---

## 4 · Axe 1 — Gain de temps Business Manager

### 4.1 Temps administratif avant Centrium

Modélisation hebdomadaire moyenne d'un BM en ESN sans plateforme dédiée
(sources : entretiens prospects + observations 2024-2025 + benchmark
Syntec) :

| Tâche | Temps hebdo (h) | Détail |
|---|---:|---|
| Préparation CV pour AO | 4,0 | Recherche profil bibliothèque + retouche manuelle Word + mise en page + check anti-typo |
| Suivi pipeline commercial | 3,0 | Mise à jour Notion/Excel + reporting hebdo + relance prospects |
| Coordination contrat | 2,0 | Rédaction contrat + envoi DocuSign + chasse signatures + relance |
| Validation CRA | 1,5 | Récupération CRA WhatsApp/email + check jours + relances consultants |
| Facturation | 2,0 | Génération facture Word + mentions légales + envoi + suivi paiement |
| Relances clients | 1,5 | Relances paiement + relances commerciales + suivi multi-outils |
| **Total "plumbing"** | **14,0** | ~30 % du temps hebdo (sur base 45 h) |

### 4.2 Temps administratif avec Centrium

Mêmes tâches, **avec la plateforme Centrium** :

| Tâche | Temps hebdo (h) | Économie | Détail |
|---|---:|---:|---|
| Préparation CV pour AO | 1,0 | -3,0 | CV Optimizer génère le PDF/DOCX en 1 min depuis la bibliothèque |
| Suivi pipeline commercial | 1,0 | -2,0 | Pipeline CRM live, données partagées entre BMs |
| Coordination contrat | 0,5 | -1,5 | Template contrat pré-rempli, signature électronique intégrée *(Q4 2026)* |
| Validation CRA | 0,3 | -1,2 | Portail consultant, validation 1 clic, alertes automatiques |
| Facturation | 0,7 | -1,3 | Facture auto-générée depuis CRA validé, mentions légales fiables |
| Relances clients | 0,5 | -1,0 | Alertes auto, suivi unique dans Centrium |
| **Total "plumbing"** | **4,0** | **-10,0** | ~9 % du temps hebdo |

### 4.3 Gain économique

```
Gain horaire / BM / semaine = 10 h
Gain horaire / BM / an     = 10 × 47 semaines = 470 h/an
Gain total 5 BMs           = 470 × 5 = 2 350 h/an
Valorisation               = 2 350 h × 35 €/h (coût chargé)
                          = 82 250 €/an
```

**Gain Axe 1 : ~82 250 €/an de productivité dégagée.**

> **Hypothèse robuste.** Le gain de temps est mesurable rapidement
> (baseline 1 mois avant / mesure 1 mois après — cf. § 15).

Ce temps n'est **pas un coupage d'effectif** : il est réinvesti dans des
activités à plus forte valeur — qualification fine des besoins, soin de
la relation client, anticipation des intercontrats.

---

## 5 · Axe 2 — Gain de revenus (positionnement plus rapide)

### 5.1 Constat avant Centrium

Sur appels d'offres concurrentiels (le cas le plus fréquent en ESN) :

- **Temps moyen entre réception d'un AO et envoi du CV candidat : 3 jours
  ouvrés** (sourcing profil + retouche CV + validation BM + envoi).
- **30 % des AOs sont perdus pour cause de retard** : un concurrent répond
  en moins de 24 h, capte le RDV, signe avant que la deuxième offre
  arrive (source : entretiens BMs ESN segment 10-50 consultants).

### 5.2 Constat avec Centrium

- **Temps moyen entre AO et envoi CV : 30 minutes** (mesure interne sur
  démonstrations + POCs prospects, juin 2025 — mai 2026).
- Workflow : scan AO → extraction IA (intitulé, skills, TJM, dates) →
  matching automatique 3 meilleurs profils → CV Optimizer génère le PDF
  au standard ESN → envoi.

### 5.3 Modélisation du gain

```
AOs traités par an                       = 100
AOs perdus pour retard (sans Centrium)   = 30 % × 100 = 30
AOs récupérés grâce à Centrium           = 50 % × 30 = 15
Marge brute par mission moyenne          = 450 € × 110 j × 20 %
                                         = 9 900 €
Gain marge brute annuel                  = 15 × 9 900 € = 148 500 €
```

**Gain Axe 2 : ~148 500 €/an de marge brute supplémentaire.**

> **Hypothèse à valider en case study client réel.**
> Le ratio "50 % des AOs perdus récupérés" est une projection optimiste.
> Une valeur conservative de 25 % donnerait ~74 250 €/an de marge brute
> supplémentaire — toujours significatif mais à confirmer par data réelle.
> Les premières case studies (Q3 2026) viendront sourcer ce chiffre.

### 5.4 Effet de levier complémentaire

Au-delà du gain quantifié ci-dessus, l'accélération du positionnement
produit deux effets indirects :

- **Effet réputation** : devenir "l'ESN qui répond vite" attire les
  intermédiaires (cabinets de placement, plateformes de freelancing).
- **Effet pipeline** : libérer du temps BM permet de **traiter plus
  d'AOs** — ce qui mécaniquement augmente le nombre de missions gagnées.

Ces effets sont volontairement **non quantifiés** ici pour rester
conservateur.

---

## 6 · Axe 3 — Réduction des erreurs et risques

### 6.1 Erreurs CV (rétractations clients)

**Avant Centrium** : les retouches manuelles de CV en Word produisent
1 à 5 incidents par an :
- Dates incohérentes entre versions
- Certifications "embellies" qui ne tiennent pas à l'audit
- Compétences "ajoutées" qui ne tiennent pas en entretien

Coût d'un incident :
- Rétractation client (mission perdue après signature)
- Détérioration relation commerciale long terme
- Coût brand moyen estimé : **5 000 €/incident**

Avec Centrium et son garde-fou **"zéro invention"** (CV Optimizer ne peut
pas ajouter un élément absent du CV source), ces incidents disparaissent.

```
Incidents évités       = 3/an (moyenne)
Coût évité             = 3 × 5 000 € = 15 000 €/an
```

**Gain Axe 3a : ~15 000 €/an.**

### 6.2 Erreurs de facturation

**Avant Centrium** : factures Word manuelles oublient régulièrement des
mentions légales (TVA, IBAN, numéro de commande, échéance, pénalités de
retard) — 1 à 2 contentieux/an, coût moyen 3 000 € (renvoi, intérêts
moratoires, négociation).

Avec Centrium, le moteur de facturation **applique automatiquement** les
mentions légales obligatoires et bloque l'émission si un champ critique
manque.

```
Contentieux évités     = 2/an
Coût évité             = 2 × 3 000 € = 6 000 €/an
```

**Gain Axe 3b : ~6 000 €/an.**

### 6.3 Erreurs d'intercontrat (mission qui se termine non anticipée)

**Avant Centrium** : la fin d'une mission est souvent découverte la veille
ou le jour même — le consultant entre en intercontrat 1 à 2 mois (faute
de relance commerciale anticipée 30 jours avant fin de mission). Coût
direct : salaire chargé non facturé.

```
Mois d'intercontrat évités    = 2/an (estimation conservative)
TJM moyen                     = 450 €
Jours ouvrés / mois           = 20
Marge brute / jour            = 90 €
Coût mensuel (salaire chargé non facturé) ~ 6 800 €
Coût évité                    = 2 × 6 800 € = 13 600 €/an
```

Centrium déclenche une **alerte automatique 30 jours avant fin de
mission** → le BM peut anticiper le renouvellement ou repositionner le
consultant.

**Gain Axe 3c : ~13 600 €/an.**

### 6.4 Synthèse Axe 3

| Sous-axe | Gain annuel |
|---|---:|
| Erreurs CV évitées (3 incidents × 5 000 €) | 15 000 € |
| Erreurs facturation évitées (2 × 3 000 €) | 6 000 € |
| Intercontrat évité (2 mois × 6 800 €) | 13 600 € |
| **Total Axe 3** | **~34 600 €/an** |

---

## 7 · Axe 4 — Rétention des consultants

### 7.1 Constat marché

Selon les baromètres ANDRH 2024 et les retours terrain ESN, **2 à 3
consultants/an** partent par "fatigue administrative" sur une équipe de
30 consultants :
- CRA difficile à saisir (Excel email, relances multiples)
- Visibilité nulle sur l'avancement contrat
- Difficulté à récupérer une facture, un justificatif
- Communication inégale entre BMs

Coût moyen de remplacement d'un consultant (recrutement + onboarding +
ramp-up) : **8 000 €** (sources : ANDRH, APEC).

### 7.2 Apport Centrium

Le **portail consultant** Centrium offre :

- Saisie CRA en autonomie en moins d'une minute (calendrier interactif)
- Accès direct aux factures et justificatifs
- Visibilité sur le contrat en cours et les communications BM
- Notifications transparentes (mission qui se termine, CRA validé)

### 7.3 Gain économique

```
Départs évités / an                  = 1 (estimation conservative)
Coût de remplacement                 = 8 000 €
Gain                                 = 1 × 8 000 € = 8 000 €/an
```

Estimation haute (2 départs évités) : 16 000 €/an.

**Gain Axe 4 : ~8 000 – 15 000 €/an (retenu 10 000 €).**

> **Hypothèse à valider en case study client réel.**
> La corrélation "outil collaboratif → rétention" est plausible mais
> difficile à isoler statistiquement. Les premières case studies clients
> permettront de mesurer un éventuel impact (taux de turnover N-1 vs N+1
> après mise en place de Centrium).

---

## 8 · Synthèse des gains

| Axe | Gain optimiste | Gain conservateur (-50 % axes risqués) |
|---|---:|---:|
| Axe 1 — Temps BM | 82 250 € | 82 250 € |
| Axe 2 — Revenus (à valider) | 148 500 € | 74 250 € |
| Axe 3 — Erreurs & risques | 34 600 € | 34 600 € |
| Axe 4 — Rétention (à valider) | 10 000 € | 5 000 € |
| **Total** | **275 350 €/an** | **~196 100 €/an** |

> Pour la décision financière, **utiliser le scénario conservateur**
> (~190 000 €/an arrondi). Les deux axes "à valider" (revenus + rétention)
> sont divisés par deux le temps que les case studies clients confirment
> les ordres de grandeur.

---

## 9 · Coûts Centrium

### 9.1 Tarification par persona

Centrium pratique une tarification **sur devis**, sans grille publique
(cf. `PRESENTATION_ENTREPRISE.md` § 7.1). Voici les **ordres de grandeur
estimatifs** par persona :

| Persona | Mensuel estimé | Annuel estimé |
|---|---|---|
| **ESN 10 – 30 consultants** | 1 200 – 2 500 €/mois | 14 400 – 30 000 €/an |
| **ESN 30 – 100 consultants** | 3 000 – 6 000 €/mois | 36 000 – 72 000 €/an |
| **Groupe 100+ consultants** | Sur mesure | À chiffrer (typiquement 80 000 – 200 000 €/an) |

Pour l'ESN type modélisée (**30 consultants**), nous retenons **30 000 €/an**
comme valeur médiane.

### 9.2 Périmètre inclus

Le tarif Centrium **inclut systématiquement** :

- Tous les modules métier (consultants, CV Optimizer, CRM, missions, CRA,
  facturation, assistant comptable, alertes, portail consultant)
- Onboarding accompagné (cadrage, configuration, import données,
  formation 2 h, 30 jours de support dédié post mise en production)
- Stockage Storage (CV, contrats, factures) sans limite raisonnable
- Bande passante Realtime
- Mises à jour produit en continu (pas de "v2" payante séparée)
- Sauvegardes chiffrées + PITR 7 jours
- Conformité RGPD + DPA signable

### 9.3 Options additionnelles

| Option | Plan requis | Tarification |
|---|---|---|
| SSO SAML 2.0 / OIDC *(Q3 2026)* | Enterprise | Inclus |
| MFA renforcé | Tous | Inclus |
| API publique *(Q1 2027)* | Enterprise | Inclus |
| White-label *(branding total)* | Sur devis | Variable |
| SLA renforcé 24/7 + 99,95 % uptime | Enterprise | Variable |
| Audit sécurité dédié | Sur devis | Sur devis |
| Formation sur site | Sur devis | Sur devis |

### 9.4 Pas de coût caché

- Pas de "modules à activer" facturés séparément en surprise
- Pas de tarif "par appel API Claude" — le volume IA est inclus dans le forfait
- Pas de frais d'import de données d'un outil existant (CSV pris en charge)
- Pas de frais de migration sortante (export complet au format CSV / PDF
  sur simple demande à tout moment)

---

## 10 · Calcul ROI

### 10.1 Scénario de référence (conservateur)

```
Gain annuel modélisé   = 190 000 €
Coût Centrium annuel   = 30 000 €
Gain net annuel        = 190 000 - 30 000 = 160 000 €

ROI = Gain net / Coût × 100
    = 160 000 / 30 000 × 100
    = 533 %

Payback = Coût / (Gain annuel / 12)
        = 30 000 / (190 000 / 12)
        = 30 000 / 15 833
        = 1,9 mois
```

**ROI : 533 % · Payback : 1,9 mois.**

### 10.2 Scénario pessimiste (-50 % supplémentaire)

Si l'on divise encore par 2 le gain modélisé conservateur, par prudence
maximale :

```
Gain annuel              = 95 000 €
Coût Centrium annuel     = 30 000 €
Gain net                 = 65 000 €
ROI                      = 217 %
Payback                  = 30 000 / (95 000 / 12) = 3,8 mois
```

**Même en scénario pessimiste, le ROI dépasse 200 % et le payback reste
inférieur à 4 mois.**

### 10.3 Scénario optimiste (modélisation complète)

```
Gain annuel              = 275 000 €
Coût Centrium annuel     = 30 000 €
Gain net                 = 245 000 €
ROI                      = 818 %
Payback                  = 30 000 / (275 000 / 12) = 1,3 mois
```

### 10.4 Synthèse des trois scénarios

| Scénario | Gain | Coût | Gain net | ROI | Payback |
|---|---:|---:|---:|---:|---:|
| Optimiste | 275 000 € | 30 000 € | 245 000 € | **818 %** | 1,3 mois |
| **Conservateur (référence)** | **190 000 €** | **30 000 €** | **160 000 €** | **533 %** | **1,9 mois** |
| Pessimiste | 95 000 € | 30 000 € | 65 000 € | **217 %** | 3,8 mois |

---

## 11 · Comparaison aux alternatives

### 11.1 Outil interne maison

Construire un outil interne équivalent à Centrium :

| Poste | Coût |
|---|---|
| Développement initial (1 an, 2 devs full-stack + 1 PM) | 80 000 – 150 000 € |
| Maintenance évolutive et corrective annuelle | 20 000 €/an |
| Hébergement, sécurité, conformité (RGPD, audit) | 10 000 €/an |
| Obsolescence (techno qui vieillit, dette technique) | Caché, mais réel |
| **Total Année 1** | **110 000 – 180 000 €** |
| **Total Année N+1** | **30 000 €/an minimum** |

Surcoût VS Centrium :
- Année 1 : ~80 000 – 150 000 € de plus
- Au-delà : équivalent en cash flow mais avec une **base maintenue par
  vous-même**, sans roadmap produit, sans recherche fonctionnelle
- Risque de départ d'un dev clé qui faisait tourner l'outil

**Conclusion** : un outil interne est plus cher dès la première année et
ne livre aucune fonctionnalité IA native (CV Optimizer, matching). Il
ne se justifie que pour les groupes avec déjà une R&D interne forte sur
des cas très spécifiques.

### 11.2 Empilement d'outils du marché

Configuration typique d'une ESN qui "fait avec ce qui existe" :

| Outil | Usage | Coût/mois pour 30 consultants + 7 users |
|---|---|---|
| Notion | Pipeline + base consultants | 8 €/user × 7 = 56 € |
| Excel / Google Sheets | Reporting, CRA | Inclus dans Workspace |
| Word + PDF tools | CV, contrats | 100 € (Adobe Acrobat Pro) |
| DocuSign | Signature électronique | 25 €/user × 5 = 125 € |
| QuickBooks ou alternative | Facturation | 60 €/mois |
| Mailchimp ou équivalent | Relances commerciales | 50 €/mois |
| **Total licences** | | **~390 €/mois ~ 4 700 €/an** |

Coûts cachés :
- Aucune intégration → ressaisie permanente → 10-15 h/semaine de
  "plumbing" par BM (cf. § 4.1) → ~80 000 €/an de productivité perdue
- Erreurs de saisie multi-outils → contentieux et incidents
- Pas de visibilité unifiée → décisions sur données partielles

**Conclusion** : Centrium ne remplace pas seulement les licences (4 700 €)
mais surtout le **temps perdu à les recoller entre elles** (80 000 €+).
Le calcul de licences seul est trompeur.

### 11.3 Plateformes ESN traditionnelles (Boondmanager, Akuiteo, ConnectWise)

| Plateforme | Tarif estimé pour 30 consultants | Force | Limite |
|---|---|---|---|
| **Boondmanager** | 35 000 – 60 000 €/an | Mature, large adoption FR, conforme | UX vieillissante, pas d'IA native, intégration lourde |
| **Akuiteo** | 50 000 – 80 000 €/an | ERP complet, multi-entités | Cher, complexe, courbe d'adoption longue |
| **ConnectWise** | 40 000 – 70 000 €/an | Suite outils US, robuste | Anglo-saxon, conformité RGPD plus floue, UX vieillissante |
| **Centrium** | 24 000 – 36 000 €/an | IA native, UX moderne, EU-first, transparence RGPD | Plus jeune (mise en marché 2026), portefeuille clients en croissance |

**Positionnement Centrium** : **IA + UX modernisée + EU-first**, sur le
même segment de prix qu'un Notion+DocuSign+QuickBooks bien intégré, mais
avec un produit unifié.

---

## 12 · Cas d'usage à fort levier

Centrium délivre le meilleur ROI dans **trois situations cibles** :

### 12.1 ESN en sortie de croissance (10 → 30 consultants)

**Le scénario type** : une ESN passe de 10 à 30 consultants en 18 mois.
Sans plateforme, elle doit embaucher 1 à 2 BMs supplémentaires
(120 000 – 160 000 €/an chargés) **uniquement pour absorber la charge
administrative**.

Centrium permet de structurer sans cette embauche → **économie nette de
80 000 – 120 000 €/an** par rapport au scénario "embaucher".

### 12.2 Cabinet conseil avec intercontrat élevé (> 15 %)

**Le scénario type** : un cabinet conseil 30 consultants a 15 % de taux
d'intercontrat moyen (4,5 consultants à plein temps en intercontrat).
Chaque consultant en intercontrat coûte ~6 800 €/mois (salaire chargé
non facturé).

```
Coût annuel d'intercontrat = 4,5 × 12 × 6 800 € = 367 000 €/an
```

Centrium réduit ce taux de 30-50 % via les alertes anticipées + matching
plus rapide :
- Réduction 30 % → **gain ~110 000 €/an**
- Réduction 50 % → **gain ~183 000 €/an**

Dans ce contexte, le ROI Centrium s'envole au-delà de 1 000 %.

### 12.3 Groupe avec audit interne strict

**Le scénario type** : un groupe (ETI, secteur public, banque, santé)
soumis à un audit interne annuel (ISO 27001, SOC 2, RGPD, sécurité des
SI).

Centrium fournit "out of the box" :
- Audit trail complet 5 ans
- RLS multi-tenant attestable
- DPA signable, sous-traitants documentés
- Hébergement EU exclusif
- Headers HTTP stricts auditables

Économie : **plusieurs dizaines de milliers d'euros** sur l'audit annuel
(temps consultant compliance + production de preuves), versus un outil
interne qui exige un audit dédié à chaque cycle.

---

## 13 · Risques et limites du calcul

### 13.1 Variables non maîtrisées

| Risque | Impact ROI | Mitigation |
|---|---|---|
| Adoption variable selon maturité numérique ESN | -20 à -40 % gain Axe 1 | Onboarding accompagné inclus + formation équipe |
| Ancien outil maintenu en parallèle | -30 à -50 % gain Axe 1 | Plan de bascule documenté en pré-vente, accompagnement déprovisioning |
| Cycle de vente AO réel < 24 h chez le client | -30 à -50 % gain Axe 2 | Axe 2 déjà divisé par 2 en scénario conservateur |
| Turnover consultant peu sensible à l'outil | -50 à -100 % gain Axe 4 | Axe 4 déjà divisé par 2 en scénario conservateur |
| Croissance ESN ralentit (cycle macro) | -10 à -20 % gain global | ROI reste positif > 300 % même en scénario pessimiste |

### 13.2 Variables à surveiller post-déploiement

| Métrique | Mesure de référence | Période |
|---|---|---|
| Heures/semaine BM sur tâches administratives | Time-tracking 2 semaines pré-Centrium | 30 j après mise en prod |
| Délai moyen entre AO et envoi CV | Mesure baseline avant | Trimestriel |
| Nombre d'incidents CV / facturation | Comptage manuel rétrospectif 12 mois | Annuel |
| Taux d'intercontrat | KPI interne ESN | Mensuel |
| Turnover consultant | KPI interne RH | Annuel |

### 13.3 Ce que ce document **ne mesure pas**

- **Valeur stratégique long terme** d'avoir une donnée propre, structurée,
  unifiée (data assets exploitables pour reporting investisseur, due
  diligence acquisition…)
- **Réduction du stress équipe** (impact bien-être au travail, non
  monétisable simplement)
- **Effet image** sur les prospects clients (qualité des CV reçus, vitesse
  de réponse, professionnalisme perçu)

Ces effets sont **réels** mais volontairement exclus du calcul pour
rester conservateur.

---

## 14 · Modèle de calcul personnalisé (à venir Q3 2026)

Un **ROI calculator interactif** sera publié sur
`centrium-platform.com/roi` en Q3 2026 (date cible : septembre 2026).

Inputs prévus :

- Nombre de consultants gérés
- Nombre de business managers
- Taux d'intercontrat actuel (%)
- TJM moyen facturé client (€)
- Nombre d'AOs traités par an
- Outils actuels en empilement (Notion, Excel, DocuSign…)

Outputs calculés :

- Gain temps BM annuel (€)
- Gain revenus annuel (€)
- Gain réduction risques annuel (€)
- Coût Centrium estimé (fourchette)
- **ROI net 12 mois (%)**
- **Payback (mois)**

Le calculator s'appuie sur le même modèle que ce document mais permet
de **remplacer chaque hypothèse par vos chiffres réels**.

---

## 15 · Comment valider votre propre ROI en 4 étapes

### Étape 1 — Baseline 1 mois (avant POC)

**Objectif** : mesurer la situation actuelle.

- Sur 4 semaines, chaque BM tient un **journal de temps simple** sur les
  6 tâches administratives (cf. § 4.1).
- Compter sur l'année écoulée :
  - Nombre d'incidents CV signalés
  - Nombre de contentieux facturation
  - Nombre de mois d'intercontrat sur l'équipe
  - Nombre de départs consultants

Livrable : **tableau baseline** signé par la direction des opérations.

### Étape 2 — POC 30 jours sur équipe pilote

**Objectif** : tester Centrium sur un périmètre restreint.

- Sélectionner **3 à 5 BMs** comme équipe pilote
- Migrer **5 à 10 consultants** sur la plateforme
- Activer **un cas d'usage prioritaire** (par ex. CV Optimizer + CRM)
- Onboarding inclus dans le POC

Engagement Centrium : pas d'engagement de souscription tant que le POC
n'est pas validé.

### Étape 3 — Mesure delta sur 30 jours

**Objectif** : refaire la mesure de l'étape 1 sur la période POC.

- Mêmes tâches, mêmes BMs (pilote)
- Mêmes indicateurs (heures/semaine, incidents, intercontrat)

Livrable : **tableau comparatif** avant/après, signé par la direction
des opérations.

### Étape 4 — Extrapolation 12 mois

**Objectif** : calculer le ROI prévisionnel sur 12 mois pour décision
d'extension.

- Appliquer le delta mesuré (étape 3) à l'ensemble des BMs
- Ajouter l'effet revenus (Axe 2) calculé sur le pipeline AO réel
- Soustraire le coût Centrium pour l'ensemble de l'équipe
- **Décision GO/NO-GO** sur souscription pleine

Ce processus prend **typiquement 60 jours** entre démarrage POC et
décision finale. Centrium accompagne chaque étape (cadrage, mesure,
synthèse).

---

## 16 · Annexes

### 16.1 Hypothèses détaillées (résumé)

| Variable | Valeur | Sensibilité ROI |
|---|---|---|
| Coût chargé BM / heure | 35 € | Linéaire — × 2 si BM senior |
| Semaines travaillées | 47 | Faible |
| AO/an | 100 | Linéaire — fort impact Axe 2 |
| AO perdus pour retard (%) | 30 % | Linéaire — fort impact Axe 2 |
| % récupération Centrium | 50 % | Linéaire — à valider en case study |
| Marge brute par mission | 9 900 € | Variable selon TJM et durée mission |
| Coût remplacement consultant | 8 000 € | Variable selon séniorité |
| Coût Centrium annuel (ESN 30) | 30 000 € | Fourchette 24 – 36 k€ |

### 16.2 Sources statistiques

- **Syntec Numérique**, Baromètre ESN 2024 (TJM moyen, taux intercontrat)
- **INSEE**, coût total chargé salarié cadre France, mise à jour 2024
- **APEC**, Étude Cadres IT 2024 (salaire médian business manager)
- **ANDRH**, Baromètre attractivité 2024 (coût de remplacement)
- **Observatoire CNIL/RGPD**, recommandations conservation et anonymisation
- **Code de commerce français**, art. L123-22 (conservation pièces comptables)
- **Statistiques internes Centrium**, juin 2025 – mai 2026 (démos, POCs,
  entretiens prospects)

### 16.3 Lexique financier

| Terme | Définition |
|---|---|
| **TCC** | Total Cost of Compensation — coût total chargé employeur d'un salarié (salaire brut + charges patronales + avantages + frais annexes). |
| **TJM** | Taux Journalier Moyen — prix de facturation d'une journée de prestation consultant. |
| **OPEX** | Operating Expenditures — dépenses récurrentes d'exploitation (par opposition aux CAPEX, investissements amortis). Un SaaS comme Centrium est OPEX pur. |
| **CAPEX** | Capital Expenditures — dépenses d'investissement amortissables sur plusieurs années. Un outil interne maison est typiquement CAPEX. |
| **Payback** | Délai de retour sur investissement — temps nécessaire pour que les gains cumulés couvrent l'investissement initial. |
| **ROI** | Return On Investment — gain net en pourcentage du coût investi. |
| **NPV** | Net Present Value — valeur actuelle nette d'un investissement, après actualisation des flux futurs au coût du capital. |
| **TCO** | Total Cost of Ownership — coût total de possession d'une solution sur sa durée de vie (licences + intégration + maintenance + obsolescence + remplacement). |
| **Marge brute** | CA - coût des consultants. Indicateur clé pour une ESN. |
| **Intercontrat** | Période entre deux missions facturées pendant laquelle le consultant est salarié non facturé — coût pur pour l'ESN. |
| **MRR** | Monthly Recurring Revenue — revenu mensuel récurrent d'un SaaS. |
| **ARR** | Annual Recurring Revenue — revenu annuel récurrent (≈ MRR × 12 pour les abonnements mensuels). |
| **NDR / GDR** | Net Dollar Retention / Gross Dollar Retention — taux de rétention des revenus existants sur 12 mois. |

### 16.4 Versions du document

| Version | Date | Auteur | Modifications |
|---|---|---|---|
| 1.0 | 2026-06-04 | QuadCore SAS | Création initiale — Guide ROI Centrium v1.0 |

---

> Pour modéliser votre cas spécifique avec un consultant Centrium :
> **sales@centrium-platform.com**
>
> Pour challenger les hypothèses de ce document :
> **contact@centrium-platform.com** — toute remontée terrain est bienvenue
> et alimentera la version 1.1.
