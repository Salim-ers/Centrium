# Stratégie pricing & packaging — Centrium

> Document de référence — Stratégie de monétisation Centrium by QuadCore SAS
> Version : 1.0 — Juin 2026
> Auteur : Direction Centrium
> Statut : Validé pour go-to-market initial (5-10 premiers clients)

---

## 1. Benchmark marché ESN (analyse concurrentielle)

Le marché des outils de gestion ESN françaises est mûr mais fragmenté. Aucun acteur ne capte plus de 8 % du SAM des 3 000 ESN françaises de 10 à 200 consultants. Les fourchettes ci-dessous proviennent de données publiques, devis prospects et retours de business managers interrogés (Q4 2025–Q2 2026).

### 1.1 Boondmanager — leader marché FR

- **Positionnement** : PSA français "tout-en-un" pour ESN/cabinets. ~1 500 clients revendiqués, leader incontestable.
- **Modèle tarifaire** : par utilisateur nommé (BM, recruteur, dirigeant, finance) — **PAS** par consultant géré. Souvent perçu comme un piège car les ESN qui scalent en BM voient la facture exploser.
- **Fourchettes observées (2025-2026)** :
  - Module CRM/RH/Activité : ~70-90 €/user/mois HT
  - Module Facturation : +20-30 €/user/mois
  - Module Achats/Marges : +20-30 €/user/mois
  - Setup + formation : 3 000 à 15 000 € one-shot
- **Coût total annuel observé** :
  - ESN 30 consultants / 6 users actifs : **18-25 k€/an**
  - ESN 80 consultants / 12 users actifs : **45-65 k€/an**
  - ESN 200 consultants / 25 users actifs : **80-130 k€/an**
- **Force** : maturité fonctionnelle, écosystème.
- **Faiblesse exploitable par Centrium** : UI datée (héritage 2010), pas d'IA native (CV optimizer, matching, parsing), commercial à l'ancienne, contrats 36 mois souvent imposés, peu transparent sur le pricing.

### 1.2 ConnectWise PSA (US)

- **Positionnement** : PSA US référence pour MSP/IT services. Adopté à la marge par ESN françaises filiales de groupes US.
- **Modèle** : par user, contrat annuel, mode "implementation partner" obligatoire.
- **Fourchettes** : ~45-75 USD/user/mois + implémentation **15-40 k$** (3-6 mois projet).
- **Adoption FR** : très faible. Pas localisé pour spécificités FR (CRA, IS, TVA intra-com, ETP, Sage/Pennylane, Urssaf).
- **Pertinence comme benchmark** : marginale, sert surtout à montrer que le pricing PSA "international" est dans la même fourchette qu'un ERP français.

### 1.3 Akuiteo / Cegid (ERP traditionnels)

- **Positionnement** : ERP "lourd" couvrant ESN parmi d'autres verticaux services.
- **Modèle** : licence + maintenance + implémentation.
- **Fourchettes** :
  - Licence : 1 200 à 3 500 €/user/an
  - Maintenance : 18-22 % de la licence par an
  - Implémentation : **30-150 k€** projet (3-12 mois)
- **Coût total an 1 ESN 50 consultants** : souvent **80-200 k€**, an 2+ : **25-50 k€/an**.
- **Force** : intégration comptable native, conformité fiscale.
- **Faiblesse** : déploiement long, UX hostile aux BM/recruteurs, IA inexistante, ROI tardif.

### 1.4 Dev interne / empilement Notion + Excel + DocuSign + QuickBooks

- **Modèle observé chez ~40 % des ESN < 50 consultants** : pas d'outil intégré.
- **Coût caché** :
  - 4-6 outils SaaS empilés : ~150-300 €/mois (Notion 15 €/user, Airtable 20 €/user, DocuSign 25 €/user, QuickBooks 30 €/mois, Calendly, Drive…)
  - Temps BM perdu en double saisie / chasse fichiers : **0,5 à 1 ETP cumulé** = **35-70 k€/an chargé**
  - Pertes par CV mal optimisé / réponses AO tardives : **non quantifié mais énorme** (un CV qui ne passe pas = ~150-400 € de prévente perdue × 50-200 propositions/an).
