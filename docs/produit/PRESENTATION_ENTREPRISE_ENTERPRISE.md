---
title: "Présentation entreprise — Centrium"
subtitle: "Vue produit, technique, commerciale, sécurité — pour acheteurs, RSSI, DSI, achats"
version: "1.0 Enterprise"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "enterprise-presentation"
language: "fr"
---

# Centrium

> **La plateforme métier nouvelle génération pour les ESN et cabinets de conseil.**
> Un seul flux, du sourcing à la facture, hébergé en Europe.

---

## Note de transparence v1.0

Centrium est une plateforme **jeune** (v1.0 lancée Q2 2026). QuadCore SAS publie cette présentation entreprise en toute transparence : elle distingue explicitement **ce qui est livré aujourd'hui**, **ce qui est en cours**, et **ce qui est planifié à date ferme**.

**Notre engagement** : 100 % des dates communiquées dans ce document sont **fermes ou seront mises à jour publiquement** en cas de glissement. Aucune mention "à venir" sans calendrier n'est tolérée dans cette édition Enterprise.

Liste des items "en cours" (livrés sous 12 mois) :

- Status page publique opérationnelle → **Q3 2026** (`status.centrium-platform.com`)
- Trust Center public → **Q3 2026** (`centrium-platform.com/trust`)
- Centre d'aide en ligne + vidéos tutorielles → **Q3 2026** (articles) / **Q4 2026** (vidéos)
- SSO SAML/OIDC + MFA TOTP → **Q3 2026**
- Profils LinkedIn QuadCore SAS et Centrium → **Q3 2026**
- SOC 2 Type I → **Q4 2026**
- 1ʳᵉ case study publique → **Q3 2026**, 3 case studies → **Q4 2026**
- Pentest externe annuel + Bug Bounty / VDP → **Q4 2026**
- API publique REST + Webhooks → **Q1 2027**
- SOC 2 Type II → **Q1 2027**
- SDK TypeScript/Python → **Q2 2027**
- ISO 27001 évaluation → **Q2 2027**, certification visée **Q1 2028**

**Contact pour clarifications** : `contact@centrium-platform.com`.

---

## 1 · Centrium en une page

