---
title: "Présentation Entreprise"
subtitle: "Centrium — la plateforme métier des ESN"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "company-presentation"
---

# Centrium

> **La plateforme métier nouvelle génération pour les ESN et cabinets de conseil.**
> Un seul flux, du sourcing à la facture, hébergé en Europe.

---

## 1 · Centrium en une page

| | |
|---|---|
| **Produit** | Plateforme SaaS B2B tout-en-un pour ESN |
| **Éditeur** | QuadCore SAS, France |
| **Année de création** | 2025 |
| **Cible** | ESN (10 à 500 consultants), cabinets de conseil, groupes multi-entités |
| **Modules** | Bibliothèque consultants · CV Optimizer IA · Matching & AO · CRM commercial · Contrats · CRA & Facturation · Assistant comptable · Portal consultant |
| **Modèle** | Devis sur mesure, sans grille publique, engagement minimum 12 mois |
| **Hébergement** | Région européenne (Supabase / PostgreSQL), CDN Vercel |
| **Conformité** | RGPD, CNIL, DPA signable sur demande, données jamais répliquées hors UE |
| **Langues** | Français · Anglais (toggle global) |
| **Contact commercial** | contact@centrium-platform.com |

---

## 2 · Le problème que nous résolvons

Les ESN performantes perdent **30 % du temps de leurs business managers** à recoller des morceaux entre 4 outils incompatibles :

- **Un CV** dans Word, retouché manuellement à chaque envoi
- **Un pipeline** dans Notion ou Excel, jamais à jour entre les commerciaux
- **Un CRA** sur WhatsApp ou par email, perdu un mois sur deux
- **Une facture** sur un PDF édité à la main, sans mentions légales fiables

Pendant ce temps, les vrais sujets — **qualifier finement un besoin**, **sentir un intercontrat qui se profile**, **soigner la relation avec un client** — passent au second plan. Pas par paresse. Par **fatigue d'outil**.

---

## 3 · Notre réponse : un flux unique

Centrium centralise **l'ensemble du cycle ESN** dans une seule interface cohérente :

```
 Sourcing  ─►  Bibliothèque consultants ─►  CV Optimizer ─►  Matching AO
                                                                     │
                                                                     ▼
   ◄─ Facturation ◄─ CRA validé ◄─ Mission active ◄─ Contrat signé ◄─ Pipeline CRM
```

Chaque étape **alimente la suivante** automatiquement. Vous ne ressaisissez rien. Vous ne jonglez plus entre quatre outils. Les données restent **cohérentes** entre modules et entre membres de l'équipe.

---

## 4 · Les quatre piliers produit

### 4.1 Bibliothèque consultants

Centralisée, enrichie par IA. Parsing CV multi-format (DOCX, PDF, scan). Recherche par stack, séniorité, ville, mobilité, disponibilité, TJM cible. Vivier de prospection séparé de la bibliothèque active. Alerte intercontrat temps réel.

### 4.2 CV Optimizer

Trois templates propriétaires (Standard, Dense, Executive). Un CV brut → un CV final au standard Centrium en moins d'une minute. Édition inline façon Canva, brand cohérent sur toute la bibliothèque, export PDF + DOCX prêt à envoyer. **Aucune invention** : chaque ligne du CV optimisé est traçable au document source.

### 4.3 Matching & Appels d'offres

Glissez un screenshot d'AO reçu par mail. L'IA Claude extrait intitulé, skills, TJM, lieu, dates, et reformule un contexte + missions + profil. Le matching propose les **3 meilleurs profils** de votre bibliothèque, classés par score d'adéquation avec justifications cliquables.

### 4.4 CRA & Facturation

Portail consultant dédié pour saisir le CRA en une minute (calendrier interactif jour par jour). Le business manager valide. La facture client est générée automatiquement avec branding ESN, IBAN, TVA, mentions légales. Alertes auto pour facture en retard, CRA en attente, mission qui se termine. Export Sage / Pennylane pour la compta.

---

## 5 · Sécurité & conformité

> Centrium est conçu pour les ESN qui auditent leurs fournisseurs avant signature. Voici notre architecture.