- **Coût équivalent réel** : **40-90 k€/an** pour une ESN 30 consultants, mais invisible au CFO.

### 1.5 Synthèse benchmark

| Acteur | Modèle | ARR ESN 30 consultants | ARR ESN 80 consultants | ARR ESN 200 consultants |
|---|---|---|---|---|
| Boondmanager | Par user, modulaire | 18-25 k€ | 45-65 k€ | 80-130 k€ |
| ConnectWise PSA | Par user + impl | 22-30 k€ + 15-40 k$ setup | 50-75 k€ | 100-150 k€ |
| Akuiteo/Cegid | Licence + impl | 60-100 k€ an 1 | 100-180 k€ an 1 | 150-300 k€ an 1 |
| Notion+Excel+… | DIY | 40-70 k€ caché | 70-120 k€ caché | difficilement tenable |

**Conclusion** : la fenêtre de prix défendable pour Centrium se situe **entre 12 et 80 k€ ARR** selon la taille ESN, avec une promesse forte : **30-50 % moins cher que Boondmanager à fonctionnalités équivalentes, IA native incluse, UX 2026**.

---

## 2. Logique de monétisation choisie pour Centrium

### 2.1 Modèle retenu : **prix par consultant géré, avec palier fondation de 20 consultants**

**Structure** :
- **Pack fondation 20 consultants inclus** dans chaque plan
- **Facturation à partir du 21ᵉ consultant** : prix unitaire mensuel par consultant additionnel
- Toutes plateformes (admin, BM, recruteurs, dirigeants) **incluses en utilisateurs illimités** dans chaque plan

### 2.2 Justification du modèle

**Pourquoi par consultant (et non par user) ?**

1. **Alignement valeur** : la valeur générée par Centrium (CV optimisé, matching, CRA, facturation) est **proportionnelle au nombre de consultants gérés**, pas au nombre d'utilisateurs admin. Une ESN de 30 consultants avec 2 BM tire autant de valeur qu'une ESN de 30 consultants avec 6 BM.
2. **Contre-positionnement Boondmanager** : Boondmanager piège ses clients en facturant par user. Une ESN qui ouvre 3 postes de BM voit sa facture exploser. Centrium retourne ce piège en argument commercial : **"Vous embauchez ? Tant mieux, votre facture Centrium ne bouge pas."**
3. **Prévisibilité CFO** : le CFO peut budgéter en fonction de son plan de recrutement consultants, métrique qu'il maîtrise.
4. **Simplicité de discours commercial** : "X €/consultant/mois au-delà de 20" est plus simple qu'une matrice user × module.

**Pourquoi un palier 20 consultants fixe ?**

1. **Seuil opérationnel naturel** : en dessous de 20 consultants, une ESN peut survivre avec Notion+Excel. À 20+, le besoin d'outillage devient critique (perte d'info, retard CRA, mauvais matching). 20 est le seuil où la douleur dépasse la friction.
2. **Psychologique** : un prix mensuel "tout inclus jusqu'à 20" lisible et engageant. L'ESN sait exactement ce qu'elle paye.
3. **Acquisition** : permet de capter dès 10 consultants (ESN naissante avec ambition) au même tarif d'entrée que 20. C'est un **investissement d'acquisition** : on capture la cohorte qui grossira chez nous.
4. **Coût marginal réel proche de zéro** : sur Supabase + Vercel + Claude API, le coût marginal d'un consultant supplémentaire est < 1,5 €/mois (parsing CV, génération CV, matching, stockage). Le palier 20 ne coûte presque rien à servir et finance la plateforme par les paliers suivants.

### 2.3 Alternatives explorées et rejetées

