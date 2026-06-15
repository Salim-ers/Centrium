# Modèle financier prévisionnel — Centrium

> **Document CFO** — Modèle financier prévisionnel 36 mois défendable face à investisseur, banquier ou board.
> **Date d'émission :** 15 juin 2026
> **Auteur :** Direction financière Centrium by QuadCore SAS
> **Version :** 1.0 (post-lancement v1.0 produit)
> **Périmètre :** France métropolitaine — SaaS B2B vertical ESN
> **Devise :** EUR (HT sauf mention contraire)

---

## Note méthodologique préliminaire

Ce modèle est construit sur la base d'une **comptabilité d'engagement** (revenu reconnu au prorata mensuel des abonnements actifs) et d'un **suivi cash distinct** (encaissements réels avec décalage clients 30-45 jours et provisions TVA/IS/charges).

Les hypothèses sont ancrées sur :
- **Benchmarks SaaS B2B verticaux français** (OpenView 2024, KeyBanc SaaS Survey 2025, BPI Tech Tour 2025)
- **Comparables marché ESN** : Boondmanager (ARR ~25M€, 1500 clients), Whoz (Series A 12M€), Akuiteo
- **Données SaaStr & ChartMogul** pour les ratios SaaS de référence (NRR, churn, CAC payback)
- **Coûts réels d'infrastructure** observés sur la stack Vercel + Supabase + Anthropic Claude API

Tous les chiffres sont **défendables** mais **doivent être stress-testés** trimestriellement et réajustés selon les premiers signaux marché (les 5 premiers clients seront révélateurs).

---

## 1. Hypothèses de base (à challenger)

### 1.1 Modèle de pricing retenu

Le pricing est **per-consultant** avec palier d'entrée à 20 consultants, conformément à la décision fondateur. Trois plans construits sur cette base :

| Plan | Cible | Prix unitaire / consultant / mois | Palier mini | Modules inclus | ARPU mensuel typique |
|---|---|---|---|---|---|
| **Starter** | ESN 20-40 consultants | 39 € HT | 20 (= 780 €/mois plancher) | Bibliothèque, CV Optimizer, CRA, facturation | **1 050 €** (27 consultants moy.) |
| **Growth** | ESN 40-100 consultants | 49 € HT | 40 (= 1 960 €/mois plancher) | + CRM, Matching IA, AO, Dashboard | **3 200 €** (65 consultants moy.) |
| **Enterprise** | ESN 100-200+ consultants | 59 € HT + setup 5-15 k€ | 100 | + SSO, API, SLA 99.9 %, CSM dédié, audit logs avancés | **8 850 €** (150 consultants moy.) |

**ARPU pondéré moyen cible (mix 60/30/10) : ~2 380 € HT / mois / client → 28 600 € HT ARR / client.**

Comparable marché : Boondmanager ~25-80 k€/an pour 30 consultants → Centrium se positionne **~30-40 % moins cher** à fonctionnalité équivalente, ce qui justifie une stratégie "challenger" agressive sur les 18 premiers mois.

### 1.2 Taux de conversion par canal (lead → client payant)

| Canal | Coût/lead estimé | Taux MQL→SQL | Taux SQL→client | Taux global lead→client | Cycle vente moyen |
|---|---|---|---|---|---|
| **Outbound LinkedIn (Sales Nav + Apollo)** | 35 € | 25 % | 18 % | **4,5 %** | 90-120 jours |
| **SEO / inbound contenu** | 80 € (coût amorti) | 35 % | 25 % | **8,8 %** | 60-90 jours |
| **Référencement co-fondateur / réseau** | 0 € | 60 % | 40 % | **24 %** | 45-60 jours |
| **Événements ESN (Numeum, Syntec)** | 250 € | 30 % | 22 % | **6,6 %** | 90-150 jours |
| **Partenariats (cabinets RH, intégrateurs Sage)** | 0 € (commission 15 %) | 45 % | 35 % | **15,8 %** | 75-100 jours |

**Taux pondéré sortie modèle : 7-9 % lead → client en mix réaliste.**

### 1.3 Churn (cible défendable)

Le SaaS vertical B2B avec friction d'usage interne (CRA, facturation) présente des taux de churn **structurellement bas** une fois l'onboarding réussi.

| Métrique | Cible année 1 | Cible année 2 | Cible année 3 | Benchmark vertical SaaS B2B FR |
|---|---|---|---|---|
| **Churn logo mensuel** | 1,5 % | 1,2 % | 0,8 % | 1,0-2,0 % (KeyBanc 2025) |
| **Churn logo annuel** | **16,6 %** | **13,5 %** | **9,2 %** | 10-18 % (Boondmanager ~8 %) |
| **Churn revenue brut annuel (GRR inverse)** | 14 % | 11 % | 7 % | — |
| **Net Revenue Retention (NRR)** | 95 % | 105 % | 115 % | >110 % top quartile |
| **Gross Revenue Retention (GRR)** | 86 % | 89 % | 93 % | >85 % bon, >90 % excellent |

L'**upsell par croissance du nombre de consultants chez le client** (modèle per-seat) est le moteur principal du NRR > 100 % en années 2-3.

### 1.4 CAC cible et LTV

**CAC blended cible** (acquisition coût tout compris : marketing + sales + outils + part fondateur) :

| Phase | CAC cible | Justification |
|---|---|---|
| **Mois 1-6** (bootstrap, fondateur sales) | 1 500 € | Réseau + outbound léger, pas de salaire sales |
| **Mois 7-18** (1er sales) | 4 200 € | Salaire SDR/AE + outils + marketing |
| **Mois 19-36** (scale) | 5 800 € | Équipe complète, mix paid/inbound |

