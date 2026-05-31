# Business Plan — Centrium

**Édité par QuadCore SAS** · Document de travail interne
**Dernière mise à jour** : mai 2026

---

## 1. Vision

Devenir la **plateforme métier de référence** pour les ESN françaises de
10 à 500 consultants, en combinant ce que les outils actuels font en
4 produits séparés (ATS, CRM, ERP staffing, facturation) dans une seule
expérience produit cohérente, humaine et conforme.

## 2. Problème marché

Les ESN françaises et cabinets de conseil souffrent d'un **stack
fragmenté** :

- Excel + Google Drive pour la bibliothèque consultants
- Notion / Trello pour le pipeline AO
- Un ATS générique (Welcome to the Jungle, Recruitee…) mal adapté
- Word pour les CV — re-formatés manuellement à chaque appel d'offres
- Sage / Pennylane pour la facturation, alimenté en double saisie
- WhatsApp pour la coordination

**Conséquences mesurables** :
- 20-30 % du temps des Business Managers perdu en saisie / re-formatage
- 3-7 jours de retard moyen sur les réponses AO
- 5-15 % du CA perdu en intercontrat non détecté à temps
- Risque RGPD non maîtrisé (CV qui traînent dans des dossiers partagés)

## 3. Proposition de valeur

Une **plateforme unique** qui pilote tout le cycle :

```
Consultant → Profil CV → Mission opportunité → Réponse AO →
Contrat → CRA → Facturation → Reporting
```

Avec **trois différenciateurs** :

1. **CV Optimizer IA cadré** : reformatage intelligent SANS invention,
   trois templates de qualité (Standard / Dense / Executive)
2. **Multi-tenant strict natif** : RLS Supabase, isolation des données
   garantie — argument fort pour les ESN qui craignent la fuite vers
   concurrent
3. **Onboarding accompagné** : pas de self-service à l'aveugle, l'équipe
   Centrium configure l'espace à votre image avant remise des clés

## 4. Cible

| Persona | Volume | Pain | Pricing cible |
|---|---|---|---|
| **ESN naissante** | 1-15 consultants | Excel à la main, pas de pipeline | 200-500 €/mois |
| **ESN en croissance** | 15-50 consultants | Outils éparpillés, RH débordée | 800-2 000 €/mois |
| **ESN structurée** | 50-150 consultants | Pas de visibilité intercontrat, AO ratés | 2 000-6 000 €/mois |
| **Cabinet conseil** | 20-100 consultants | Staffing + rentabilité par mission | 1 500-4 500 €/mois |
| **Groupe / ETI** | 150-500+ consultants | SSO, audit, multi-entité, SLA | 8 000-25 000 €/mois |

## 5. Benchmark concurrentiel

| Acteur | Forces | Faiblesses |
|---|---|---|
| **Opteamis** | Marketplace VMS, sourcing, contractualisation | UX vieillissante, peu d'IA, lock-in côté ESN |
| **Napta** | Staffing + rentabilité, beau produit | Cher, orienté grands comptes, faible CRM |
| **Nicoka CABS** | ATS + CRM + facturation | Complexe, courbe d'apprentissage élevée |
| **Boondmanager** | Très complet | Vieillissant visuellement, intégrations IA limitées |
| **TeamInside** | Niche conseil | Surtout RH, peu de commercial |

### Notre positionnement

- Plus **moderne UX** que Opteamis / Boondmanager / Nicoka
- Plus **accessible prix** que Napta sur le segment 10-50 consultants
- Plus **complet** qu'un ATS pur (Welcome, Recruitee)
- **CV Optimizer IA cadré** : argument différenciant unique
- **Onboarding accompagné** : barrière à la sortie + qualité d'usage

## 6. Modèle économique

### Pricing recommandé

**Pas de grille publique** (page `/pricing` pousse vers `/devis`).

Tarification 3 axes :

```
Prix = Base licence + (Nb consultants × €/consultant) +
       Modules activés (IA, signature, SSO) + Accompagnement
```

| Composant | Fourchette |
|---|---|
| Base licence (≤ 5 sièges) | 200 €/mois |
| Siège supplémentaire | 25 €/siège/mois (dégressif au-delà de 20) |
| Consultant géré | 8 €/consultant/mois (dégressif au-delà de 50) |
| Module CV Optimizer IA | 100-300 €/mois selon volume d'appels |
| Module SSO + MFA | 200 €/mois |
| Onboarding accompagné | 1 500-5 000 € one-shot |
| Support dédié + SLA | + 20 % du MRR |