| Alternative | Pourquoi rejetée |
|---|---|
| **Par user nommé** (modèle Boondmanager) | Reproduit le piège concurrent. Crée frustration et désalignement avec la valeur. |
| **Par module** (CRM, CRA, Facturation séparés) | Complexifie la grille, freine l'adoption transverse (le CRM seul a peu de valeur sans la bibliothèque consultants). À garder pour les **add-ons premium** uniquement. |
| **% du CA généré** (mission_value × take_rate) | Trop intrusif, exige accès comptable complet, vu comme prédateur, opaque pour le CFO, illégal dans certaines structures (intermédiation). |
| **Freemium illimité** | Inadapté B2B vertical : cycle long, support coûteux, conversion < 2 %. Pas de capital pour absorber. |
| **Par mission ou par CV généré** | Décourage l'usage, casse la valeur ("je vais limiter mes CV pour économiser"). |

---

## 3. Grille tarifaire proposée — 3 plans

> Tous prix HT, hors taxes. €/mois facturé annuellement. Engagement 12 mois minimum.

### 3.1 Plan **Starter** — cible : ESN 10-30 consultants

- **Prix annuel HT** : **890 €/mois** (10 680 €/an), facturable annuellement
- **Prix mensuel HT** (engagement 12 mois mais facturation mensuelle) : **990 €/mois**
- **Au-delà de 20 consultants** : **+39 €/consultant additionnel/mois**
- **Inclus** :
  - Jusqu'à 20 consultants dans la bibliothèque
  - Utilisateurs admin/BM/recruteurs **illimités**
  - Bibliothèque consultants + parsing CV IA (illimité dans la limite raisonnable, 500 parsings/mois soft cap)
  - CV Optimizer (3 templates Standard/Dense/Executive, illimité)
  - Matching IA + extraction besoin AO (50 matchings/mois inclus, puis 1 €/matching)
  - CRA + facturation (illimité, exports Sage/Pennylane)
  - CRM commercial (kanban, pipeline)
  - Dashboard de pilotage
  - Portail consultant
  - 1 organisation, branding (logo, couleurs)
  - **Support** : email (réponse 24h ouvrées), centre d'aide en ligne
  - **Sécurité** : RLS multi-tenant, MFA TOTP, audit logs, export RGPD
- **Non inclus** : SSO SAML, SLA contractuel, account manager, intégrations custom
- **Profil cible** : ESN 10-30 consultants, 1 dirigeant + 1-3 BM, en transition Notion/Excel vers outil structuré

### 3.2 Plan **Growth** — cible : ESN 30-100 consultants

- **Prix annuel HT** : **1 690 €/mois** (20 280 €/an)
- **Prix mensuel HT** : **1 890 €/mois**
- **Au-delà de 20 consultants** : **+29 €/consultant additionnel/mois** (dégressivité vs Starter)
- **Inclus tout le Starter +** :
  - Parsing CV illimité (vrai illimité, pas de soft cap)
  - Matching IA illimité
  - Module AO avancé (extraction de cahier des charges PDF/screenshot, génération réponse pré-formatée)
  - Multi-branding (plusieurs templates CV par filiale/marque)
  - Webhooks + API REST pour intégrations
  - Connecteur Pennylane / Sage natif (export automatique facturation)
  - **Support prioritaire** : email + chat (réponse 8h ouvrées)
  - Onboarding guidé inclus (2 sessions de 90 min en visio)
  - 99,5 % de disponibilité (SLA déclaratif, non garanti contractuellement)
- **Non inclus** : SSO SAML, AM dédié, SLA contractuel, intégrations sur mesure
- **Profil cible** : ESN structurées 30-100 consultants, 3-8 BM, ambition de scaler

### 3.3 Plan **Enterprise** — cible : ESN 100+ consultants ou groupes multi-entités