**LTV calculée** (avec ARPU pondéré 2 380 €/mois, marge brute 85 %, churn cible) :

```
LTV = ARPU × Marge brute / Churn mensuel
LTV année 1 = 2 380 × 0,85 / 0,015 = 134 866 €
LTV année 3 = 2 380 × 0,85 / 0,008 = 252 875 €
```

**Ratio LTV/CAC cible :**

| Phase | LTV | CAC | Ratio LTV/CAC | Norme SaaS |
|---|---|---|---|---|
| M+12 | 135 k€ | 4,2 k€ | **32x** | >3x acceptable, >5x excellent |
| M+24 | 180 k€ | 5,8 k€ | **31x** | — |
| M+36 | 253 k€ | 5,8 k€ | **43x** | — |

> Ratios apparemment très élevés mais typiques du **SaaS B2B vertical avec ticket élevé**. Le ratio sera mécaniquement compressé si churn réel > cible : sensibilité étudiée en §5.

**CAC Payback (mois pour récupérer le CAC sur marge brute) :**

| Phase | CAC | ARPU × Marge | CAC Payback |
|---|---|---|---|
| M+12 | 4 200 € | 2 023 €/mois | **2,1 mois** |
| M+24 | 5 800 € | 2 380 €/mois | **2,9 mois** |
| M+36 | 5 800 € | 2 600 €/mois | **2,7 mois** |

Norme SaaS : <12 mois bon, <6 mois excellent.

### 1.5 Marge brute SaaS

Calcul par client moyen (ARPU 2 380 €/mois) :

| Poste COGS / client / mois | Coût |
|---|---|
| Hébergement Vercel (part allouée) | 8 € |
| Supabase (DB + Storage + Auth, part allouée) | 22 € |
| Anthropic Claude API (CV, matching, parsing) | 95 € (~7 M tokens/mois/client moy.) |
| Resend (emails) | 4 € |
| Stripe (1,4 % + 0,25 €, frais retenus) | 33 € |
| Sentry / Upstash / VirusTotal | 6 € |
| Support N1 (part CSM) | 130 € |
| Backups, sécu, monitoring | 12 € |
| **Total COGS** | **310 €** |
| **Marge brute** | **2 070 €** |
| **Taux de marge brute** | **87 %** |

**Marge brute SaaS cible : 85-87 %** (norme SaaS B2B premium : 75-85 %, Centrium tire vers le haut grâce au mix per-seat + faible support N1 sur cible ESN sophistiquée).

### 1.6 Salaires bruts chargés (référence)

Tous les coûts salariaux ci-dessous sont **bruts chargés employeur** (× 1,45 sur le brut) — base mensuelle :

| Poste | Brut annuel | Brut chargé annuel | Brut chargé mensuel |
|---|---|---|---|
| **Fondateur CEO/CTO (Salim)** | 48 000 € (an 1) puis 72 000 € | 69 600 / 104 400 € | 5 800 / 8 700 € |
| **Dev fullstack senior** | 60 000 € | 87 000 € | 7 250 € |
| **Dev junior** | 40 000 € | 58 000 € | 4 833 € |
| **Sales SDR** | 38 000 € + variable 15 k€ | 76 850 € | 6 400 € |
| **Sales AE (Account Exec)** | 50 000 € + variable 25 k€ | 108 750 € | 9 062 € |
| **Head of Sales** | 75 000 € + variable 30 k€ | 152 250 € | 12 687 € |
| **Customer Success (CSM)** | 45 000 € | 65 250 € | 5 437 € |
| **Marketing / Growth** | 50 000 € | 72 500 € | 6 042 € |
| **DAF externalisé (forfait)** | — | 18 000 € | 1 500 € |

---

## 2. Tableau projection MRR / ARR (mois M+1 à M+36, par trimestre)

### 2.1 Hypothèses de ramp-up commercial

- **T1-T2 (M+1 à M+6)** : phase pilote, fondateur seul en sales, signature des 3-5 premiers clients via réseau et outbound léger
- **T3 (M+7-M+9)** : recrutement 1er sales SDR (M+7), montée en charge progressive
- **T4-T6 (M+10-M+18)** : recrutement Head of Sales (M+12) + 2e sales (M+15), structuration outbound + inbound
- **T7-T9 (M+19-M+27)** : équipe sales étoffée (3 AE), industrialisation acquisition
- **T10-T12 (M+28-M+36)** : scale, ouverture Belgique/Luxembourg envisagée

### 2.2 Projection trimestrielle scénario réaliste