### 5.1 Chiffrement de bout en bout

- **TLS 1.2+** sur toutes les communications (HTTPS strict, HSTS preload activé sur 2 ans)
- **AES-256** au repos sur base de données et stockage Supabase
- Gestion stricte des clés côté hébergeur certifié SOC 2 Type II

### 5.2 Hébergement européen

Base de données PostgreSQL et stockage des fichiers (CV, contrats, factures) en **région Europe**. CDN edge pour la latence, avec **données applicatives jamais répliquées hors UE**.

### 5.3 Isolation multi-tenant stricte

**Row Level Security (RLS)** activée sur toutes les tables sensibles. Chaque ESN n'accède qu'à ses propres consultants, contacts, missions et documents. Pas de "joker" admin global. Les policies sont testées en intégration.

### 5.4 Authentification renforcée

- Mots de passe robustes obligatoires (validation Zod côté serveur)
- Sessions cookie-only **httpOnly + Secure + SameSite=Lax**
- Cookies **session-only** : purge à la fermeture du navigateur
- **Auto-logout instantané** si la session navigateur a été restaurée par Chrome ("Continue where you left off")
- Invitations par email signées avec lien à usage unique
- Support **SSO + MFA** prévu pour les groupes (sur devis)

### 5.5 Journalisation & audit

Connexions, actions sensibles (suppression, exports, changement de droits) et accès aux données sont **horodatés et associés à l'utilisateur responsable**. Page admin dédiée à l'audit disponible pour les rôles `admin` / `super_admin`.

### 5.6 Sauvegardes & restauration

Sauvegardes chiffrées **quotidiennes** côté hébergeur, **Point-in-Time Recovery (PITR)** disponible sur les 7 derniers jours. Procédures de restauration testées trimestriellement.

### 5.7 Headers de sécurité HTTP

Toutes les pages servies par Centrium portent :

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(),
                    interest-cohort=(), browsing-topics=()