- **Prix** : **sur devis**, range communiqué en avant-vente : **à partir de 3 500 €/mois HT** (42 k€/an minimum)
- **Au-delà de 20 consultants** : tarif négocié, **dégressif par paliers** :
  - 21-100 consultants : 25 €/consultant/mois
  - 101-200 : 20 €/consultant/mois
  - 201+ : 15 €/consultant/mois
- **Inclus tout le Growth +** :
  - **SSO SAML / OIDC** (Azure AD, Okta, Google Workspace)
  - **SLA contractuel** : 99,9 % uptime, RTO 4h / RPO 1h
  - **Account Manager dédié** + revue trimestrielle (QBR)
  - **Support prioritaire 24/5** (urgences P1 traitées sous 2h ouvrées, escalade dirigeant Centrium)
  - **Multi-organisations** (groupe ESN avec filiales cloisonnées)
  - **Audit logs avancés** (export SIEM, conservation 24 mois)
  - **DPA renforcée**, **annexe sécurité** signée, accès au Trust Center
  - **Intégrations custom** (1 connecteur inclus/an, ex : HR Access, Workday, Lucca)
  - **Pentest annuel** partagé sur demande (NDA)
  - Sandbox de test isolée
- **Profil cible** : ESN 100-500 consultants, groupes multi-filiales, exigences sécurité/conformité (ISO 27001 en cours, SOC 2)

---

## 4. Add-ons monétisables (par-dessus le plan)