| Trim | Mois | Nouveaux clients | Churn (clients perdus) | Clients cumulés | ARPU moyen €/mois | MRR € | ARR € | Net new ARR € |
|---|---|---|---|---|---|---|---|---|
| **T1** | M+1 à M+3 | 2 | 0 | 2 | 1 800 | 3 600 | 43 200 | 43 200 |
| **T2** | M+4 à M+6 | 3 | 0 | 5 | 1 900 | 9 500 | 114 000 | 70 800 |
| **T3** | M+7 à M+9 | 4 | 0 | 9 | 2 000 | 18 000 | 216 000 | 102 000 |
| **T4** | M+10 à M+12 | 5 | 1 | 13 | 2 100 | 27 300 | **327 600** | 111 600 |
| **T5** | M+13 à M+15 | 6 | 1 | 18 | 2 200 | 39 600 | 475 200 | 147 600 |
| **T6** | M+16 à M+18 | 7 | 1 | 24 | 2 300 | 55 200 | 662 400 | 187 200 |
| **T7** | M+19 à M+21 | 9 | 2 | 31 | 2 380 | 73 780 | 885 360 | 222 960 |
| **T8** | M+22 à M+24 | 11 | 2 | 40 | 2 450 | 98 000 | **1 176 000** | 290 640 |
| **T9** | M+25 à M+27 | 13 | 3 | 50 | 2 500 | 125 000 | 1 500 000 | 324 000 |
| **T10** | M+28 à M+30 | 15 | 3 | 62 | 2 550 | 158 100 | 1 897 200 | 397 200 |
| **T11** | M+31 à M+33 | 17 | 4 | 75 | 2 600 | 195 000 | 2 340 000 | 442 800 |
| **T12** | M+34 à M+36 | 19 | 4 | 90 | 2 650 | 238 500 | **2 862 000** | 522 000 |

**Synthèse :**

| Échéance | Clients | MRR | ARR | ARR / employé |
|---|---|---|---|---|
| Fin Année 1 (M+12) | 13 | 27 300 € | **327 600 €** | 109 200 € (3 ETP) |
| Fin Année 2 (M+24) | 40 | 98 000 € | **1 176 000 €** | 168 000 € (7 ETP) |
| Fin Année 3 (M+36) | 90 | 238 500 € | **2 862 000 €** | 220 000 € (13 ETP) |

> **Lecture :** l'ARR fin année 1 atterrit à **328 k€**, milieu de fourchette de l'objectif annoncé (200-500 k€). La trajectoire est crédible avec un fondateur opérationnel sales + 1 SDR à partir de M+7.

---

## 3. Tableau coûts mensuels (récurrents)

### 3.1 Coûts infrastructure (variable + part fixe)

Calculés en fonction du nombre de clients actifs, avec part fixe minimale.

| Poste | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| Vercel Pro + bande passante | 60 € | 100 € | 180 € | 420 € | 850 € |
| Supabase Pro + add-ons | 80 € | 180 € | 380 € | 980 € | 2 200 € |
| Anthropic Claude API | 50 € | 380 € | 1 235 € | 3 800 € | 8 550 € |
| Resend (emails transac) | 20 € | 35 € | 65 € | 200 € | 450 € |
| Stripe (frais % CA) | 0 € | 95 € | 380 € | 1 372 € | 3 340 € |
| Sentry + Upstash + VirusTotal | 70 € | 70 € | 100 € | 180 € | 320 € |
| CDN, backups, monitoring | 30 € | 50 € | 90 € | 220 € | 500 € |
| **Sous-total infra/COGS** | **310 €** | **910 €** | **2 430 €** | **7 172 €** | **16 210 €** |

### 3.2 Salaires (brut chargé)

| Poste | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| Fondateur CEO/CTO | 5 800 € | 5 800 € | 5 800 € | 8 700 € | 8 700 € |
| Dev fullstack senior | — | — | 7 250 € | 7 250 € | 14 500 € (×2) |
| Dev junior | — | — | — | 4 833 € | 4 833 € |
| Sales SDR | — | — | 6 400 € | 6 400 € | 6 400 € |
| Sales AE | — | — | — | 9 062 € | 18 124 € (×2) |
| Head of Sales | — | — | — | 12 687 € | 12 687 € |
| Customer Success | — | — | — | 5 437 € | 10 874 € (×2) |
| Marketing / Growth | — | — | — | 6 042 € | 6 042 € |
| DAF externalisé | 1 000 € | 1 500 € | 1 500 € | 1 500 € | 2 000 € |
| **Sous-total salaires** | **6 800 €** | **7 300 €** | **20 950 €** | **61 911 €** | **84 160 €** |
| **ETP équivalent** | 1,1 | 1,1 | 3,0 | 7,0 | 13,0 |

### 3.3 Marketing & commercial

| Poste | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| LinkedIn Ads | 0 € | 800 € | 2 500 € | 5 000 € | 8 000 € |
| Google Ads (search brand+intent) | 0 € | 300 € | 1 200 € | 3 500 € | 6 000 € |
| Production contenu (SEO, vidéos, cas) | 0 € | 1 200 € | 2 000 € | 3 500 € | 5 000 € |
| Événements (Numeum, Syntec, salons) | 0 € | 0 € | 1 500 € | 3 000 € | 5 000 € |
| Sales Navigator + Apollo + Lemlist | 180 € | 350 € | 580 € | 1 100 € | 1 800 € |
| Outils CRM (HubSpot Starter→Pro) | 0 € | 50 € | 450 € | 1 200 € | 1 800 € |
| DocuSign / signature électronique | 35 € | 35 € | 80 € | 220 € | 500 € |
| **Sous-total marketing/sales** | **215 €** | **2 735 €** | **8 310 €** | **17 520 €** | **28 100 €** |

### 3.4 Outils SaaS internes

| Poste | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| Slack | 0 € | 0 € | 30 € | 90 € | 175 € |
| Notion / Linear | 10 € | 20 € | 60 € | 150 € | 280 € |
| GitHub Team / Copilot | 25 € | 50 € | 120 € | 280 € | 520 € |
| Google Workspace | 12 € | 24 € | 60 € | 140 € | 260 € |
| Figma | 15 € | 15 € | 45 € | 90 € | 180 € |
| Outils analytics (Plausible, Posthog) | 0 € | 50 € | 120 € | 280 € | 480 € |
| **Sous-total SaaS internes** | **62 €** | **159 €** | **435 €** | **1 030 €** | **1 895 €** |