### Engagement & paiement

- **Engagement 12 mois** minimum (justifie l'onboarding)
- Paiement mensuel ou annuel (- 10 % en annuel)
- Prélèvement SEPA via Stripe
- Facture détaillée mensuelle

### Revenus prévisionnels

| Scénario | M+12 | M+24 | M+36 |
|---|---|---|---|
| **Pessimiste** | 8 ESN, MRR 6 k€ | 25 ESN, MRR 22 k€ | 50 ESN, MRR 50 k€ |
| **Réaliste** | 15 ESN, MRR 14 k€ | 45 ESN, MRR 45 k€ | 100 ESN, MRR 110 k€ |
| **Optimiste** | 25 ESN, MRR 28 k€ | 80 ESN, MRR 90 k€ | 180 ESN, MRR 230 k€ |

## 7. Stratégie go-to-market

### Phase 1 — M0 à M+3 : lancement design partners

- 5 ESN amies / réseau perso → tarif réduit, retours formalisés
- Itérations produit hebdomadaires
- Génération d'études de cas

### Phase 2 — M+3 à M+9 : ouverture contrôlée

- Liste d'attente publique (`/devis`)
- 1 démo/jour cible
- Présence LinkedIn (CEO + posts cas clients)
- Partenariat avec 2-3 cabinets de portage salarial

### Phase 3 — M+9 à M+18 : scale

- Inbound : SEO + contenu (blog ESN, comparatif)
- Outbound : team SDR sur LinkedIn Sales Nav
- Salons : Production Days, AppliBox, etc.
- Partenariat intégrateurs (KPMG, Mazars, ...)

### Phase 4 — M+18+ : expansion

- Verticalisation : conseil IT, ingénierie, RH
- Internationalisation Benelux, Suisse, UK

## 8. Acquisition

| Canal | Coût d'acquisition cible | Notes |
|---|---|---|
| Réseau perso / référral | < 200 € | Tier 1 |
| LinkedIn organique (CEO) | < 500 € | Build slowly |
| SEO contenu | < 800 € (après M+12) | Investissement long terme |
| Partenariat | 1 000-2 000 € | Commission 15-20 % |
| Outbound SDR | 1 500-3 000 € | Coûteux mais prédictible |
| Ads (Google, LinkedIn) | À éviter avant M+12 | Mauvais ROI sur SaaS niche |

## 9. Rétention

- **Onboarding accompagné** = engagement utilisateur fort
- **Module CV Optimizer** = usage quotidien = stickiness
- **Données migrées** = friction de sortie
- **CSAT trimestriel** + entretien semestriel avec admins
- Objectif churn brut annuel < 8 %

## 10. Risques

| Risque | Probabilité | Mitigation |
|---|---|---|
| Acquisition coûteuse | Élevée | Focus référral + contenu, éviter ads tôt |
| Concurrence prix de Boondmanager | Moyenne | Mieux différencier sur UX + IA cadrée |
| Bug IA invente un fait | Moyenne | Garde-fous techniques + flag visible utilisateur |
| Faille sécurité multi-tenant | Faible | Audit RLS systématique + monitoring |
| Coût Anthropic explose | Moyenne | Cache prompts + plan B Mistral / fine-tune local |
| Réglementation IA Act | Faible-moyenne | Transparence outputs + audit trail déjà en place |

## 11. Roadmap

### 3 mois
- Phase 1 design partners
- Stabilité MVP (current state)
- 5-8 ESN payantes

### 6 mois
- Module CV Optimizer V1 (Claude réel)
- SSO + MFA en option
- Audit logging complet
- 15-25 ESN

### 12 mois
- API publique avec auth clé
- App mobile React Native (consultant portal)
- Signature électronique intégrée
- 50-100 ESN

### 18 mois
- Marketplace partenaires (intégrations)
- BI / reporting avancé
- White-label pour groupes
- Internationalisation FR → BENELUX

## 12. Équipe cible 12 mois

- 1 CEO (founder)
- 1 CTO (founder)
- 2 Full-stack
- 1 Designer produit
- 1 Customer Success
- 1 SDR / Sales
- Total : 7 personnes
- Burn rate cible : 70-90 k€/mois

## 13. Levée

À étudier après preuve de traction (M+12, > 30 ESN, MRR > 30 k€).
Cible : pre-seed 600 k€-1 M€ pour accélérer commercial + produit.
Sinon, bootstrap profitable visé à M+18.

---

> Ce document est un **document de travail interne**. Pas de communication
> publique sans relecture CEO + DPO.