| Add-on | Modèle | Prix HT | Justification |
|---|---|---|---|
| **Pack Implémentation Standard** | One-shot | **2 500 €** | Onboarding 2 demi-journées, import CV batch (jusqu'à 200), paramétrage templates CV, formation BM |
| **Pack Implémentation Premium** | One-shot | **6 500 €** | Tout le Standard + audit process ESN, formation dirigeant + finance, paramétrage CRM custom, 30j hypercare |
| **Migration de données complexe** | One-shot, sur devis | **4 000 - 15 000 €** | Import depuis Boondmanager / Akuiteo / Excel volumineux (>500 consultants), mapping custom |
| **Module AO Premium** (Starter only) | Récurrent | **+290 €/mois** | Débloque l'extraction AO depuis screenshot et la génération de réponse pré-formatée |
| **Module Comptabilité Avancée** | Récurrent | **+390 €/mois** | Assistant comptable IA, rapprochement bancaire, OD de provision sur missions ouvertes |
| **Pack Connecteurs supplémentaires** | Récurrent | **+190 €/mois** par connecteur | Au-delà du 1er connecteur inclus en Enterprise |
| **Formation continue** | Récurrent | **390 €/trimestre** | 2 sessions/trimestre nouveautés produit, training BM/recruteurs |
| **Workshop CV Optimizer "Studio"** | One-shot | **1 200 €** | Création d'un template CV sur mesure aux couleurs / structure de l'ESN |
| **SLA renforcé 99,95 %** | Récurrent | **+ 8 % du plan** | Réservé Enterprise, RTO 2h |

---

## 5. Politique commerciale

### 5.1 Engagement & facturation

- **Engagement minimum** : **12 mois** sur tous les plans (norme SaaS B2B vertical FR).
- **Facturation** : annuelle (option par défaut, **-10 %**) ou mensuelle (engagement 12 mois maintenu, prélèvement Stripe SEPA).
- **Acompte** : 100 % du semestre 1 facturé à la signature en Enterprise, annuel cash pour Starter/Growth (cash flow critique année 1).

### 5.2 Remises

- **Annuel vs mensuel** : -10 % automatique
- **Engagement 24 mois** : -5 % supplémentaire (donc -15 % combiné), gel du prix garanti
- **Engagement 36 mois** : -10 % supplémentaire (donc -20 % combiné), gel du prix garanti
- **Volume consultants > 100** : dégressivité automatique (cf. paliers Enterprise)
- **Programme "Pionnier"** : 5 premiers clients signés en 2026, **-30 % à vie** sur le plan, en échange d'un témoignage écrit + droit de cas client + référence appelable

### 5.3 Période d'essai / POC

- **Essai gratuit 14 jours** : sandbox avec données démo + import de 5 CV réels. Aucune CB demandée. Conversion attendue : 20-30 %.
- **POC payant 60 jours** (mid-market) : **2 500 € HT** déductibles de l'abonnement annuel si signature dans les 30j post-POC. Périmètre cadré : 1 cas d'usage, succès critères mesurables.

### 5.4 Résiliation et réversibilité

- Préavis : **60 jours** avant échéance annuelle.
- **Export RGPD self-service** déjà livré (export complet JSON + CSV des données client).
- **Suppression définitive** sous 30 jours post-résiliation (déjà conforme RGPD art. 17).
- Aucune pénalité de sortie au terme de l'engagement.

### 5.5 Indexation prix annuelle

- **Indexation contractuelle plafonnée à +5 %/an** ou **indice Syntec** (le plus élevé des deux), applicable au renouvellement.
- Clause gel pour engagements 24/36 mois (cf. supra).

---

## 6. Tableau récap de simulation

> Tous prix HT, engagement annuel, facturation annuelle (-10 % vs mensuel inclus).

| Profil ESN | Plan | Mensuel HT | Annuel HT | Effective €/consultant/mois |
|---|---|---|---|---|
| 15 consultants | Starter | 890 € | **10 680 €** | 59 € |
| 20 consultants | Starter | 890 € | **10 680 €** | 45 € |
| 30 consultants | Starter | 890 + (10×39) = **1 280 €** | **15 360 €** | 43 € |
| 30 consultants (option Growth) | Growth | 1 690 € | **20 280 €** | 56 € (mais inclut AO + connecteurs) |
| 50 consultants | Growth | 1 690 + (30×29) = **2 560 €** | **30 720 €** | 51 € |
| 80 consultants | Growth | 1 690 + (60×29) = **3 430 €** | **41 160 €** | 43 € |
| 100 consultants | Growth ou Enterprise | 1 690 + (80×29) = **4 010 €** | **48 120 €** | 40 € |
| 150 consultants | Enterprise | 3 500 + (80×25) + (50×20) = **6 500 €** | **78 000 €** | 43 € |
| 200 consultants | Enterprise | 3 500 + (80×25) + (100×20) = **7 500 €** | **90 000 €** | 38 € |

**Lecture** :
- Effective €/consultant/mois : converge vers **38-45 €** sur la cible cœur, soit **40-60 % moins cher que Boondmanager équivalent**.
- ARR moyen ciblé : **15-50 k€** sur 80 % des clients, **70-100 k€** sur les Enterprise.
- ARPU plateforme cible **2 000-3 500 €/mois** sur le mix portefeuille — en ligne avec l'ARPU SaaS vertical FR 2026 (150-500 €/mois pour PME small, 1 500-5 000 €/mois pour mid-market).

---

## 7. Argumentaire pricing face à objection "c'est cher"

### 7.1 ROI cible quantifié — ESN 30 consultants

**Coût Centrium Starter avec 30 consultants** : 15 360 €/an = ~1 280 €/mois.

**Bénéfices quantifiables** :

| Levier | Hypothèse | Économie/an |
|---|---|---|
| Temps BM économisé sur CV optimization | 2h/CV × 4 CV/semaine × 50 sem × 50 €/h chargé | **20 000 €** |
| Temps BM sur matching mission | 1h/mission × 8 missions/mois × 12 mois × 50 €/h | **4 800 €** |
| Temps administratif CRA + facturation | 0,2 ETP économisé × 45 k€ chargé | **9 000 €** |
| Réduction intercontrat (1 jour gagné/consultant/an grâce à matching IA) | 30 × 1j × 500 €/j marge | **15 000 €** |
| Augmentation taux signature AO (+3 pts) | 50 AO × 3 % × 4 k€ marge moyenne | **6 000 €** |
| **Total bénéfices an 1** | | **~54 800 €** |

**ROI** : 54 800 / 15 360 = **3,5×**. Payback < 4 mois.

### 7.2 Risque vs concurrents

- Boondmanager : **18-25 k€/an** pour le même périmètre, UX 2010, pas d'IA native, contrat 36 mois souvent imposé.
- Akuiteo : **60-100 k€/an** la première année, déploiement 6 mois, ROI à 18 mois.
- Notion+Excel : "gratuit" en apparence, **0,5-1 ETP perdu**, soit 35-70 k€ caché. Et aucune sécurité multi-tenant, RGPD bancal, scalabilité nulle.

### 7.3 Coût d'opportunité de ne pas signer

- 1 CV mal optimisé = 1 prévente perdue ≈ 150-400 € de marge théorique.
- 50 préventes perdues/an = **7 500 à 20 000 €** non facturés.
- 1 mois de retard sur signature d'un consultant supplémentaire = perte ~3 000-5 000 € de marge.

**Argument clôture** : "Centrium coûte le prix de 4 jours-homme de consultant senior. Il les fait gagner en 2 semaines."

---

## 8. Politique mid-market / Enterprise

### 8.1 Quand basculer en devis personnalisé

- ESN > **100 consultants** systématiquement Enterprise.
- ESN < 100 mais avec **besoin SSO** ou **SLA contractuel** : bascule Enterprise.
- ESN appartenant à un **groupe** (multi-filiales, multi-marques) : bascule Enterprise quel que soit le volume.
- ESN sous obligation réglementaire (filiale banque, défense, santé) : bascule Enterprise pour annexe sécurité signée.

### 8.2 Leviers de négociation Enterprise

| Levier | Plage de remise/concession |
|---|---|
| Engagement 24/36 mois | -5 à -10 % |
| Volume > 150 consultants | -10 à -15 % palier supplémentaire |
| Paiement annuel cash | -5 % additionnel |
| Référence appelable / case study | -10 % |
| Co-marketing (webinar, salon) | -5 % ou Pack Implémentation offert |
| Multi-modules (Comptabilité + AO Premium) | Bundle -15 % sur add-ons |

**Garde-fou** : remise maximale cumulée plafonnée à **-30 %** vs grille publique pour préserver la marge et éviter la cannibalisation.

---

## 9. Affichage prix sur le site

### 9.1 Recommandation : **prix public sur Starter et Growth, "sur devis" sur Enterprise**

**Pourquoi afficher** :
- **Transparence = confiance** : la cible (dirigeants ESN 30-80 personnes) déteste perdre du temps en RFI. 67 % des acheteurs B2B SaaS abandonnent un site sans prix (Gartner 2024).
- **Différenciation Boondmanager** : Boondmanager ne publie pas ses prix, c'est un irritant marché bien connu. Centrium en fait un argument.
- **Qualification leads entrants** : un prospect qui voit le prix et demande une démo est qualifié budget. Réduit le coût d'acquisition.

**Comment afficher** :

```
STARTER          GROWTH           ENTERPRISE
À partir de      À partir de      Sur devis
890 €/mois HT    1 690 €/mois HT  À partir de 3 500 €/mois HT
20 consultants   20 consultants   Volumes 100+
inclus           inclus           SSO, SLA, AM dédié
+39 €/consultant +29 €/consultant Tarifs dégressifs
au-delà          au-delà
```

Avec mention : *"Engagement 12 mois minimum. Facturation annuelle (-10 %). Démo personnalisée gratuite."*

### 9.2 Page /pricing à créer

- 3 cards Starter / Growth / Enterprise
- Tableau comparatif features (15 lignes max)
- Simulateur "Combien ça me coûte ?" (slider nb consultants + plan, ARR calculé en temps réel)
- FAQ pricing (12 questions)
- CTA "Réserver une démo 30 min" + "Démarrer mon essai gratuit 14 jours"

---

## 10. Recommandations finales et premières fourchettes chiffrées défendables

### 10.1 Synthèse pricing v1.0 Centrium

| Plan | Mensuel HT (engagement annuel) | Au-delà de 20 consultants | Engagement | Cible |
|---|---|---|---|---|
| **Starter** | **890 €/mois** (10 680 €/an) | **+39 €/consultant/mois** | 12 mois | 10-30 consultants |
| **Growth** | **1 690 €/mois** (20 280 €/an) | **+29 €/consultant/mois** | 12 mois | 30-100 consultants |
| **Enterprise** | **À partir de 3 500 €/mois** (42 k€/an) | Dégressif 25/20/15 €/cons/mois | 12-36 mois | 100+ ou groupes |

### 10.2 Trajectoire ARR an 1 défendable

Avec ces tarifs et l'objectif de **5-10 clients signés en 12 mois** :

- **Scénario prudent** : 5 clients (3 Starter à 30 consultants + 2 Growth à 50 consultants) = **3 × 15 k + 2 × 31 k = 107 k€ ARR**
- **Scénario médian** : 7 clients (4 Starter 25 consultants + 2 Growth 60 consultants + 1 Enterprise 120) = **4 × 13 k + 2 × 35 k + 1 × 60 k = 182 k€ ARR**
- **Scénario ambitieux** : 10 clients (4 Starter + 4 Growth + 2 Enterprise) = **52 k + 140 k + 130 k = 322 k€ ARR**

Le scénario médian **182 k€ ARR** est défendable face à investisseur, dans la fourchette annoncée (200-500 k€).

### 10.3 Principes à protéger

1. **Ne jamais brader le Starter sous 690 €/mois** — risque de positionner Centrium comme "outil pour TPE", incompatible avec la promesse enterprise-ready (sécurité, IA, ROI).
2. **Toujours présenter les 3 plans** en démo, mais **piloter vers Growth** : c'est le plan le plus rentable (LTV/CAC optimal) et le plus défendable produit.
3. **Réviser la grille au 10ᵉ client** (sans doute fin 2026 ou T1 2027), avec données réelles de churn, expansion, CAC. Possiblement augmenter les prix de +10-15 % une fois la traction prouvée.
4. **Verrouiller les 5 premiers clients en "Pionnier"** avec -30 % à vie : ces logos servent d'arme commerciale pour la suite et le coût de ce rabais est largement compensé par la crédibilité acquise.

### 10.4 Risques pricing à surveiller

- **Risque de cannibalisation Growth → Starter** : si Starter est trop généreux, un prospect 30 consultants prend Starter au lieu de Growth. **Mitigation** : Module AO Premium réservé à Growth, parsing CV illimité sur Growth uniquement, support 8h sur Growth uniquement.
- **Risque de churn Enterprise an 2** : Enterprise = SLA + AM dédié = coût élevé à servir. **Mitigation** : engagement 24 mois minimum sur Enterprise, NPS et QBR trimestriels obligatoires.
- **Risque de pricing power Claude API** : marge brute sensible à Anthropic. **Mitigation** : surveiller le coût/parsing CV et /matching, cap soft de 500 parsings/mois sur Starter, prepaid bucket sur Growth, Anthropic Enterprise Agreement à négocier au 20ᵉ client.

---

## Annexe — checklist déploiement pricing

- [ ] Créer page `/pricing` publique avec simulateur
- [ ] Mettre à jour `/devis` pour pré-qualifier (slider consultants → plan suggéré)
- [ ] Activer 3 produits Stripe (Starter / Growth / Enterprise) + métered billing par consultant
- [ ] Rédiger CGV V2 avec engagement 12 mois, indexation Syntec, clause "Pionnier"
- [ ] Créer landing "Programme Pionnier 5 places" avec compte à rebours visuel
- [ ] Préparer one-pager pricing PDF pour démo
- [ ] Former 1 SDR sur l'argumentaire ROI quantifié
- [ ] Mettre en place tracking conversion /pricing → /demo dans Plausible/PostHog