### 3.5 Frais généraux

| Poste | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| Comptable mensualisé | 250 € | 300 € | 450 € | 750 € | 1 200 € |
| Juridique (avocat retainer + ad hoc) | 0 € | 200 € | 400 € | 800 € | 1 500 € |
| Bureau / coworking | 0 € | 250 € | 600 € | 1 800 € | 4 000 € |
| Domiciliation | 30 € | 30 € | 30 € | 30 € | 30 € |
| Assurance RC pro + cyber | 50 € | 80 € | 150 € | 380 € | 750 € |
| Banque (frais comptes pro) | 30 € | 40 € | 60 € | 120 € | 200 € |
| Déplacements / repas clients | 100 € | 350 € | 900 € | 2 200 € | 4 500 € |
| Pentest annuel (provision /12) | 0 € | 0 € | 600 € | 800 € | 1 200 € |
| Cert SOC 2 (provision /12) | 0 € | 0 € | 0 € | 1 500 € | 2 000 € |
| Imprévus / réserve (10 %) | 740 € | 1 190 € | 3 416 € | 9 411 € | 14 384 € |
| **Sous-total frais généraux** | **1 200 €** | **2 440 €** | **6 606 €** | **17 791 €** | **29 764 €** |

### 3.6 Récapitulatif coûts mensuels totaux

| Catégorie | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---|---|---|---|---|
| Infrastructure / COGS | 310 € | 910 € | 2 430 € | 7 172 € | 16 210 € |
| Salaires bruts chargés | 6 800 € | 7 300 € | 20 950 € | 61 911 € | 84 160 € |
| Marketing & commercial | 215 € | 2 735 € | 8 310 € | 17 520 € | 28 100 € |
| Outils SaaS internes | 62 € | 159 € | 435 € | 1 030 € | 1 895 € |
| Frais généraux | 1 200 € | 2 440 € | 6 606 € | 17 791 € | 29 764 € |
| **TOTAL OPEX MENSUEL** | **8 587 €** | **13 544 €** | **38 731 €** | **105 424 €** | **160 129 €** |
| **TOTAL ANNUALISÉ (×12)** | 103 044 € | 162 528 € | **464 772 €** | **1 265 088 €** | **1 921 548 €** |

---

## 4. Burn rate et runway

### 4.1 Burn mensuel par phase

| Phase | Période | MRR moyen | OPEX mensuel moyen | Burn net mensuel | Commentaire |
|---|---|---|---|---|---|
| **Phase 0 — Bootstrap** | M+1 à M+6 | 6 500 € | 11 000 € | **-4 500 €** | Salaire fondateur réduit, pas de sales |
| **Phase 1 — Premier sales** | M+7 à M+12 | 22 000 € | 30 000 € | **-8 000 €** | Recrutement SDR, ROI à 6 mois |
| **Phase 2 — Structuration** | M+13 à M+24 | 65 000 € | 75 000 € | **-10 000 €** | Head of Sales + 2 AE + CSM |
| **Phase 3 — Scale** | M+25 à M+36 | 175 000 € | 135 000 € | **+40 000 €** | EBITDA positif, croissance autofinancée |

### 4.2 Runway sans levée (bootstrap + JEI + CIR + revenus)