Content-Security-Policy: <politique stricte XSS + clickjacking>
```

### 5.8 Conformité RGPD

| Engagement | Détail |
|---|---|
| Registre des activités de traitement | Maintenu à jour, fourni sur demande |
| Bases légales | Documentées pour chaque finalité (contrat, intérêt légitime, consentement) |
| Conservation des données | Limitée et justifiée par finalité métier |
| Notification CNIL | Sous 72h en cas de violation de données |
| Droits des personnes | Accès, rectification, effacement, opposition, portabilité — procédure depuis le compte utilisateur, réponse sous 30 jours |
| Sous-traitance encadrée | Clauses Contractuelles Types pour transferts hors UE · audit fournisseurs annuel · notification de tout changement de sous-traitant |
| DPA | Signable sur demande dans le cadre du contrat de service |

**Sous-traitants principaux** (liste publique) :

- **Supabase** (hébergement DB + Auth + Storage, région EU)
- **Vercel** (CDN edge, frontends Next.js)
- **Anthropic** (Claude API pour les modules IA — données envoyées sans entraînement)
- **Stripe** (facturation produit, à venir)

### 5.9 Pratiques de développement

- Revue de code obligatoire avant merge
- **Validation Zod** sur 100 % des entrées API (côté serveur)
- Scan automatique des dépendances (npm audit + Snyk-style)
- Variables d'environnement isolées, **secrets jamais commités**
- Tests d'isolation multi-tenant en CI
- Audit trail des actions sensibles

---

## 6 · Architecture technique

### 6.1 Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui |
| Animations | Framer Motion · GSAP (sélectif) · Canvas 2D Starfield |
| PDF | @react-pdf/renderer (vectoriel, sélectionnable, sauts de page natifs) |
| DOCX | docx (Word-compatible) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| IA | Anthropic Claude API |
| Charts | Recharts |
| Validation | Zod (côté serveur + client) |
| Tests | Vitest (unit + intégration) · Playwright (E2E) |
| Déploiement | Vercel (Edge runtime + ISR) |

### 6.2 Multi-tenant

Chaque ESN est une **organisation** (`organizations` table). Les utilisateurs sont membres d'une ou plusieurs organisations (`organization_members`). Toutes les données métier sont scopées par `organization_id` avec RLS.

### 6.3 Performance

- **First Load JS shared** : 87.8 kB (sous le budget Lighthouse "good")
- **OG image** générée en Edge runtime
- **Cache sessionStorage** sur les données stables (identity, branding)
- **Animations 60fps** garanties via `requestAnimationFrame` throttling
- **`prefers-reduced-motion`** respecté partout

### 6.4 Disponibilité

- **Cible : 99.9 %** de disponibilité applicative
- Statut monitoring : à venir sur status.centrium-platform.com
- Notification incidents : par email aux contacts admin de chaque organisation

---

## 7 · Modèle commercial

### 7.1 Pourquoi pas de grille publique ?

Une ESN de 12 consultants et un groupe de 500 personnes n'ont ni les mêmes besoins, ni les mêmes coûts. **Une grille publique pousserait à mal facturer les deux.** Nous préférons **chiffrer ensemble en 20 minutes** plutôt que de laisser nos prospects deviner.

### 7.2 Les 5 critères de calcul

1. **Volume de consultants gérés** (bibliothèque interne + freelances + portage)
2. **Nombre d'utilisateurs ESN** (BMs, recruteurs, finance, viewers — tarification dégressive au-delà de 20 sièges)
3. **Modules IA activés** (CV Optimizer, matching, assistant comptable — volume d'appels ajustable)
4. **Intégrations & options** (SSO, signature électronique, exports comptables, API publique, white-label, SLA renforcé)
5. **Conformité & accompagnement** (DPA personnalisé, audit sécurité, onboarding équipe, support dédié, formation sur site)

### 7.3 Engagement

- **Minimum 12 mois** pour permettre l'accompagnement et la configuration sur mesure
- Au-delà : renouvellement mensuel ou annuel au choix
- **Aucun engagement avant signature** : démo, devis, validation interne — vous gardez la main jusqu'au contrat
- Onboarding accompagné **inclus** dans tous les contrats

### 7.4 Trois personas types

| Persona | Profil | Modules typiques |
|---|---|---|
| **ESN en croissance** | 10 à 100 consultants, plusieurs BMs, besoin de structurer | CV Optimizer + Bibliothèque + Pipeline CRM + CRA/Facturation + Onboarding accompagné |
| **Cabinet de conseil** | Staffing exigeant, suivi rentabilité, intercontrat à minimiser | Matching consultant ↔ mission + Vue intercontrat temps réel + Reporting marge & TJM + Templates contrats personnalisés |
| **Groupe / ETI** | Multi-entités, SSO, audit, conformité renforcée | Multi-organisation + SSO + MFA + Audit & traçabilité + SLA + support dédié |

---

## 8 · Onboarding & accompagnement

### 8.1 Étape 1 : Cadrage (J0)

Visioconférence de **30 minutes** :
- 10 min : découverte de votre setup actuel
- 15 min : démo ciblée sur vos cas d'usage
- 5 min : questions ouvertes

Vous repartez avec une **estimation chiffrée** et un calendrier d'activation possible.

### 8.2 Étape 2 : Configuration espace (J+2 à J+5)

Notre équipe configure pour vous :
- Logo, couleurs, mentions légales sur les CV / contrats / factures
- Templates CV personnalisés à votre charte
- Templates contrats personnalisés
- Signature électronique de votre représentant
- Comptes utilisateurs initiaux (BMs, recruteurs, finance)

### 8.3 Étape 3 : Import des données (J+5 à J+10)

- Import CSV de votre bibliothèque consultants existante
- Import CSV du carnet de contacts
- Migration des missions actives
- Reprise des CRA en cours (option)

### 8.4 Étape 4 : Formation équipe (J+10)

Session de **2 heures** en visio :
- Tour de l'interface
- Workflows clés par persona (BM, recruteur, finance)
- Q&R en direct

Replay vidéo et guides PDF fournis.

### 8.5 Étape 5 : Mise en production (J+14)

- Activation des notifications
- Bascule officielle
- **Support dédié pendant 30 jours** (chat + email + visio si besoin)

---

## 9 · Support

### 9.1 Canaux disponibles

| Canal | Délai cible | Heures |
|---|---|---|
| Email `support@centrium-platform.com` | Sous 24 h ouvrées | Lun–Ven 9h–18h CET |
| Chat in-app | Sous 4 h ouvrées | Lun–Ven 9h–18h CET |
| Visio (sur RDV) | Programmable | Selon disponibilité |
| Urgences sécurité | Sous 1 h | 24/7 |

### 9.2 Niveaux de support

| Niveau | Inclus dans | Contenu |
|---|---|---|
| **Standard** | Tous les plans | Email + chat aux heures ouvrées, base de connaissances en ligne |
| **Premium** | Contrats > 20 sièges | Réponse prioritaire (4 h ouvrées), responsable de compte dédié |
| **Enterprise** | Contrats Groupe / ETI | SLA contractuel, support 24/7 pour incidents critiques, formation périodique |

### 9.3 Statut applicatif

`status.centrium-platform.com` (à venir) — incidents en cours, maintenance planifiée, historique de disponibilité.

### 9.4 Documentation

- **Manuel utilisateur** (PDF, voir `MANUEL_UTILISATEUR.pdf`)
- **Guide administrateur** (sections 13 du manuel)
- **Tutoriels vidéo** (à venir sur centrium-platform.com/aide)
- **Documentation API** (sur devis, accès Enterprise)

---

## 10 · Engagements de service

### 10.1 Disponibilité

- **Cible 99.9 %** mensuelle (hors maintenance planifiée annoncée 72 h à l'avance)
- Pénalités contractuelles définies au DPA en cas de manquement répété (plans Enterprise)

### 10.2 Réponse incident

| Sévérité | Définition | Réponse cible |
|---|---|---|
| **P1 Critique** | Service indisponible, perte de données | Sous 1 h, 24/7 |
| **P2 Majeure** | Feature critique dégradée | Sous 4 h ouvrées |
| **P3 Mineure** | Bug non bloquant | Sous 24 h ouvrées |
| **P4 Cosmétique** | Polish, demande d'évolution | Sous 5 jours ouvrés |

### 10.3 Notifications

- **Email** aux contacts admin de l'organisation pour tout incident P1/P2
- **Bannière in-app** pour maintenance planifiée
- **Page status** publique (à venir)

---

## 11 · Tarification (rappel)

> Pas de grille publique. Devis chiffré sous 48 h sur [centrium-platform.com/devis](https://centrium-platform.com/devis)

| Critère | Impact tarif |
|---|---|
| Volume consultants gérés | Tarification par tranche (1-50, 51-150, 151-500, 500+) |
| Utilisateurs ESN | Dégressif au-delà de 20 sièges |
| Modules IA | Volume d'appels Claude API ajustable |
| SSO + MFA | Option additionnelle |
| API publique | Plan Enterprise uniquement |
| White-label | Sur devis |
| SLA renforcé | Plan Enterprise (24/7 + 99.95 % uptime) |

---

## 12 · Mentions légales

**Éditeur** : QuadCore SAS
**Siège social** : France
**Forme juridique** : Société par actions simplifiée
**SIREN** : à compléter dans Settings → Identité visuelle
**TVA intracommunautaire** : sur facturation
**Représentant légal** : Salim El Rahmani, Président

**Hébergement** : Vercel Inc. (CDN edge) · Supabase Inc. (DB + Auth + Storage, région EU)

**Directeur de la publication** : QuadCore SAS

**Contact RGPD / DPO** : dpo@centrium-platform.com

---

## 13 · Coordonnées commerciales

**Centrium by QuadCore SAS**
Email général : contact@centrium-platform.com
Email commercial : sales@centrium-platform.com
Email support : support@centrium-platform.com
Email RGPD : dpo@centrium-platform.com
Email sécurité : security@centrium-platform.com

Site web : [centrium-platform.com](https://centrium-platform.com)
LinkedIn : (à compléter)

---

> **Vous ne devriez pas avoir à choisir entre rapidité et rigueur.**
>
> — L'équipe Centrium