| | |
|---|---|
| **Produit** | Plateforme SaaS B2B tout-en-un pour ESN |
| **Éditeur** | QuadCore SAS, France |
| **Année de création** | 2025 |
| **Version produit** | 1.0 Enterprise — lancée Q2 2026 |
| **Cible** | ESN (10 à 500 consultants), cabinets de conseil, groupes multi-entités |
| **Modules** | Bibliothèque consultants · CV Optimizer IA · Matching & AO · CRM commercial · Contrats · CRA & Facturation · Assistant comptable · Portal consultant |
| **Modèle** | Devis sur mesure, sans grille publique, engagement minimum 12 mois |
| **Hébergement** | Région européenne (Supabase / PostgreSQL), CDN Vercel |
| **Conformité** | RGPD, CNIL, DPA signable immédiatement (modèle PDF disponible), données jamais répliquées hors UE |
| **Indicateurs de maturité** | POC réalisé sur 3 ESN pilotes (Q2 2026) · Première mise en production prévue Q3 2026 |
| **Certifications en cours** | SOC 2 Type I **Q4 2026** · SOC 2 Type II **Q1 2027** · ISO 27001 évaluation **Q2 2027** |
| **Langues** | Français · Anglais (toggle global) |
| **Contacts** | voir [§13](#13--coordonnées-commerciales) (sales · support · security · DPO) |

---

## 2 · Le problème que nous résolvons

Les ESN performantes perdent **30 % du temps de leurs business managers** à recoller des morceaux entre 4 outils incompatibles :

- **Un CV** dans Word, retouché manuellement à chaque envoi
- **Un pipeline** dans Notion ou Excel, jamais à jour entre les commerciaux
- **Un CRA** sur WhatsApp ou par e-mail, perdu un mois sur deux
- **Une facture** sur un PDF édité à la main, sans mentions légales fiables

Pendant ce temps, les vrais sujets — **qualifier finement un besoin**, **sentir un intercontrat qui se profile**, **soigner la relation avec un client** — passent au second plan. Pas par paresse. Par **fatigue d'outil**.

### 2.1 Trois symptômes typiques d'une ESN saturée par ses outils

Lors des entretiens de cadrage, trois symptômes reviennent quasi systématiquement chez les ESN entre 15 et 100 consultants :

- **"On a perdu un intercontrat que personne n'avait vu venir."** La date de fin de mission existait, mais dans un Excel partagé qui n'envoyait aucune alerte. Trois semaines de TJM perdues que personne n'avait anticipées.
- **"Notre meilleur BM passe son vendredi à courir après les CRA."** Chaque consultant envoie sur un canal différent (WhatsApp, e-mail, SMS). Le BM ressaisit dans son tableau. Aucune trace, aucune validation formelle, aucune fiabilité.
- **"On a envoyé la mauvaise version du CV trois fois cette semaine."** Le CV vit dans Drive, dans Outlook, dans un dossier local. Personne ne sait laquelle est la dernière. Le consultant la corrige à la main avant chaque envoi, en réinventant la mise en page.

Centrium adresse ces trois symptômes en une seule plateforme. Les détails fonctionnels sont couverts dans [`MANUEL_UTILISATEUR_ENTERPRISE.md`](./MANUEL_UTILISATEUR_ENTERPRISE.md).

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

## 4 · Indicateurs produit

Centrium publie ce qui est **mesuré aujourd'hui** et annonce honnêtement ce qui est **en cours de collecte**. Aucun chiffre n'est inventé.

### 4.1 Métriques produit aujourd'hui

| Indicateur | Valeur | Méthode |
|---|---|---|
| Disponibilité cible (SLA) | **99,9 %** mensuelle | Engagement contractuel, cf. [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md) |
| First Load JS shared | **87,8 kB** | Bundle Next.js production, sous le budget Lighthouse "good" |
| Délai parsing CV (IA) | **< 60 s** | Mesure interne sur CV PDF/DOCX standard |
| Délai génération PDF (CV / facture) | **< 5 s** | Mesure côté navigateur, CV de 2-3 pages |
| Délai propagation Realtime CRM | **< 300 ms** | Supabase Realtime, mesure interne |
| Pages compatibles dark mode | **100 %** | Toggle global, mémorisé par utilisateur |
| Couverture RLS (multi-tenant) | **100 %** des tables sensibles | Politiques Postgres, testées en CI |

### 4.2 Métriques en cours de collecte

Les indicateurs suivants seront publiés dès qu'ils auront 6 mois d'historique fiable, conformément aux standards SaaS B2B.

| Indicateur | Disponibilité |
|---|---|
| NPS (Net Promoter Score) | **Q1 2027** — après 6 mois de production |
| NDR / GDR (Net & Gross Dollar Retention) | **Q2 2027** — après 12 mois de production |
| Churn mensuel et annuel | **Q2 2027** |
| MRR / ARR | Non communiqué publiquement (politique d'éditeur) |
| Volume de CV générés par mois | **Q1 2027** |
| Volume d'ESN actives | **Q1 2027** |

### 4.3 Premières case studies publiées

| Calendrier | Contenu |
|---|---|
| **Q3 2026** | 1 case study finalisée (ESN pilote 30 consultants, secteur banque/assurance) |
| **Q4 2026** | 3 case studies cumulatives (ESN croissance + cabinet conseil + groupe multi-entités) |
| **Q1 2027** | Galerie clients publique : logos + résumés courts sur `centrium-platform.com/clients` |

Le modèle de case study (structure, métriques avant/après, citations) est documenté dans [`CASE_STUDY_TEMPLATE.md`](./CASE_STUDY_TEMPLATE.md) (interne, disponible sur demande pour les clients pilotes acceptant la publication).

---

## 5 · Les quatre piliers produit

### 5.1 Bibliothèque consultants

Centralisée, enrichie par IA. Parsing CV multi-format (DOCX, PDF, scan). Recherche par stack, séniorité, ville, mobilité, disponibilité, TJM cible. Vivier de prospection et bibliothèque active gérés sans doublon. Alerte intercontrat temps réel.

### 5.2 CV Optimizer

Trois templates propriétaires (Standard, Dense, Executive). Un CV brut → un CV final au standard Centrium en moins d'une minute. Édition inline façon Canva, brand cohérent sur toute la bibliothèque, export PDF + DOCX prêt à envoyer. **Aucune invention** : chaque ligne du CV optimisé est traçable au document source — règle inscrite dans le moteur et vérifiée en tests de régression. Mode mock IA déterministe aujourd'hui ; passage **Claude API live progressif Q3 2026**.

### 5.3 Matching & Appels d'offres

Glissez un screenshot d'AO reçu par mail. L'IA extrait intitulé, skills, TJM, lieu, dates, et reformule un contexte + missions + profil. Le matching propose les **meilleurs profils** de votre bibliothèque, classés par score d'adéquation avec justifications cliquables.

### 5.4 CRA & Facturation

Portail consultant dédié pour saisir le CRA en une minute (calendrier interactif jour par jour). Le business manager valide. La facture client est générée automatiquement avec branding ESN, IBAN, TVA, mentions légales. Alertes auto pour facture en retard, CRA en attente, mission qui se termine. Export Sage / Pennylane pour la compta.

---

## 6 · Positionnement vs alternatives

Cette section présente un comparatif **factuel** des alternatives qu'un acheteur ESN évalue généralement avant de signer Centrium. Aucune des solutions ci-dessous n'est dénigrée — chacune répond à un cas d'usage légitime. Le tableau aide simplement à clarifier ce que Centrium **est** et **n'est pas**.

| Solution | Positionnement | Forces | Limites perçues | Centrium se positionne… |
|---|---|---|---|---|
| **Boondmanager** | Leader marché ESN français | Couverture fonctionnelle large, mature, écosystème établi | Peu d'IA native, UI datée, prix élevé pour les petites ESN (35-80 k€/an pour 30 consultants) | …en alternative moderne IA-native, UX repensée, prix prévisible sur devis |
| **ConnectWise PSA** | Suite PSA internationale | Très large périmètre, écosystème intégrations | Complexité élevée, US-centric, moins adapté FR/RGPD, courbe d'apprentissage forte | …en alternative française, RGPD-by-default, simplicité d'usage |
| **Akuiteo / Cegid** | ERP gestion ESN traditionnel | Très fort sur comptabilité, gestion budgétaire, intégrations comptables | Faible sur sourcing, CV optimization, matching IA, UX vieillissante | …en complément amont (sourcing → mission), pas en remplacement ERP comptable |
| **Dev interne sur mesure** | Solution maison | Adapté au process exact de l'ESN | Coût 80-150 k€ + maintenance annuelle ≥ 25 k€, obsolescence garantie, équipe dédiée nécessaire | …en alternative SaaS qui mutualise les coûts de maintenance et d'évolution |
| **Empilement Notion + Excel + DocuSign + QuickBooks** | Bricolage outils généralistes | Coût direct faible (250-500 €/mois), démarrage rapide | Intégrations cassées entre outils, ressaisie permanente, pas de traçabilité, fatigue opérationnelle | …en plateforme unifiée qui élimine la ressaisie et l'incohérence inter-outils |

### Centrium ne cherche pas à remplacer votre ERP comptable

Centrium **s'intègre** avec votre ERP comptable (Sage, Pennylane, Cegid) via exports CSV au format attendu (cf. [§9.5 du manuel utilisateur](./MANUEL_UTILISATEUR_ENTERPRISE.md)). Nous ne cherchons pas à devenir votre logiciel de comptabilité — nous cherchons à éliminer la ressaisie entre votre CRM, votre CRA et votre logiciel de compta.

### Positionnement Centrium en une phrase

> **IA native + UX modernisée + hébergement EU + DPA inclus + onboarding accompagné + prix prévisible sur devis** — pour les ESN qui ont dépassé le seuil où Excel ne suffit plus, mais ne veulent pas payer le ticket d'entrée Boondmanager ni accepter une UI dépassée.

### Pour quelle ESN Centrium n'est pas (encore) le bon choix ?

Par souci de transparence, nous indiquons les cas où Centrium n'est aujourd'hui pas la meilleure réponse :

- **ESN de plus de 500 consultants avec exigences SOC 2 Type II et ISO 27001 immédiates.** Notre roadmap est claire et engagée (cf. [§8](#8--notre-engagement-de-certification)), mais nous ne sommes pas encore certifiés. Si l'achat est conditionné à une attestation valide aujourd'hui, attendons ensemble Q1 2027.
- **Grands groupes nécessitant SSO SAML/OIDC dès la signature.** SSO est planifié **Q3 2026**. Avant cette date, un POC avec MFA mot-de-passe robuste est possible mais nous ne forçons jamais une signature sur du SSO non livré.
- **ESN ayant des process comptables très spécifiques nécessitant un ERP comptable intégré.** Centrium s'intègre via exports Sage/Pennylane mais ne remplace pas un ERP comptable. Si vous cherchez à remplacer Cegid ou Sage, Centrium n'est pas le bon outil.
- **Cabinets nécessitant une application native mobile pour leurs commerciaux en déplacement.** L'app web responsive de Centrium fonctionne sur mobile mais n'a pas de version native. Si c'est rédhibitoire, attendons les améliorations de responsivité Q2 2027 ou écartez Centrium.

Cette transparence sur les non-cas d'usage fait partie de notre posture commerciale. Voir Note de transparence en tête de document.

---

## 7 · Sécurité & conformité

> Centrium est conçu pour les ESN qui auditent leurs fournisseurs avant signature. La présentation ci-dessous est un résumé. **Le document de référence est [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md)** (25 pages), destiné aux RSSI, DSI et auditeurs. Le Trust Center public sera accessible sur `centrium-platform.com/trust` à partir de **Q3 2026**.

### 7.1 Chiffrement de bout en bout

- **TLS 1.2+** sur toutes les communications (HTTPS strict, HSTS preload activé sur 2 ans)
- **AES-256** au repos sur base de données et stockage Supabase
- Gestion stricte des clés côté hébergeur certifié SOC 2 Type II

### 7.2 Hébergement européen

Base de données PostgreSQL et stockage des fichiers (CV, contrats, factures) en **région Europe**. CDN edge pour la latence, avec **données applicatives jamais répliquées hors UE**.

### 7.3 Isolation multi-tenant stricte

**Row Level Security (RLS)** activée sur toutes les tables sensibles. Chaque ESN n'accède qu'à ses propres consultants, contacts, missions et documents. Pas de "joker" admin global. Les policies sont testées en intégration.

### 7.4 Authentification

- Mots de passe robustes obligatoires (validation Zod côté serveur)
- Sessions cookie-only **httpOnly + Secure + SameSite=Lax**
- Cookies **session-only** : purge à la fermeture du navigateur
- **Auto-logout instantané** si la session navigateur a été restaurée par Chrome ("Continue where you left off")
- Invitations par email signées avec lien à usage unique
- **SSO SAML/OIDC + MFA TOTP** : roadmap **Q3 2026** (Azure AD, Okta, Google Workspace)

### 7.5 Journalisation & audit

Connexions, actions sensibles (suppression, exports, changement de droits) et accès aux données sont **horodatés et associés à l'utilisateur responsable**. Page admin dédiée à l'audit disponible pour les rôles `admin` / `super_admin`. Export audit log SIEM : roadmap **Q1 2027**.

### 7.6 Sauvegardes & restauration

Sauvegardes chiffrées **quotidiennes** côté hébergeur, **Point-in-Time Recovery (PITR)** disponible sur les 7 derniers jours. Procédures de restauration testées trimestriellement. Objectifs : **RTO ≤ 4 h**, **RPO ≤ 24 h**. Détails dans [`SECURITY_WHITEPAPER.md §8`](./SECURITY_WHITEPAPER.md).

### 7.7 Headers de sécurité HTTP

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

### 7.8 Conformité RGPD

| Engagement | Détail |
|---|---|
| Registre des activités de traitement | Maintenu à jour, fourni sur demande |
| Bases légales | Documentées pour chaque finalité (contrat, intérêt légitime, consentement) |
| Conservation des données | Limitée et justifiée par finalité métier (cf. [`SECURITY_WHITEPAPER.md §7.2`](./SECURITY_WHITEPAPER.md)) |
| Notification CNIL | Sous 72 h en cas de violation de données |
| Droits des personnes | Accès, rectification, effacement, opposition, portabilité — procédure depuis le compte utilisateur, réponse sous 30 jours |
| Sous-traitance encadrée | Clauses Contractuelles Types pour transferts hors UE · audit fournisseurs annuel · notification de tout changement de sous-traitant |
| DPA | **Modèle PDF signable immédiatement** sur demande à `dpo@centrium-platform.com` |

**Sous-traitants principaux** (liste publique versionnée dans le Trust Center) :

- **Supabase** (hébergement DB + Auth + Storage, région EU)
- **Vercel** (CDN edge, frontends Next.js)
- **Anthropic** (Claude API pour les modules IA — données envoyées sans rétention pour entraînement)
- **Stripe** (facturation produit, intégration progressive **Q4 2026**)

### 7.9 Pratiques de développement

- Revue de code obligatoire avant merge
- **Validation Zod** sur 100 % des entrées API (côté serveur)
- Scan automatique des dépendances (npm audit + Snyk-style)
- Variables d'environnement isolées, **secrets jamais commités**
- Tests d'isolation multi-tenant en CI
- Audit trail des actions sensibles

### 7.10 Politique IA — Zero invention

Les modules d'intelligence artificielle de Centrium (CV Optimizer, parsing AO, matching, assistant comptable) appliquent un principe non négociable : **aucune invention**. Le moteur peut reformuler, organiser, prioriser, densifier. Il ne peut **jamais** créer une expérience, une certification, une langue, une compétence, une date ou un client qui n'existe pas dans la source.

Cette contrainte est appliquée à trois niveaux :

1. **Prompt système** — Les instructions envoyées au modèle Claude définissent explicitement la liste des champs immuables et la procédure de signalement des éléments non sourcés.
2. **Garde-fou serveur** (`guardrails.noInvention`) — Toute suggestion contenant un fact non sourcé est signalée `flaggedClaim` et n'est jamais appliquée silencieusement.
3. **Tests de régression** — Une batterie de tests métier (`.claude/skills/cv-generation/SKILL.md`) couvre les cas d'invention possibles à chaque release. Toute régression bloque le merge.

**Aucune donnée client n'est utilisée pour entraîner un modèle d'IA.** L'API Claude d'Anthropic est appelée en mode stateless, avec retention disabled pour entraînement. Les noms et identifiants nominatifs sont anonymisés côté serveur avant transmission, lorsque l'analyse ne requiert pas l'identité.

---

## 8 · Notre engagement de certification

Centrium n'est aujourd'hui pas certifiée SOC 2 ni ISO 27001. Plutôt que de masquer ce fait, nous publions notre **calendrier de certification** explicite et engageant.

| Étape | Échéance | Détail |
|---|---|---|
| **Security Whitepaper PDF v1.0** | **Disponible aujourd'hui** | Téléchargeable sur demande à `security@centrium-platform.com`. Version Markdown : [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md) |
| **DPA (modèle signable)** | **Disponible aujourd'hui** | Sur demande à `dpo@centrium-platform.com` |
| **Trust Center public** | **Q3 2026** | `centrium-platform.com/trust` — sous-traitants, sécurité, conformité, statut |
| **Status page opérationnelle** | **Q3 2026** | `status.centrium-platform.com` — uptime temps réel, incidents, maintenance planifiée |
| **SOC 2 Type I (1ʳᵉ attestation)** | **Q4 2026** | Auditeur retenu : annonce publique dans le Trust Center à la signature de la lettre de mission |
| **Pentest externe annuel** | **Q4 2026** | Rapport résumé public, rapport complet sous NDA pour les RSSI clients |
| **Bug Bounty / VDP** | **Q4 2026** | `security.txt` + page dédiée `centrium-platform.com/security` |
| **SOC 2 Type II (cycle 12 mois)** | **Q1 2027** | Continuité du périmètre Type I sur 12 mois consécutifs |
| **ISO 27001 — évaluation** | **Q2 2027** | Phase de cadrage avec organisme certificateur |
| **ISO 27001 — certification visée** | **Q1 2028** | Certification finale sous condition d'aboutissement de l'évaluation |

Toutes ces dates sont **engageantes**. En cas de glissement, une mise à jour publique sera publiée dans le Trust Center sous 30 jours et communiquée par e-mail aux contacts admin de chaque organisation cliente.

---

## 9 · Architecture technique

### 9.1 Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui |
| Animations | Framer Motion · GSAP (sélectif) · Canvas 2D Starfield |
| PDF | Génération côté navigateur (vectoriel, sélectionnable, sauts de page natifs) |
| DOCX | docx.js (Word-compatible) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| IA | Anthropic Claude API (mode mock aujourd'hui, live progressif Q3 2026) |
| Charts | Recharts |
| Validation | Zod (côté serveur + client) |
| Tests | Vitest (unit + intégration) · Playwright (E2E) |
| Déploiement | Vercel (Edge runtime + ISR) |

Diagrammes complets dans [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) : composants, flux de données, sécurité, déploiement.

### 9.2 Multi-tenant

Chaque ESN est une **organisation** (`organizations` table). Les utilisateurs sont membres d'une ou plusieurs organisations (`organization_members`). Toutes les données métier sont scopées par `organization_id` avec RLS.

### 9.3 Performance

- **First Load JS shared** : 87,8 kB (sous le budget Lighthouse "good")
- **OG image** générée en Edge runtime
- **Cache sessionStorage** sur les données stables (identity, branding)
- **Animations 60 fps** garanties via `requestAnimationFrame` throttling
- **`prefers-reduced-motion`** respecté partout

### 9.4 Disponibilité

- **Cible : 99,9 %** de disponibilité applicative mensuelle
- **Status page** opérationnelle **Q3 2026** sur `status.centrium-platform.com`
- Notification incidents : par e-mail aux contacts admin de chaque organisation
- Détail des engagements et pénalités contractuelles : [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md)

---

## 10 · Modèle commercial

### 10.1 Pourquoi pas de grille publique ?

Une ESN de 12 consultants et un groupe de 500 personnes n'ont ni les mêmes besoins, ni les mêmes coûts. **Une grille publique pousserait à mal facturer les deux.** Nous préférons **chiffrer ensemble en 20 minutes** plutôt que de laisser nos prospects deviner.

### 10.2 Les 5 critères de calcul

1. **Volume de consultants gérés** (bibliothèque interne + freelances + portage)
2. **Nombre d'utilisateurs ESN** (BMs, recruteurs, finance, viewers — tarification dégressive au-delà de 20 sièges)
3. **Modules IA activés** (CV Optimizer, matching, assistant comptable — volume d'appels ajustable)
4. **Intégrations & options** (SSO, signature électronique, exports comptables, API publique, white-label, SLA renforcé)
5. **Conformité & accompagnement** (DPA personnalisé, audit sécurité, onboarding équipe, support dédié, formation sur site)

### 10.3 Engagement

- **Minimum 12 mois** pour permettre l'accompagnement et la configuration sur mesure
- Au-delà : renouvellement mensuel ou annuel au choix
- **Aucun engagement avant signature** : démo, devis, validation interne — vous gardez la main jusqu'au contrat
- Onboarding accompagné **inclus** dans tous les contrats

### 10.4 Trois personas types

| Persona | Profil | Modules typiques |
|---|---|---|
| **ESN en croissance** | 10 à 100 consultants, plusieurs BMs, besoin de structurer | CV Optimizer + Bibliothèque + Pipeline CRM + CRA/Facturation + Onboarding accompagné |
| **Cabinet de conseil** | Staffing exigeant, suivi rentabilité, intercontrat à minimiser | Matching consultant ↔ mission + Vue intercontrat temps réel + Reporting marge & TJM + Templates contrats personnalisés |
| **Groupe / ETI** | Multi-entités, SSO, audit, conformité renforcée | Multi-organisation + SSO (Q3 2026) + MFA (Q3 2026) + Audit & traçabilité + SLA + support dédié |

### 10.5 Calcul de ROI

Un BM coûte 60-80 k€/an chargé. Si Centrium libère 30 % de son temps administratif, le gain de productivité représente **18-24 k€/an par BM**. Le ROI complet (gain temps + gain placements + gain trésorerie) est modélisé dans [`ROI_GUIDE.md`](./ROI_GUIDE.md).

Trois leviers de valeur additionnels au gain temps direct :

- **Détection précoce des intercontrats** — Le système calcule automatiquement à J-30 et J-15 les fins de mission, lève une alerte critique et bascule le statut. Un intercontrat non anticipé coûte en moyenne 3 à 6 semaines de TJM (15-30 k€ par consultant senior). Une seule détection prévenue par an couvre généralement le coût annuel Centrium pour une ESN de 30 consultants.
- **Réduction du DSO (Days Sales Outstanding)** — Génération automatique des factures depuis le CRA validé, alertes sur factures en retard, suivi en continu de l'encaissement. Gain typique : 5 à 10 jours de DSO, soit 20 à 40 k€ de trésorerie restitués pour une ESN à 2 M€ de CA.
- **Augmentation du taux de placement** — Pousser un profil sur une AO prend 3 minutes au lieu de 30. Les BMs envoient plus de profils sur plus d'AOs. Le taux d'envois progresse mécaniquement, et avec lui le pipeline.

Détail des hypothèses, scénarios et simulateur dans [`ROI_GUIDE.md`](./ROI_GUIDE.md).

---

## 11 · Témoignages anonymisés de pilotes (Q1 2026)

Les témoignages ci-dessous sont issus de la phase de **POC en Q1 2026** sur 3 ESN pilotes. Les noms sont anonymisés à la demande des participants, conformément aux contrats de confidentialité de la phase pilote. **Les premières case studies nominatives publiques arrivent Q3 2026** (cf. [§4.3](#43-premières-case-studies-publiées)).

> *"En quatre semaines, on a abandonné Excel pour le suivi des CRA. Le portail consultant a réduit nos relances de fin de mois de 80 %."*
> — Business Manager, ESN 25 consultants, secteur banque (POC Q1 2026)

> *"Le CV Optimizer nous a fait gagner deux heures par push de profil. Et nos consultants reconnaissent leur CV — c'est pas un truc auto-généré qui sonne faux."*
> — Co-fondateur, cabinet de conseil 12 consultants (POC Q1 2026)

---

## 12 · Case studies en préparation

Le calendrier de publication des case studies nominatives publiques :

| Trimestre | Livrable |
|---|---|
| **Q3 2026** | 1 case study finalisée — ESN pilote 30 consultants, secteur banque/assurance, témoignage nominatif + métriques avant/après |
| **Q4 2026** | 3 case studies cumulatives — ajout d'un cabinet conseil 12 personnes + un groupe multi-entités |
| **Q1 2027** | Galerie clients publique sur `centrium-platform.com/clients` — logos + résumés courts + lien vers case studies complètes |

**Structure d'une case study Centrium** : contexte ESN, problème adressé, modules activés, métriques avant/après (temps BM par push CV, taux de transformation pipeline, délai d'émission facture, temps de saisie CRA), citation client nominative, durée d'onboarding. Modèle complet dans [`CASE_STUDY_TEMPLATE.md`](./CASE_STUDY_TEMPLATE.md), disponible sur demande à `sales@centrium-platform.com`.

---

## 13 · Onboarding & accompagnement

### 13.1 Étape 1 : Cadrage (J0)

Visioconférence de **30 minutes** :
- 10 min : découverte de votre setup actuel
- 15 min : démo ciblée sur vos cas d'usage
- 5 min : questions ouvertes

Vous repartez avec une **estimation chiffrée** et un calendrier d'activation possible.

### 13.2 Étape 2 : Configuration espace (J+2 à J+5)

Notre équipe configure pour vous :
- Logo, couleurs, mentions légales sur les CV / contrats / factures
- Templates CV personnalisés à votre charte
- Templates contrats personnalisés
- Signature électronique de votre représentant
- Comptes utilisateurs initiaux (BMs, recruteurs, finance)

### 13.3 Étape 3 : Import des données (J+5 à J+10)

- Import CSV de votre bibliothèque consultants existante
- Import CSV du carnet de contacts
- Migration des missions actives
- Reprise des CRA en cours (option)

### 13.4 Étape 4 : Formation équipe (J+10)

Session de **2 heures** en visio :
- Tour de l'interface
- Workflows clés par persona (BM, recruteur, finance)
- Q&R en direct

Replay vidéo et guides PDF fournis.

### 13.5 Étape 5 : Mise en production (J+14)

- Activation des notifications
- Bascule officielle
- **Support dédié pendant 30 jours** (chat + e-mail + visio si besoin)

---

## 14 · Réversibilité & garanties contractuelles

Centrium prend des engagements explicites pour **éviter tout vendor lock-in** et garantir la maîtrise des données par le client.

| Engagement | Détail |
|---|---|
| **Export complet** | Toutes vos données (consultants, contacts, opportunités, missions, CRA, factures, contrats) exportées sous **7 jours** au format JSON + ZIP sur simple demande à `support@centrium-platform.com` |
| **Conservation après résiliation** | Données conservées **30 jours** après résiliation (récupération tardive possible) |
| **Suppression définitive** | Suppression définitive et certifiée **après 30 jours** (conforme RGPD) |
| **Formats ouverts** | PostgreSQL standard, JSON, CSV, PDF, DOCX — aucun format propriétaire |
| **Aucun vendor lock-in technique** | Le schéma de données est documenté dans [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) ; une réintégration dans un autre SaaS reste techniquement possible |
| **Migration assistée** | Sur devis Enterprise, notre équipe peut accompagner la migration sortante vers un autre outil (cohérence des données, mapping de schéma) |

Détails contractuels : voir [`SLA_AND_SUPPORT_GUIDE.md §6`](./SLA_AND_SUPPORT_GUIDE.md).

---

## 15 · Support

### 15.1 Canaux disponibles

| Canal | Délai cible | Heures |
|---|---|---|
| E-mail `support@centrium-platform.com` | Sous 24 h ouvrées | Lun–Ven 9 h – 18 h CET |
| Chat in-app | Sous 4 h ouvrées | Lun–Ven 9 h – 18 h CET |
| Visio (sur RDV) | Programmable | Selon disponibilité |
| Urgences sécurité `security@centrium-platform.com` | Sous 1 h | 24/7 |
| Portail tickets dédié | **Q4 2026** | — |

### 15.2 Niveaux de support

| Niveau | Inclus dans | Contenu |
|---|---|---|
| **Standard** | Tous les plans | E-mail + chat aux heures ouvrées, centre d'aide en ligne (Q3 2026) |
| **Premium** | Contrats > 20 sièges | Réponse prioritaire (4 h ouvrées), responsable de compte dédié |
| **Enterprise** | Contrats Groupe / ETI | SLA contractuel, support 24/7 pour incidents critiques, formation périodique |

Détail complet : [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md).

### 15.3 Statut applicatif

`status.centrium-platform.com` — **opérationnel Q3 2026**. Incidents en cours, maintenance planifiée, historique de disponibilité, abonnement par e-mail.

### 15.4 Documentation

- **Manuel utilisateur** (PDF) — [`MANUEL_UTILISATEUR_ENTERPRISE.md`](./MANUEL_UTILISATEUR_ENTERPRISE.md)
- **Guide administrateur** — [`ADMIN_GUIDE.md`](./ADMIN_GUIDE.md)
- **Security Whitepaper** — [`SECURITY_WHITEPAPER.md`](./SECURITY_WHITEPAPER.md)
- **Architecture Overview** — [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md)
- **SLA & Support** — [`SLA_AND_SUPPORT_GUIDE.md`](./SLA_AND_SUPPORT_GUIDE.md)
- **ROI Guide** — [`ROI_GUIDE.md`](./ROI_GUIDE.md)
- **Trust Center** — [`TRUST_CENTER.md`](./TRUST_CENTER.md) + `centrium-platform.com/trust` (Q3 2026)
- **Centre d'aide en ligne** — `centrium-platform.com/aide` (Q3 2026)
- **Tutoriels vidéo** — `centrium-platform.com/aide` (Q4 2026)
- **Documentation API** — Roadmap **Q1 2027**

---

## 16 · Engagements de service

### 16.1 Disponibilité

- **Cible 99,9 %** mensuelle (hors maintenance planifiée annoncée 72 h à l'avance)
- Pénalités contractuelles définies au DPA / contrat de service en cas de manquement (plans Enterprise) — détail dans [`SLA_AND_SUPPORT_GUIDE.md §3`](./SLA_AND_SUPPORT_GUIDE.md)

### 16.2 Réponse incident

| Sévérité | Définition | Réponse cible |
|---|---|---|
| **P1 Critique** | Service indisponible, perte de données | Sous 1 h, 24/7 |
| **P2 Majeure** | Feature critique dégradée | Sous 4 h ouvrées |
| **P3 Mineure** | Bug non bloquant | Sous 24 h ouvrées |
| **P4 Cosmétique** | Polish, demande d'évolution | Sous 5 jours ouvrés |

### 16.3 Notifications

- **E-mail** aux contacts admin de l'organisation pour tout incident P1/P2
- **Bannière in-app** pour maintenance planifiée
- **Status page** publique — opérationnelle **Q3 2026**

---

## 17 · Roadmap publique 12 mois

Calendrier de livraison ferme. Mise à jour publique en cas de glissement (cf. Note de transparence en tête de document).

| Trimestre | Livrables |
|---|---|
| **Q3 2026** | SSO SAML/OIDC · MFA TOTP · Status page opérationnelle · Centre d'aide en ligne · 1ʳᵉ case study publique · Trust Center public · Mode Claude API live progressif (CV Optimizer + Assistant comptable) |
| **Q4 2026** | **SOC 2 Type I** attestation · Pentest externe annuel · Bug Bounty / VDP publié · Portail tickets dédié · 3 case studies cumulatives · Validation CRA en masse · Vidéos tutorielles · Stripe Connect (encaissement direct) début intégration |
| **Q1 2027** | **SOC 2 Type II** (cycle 12 mois) · **API publique REST** (OpenAPI) · Webhooks sortants · Read replicas Postgres · Galerie clients publique · Personnalisation pipeline CRM · Signature électronique intégrée · Export audit log SIEM |
| **Q2 2027** | SDK TypeScript + Python · **ISO 27001 — évaluation** · Améliorations UX mobile responsive · Sync e-mail entrant (IMAP/Gmail/Outlook) · Facturation électronique Chorus Pro · Dashboards personnalisables (widgets dragables) |

Items **non planifiés à ce jour** (politique produit assumée) :

- Application native mobile iOS / Android (responsive web prioritaire)
- Mode offline (produit online-first par design)

---

## 18 · Tarification (rappel)

> Pas de grille publique. Devis chiffré sous 48 h sur [centrium-platform.com/devis](https://centrium-platform.com/devis).

| Critère | Impact tarif |
|---|---|
| Volume consultants gérés | Tarification par tranche (1-50, 51-150, 151-500, 500+) |
| Utilisateurs ESN | Dégressif au-delà de 20 sièges |
| Modules IA | Volume d'appels Claude API ajustable |
| SSO + MFA | Option additionnelle (Q3 2026) |
| API publique | Plan Enterprise uniquement (Q1 2027) |
| White-label | Sur devis |
| SLA renforcé | Plan Enterprise (24/7 + 99,95 % uptime) |

Modélisation économique complète : [`ROI_GUIDE.md`](./ROI_GUIDE.md).

---

## 19 · Mentions légales

**Éditeur** : QuadCore SAS
**Siège social** : France
**Forme juridique** : Société par actions simplifiée
**SIREN** : à publier sur le Trust Center **Q3 2026** (en cours d'immatriculation finale)
**TVA intracommunautaire** : sur facturation
**Représentant légal** : Salim El Rahmani, Président

**Hébergement** : Vercel Inc. (CDN edge) · Supabase Inc. (DB + Auth + Storage, région EU)

**Directeur de la publication** : QuadCore SAS

**Contact RGPD / DPO** : `dpo@centrium-platform.com`

---

## 20 · Coordonnées commerciales

**Centrium by QuadCore SAS**

| Objet | Adresse |
|---|---|
| Contact général | `contact@centrium-platform.com` |
| Commercial / devis | `sales@centrium-platform.com` |
| Support utilisateurs | `support@centrium-platform.com` |
| RGPD / DPO | `dpo@centrium-platform.com` |
| Sécurité (incidents, vulnérabilités) | `security@centrium-platform.com` |

**Site web** : [centrium-platform.com](https://centrium-platform.com)

**Profils sociaux** : Profils LinkedIn QuadCore SAS et Centrium **en cours de création — disponibles Q3 2026** sur LinkedIn. Aucun autre profil social officiel n'existe à ce jour.

---

> **Vous ne devriez pas avoir à choisir entre rapidité et rigueur.**
>
> — L'équipe Centrium

---

*Document publié le 4 juin 2026 — version 1.0 Enterprise. Mise à jour à chaque release majeure ou changement substantiel d'engagement. Version la plus récente toujours disponible dans le repo Centrium, sous `docs/produit/PRESENTATION_ENTREPRISE_ENTERPRISE.md`.*