Hypothèse de cash de départ (apport fondateur + prêt d'honneur Initiative France + BPI Création) : **80 000 €**.

| Mois | Cash début | OPEX | Recettes (cash, dl 45j) | Aides (CIR + JEI rembours.) | Cash fin |
|---|---|---|---|---|---|
| M+0 | 80 000 € | 8 600 € | 0 € | 0 € | 71 400 € |
| M+3 | 56 800 € | 9 200 € | 3 600 € | 0 € | 51 200 € |
| M+6 | 38 500 € | 13 500 € | 9 500 € | 4 200 € (JEI charges) | 38 700 € |
| M+9 | 22 800 € | 22 000 € | 18 000 € | 4 200 € | 23 000 € |
| M+12 | 8 400 € | 38 700 € | 27 300 € | 12 500 € (CIR an 1) | **9 500 €** |
| M+15 | -6 200 € | 52 000 € | 39 600 € | 4 200 € | **-14 400 €** ⚠️ |

> **Conclusion critique :** sans levée, le **runway s'épuise vers M+13-M+15**. La fenêtre de levée doit s'ouvrir **dès M+6-M+9** pour signer un closing avant M+12.

### 4.3 Runway avec levée Seed 750 k€ closée à M+9

| Mois | Cash début | OPEX | Recettes | Aides | Cash fin |
|---|---|---|---|---|---|
| M+9 (post-levée) | 23 000 € + 750 000 € = 773 000 € | — | — | — | 773 000 € |
| M+12 | 750 000 € | 38 700 € | 27 300 € | 12 500 € | **751 100 €** |
| M+18 | 690 000 € | 55 200 € | 55 200 € | 4 200 € | **694 200 €** (équilibre cash) |
| M+24 | 600 000 € | 105 400 € | 98 000 € | 25 000 € (CIR) | **617 600 €** |
| M+30 | 520 000 € | 135 000 € | 158 000 € | 4 200 € | **547 200 €** (croissance cash) |
| M+36 | 600 000 € | 160 000 € | 238 500 € | 30 000 € | **708 500 €** |

**Runway post-levée : >36 mois.** Break-even cash atteint vers **M+24-M+26**.

### 4.4 Mois de break-even cible

| Indicateur | Mois cible | Conditions |
|---|---|---|
| **Break-even opérationnel (MRR = OPEX hors investissement)** | M+22 | Scénario réaliste |
| **Break-even cash (cash-flow net mensuel >0)** | M+26 | Avec décalage encaissement 45j |
| **EBITDA positif récurrent** | M+28 | Croissance soutenable sans cash burn |

---

## 5. Scénarios (Pessimiste / Réaliste / Optimiste)

### 5.1 Variables clé qui bougent

| Variable | Pessimiste | Réaliste | Optimiste |
|---|---|---|---|
| Taux conversion lead → client | 4 % | 7 % | 12 % |
| ARPU moyen | 1 800 € | 2 380 € | 2 900 € |
| Churn logo annuel an 1 | 25 % | 16,6 % | 10 % |
| CAC moyen | 7 500 € | 4 200 € | 2 800 € |
| Délai vente moyen | 150 jours | 90 jours | 60 jours |
| Croissance trim. clients an 2 | +20 % | +35 % | +55 % |

### 5.2 Synthèse récap MRR / ARR / Cash par scénario

#### Scénario pessimiste

| Échéance | Clients | MRR | ARR | Cash fin (avec levée 750 k€ à M+9) |
|---|---|---|---|---|
| Fin Année 1 | 7 | 12 600 € | **151 200 €** | 720 000 € |
| Fin Année 2 | 18 | 32 400 € | **388 800 €** | 380 000 € |
| Fin Année 3 | 40 | 72 000 € | **864 000 €** | -120 000 € ⚠️ (nouvelle levée requise) |

#### Scénario réaliste

| Échéance | Clients | MRR | ARR | Cash fin (avec levée 750 k€ à M+9) |
|---|---|---|---|---|
| Fin Année 1 | 13 | 27 300 € | **327 600 €** | 751 000 € |
| Fin Année 2 | 40 | 98 000 € | **1 176 000 €** | 617 000 € |
| Fin Année 3 | 90 | 238 500 € | **2 862 000 €** | 708 000 € |

#### Scénario optimiste

| Échéance | Clients | MRR | ARR | Cash fin (avec levée 750 k€ à M+9) |
|---|---|---|---|---|
| Fin Année 1 | 20 | 50 000 € | **600 000 €** | 800 000 € |
| Fin Année 2 | 65 | 178 000 € | **2 136 000 €** | 1 200 000 € |
| Fin Année 3 | 160 | 480 000 € | **5 760 000 €** | 2 800 000 € |

### 5.3 Sensibilités critiques

Les **3 variables qui font basculer le modèle** :

1. **Churn an 1** : passer de 16 % à 25 % = perte de **35 % de l'ARR fin an 3**
2. **ARPU** : passer de 2 380 € à 1 800 € = perte de **24 % de l'ARR fin an 3**
3. **CAC** : passer de 4 200 € à 7 500 € = **+650 k€ de besoin de cash cumulé sur 36 mois**

> **Priorité fondateur :** monitorer le churn dès le 3e client. Tout signal >2 %/mois doit déclencher un sprint produit/CSM immédiat.

---

## 6. Besoins de financement

### 6.1 Bootstrap : jusqu'où sans levée ?

Avec apport fondateur 30 k€ + prêt d'honneur Initiative France 25 k€ + BPI Création 25 k€ = **80 k€ de cash initial** :

- **Runway sans levée : ~13 mois** (jusqu'à M+13)
- **Permet de signer 8-12 clients** avant épuisement
- **Permet de prouver le PMF** (Product-Market Fit) et négocier une levée à valorisation correcte

### 6.2 Levée Seed cible

| Paramètre | Valeur recommandée | Justification |
|---|---|---|
| **Montant cible** | **750 k€ - 1 M€** | Couvre 24 mois d'opex, atteint break-even cash |
| **Timing closing** | M+9 à M+12 | Après 8-13 clients = traction démontrée |
| **Valorisation pré-money défendable** | 3-4 M€ | 10-12× ARR projeté an 1 (multiple SaaS B2B vertical seed FR 2025) |
| **Dilution acceptable** | 18-22 % | Standard Seed FR (BPI France Tech, Elaia, Serena, Iris) |
| **Type d'instrument** | BSA-AIR ou equity directe | BSA-AIR si pre-revenue rapide, equity si traction claire |

**Comparables récents (Seed SaaS B2B vertical FR 2024-2025) :**
- Whoz (vertical ESN proche) : Seed 2,5 M€ à 12 M€ pré-money (2022) — multiple ARR ~15×
- Pennylane (early days) : Seed 1,2 M€ (2020) à ~6 M€ pré-money
- Spendesk (early days) : Seed 1,5 M€ à 7 M€ pré-money
- Median seed SaaS B2B FR 2024 : **750 k€ à 4 M€ pré-money** (source : France Digitale 2024)

### 6.3 Aides publiques mobilisables (non dilutives)

| Dispositif | Montant cible | Conditions | Délai obtention |
|---|---|---|---|
| **JEI (Jeune Entreprise Innovante)** | Exonération charges patronales sur R&D = **~25-35 k€/an** dès an 1 | Statut JEI obtenu, R&D >15 % charges | 3 mois |
| **CIR (Crédit Impôt Recherche)** | **30 % des dépenses R&D éligibles** = ~40-80 k€/an | Activité R&D documentée | Remboursement N+1 (12 mois) |
| **CII (Crédit Impôt Innovation)** | **20 % des dépenses innovation** plafonné 80 k€/an = **16 k€ max** | PME, dépenses innovation | N+1 |
| **BPI France — Prêt Innovation FEI** | 50-300 k€ taux 0 % | Avoir levé en equity (matching 1:1) | 3-6 mois post-levée |
| **BPI France — Bourse French Tech** | 30 k€ subvention | Projet innovant, jeune entreprise | 4-6 mois |
| **French Tech Tremplin** | 30 k€ + accompagnement | Fondateurs sous-représentés | 6 mois |
| **Pass French Tech** | Accès facilité aux aides + lobbying | Croissance >100 %/an | Sur dossier |
| **CIFRE** | ~50 % d'un salaire doctorant pendant 3 ans | Sujet de recherche défini | 6 mois |
| **FEI (Région Île-de-France)** | 50-200 k€ subvention/avance | Innovation, emploi local | 4-8 mois |
| **Aides Numeum / Syntec** | Variables | Adhésion syndicat | — |

**Total aides mobilisables cumulées sur 24 mois : ~150-280 k€ non dilutif.** Réduit mécaniquement le besoin de levée de 20-30 %.

### 6.4 Plan de financement consolidé

| Source | Montant | Timing | Dilution |
|---|---|---|---|
| Apport fondateur | 30 k€ | M+0 | 0 % |
| Prêt d'honneur Initiative France | 25 k€ | M+1 | 0 % |
| BPI Création (prêt taux 0 %) | 25 k€ | M+2 | 0 % |
| Bourse French Tech | 30 k€ | M+5 | 0 % |
| CIR an 1 (remboursement) | 50 k€ | M+15 | 0 % |
| JEI (économie charges sur 24 mois) | 60 k€ | étalé | 0 % |
| **Levée Seed equity** | **750 k€** | M+9 | **20 %** |
| Prêt Innovation BPI (matching) | 200 k€ | M+11 | 0 % |
| **TOTAL FINANCEMENT 24 PREMIERS MOIS** | **~1 170 k€** | — | **20 %** |

---

## 7. Métriques SaaS clés à tracker (avec cibles par phase)

| Métrique | Définition | Cible M+12 | Cible M+24 | Cible M+36 | Benchmark top-tier |
|---|---|---|---|---|---|
| **MRR** | Monthly Recurring Revenue | 27 300 € | 98 000 € | 238 500 € | — |
| **ARR** | MRR × 12 | 327 600 € | 1 176 000 € | 2 862 000 € | — |
| **Croissance ARR YoY** | (ARR N / ARR N-1) - 1 | n/a | **+259 %** | **+143 %** | T2D3 (triple-triple-double-double-double) |
| **NRR** | (MRR cohorte début + expansion - churn) / MRR cohorte début | 95 % | 105 % | 115 % | >110 % top quartile |
| **GRR** | (MRR cohorte début - churn) / MRR cohorte début | 86 % | 89 % | 93 % | >90 % excellent |
| **Churn logo mensuel** | Clients perdus / clients début mois | 1,5 % | 1,2 % | 0,8 % | <1 % top |
| **CAC blended** | (Sales + Marketing) / Nouveaux clients | 4 200 € | 5 800 € | 5 800 € | — |
| **CAC Payback** | CAC / (ARPU × Marge brute) | 2,1 mois | 2,9 mois | 2,7 mois | <12 mois bon |
| **LTV** | ARPU × Marge / Churn mensuel | 135 k€ | 180 k€ | 253 k€ | — |
| **LTV/CAC** | — | 32× | 31× | 43× | >3× minimum, >5× excellent |
| **Magic Number** | Net new ARR T / OPEX S&M T-1 | 1,2 | 1,5 | 1,8 | >0,75 bon, >1 excellent |
| **Rule of 40** | Croissance % + Marge EBITDA % | -50 % | +85 % | +160 % | >40 % = SaaS sain |
| **Burn Multiple** | Net Burn / Net New ARR | 1,5× | 0,3× | 0× | <1× excellent, <2× sain |
| **ARR / Employé** | ARR / ETP | 109 k€ | 168 k€ | 220 k€ | >200 k€ top quartile |

---

## 8. Reporting financier

### 8.1 Tableau de bord mensuel interne (modèle Notion / Sheets)

À tenir le 5 du mois suivant :

| Section | KPIs trackés |
|---|---|
| **Revenu** | MRR, ARR, ARPU, Nouveau MRR, Expansion MRR, Churn MRR, Net New MRR |
| **Clients** | Clients actifs, Nouveaux signés, Churn logo, Pipeline ouvert (€), Pipeline qualifié (€) |
| **Sales** | Leads générés (par canal), MQL, SQL, Démos réalisées, Devis envoyés, Closings, Win rate |
| **Marketing** | Visites site, Taux conversion lead, Coût/lead par canal, CAC blended |
| **Cash** | Cash en banque, Burn mensuel, Runway restant, Encaissements clients, Dépenses |
| **Produit** | Tickets support ouverts / clos, NPS, Activation rate (consultants importés) |
| **Équipe** | Effectif, Cost / ETP, Recrutements en cours |

### 8.2 Reporting trimestriel investisseurs (template)

Envoi T+30 jours après clôture trimestre. Format **2-3 pages max + dashboard chiffré**.

Sections obligatoires :
1. **Highlights & lowlights du trimestre** (3-5 bullets max chaque)
2. **KPIs financiers** : MRR, ARR, croissance, NRR, churn, CAC, runway
3. **KPIs produit & équipe** : NPS, activation, recrutements
4. **Top 3 risques & mitigations**
5. **Cash situation** : cash début, burn, recettes, cash fin, runway
6. **Demandes / besoins** (introductions, conseil, recrutements)

### 8.3 Reporting annuel comptable

- **Comptes annuels** : bilan + compte de résultat + annexes (commissaire aux comptes obligatoire >8 M€ CA, >4 M€ bilan, >50 ETP)
- **Liasse fiscale** (formulaires 2050-2059 si IS) : déposée 3 mois après clôture
- **Annexe CIR/CII** : dossier technique + comptable à conserver 6 ans
- **Rapport JEI** : justification R&D au régime social

---

## 9. Stratégie cash management

### 9.1 Provisions à constituer mensuellement (BFR négatif souhaitable)

| Poste | Mode de provision | Montant cible à M+24 |
|---|---|---|
| **TVA collectée** (20 % CA) | Compte séparé, reversement mensuel ou trimestriel | ~19 600 € (sur MRR 98 k€) |
| **IS prévisionnel** (25 % résultat) | Provision si bénéfice prévu | 0 € (déficit reportable an 1-2) |
| **Charges sociales** (~45 % salaires) | URSSAF mensuelle + AGIRC-ARRCO trimestrielle | Déjà inclus dans brut chargé |
| **Indemnités CP & RTT** | Provision 10 % de la masse salariale | ~5 500 €/mois |
| **Réserve sécurité** (3 mois OPEX) | Cash bloqué | ~316 000 € à M+24 |

### 9.2 Délai paiement clients : impact cash

| Délai contractuel | Réalité moyenne | Impact BFR (sur ARR 1,2 M€) |
|---|---|---|
| **30 jours net** (cible) | 35-40 jours | ~115 k€ immobilisés |
| **45 jours fin de mois** (standard FR) | 55-60 jours | ~180 k€ immobilisés |
| **60 jours fin de mois** (grands comptes) | 75-90 jours | ~270 k€ immobilisés |

> **Stratégie contractuelle :** imposer **paiement annuel d'avance avec remise 10 %** pour les plans Growth et Enterprise → améliore le BFR de 40-60 % et sécurise le revenu. Standard SaaS B2B premium.

### 9.3 Factoring / affacturage

| Option | Pertinence Centrium | Conditions |
|---|---|---|
| **Affacturage classique** (BPCE Factor, Crédit du Nord) | Pertinent si grands comptes >60 jours | Commission 1-2 % CA + frais |
| **Affacturage SaaS (Capchase, Pipe)** | **Très pertinent** dès an 2 | 5-7 % de l'ARR avancé en cash immédiat, remboursement sur encaissement abonnement |
| **Forfait BPI mobilisation créances** | Bon backup | 1,5-2 % commission |

**Recommandation : étudier Capchase / Pipe dès M+18** pour transformer ARR en cash immédiat sans dilution.

### 9.4 Banque : BPI vs traditionnelle

| Critère | Qonto Pro | BPI France (Banque Pop) | Crédit Mutuel Pro | Recommandation |
|---|---|---|---|---|
| Compte courant | 14-39 €/mois | 50-80 €/mois | 35 €/mois | **Qonto** pour ops courantes |
| Facilité de caisse | Non | Oui (10-30 k€) | Oui | BPI/CM en parallèle |
| Prêt innovation | Non | Spécialiste | Possible | **BPI** pour prêts dédiés |
| API & intégrations | Excellent | Faible | Moyen | Qonto |

**Setup recommandé : Qonto (compte principal ops) + BPI (compte prêts + relation banquier dédié).**

---

## 10. Synthèse cash et profitabilité

### 10.1 Trajectoire vers la rentabilité

| Indicateur | Mois | Conditions |
|---|---|---|
| **Break-even opérationnel** (MRR > OPEX courant hors invest.) | **M+22** | Réaliste, NRR ≥ 95 % |
| **Break-even cash mensuel** (cash-flow positif) | **M+26** | Décalage encaissement 45j |
| **EBITDA positif récurrent** | **M+28** | Marge EBITDA ~5-10 % |
| **EBITDA marge 20 %** | **M+36** | Maturité commerciale |

### 10.2 Cash cumulatif requis

| Phase | Cash net cumulé requis (depuis M+0) |
|---|---|
| M+12 | -180 k€ |
| M+18 | -310 k€ |
| M+24 | -380 k€ |
| **M+26 (point bas)** | **-410 k€** |
| M+30 | -290 k€ (remontée) |
| M+36 | -50 k€ (quasi-neutralisé) |

**Cash maximum à mobiliser : ~410 k€**, couvert très largement par la levée Seed 750 k€ + aides publiques 150-280 k€.

### 10.3 Rentabilité projetée

| Indicateur | Année 1 | Année 2 | Année 3 |
|---|---|---|---|
| Revenu reconnu (€) | 195 000 | 770 000 | 2 100 000 |
| COGS (€) | 21 000 | 75 000 | 195 000 |
| Marge brute (€) | 174 000 | 695 000 | 1 905 000 |
| Marge brute % | 89 % | 90 % | 91 % |
| OPEX hors COGS (€) | 410 000 | 1 190 000 | 1 730 000 |
| **EBITDA (€)** | **-236 000** | **-495 000** | **+175 000** |
| Marge EBITDA % | -121 % | -64 % | +8 % |
| **Rule of 40** | -50 % | +85 % | +160 % |

---

## 11. Annexe — calculs détaillés et formules

### 11.1 Formules SaaS de référence

```
MRR = Σ(Abonnements actifs × Prix mensuel)
ARR = MRR × 12
ARPU = MRR / Nombre de clients
NRR = (MRR cohorte début + Expansion - Downgrade - Churn) / MRR cohorte début
GRR = (MRR cohorte début - Downgrade - Churn) / MRR cohorte début
Churn % mensuel = Clients perdus / Clients début de mois
LTV = ARPU × Marge brute / Churn mensuel
CAC = (Sales + Marketing) / Nouveaux clients sur la période
CAC Payback (mois) = CAC / (ARPU × Marge brute)
Magic Number = (Net new ARR trimestre × 4) / OPEX Sales&Marketing trimestre précédent
Rule of 40 = Croissance ARR % + Marge EBITDA %
Burn Multiple = Net Burn / Net New ARR (sur la période)
```

### 11.2 Hypothèse Anthropic Claude API — calcul détaillé

Par client moyen et par mois :
- 30 consultants moy. × 2 reformulations CV / mois × 8 000 tokens / reformulation = 480 000 tokens
- 50 matchings/mois × 12 000 tokens = 600 000 tokens
- 20 extractions AO × 15 000 tokens = 300 000 tokens
- 100 actions parsing CV / extraction × 5 000 tokens = 500 000 tokens
- **Total ~1,9 M tokens/mois/client → coût ~95 € avec Claude Sonnet 4.x** (mix input/output, prix moy. 5 €/M tokens input + 25 €/M tokens output, optimisations cache)

### 11.3 Hypothèse Supabase — calcul détaillé

- Plan Pro : 25 $/mois fixe + add-ons
- Storage moyen 5 Go/client (CV, docs, factures) à 0,021 $/Go = 0,10 $/client
- Egress moyen 30 Go/client = 2,70 $/client (compute add-ons)
- Compute : 2 vCPU + 8 Go RAM partagés (plan Pro micro compute) — passage Small à 100 clients (+60 $/mois)
- **Allocation moyenne : ~22 €/client/mois** (incluant marge sécurité)

### 11.4 Hypothèse Stripe — calcul détaillé

- Frais Stripe Europe : 1,4 % + 0,25 € pour cartes EU, 0,80 % pour SEPA prélèvement
- Mix SEPA 70 % / Carte 30 % sur cible B2B française
- **Frais effectifs moyens : ~1,4 % du CA** (cible Centrium : pousser SEPA prélèvement pour ~0,9 %)

### 11.5 Plan de recrutement détaillé (référence §3.2)

| Mois | Recrutement | Salaire brut chargé mensuel | Justification |
|---|---|---|---|
| M+0 | Fondateur CEO/CTO (Salim) | 5 800 € | Salaire de base soutenable |
| M+7 | Sales SDR | 6 400 € | Génère pipeline pour M+10+ |
| M+10 | Dev fullstack senior | 7 250 € | Soulagement tech, roadmap V1.x |
| M+12 | Head of Sales | 12 687 € | Structure commerciale |
| M+15 | Customer Success Manager | 5 437 € | NRR critique au-delà de 15 clients |
| M+15 | Sales AE n°1 | 9 062 € | Closing tickets >2 k€/mois |
| M+18 | Dev junior | 4 833 € | Velocity équipe produit |
| M+22 | Marketing / Growth | 6 042 € | Inbound + contenu + ads |
| M+30 | Sales AE n°2 | 9 062 € | Couverture territoires/segments |
| M+32 | Customer Success n°2 | 5 437 € | Ratio CSM <1:30 clients |
| M+34 | Dev fullstack senior n°2 | 7 250 € | Roadmap V2, intégrations |

### 11.6 Détail TVA et imposition

- **TVA collectée** : 20 % sur abonnements (B2B France) — déclarations mensuelles si CA > 818 k€ (CA3), trimestrielles sinon
- **Auto-liquidation TVA** sur ventes UE B2B (Belgique, Luxembourg, etc.)
- **IS** : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà — déficit reportable indéfiniment (an 1-2 en perte)
- **CVAE supprimée 2024** — plus de charge sur valeur ajoutée
- **CFE** (Cotisation Foncière des Entreprises) : ~500-2 000 €/an selon commune

### 11.7 Cap table simulée post-Seed (référence §6.2)

| Actionnaire | Avant Seed | Après Seed (750 k€ @ 3,75 M€ post-money) |
|---|---|---|
| Fondateur (Salim) | 100 % | **80 %** |
| Fonds Seed lead | 0 % | **17 %** |
| BSA-AIR / business angels | 0 % | **3 %** |
| **Total** | 100 % | 100 % |

Pool BSPCE recommandé à constituer post-Seed : **10 % dilutif** pour attractivité recrutements (consensus marché).

### 11.8 Glossaire express

- **MRR / ARR** : revenu récurrent mensuel / annualisé
- **NRR / GRR** : Net / Gross Revenue Retention — santé du portefeuille existant
- **CAC / LTV** : coût d'acquisition / valeur vie client
- **CAC Payback** : durée pour récupérer le CAC sur la marge brute du client
- **Magic Number** : efficacité du dollar marketing/sales
- **Rule of 40** : indicateur santé SaaS (croissance + rentabilité ≥ 40 %)
- **Burn Multiple** : efficience du cash brûlé pour générer du nouveau ARR
- **NRR > 100 %** signifie que la base existante grossit même sans nouveau client : moteur principal de croissance composée SaaS

---

**Fin du modèle financier — Version 1.0 — Juin 2026**

> Ce modèle est un **document vivant**. Il doit être révisé trimestriellement après confrontation avec la réalité commerciale (premiers 5 clients = vérité terrain >> hypothèses). Les variables churn, ARPU et CAC sont les **3 leviers à instrumenter en priorité**.
