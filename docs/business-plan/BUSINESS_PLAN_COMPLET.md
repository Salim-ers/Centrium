# Centrium by QuadCore — Business Plan & Plan d'action

> Document stratégique consolidé. Date : 4 juin 2026. Auteur : direction QuadCore SAS.
> Audience cible : fondateur, board, investisseurs Seed, banquier (prêt amorçage), associés futurs, recruteurs clés.
> Sources : 5 audits techniques indépendants (code, sécurité, produit, ops, vitrine) + 4 documents commerciaux (pricing, marché/ICP, GTM, modèle financier).

---

## Executive Summary (1 page)

**Centrium est l'OS opérationnel des ESN françaises modernes.** Une plateforme SaaS verticale B2B qui centralise dans un seul flux la bibliothèque consultants, le CV optimizer IA, le matching mission, la facturation et le pilotage — ce que Boondmanager fait dans une UX 2010, ce que Notion+Excel ne fera jamais. Hébergée 100 % Europe (Vercel + Supabase), sécurisée par défaut (RLS multi-tenant FORCE sur 38 tables, MFA TOTP, audit log, Trust Center public).

**Le marché est ouvert et mûr pour un challenger.** ~3 000 ESN françaises de 10 à 200 consultants constituent le SAM (~48 M€ ARR adressables). Boondmanager (leader, ~1 500 clients, ~50 % du SAM) facture 25-80 k€/an pour 30 consultants, sur une UX legacy sans IA native. Une cohorte de 300-400 ESN va renégocier son PSA en 2026-2028. C'est notre fenêtre de tir.

**Le produit existe et tient debout — à conditions.** v1.0 livrée Q2 2026, 14+ surfaces fonctionnelles, 63 migrations SQL, 4 modules IA réels (parsing CV, extraction AO, génération email, suggestion compétences), brand identity au niveau série A. Score maturité global **6,8/10**. Trois mocks IA à transformer en LLM réels (CV Optimizer, justification matching, assistant compta), zéro intégration native (Pennylane, Yousign), zéro pipeline CI : 15-25 jours dev pour passer "beta cohérent" à "vendable sérieusement".

**Pricing : modèle "Pack 20 consultants inclus + prix unitaire au-delà".** Starter 890 €/mois (12 k€/an, +39 €/consultant), Growth 1 690 €/mois (20 k€/an, +29 €/consultant), Enterprise sur devis à partir de 3 500 €/mois (42 k€/an). ARPU moyen ciblé 2 380 €/mois soit 28 k€ ARR/client. 30-40 % moins cher que Boondmanager à scope équivalent.

**Trajectoire commerciale défendable.** Avec un fondateur seul en sales jusqu'à M+7, puis un SDR, on vise **8-13 clients ESN signés à 12 mois pour 200-330 k€ ARR**. À 36 mois, **90 clients pour 2,86 M€ ARR** en scénario réaliste (vs 1,2 M€ pessimiste / 5,8 M€ optimiste). Break-even opérationnel M+22, break-even cash M+26.

**Verdict GO-CONDITIONNEL pour la prospection.** Centrium est mature pour démarrer la prospection en mode "design partner ciblé sur 3-5 ESN françaises 30-80 consultants" à condition d'exécuter un sprint d'industrialisation 30 jours (CI, Sentry, Upstash, restore drill, switch LLM CV Optimizer). Pas prêt pour cycle "cold prospection LinkedIn → démo → signature 8 semaines" sur cible 100+ consultants : il manque le pentest, le SSO, l'intégration Pennylane et le social proof.

**Besoin de financement : 80 k€ bootstrap pour atteindre M+9 puis Seed 750 k€-1 M€ closé M+9 à M+12.** Apport fondateur + prêt d'honneur Initiative France + BPI Création + Bourse French Tech = 110 k€ non dilutif disponibles. Aides cumulées 24 mois (JEI + CIR + CII + BPI) : 150-280 k€ non dilutif. Cap table post-Seed : fondateur 80 % / fonds 17 % / BSA-AIR 3 %.

**Prochain milestone : 3 design partners signés et 1ère facture encaissée à 90 jours.**

**KPIs cibles 12 mois.** 13 clients · MRR 27 k€ · ARR 328 k€ · 3 ETP · Churn < 2 %/mois · CAC blended < 4 200 € · CAC Payback < 3 mois · NPS > 40 · Rule of 40 > -50 %.

**Demande de financement consolidée : 750 k€ Seed equity à closer M+9-M+12 contre 20 % dilution sur valorisation pré-money 3-4 M€, complété par 200 k€ Prêt Innovation BPI (matching equity) et 60-110 k€ d'aides non dilutives.**

---

## Partie I — État du projet et niveau de maturité

### 1. Vue d'ensemble produit

Centrium est une plateforme SaaS B2B verticale pour ESN et cabinets de conseil français de 10 à 200 consultants. Périmètre fonctionnel livré en v1.0 (Q2 2026), audité ligne par ligne dans le repo `quadcore-platform` (341 fichiers TypeScript, 65 pages Next.js, 46 routes API, 142 composants, 63 migrations SQL, 38 tables).

| Module | État | Couverture |
|---|---|---:|
| Bibliothèque consultants + parsing CV IA | Complet | 95 % |
| CV Optimizer (3 templates + édition inline + PDF/DOCX) | Partiel (mock IA) | 70 % |
| Matching IA + extraction AO | Mixte (extraction OK, matching mock) | 50-85 % |
| CRM kanban realtime collaboratif | Complet | 90 % |
| CRA + facturation (auto-création facture sur validation CRA) | Complet (sans Pennylane) | 75 % |
| Dashboard pilotage + alertes | Complet | 85 % |
| Portail consultant (7 surfaces) | Complet | 85 % |
| Console admin per-org (MFA, HIBP, audit, RGPD) | Complet | 90 % |
| Console super-admin (provisioning ESN) | Complet | 80 % |
| Réponses commerciales IA | Complet | 80 % |
| Assistant compta IA | Mock heuristique | 40 % |
| Billing Stripe | Câblé, plans non-actifs | 70 % |

**Positionnement choisi** : OS opérationnel ESN moderne, IA-native, hébergé en Europe, sécurité by default. Catégorie revendiquée : "Staffing OS" (équivalent vertical du "spend management" Spendesk).

### 2. Bilan technique (résumé audit code + sécu + ops)

**Code & architecture (note 7,4/10)** : stack Next 14 + Supabase + TypeScript strict + Tailwind/shadcn cohérente. 18 occurrences d'`any` sur 341 fichiers (très propre), 26/46 routes utilisent zod, 4 services métier isolés. **Trous** : aucun pipeline CI (.github/workflows vide), tests symboliques (5 fichiers dont 3 E2E), god-module `services/index.ts` 1 433 lignes, 168 fichiers `'use client'` (surface client trop large), modèle Anthropic hardcodé sans fallback, dépendances 3D (three.js, gsap) embarquées en B2B.

**Sécurité (note 7,3/10)** : sprint hardening **réel et sérieux** — RLS FORCE sur 38 tables, vue d'audit `_security_rls_audit`, helpers `SECURITY DEFINER`, fence rôle consultant, `security_invoker` views, MFA TOTP, HIBP k-anonymity, password policy NIST, `createAdminClient(reason whitelisté)` sur 51 callsites, audit log typé, login_events, export RGPD self-service, suppression compte différée 30j, VirusTotal hooké, CSP complète, HSTS preload, Trust Center + whitepaper + VDP. **Manques structurels** : 0 pentest, 0 SSO, 0 CI sécurité (npm audit, Dependabot), Sentry SDK pas installé (wrapper HTTP seulement), Upstash potentiellement non activé en prod, tests RLS multi-tenant skipped si seed manquant.

**Ops & infra (note 6,2/10)** : topologie serverless saine (Vercel CDG1 + Supabase EU + Anthropic + Stripe + Resend + Upstash). Marge brute infra > 90 % dès le 1er client. Runbook propre et complet. **Trous opérationnels** : 0 pipeline CI, Sentry pas installé en runtime, restore drill jamais exécuté, status page non publiée, bus factor = 1 (Salim solo), cron Vercel purge RGPD non branché, `.env.example` non splitté dev/prod.

**Décision principale Partie I.2 : la base technique est saine mais la couche opérationnelle n'est pas industrialisée. 10-12 jours de travail concentré (CI, Sentry, Upstash, restore drill, switch LLM) suffisent à passer d'un MVP solo à un produit défendable face à un Security Questionnaire ESN. C'est le sprint pré-prospection obligatoire.**

### 3. Bilan produit (résumé audit produit + vitrine)

**Produit (note 6,5/10)** : 14+ surfaces livrées, parcours BM/recruteur/consultant/admin/super-admin cohérents, CRM polished et realtime, 4 modules IA réels. **3 modules survendus IA mais mockés en code** : `cv-generator.ts` (mock déterministe avec commentaire "remplacer par Claude en V1"), matching (set intersection vendu comme IA, aucune justification générée), `accounting-assistant.ts` (heuristique regex). **Risque démo** : un BM expérimenté qui pousse > 30 min expose le mock.

**Intégrations natives — état zéro** : aucune connexion Pennylane / Sage / Yousign / Gmail / Outlook / LinkedIn. Le pitch "centralise tout le cycle" est partiellement faux puisque l'ESN garde tous ses outils du quotidien (email, comptabilité, signature). Bloquant chez tout DAF/DAF-adjoint.

**Vitrine & brand (note 6,5/10)** : brand identity au niveau série A (Space Grotesk + Instrument Serif + dark mode forcé + animations 3D — niveau Qonto/Linear), Trust Center et `/legal/*` au-dessus du marché ESN, SEO technique 9/10 (robots.ts per-agent inc. ClaudeBot/PerplexityBot, sitemap.ts FR/EN, JsonLd Organization/Breadcrumb/FAQ, llms.txt structuré). **Trous critiques** : 0 logo client, 0 case study publique, 2 témoignages anonymisés seulement, 0 page comparatif vs Boondmanager, 0 page about/équipe, 0 article de blog (zéro SEO contenu), pas de Calendly embed, pas de calculateur prix, formulaire `/devis` long de 12+ champs (friction massive top funnel).

### 4. Score maturité global /10 (par axe)

| Axe | Note /10 | Poids | Contribution | Justification synthétique |
|---|---:|---:|---:|---|
| Code & Architecture | 7,4 | 15 % | 1,11 | Stack moderne, TS strict, 0 CI |
| Sécurité applicative | 7,3 | 25 % | 1,83 | RLS FORCE sérieuse, manque pentest+SSO+CI sécu |
| Produit | 6,5 | 25 % | 1,63 | 14+ surfaces, 3 mocks IA à corriger |
| Ops & Infra | 6,2 | 20 % | 1,24 | Topologie saine, opérationnel non industrialisé |
| Vitrine & Brand | 6,5 | 15 % | 0,98 | Brand A-tier, social proof 3/10 |
| **Global pondéré** | **6,8** | 100 % | **6,79** | Beta crédible commercialement |

**Lecture** : 6,8 = "beta crédible, prêt à prospecter en mode design partner, pas prêt en cycle de vente standard". Équivalent Pennylane 2018, Spendesk 2017, Qonto 2017. Vendable à 2-3 mois de chantier d'industrialisation près.

### 5. Verdict GO/NO-GO pour démarrer la prospection

**Verdict : GO-CONDITIONNEL.** Centrium peut commencer à prospecter **dès maintenant** en mode design partner ciblé sur 3-5 ESN françaises de 25-50 consultants, à condition :

1. D'exécuter le **sprint 30 jours d'industrialisation** AVANT le premier rendez-vous prospect (CI, Sentry, Upstash, cron RGPD, restore drill, switch LLM CV Optimizer, justification IA matching).
2. D'exécuter le **sprint 60 jours commercial** AVANT la première signature (intégration Pennylane minimale, Yousign portail, Stripe câblé, pentest commandé, tests RLS en CI).
3. D'assumer le **statut beta** avec brief commercial honnête au design partner : "assistant comptable IA = roadmap V1.1, on l'allume avec vous quand on le débloque".
4. De **briefer le pitch** pour ne plus survendre les 3 modules IA mockés.

**Pas GO pour** : prospection cold LinkedIn à grande échelle sur ESN > 100 consultants, RFP CAC 40 / banques / défense, ouverture self-serve sans accompagnement.

**Coût d'attente** (perdre 6 mois à peaufiner sans signal marché) > **coût du risque d'image** (signer 1 client qui se plaint d'un mock). La fenêtre de tir est ouverte.

**Décision principale Partie I : GO-CONDITIONNEL prospection mode design partner sur 3-5 ESN cibles 30-80 consultants, après sprint 30 jours d'industrialisation et pendant sprint 60 jours commercial. Aller vite, assumer le statut beta, transparence > survente.**

---

## Partie II — Ce qui manque pour vendre

### 6. Gaps bloquants avant 1er rendez-vous prospect

Top 15 items du sprint d'industrialisation minimal. Sans ces 15 items cochés, ne pas envoyer le premier email cold.

| # | Action | Effort | Pourquoi bloquant |
|---|---|---:|---|
| 1 | Activer en Vercel env Production : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `RESEND_API_KEY`, `VIRUSTOTAL_API_KEY`, `CRON_SECRET` | 0,5 j | Argumentaire sécu cosmétique sans ces vars |
| 2 | Rotation initiale `SUPABASE_SERVICE_ROLE_KEY` + activer Vercel Firewall (WAF) | 0,25 j | Hygiène RSSI minimale |
| 3 | Confirmer région Supabase `eu-central-1` ou `eu-west-3` | 0,25 j | Si US → argumentaire RGPD s'effondre |
| 4 | Brancher CI GitHub Actions (`lint + type-check + vitest + playwright marketing+login + npm audit`) | 1 j | Question RFP n°1 : "do you run automated tests?" |
| 5 | Installer `@sentry/nextjs` réel + source maps Vercel | 0,5 j | Events sécu disparaissent sans SDK |
| 6 | Créer `src/app/api/health/route.ts` + Better Stack monitor + status page publique | 0,5 j | Crédibilise le SLA 99,9 % |
| 7 | Switch CV Optimizer mock → Claude API avec garde-fous "no invention" | 4 j | Pitch CV Optimizer mensonger tant que mock |
| 8 | Justification IA matching (2e pass Claude Haiku, 2 lignes "pourquoi 87 %") | 2 j | Marketing dit "justification IA" mais code n'en a pas |
| 9 | Cron Vercel purge-archives (`vercel.json` 30 min) | 0,25 j | RGPD art. 17 — CNIL flag potentiel |
| 10 | Restore drill #1 documenté + screenshot daté | 0,25 j | Demande SOC 2 / ISO 27001 / RFP |
| 11 | Tourner vidéo produit 90s (Loom scriptée + sous-titres) | 1 j | Pré-qualifie en silencieux |
| 12 | Embed Cal.com / Calendly sur `/devis` et home | 0,25 j | Gain conversion +20-40 % |
| 13 | Page comparatif `/centrium-vs-boondmanager` (tableau parity + différenciateurs) | 1 j | Wedge SEO BOFU + arme commerciale |
| 14 | Page `/about` (photo Salim + manifesto + raison d'être) | 0,25 j | Confiance quand pas de logos |
| 15 | Identifier 10 ESN cibles design partners (Sales Nav + scoring ICP) | 1 j | Pas de prospection sans liste |

**Effort total** : ~13 jours dev concentrés sur 30 jours calendaires. Réalisable par Salim seul. Le reste = prospection cold et briefing produit.

### 7. Gaps bloquants avant 1ère signature

Sprint commercial avant ARR. À itérer pendant la prospection sur les 60 jours suivants.

| # | Action | Effort | Pourquoi bloquant signature |
|---|---|---:|---|
| 1 | 3 design partners signés (gratuit ou -30 %) en échange droit logo + case study | jalon | Aucun cold prospect ne signe avec "0 client" affiché |
| 2 | Intégration Pennylane minimale (push factures payées) | 5-8 j | DAF refuse signature sans connecteur compta |
| 3 | Signature électronique Yousign portail consultant | 4-6 j | "Donc je signe encore par email comme avant ?" |
| 4 | Support PDF dans extraction AO (en plus PNG/JPG) | 2-3 j | 80 % des AO arrivent en PDF |
| 5 | Activer Stripe sur 1 plan câblé bout-en-bout (Checkout + webhook + portal) | 3 j | 1er paiement manuel = signal beta |
| 6 | Pentest externe PASSI commandé (Synacktiv/Wavestone/Almond) | 0,5 j cmd + 6 sem | Aucune ESN > 50 consultants ne signe sans rapport NDA |
| 7 | Tests RLS multi-tenant exécutés en CI avec seed Org A / Org B | 2 j | Transforme promesse marketing en garantie automatisée |
| 8 | CSP nonce-ifiée (sortie `unsafe-inline`/`unsafe-eval`) | 1 j | Pentester compétent va siffler |
| 9 | Calculateur prix slider sur `/pricing` (10→500 consultants) | 1 j | 67 % des acheteurs B2B SaaS abandonnent sans prix |
| 10 | 3-5 articles blog SEO BOFU | 2 j | Démarre l'inbound (latence 12 mois) |
| 11 | Pages `/changelog` et `/roadmap` publiques | 0,5 j | Signal "produit vivant" |
| 12 | Splitter `.env.example` en `.env.development.example` et `.env.production.example` | 0,1 j | Risque copier-coller localhost en prod |
| 13 | CHANGELOG.md + tags Git versionnés (v1.0.0, v1.0.1) | 0,25 j | Hygiène attendue par dev externe |
| 14 | Refondre `services/index.ts` (1 433 L) en 8 services dédiés | 1 j | Maintenabilité avant 2e dev |
| 15 | OPERATIONAL_RUNBOOK_EXTERNAL.md lisible par dev externe | 1 j | Mitigation bus factor |

**Effort total** : ~25-35 jours dev + 6 semaines pentest externe + 30 jours hustle commercial design partners. Réalisable en 60 jours si Salim consacre 100 % de son temps.

### 8. Plan 30 jours (sprint avant prospection)

**Objectif** : être prospect-ready et tenir un Security Questionnaire honnête.

| # | Action | Effort | Owner | Bloque ? |
|---|---|---:|---|:---:|
| S1.1 | CI GitHub Actions (lint+TC+tests+audit) | 1 j | Salim | OUI |
| S1.2 | Activer Upstash + Sentry SDK + Resend prod | 0,5 j | Salim | OUI |
| S1.3 | Confirmer région Supabase EU + Vercel Firewall | 0,5 j | Salim | OUI |
| S1.4 | `/api/health` + Better Stack + status page | 0,5 j | Salim | NON |
| S1.5 | Cron Vercel purge-archives | 0,25 j | Salim | OUI |
| S1.6 | Restore drill #1 documenté | 0,25 j | Salim | OUI |
| S1.7 | Rotation `SUPABASE_SERVICE_ROLE_KEY` | 0,25 j | Salim | OUI |
| S1.8 | Switch CV Optimizer mock → Claude API | 4 j | Salim | OUI |
| S1.9 | Justification IA matching (Haiku 2e pass) | 2 j | Salim | OUI |
| S1.10 | Vidéo produit 90s (Loom) | 1 j | Salim | NON |
| S1.11 | Calendly embed + page `/about` | 0,5 j | Salim | NON |
| S1.12 | Page `/centrium-vs-boondmanager` | 1 j | Salim | NON |
| S1.13 | 3 chiffres assumés en Home (60 migrations, 38 tables RLS) | 0,25 j | Salim | NON |
| S1.14 | Identifier 10 ESN cibles design partners | 1 j | Salim | OUI |
| S1.15 | LinkedIn Insight Tag + Plausible/PostHog | 0,25 j | Salim | NON |
| S1.16 | Sourcer 800 ESN cibles via Société.com + Sales Nav + enrich emails | 2 j | Salim | OUI |
| S1.17 | Construire deck commercial 12 slides + one-pager produit + 6 templates emails cold | 2 j | Salim | OUI |
| S1.18 | Configurer HubSpot Free (pipeline 7 étapes, scoring, dashboards) | 0,5 j | Salim | OUI |
| S1.19 | Activer founder-led content LinkedIn (3 posts/sem) — démarrer dès J+1 | 5h/sem | Salim | NON mais critique |
| S1.20 | Demander 5 warm intros à son réseau | continu | Salim | OUI |

**Total effort dev** : ~13 jours dev sur 30 jours calendaires. Le reste = prospection cold et refresh produit.

### 9. Plan 60 jours (1ère vague prospection)

**Objectif** : signer 2 design partners + brancher Pennylane + commander pentest.

| # | Action | Effort | Owner | Bloque signature ? |
|---|---|---:|---|:---:|
| S2.1 | Commander pentest PASSI (Synacktiv/Almond) | 0,5 j cmd | Salim | OUI |
| S2.2 | Intégration Pennylane push factures | 6 j | Salim | OUI |
| S2.3 | Signature électronique Yousign portail | 5 j | Salim | OUI (50+ consultants) |
| S2.4 | Support PDF extraction AO | 2 j | Salim | NON |
| S2.5 | Activer Stripe Connect plan câblé | 3 j | Salim | OUI |
| S2.6 | Tests RLS multi-tenant en CI avec seed | 2 j | Salim | OUI |
| S2.7 | CSP nonce-ifiée | 1 j | Salim | NON |
| S2.8 | Calculateur prix slider `/pricing` | 1 j | Salim | NON |
| S2.9 | 3 articles blog SEO BOFU | 2 j | Salim | NON |
| S2.10 | Page `/changelog` + `/roadmap` publiques | 0,5 j | Salim | NON |
| S2.11 | Refondre `services/index.ts` en 8 fichiers | 1 j | Salim | NON |
| S2.12 | CHANGELOG.md + tags Git | 0,25 j | Salim | NON |
| S2.13 | Lancer LinkedIn outbound (200 invitations/sem) | continu | Salim | OUI |
| S2.14 | Lancer cold email (200/jour à partir J+45 warmup) | continu | Salim | OUI |
| S2.15 | 8-12 démos tenues + premier feedback produit | continu | Salim | OUI |
| S2.16 | Inscription Capterra FR, G2, Appvizer | 0,5 j | Salim | NON |
| S2.17 | Organiser 1er petit déjeuner Centrium (15 dirigeants ESN) | 1 j | Salim | NON |
| S2.18 | **1-2 lettres d'engagement design partner signées** | jalon | Salim | OUI |
| S2.19 | 2 devis envoyés à J+60 | jalon | Salim | OUI |

**Total effort dev** : ~24 jours dev. Jalon attendu fin sprint : 1-2 lettres d'engagement design partner signées + 2 devis envoyés.

### 10. Plan 90 jours (1ères signatures)

**Objectif** : encaisser le 1er € + livrer pentest + initier SOC 2 + signer SDR.

| # | Action | Effort | Owner | Objectif |
|---|---|---:|---|---|
| S3.1 | Réception rapport pentest + plan remediation | 5 j | Salim | Livrable RSSI |
| S3.2 | Remediation findings critiques pentest | 3-7 j | Salim | Re-test |
| S3.3 | 1ère case study publique chiffrée (design partner) | 2 j | Salim | Social proof |
| S3.4 | **1er paiement encaissé Stripe** (design partner converti ou 2e client) | jalon | Salim | MRR > 0 |
| S3.5 | Lancement procédure SOC 2 Type I (cabinet + Vanta/Drata) | 1 j cmd | Salim | Q1 2027 livrable |
| S3.6 | Recherche co-fondateur tech ou 1er CDI | continu | Salim | Bus factor |
| S3.7 | OPERATIONAL_RUNBOOK_EXTERNAL.md | 1 j | Salim | Bus factor |
| S3.8 | TTL `activities` (purge logs 24 mois) | 0,5 j | Salim | RGPD |
| S3.9 | Connecteur Sage 100c export comptable | 4-6 j | Salim | Élargit ICP |
| S3.10 | Roadmap SSO SAML/OIDC publique | 0,25 j | Salim | Débloque RFP > 100 consultants |
| S3.11 | PWA + saisie CRA mobile-first | 3 j | Salim | UX consultants |
| S3.12 | Storylane / Navattic product tour | 2 j | Salim | Conversion |
| S3.13 | **2e + 3e design partners signés** | jalon | Salim | Pipeline |
| S3.14 | Page intégrations `/integrations` (SEO + crédibilité) | 1 j | Salim | SEO BOFU |
| S3.15 | 2e + 3e + 4e articles blog | 2 j | Salim | SEO inbound |
| S3.16 | **Recrutement 1er SDR validé** (closing fondateur, prospection SDR) | jalon | Salim | Capacité commerciale |
| S3.17 | 1er webinaire produit (audience LinkedIn + base mail) | 1 j | Salim | Lead gen |
| S3.18 | Setup 3 partenariats fiduciaires (10 % commission ACV) | continu | Salim | Canal long terme |

**Jalon final 90 jours** : 1er € encaissé + 3 design partners signés + pentest livré + SOC 2 lancée + 1 case study publique + SDR validé en cours de recrutement.

**Décision principale Partie II : 90 jours, 3 sprints, 1 jalon par sprint (prospect-ready / design partners signés / 1er paiement encaissé). Salim 100 % du temps sur ce plan, 0 distraction, 0 nouvelle feature hors roadmap, 0 refactor non bloquant.**

---

## Partie III — Marché et positionnement

### 11. Vue marché ESN France et Europe

**France** : secteur numérique 65,6 Md€ CA 2024 (Numeum), sous-segment services numériques ~36 Md€ (~55 %). Croissance +3,3 % en 2024, projection +4-6 % 2025-2026. ~3 000 ESN structurées en France (Numeum), dont ~2 700 dans la tranche 10-200 consultants (cœur Centrium). TJM moyen 580 €/j stable (Free-Work). 60 000 postes IT non pourvus (tension recrutement).

**Évolutions structurantes 2025-2026** :
1. Tension recrutement IT → valorisation capital humain → besoin d'outils gestion consultants premium.
2. Montée freelance + portage (1,1 M freelances FR, 40 % tech) → carnet hybride salariés + freelances.
3. IA générative en B2B → standard "IA-native" attendu.
4. NIS2 (oct. 2024) + DORA (janv. 2025) → exigence conformité cyber → avantage Centrium (RLS, MFA, audit).
5. Fin de l'empilement Excel+Notion+DocuSign+QuickBooks → cycle de remplacement actif chez ESN 30-80 consultants.
6. Cohorte Boondmanager 2010-2015 en fin d'amortissement → 300-400 ESN renégocient leur PSA en 2026-2028.

**Europe** : ~25 000 ESN structurées, ~280 Md€ CA agrégé (EITO 2024). Marchés cibles V2 Centrium : Belgique (~250 ESN francophones), Suisse romande (~180), Luxembourg (~80), Espagne (~1 200), Italie (~1 800). Total ~3 500 ESN expansion 2027-2029.

### 12. TAM / SAM / SOM

| Niveau | Périmètre | Méthode | Valeur |
|---|---|---|---:|
| **TAM** | Europe — toutes ESN 10-1 000 consultants | 25 000 ESN × 60 cons moy × 30 €/mois × 12 | **~540 M€ ARR** |
| **SAM** | France — ESN 10-200 consultants | 2 700 ESN × 50 cons moy × 30 €/mois × 12 | **~48 M€ ARR** |
| **SOM 3 ans** | France — captation réaliste 2,8 % SAM | 75 clients × ARPA 18 k€ | **~1,35 M€ ARR** |

**Sanity check top-down** : Boondmanager génère ~30 M€ CA avec 1 500 clients (ARPA ~20 k€). Si Centrium capte 5 % de la part Boondmanager en 3 ans = 75 clients = exactement notre SOM bottom-up.

Marché mondial PSA estimé 17 Md$ en 2025 (MarketsAndMarkets), croissance +12 %/an. Centrium adresse la sous-niche PSA vertical ESN/conseil tech.

### 13. Segmentation et ICP

**4 segments** :
- **Segment A — ESN tech "challenger" 30-80 consultants (PRIORITÉ 1)** : ~600 entités FR, créées 5-15 ans, croissance 15-30 %/an, ARPA cible 25 k€, cycle 2-4 mois, décideur = fondateur ou Head of Ops.
- **Segment B — ESN établies 80-200 consultants (PRIORITÉ 2)** : ~300 entités FR, ARPA cible 60 k€, cycle 4-9 mois, RFP, comité achat.
- **Segment C — Cabinets conseil et MBO 20-60 consultants** : ~400 entités, TJM élevés (700-1 100 €/j), ARPA cible 30 k€.
- **Segment D — Jeunes ESN 10-30 consultants hypercroissance** : ~800 entités, ARPA cible 12 k€, sensibilité prix forte.

**ICP primaire (Segment A)** : ESN française tech, 30-80 consultants, 5-15 ans d'ancienneté, CA 3-12 M€, croissance > 10 %/an, IDF ou top 5 métropole régionale, modèle régie dominant (60-90 %), équipe dirigeante < 45 ans, stack actuelle = Boondmanager vieillissant OU Notion/Excel improvisé, spécialisée data/IA/cloud/cyber/SAP/Salesforce.

**Scoring ICP /100** : > 70 = ICP A (démo 7 jours) | 40-70 = ICP B (nurture 3 mois) | < 40 = pas ICP.

**Anti-portrait** : ESN portage gros volume bas TJM ; CAC 40 (RFP SSO/SOC 2 bloquants) ; cabinet conseil stratégie pur ; < 10 consultants ; > 500 consultants ; filiale grand groupe avec outillage imposé ; redressement judiciaire ; 100 % freelance/portage ; hors zone francophone (V1).

### 14. Personas (4 personas avec JTBD)

**Persona 1 — Camille, Fondateur/CEO d'ESN (décideur final, signataire)**
- 38-48 ans, ancien consultant senior, 60-80 consultants, CA 5-10 M€.
- **JTBD** : "Faire grandir mon ESN sans perdre le contrôle du pilotage opérationnel ni la qualité du delivery."
- Douleurs : intercontrat invisible (pertes 5-10 % CA), dépendance COO, outils vieillissants nuisent à l'image employeur, réponses AO lentes, pression investisseurs.
- KPIs : CA, EBE, taux intercontrat, NPS consultants, % missions gagnées.
- Sourçage : LinkedIn (thought leadership Salim), bouche-à-oreille pairs, Numeum, podcasts tech, "alternative Boondmanager" Google.

**Persona 2 — Sophie, Head of Operations / Directrice staffing (décideur opérationnel)**
- 32-42 ans, 7-15 ans staffing ESN, équipe 3-8 (BM + recruteurs).
- **JTBD** : "Orchestrer le matching consultant ↔ mission sans que ça prenne 50 % de mon temps en saisie."
- Douleurs : saisie redondante CV, pas de vision unifiée dispos × pipeline, CV reformatés 8-15h par mission, communication CRA → DAF par mail, choix subjectifs sans scoring.
- KPIs : time-to-CV, time-to-staff, taux intercontrat, NPS BMs internes.

**Persona 3 — Marc, Business Manager / Responsable commercial (utilisateur quotidien)**
- 28-38 ans, 3-10 ans commercial ESN, portefeuille 8-25 missions actives.
- **JTBD** : "Maximiser mon CA personnel en plaçant mes consultants vite et bien."
- Douleurs : trop d'AO à produire, CV à reformater 6 fois/jour, pipeline CRM Excel obsolète, comm client dispersée, pas de notif consultant dispo.
- KPIs : CA généré, nombre de placements, marge nette par mission, taux conversion AO.

**Persona 4 — Élodie, DAF / Responsable finance (validateur sur prix + sécu/RGPD)**
- 35-55 ans, expert-comptable ou DAF interne, 10+ ans d'expérience.
- **JTBD** : "Des données financières fiables, à jour, exportables en comptabilité, conformes RGPD."
- Douleurs : CRA non validés → retard facturation → BFR dégradé ; export Sage/Pennylane manuel ; docs éparpillés ; RGPD bancal (CV candidats sans base légale) ; pas de visibilité DSO.
- KPIs : DSO, taux erreur facturation, conformité RGPD, coût outillage/consultant.

### 15. Concurrence et différenciation

| Acteur | Modèle | ARR ESN 30 cons | ARR ESN 80 cons | ARR ESN 200 cons | Force | Faiblesse exploitable |
|---|---|---:|---:|---:|---|---|
| **Boondmanager** | Par user, modulaire | 18-25 k€ | 45-65 k€ | 80-130 k€ | Maturité, écosystème, 1 500 clients | UI 2010, pas d'IA, par-user piège ESN qui scale, contrat 36 mois |
| **ConnectWise PSA (US)** | Par user + impl | 22-30 k€ + 15-40 k$ | 50-75 k€ | 100-150 k€ | Couverture US/UK | Pas localisé FR (CRA, IS, TVA, Sage), trop complexe |
| **Akuiteo / Cegid (ERP)** | Licence + impl | 60-100 k€ an 1 | 100-180 k€ an 1 | 150-300 k€ an 1 | Intégration compta native | Implémentation 6-12 mois, ERP rigide, 0 IA |
| **Notion + Excel + DocuSign + QuickBooks** | DIY | 40-70 k€ caché | 70-120 k€ caché | non tenable | Flexible, coût faible apparent | 0,5-1 ETP perdu, pas vertical, RGPD bancal |
| **Dev interne** | Maison | 200 k€+ TCO | 300 k€+ TCO | 500 k€+ TCO | Sur-mesure | Dette technique, dépend d'individus |

**Positionnement Centrium — matrice 2×2** :
- Axe modernité (UX, IA, vitesse) : **Centrium en haut à droite**, seul acteur dans le quadrant "moderne + vertical ESN" en 2026.
- Axe verticalité : Centrium vertical + moderne / Boondmanager vertical + legacy / Akuiteo vertical + ERP rigide / Hubspot horizontal + moderne / Notion+Excel horizontal + flexible.

**Différenciation Centrium en 5 points** :
1. **Tarification par consultant** (vs par user Boondmanager) — l'ESN qui embauche un BM ne voit pas sa facture exploser.
2. **IA native intégrée** (parsing CV, extraction AO, génération email, matching+justification, CV optimizer).
3. **Sécurité by default** — RLS multi-tenant FORCE, MFA TOTP, audit log, Trust Center public — rare à ce stade en early.
4. **UX 2026** (brand niveau Qonto/Linear, dark mode forcé, animations soignées) vs UI 2010 concurrents.
5. **Hébergement EU exclusif** (Vercel CDG1 + Supabase EU) — Trust Center et `/legal/subprocessors` listent nommément les sous-traitants.

### 16. Positionnement choisi en 1 phrase

**"Centrium est l'OS opérationnel des ESN françaises modernes — la salle de pilotage qui remplace Boondmanager, l'empilement Notion+Excel ou Akuiteo. IA native, conformité par défaut, hébergement en Europe."**

Wedge messaging dur (à durcir vs "moderne" mou actuel) : *"Boondmanager prend 4 mois à déployer — Centrium 15 minutes. Et nos tarifs ne grimpent pas quand vous recrutez."*

**Décision principale Partie III : segment prioritaire 12 premiers mois = ESN tech challenger 30-80 consultants, IDF, en cycle de remplacement Boondmanager actif. Environ 250 entreprises ultra-ciblées à attaquer en outbound + LinkedIn + Numeum. ICP scoré > 70 = démo dans 7 jours. Pas de dispersion sur les autres segments avant 10 clients signés.**

---

## Partie IV — Pricing et packaging

### 17. Logique tarifaire choisie : "Pack 20 consultants inclus + €/consultant additionnel"

**Structure** : Pack fondation **20 consultants inclus** dans chaque plan + facturation à partir du **21ᵉ consultant** au prix unitaire mensuel. Utilisateurs admin/BM/recruteurs/dirigeants **illimités** dans tous les plans.

**Pourquoi par consultant et pas par user** :
1. **Alignement valeur** : la valeur Centrium est proportionnelle au nombre de consultants gérés, pas aux utilisateurs admin.
2. **Contre-positionnement Boondmanager** : retourne le piège "par-user" en argument commercial — *"Vous embauchez un BM ? Tant mieux, votre facture Centrium ne bouge pas."*
3. **Prévisibilité CFO** : budget aligné sur plan de recrutement consultants, métrique maîtrisée.
4. **Simplicité discours commercial** : "X €/consultant/mois au-delà de 20" > matrice user × module.

**Pourquoi palier 20 fixe** :
1. **Seuil opérationnel naturel** : en dessous de 20 consultants, Notion+Excel survit ; à 20+, la douleur dépasse la friction.
2. **Psychologique** : prix tout-inclus jusqu'à 20 lisible et engageant.
3. **Acquisition** : capte dès 10 consultants au même tarif d'entrée — cohorte d'investissement qui grossira chez nous.
4. **Coût marginal réel proche de zéro** : sur Supabase + Vercel + Claude, coût marginal d'un consultant supplémentaire < 1,5 €/mois. Le palier 20 ne coûte presque rien à servir.

### 18. Grille tarifaire Starter / Growth / Enterprise (chiffres précis)

> Tous prix HT, engagement 12 mois minimum, facturation annuelle (-10 % automatique sinon mensuelle).

| Plan | Cible | Prix annuel HT | Au-delà de 20 cons | ARPU mensuel typique | ARR typique |
|---|---|---|---|---|---|
| **Starter** | ESN 10-30 consultants | **890 €/mois** (10 680 €/an) | **+39 €/consultant/mois** | 1 050 € | ~13 k€ |
| **Growth** | ESN 30-100 consultants | **1 690 €/mois** (20 280 €/an) | **+29 €/consultant/mois** | 3 200 € | ~38 k€ |
| **Enterprise** | ESN 100+ ou groupes | **À partir de 3 500 €/mois** (42 k€/an) | Dégressif 25/20/15 €/cons | 8 850 € | ~106 k€ |

**Inclus Starter** : bibliothèque consultants + parsing CV IA (500/mois soft cap), CV Optimizer 3 templates, Matching IA + extraction AO (50/mois inclus puis 1 €/match), CRA + facturation, CRM, dashboard, portail consultant, 1 organisation, branding, support email 24h ouvrées, sécurité (RLS, MFA, audit, RGPD).

**Inclus Growth** (en plus de Starter) : parsing CV illimité, matching IA illimité, module AO avancé (PDF + génération réponse pré-formatée), multi-branding, webhooks + API REST, connecteur Pennylane/Sage natif, support prioritaire email+chat 8h, onboarding guidé 2 sessions 90 min, SLA déclaratif 99,5 %.

**Inclus Enterprise** (en plus de Growth) : SSO SAML/OIDC (Azure AD, Okta, Google Workspace), SLA contractuel 99,9 % RTO 4h RPO 1h, Account Manager dédié + QBR trimestrielles, support prioritaire 24/5 (P1 < 2h), multi-organisations, audit logs avancés (export SIEM, 24 mois rétention), DPA renforcée + annexe sécurité signée, intégrations custom (1 connecteur inclus/an), pentest annuel partagé sur demande NDA, sandbox isolée.

### 19. Add-ons monétisables

| Add-on | Modèle | Prix HT | Justification |
|---|---|---|---|
| **Pack Implémentation Standard** | One-shot | **2 500 €** | Onboarding 2 demi-journées, import 200 CV, paramétrage templates, formation BM |
| **Pack Implémentation Premium** | One-shot | **6 500 €** | Tout Standard + audit process, formation dirigeant+finance, CRM custom, 30j hypercare |
| **Migration de données complexe** | One-shot devis | **4 000-15 000 €** | Import Boondmanager / Akuiteo / Excel >500 consultants, mapping custom |
| **Module AO Premium** (Starter only) | Récurrent | **+290 €/mois** | Débloque extraction AO + génération réponse |
| **Module Comptabilité Avancée** | Récurrent | **+390 €/mois** | Assistant compta IA, rapprochement bancaire, OD provision missions |
| **Pack Connecteurs supplémentaires** | Récurrent | **+190 €/mois** par connecteur | Au-delà du 1er inclus Enterprise |
| **Formation continue** | Récurrent | **390 €/trimestre** | 2 sessions/trim nouveautés produit |
| **Workshop CV Optimizer "Studio"** | One-shot | **1 200 €** | Création template CV sur mesure |
| **SLA renforcé 99,95 %** | Récurrent | **+ 8 % du plan** | Réservé Enterprise, RTO 2h |

### 20. Politique commerciale (engagement, remises, indexation)

**Engagement** : minimum 12 mois sur tous les plans (norme SaaS B2B vertical FR).

**Facturation** : annuelle par défaut (-10 %) ou mensuelle (engagement 12 mois maintenu, prélèvement Stripe SEPA).

**Remises** :
- Annuel vs mensuel : -10 % automatique
- Engagement 24 mois : -5 % supplémentaire (cumul -15 %, gel prix garanti)
- Engagement 36 mois : -10 % supplémentaire (cumul -20 %, gel prix garanti)
- Volume > 100 consultants : dégressivité auto (paliers Enterprise)
- **Programme "Pionnier" 5 premiers clients 2026** : **-30 % à vie** contre témoignage écrit + droit case study + référence appelable

**Discount max autorisé** (hors Pionnier) : 15 % sur abonnement annuel, uniquement contre engagement 24 mois OU paiement annuel cash. Plafond cumulé : -30 % vs grille publique. Pas de discount > 15 % sans validation fondateur.

**Période d'essai/POC** :
- **Essai gratuit 14 jours** : sandbox + données démo + 5 CV réels, sans CB. Conversion attendue 20-30 %.
- **POC payant 60 jours** (mid-market) : 2 500 € HT déductibles de l'abonnement annuel si signature 30j post-POC. Périmètre cadré 1 cas d'usage, critères mesurables.

**Résiliation / réversibilité** : préavis 60 jours avant échéance ; export RGPD self-service ; suppression définitive 30j post-résiliation ; aucune pénalité de sortie au terme.

**Indexation** : plafonnée +5 %/an ou indice Syntec (le plus élevé), applicable au renouvellement. Clause gel pour engagements 24/36 mois.

### 21. Simulation profils ESN (15 / 30 / 50 / 100 / 200 consultants)

| Profil ESN | Plan | Mensuel HT | Annuel HT | Effective €/cons/mois | Vs Boondmanager |
|---|---|---|---|---|---|
| 15 consultants | Starter | 890 € | **10 680 €** | 59 € | n/a |
| 20 consultants | Starter | 890 € | **10 680 €** | 45 € | n/a |
| 30 consultants | Starter | 890 + 10×39 = **1 280 €** | **15 360 €** | 43 € | **-31 % vs 22 k€ Boond** |
| 30 consultants (option Growth) | Growth | 1 690 € | **20 280 €** | 56 € (inc. AO + connecteurs) | -8 % |
| 50 consultants | Growth | 1 690 + 30×29 = **2 560 €** | **30 720 €** | 51 € | **-32 % vs 45 k€ Boond** |
| 80 consultants | Growth | 1 690 + 60×29 = **3 430 €** | **41 160 €** | 43 € | **-32 % vs 60 k€ Boond** |
| 100 consultants | Growth ou Enterprise | 1 690 + 80×29 = **4 010 €** | **48 120 €** | 40 € | **-29 % vs 68 k€ Boond** |
| 150 consultants | Enterprise | 3 500 + 80×25 + 50×20 = **6 500 €** | **78 000 €** | 43 € | **-22 % vs 100 k€ Boond** |
| 200 consultants | Enterprise | 3 500 + 80×25 + 100×20 = **7 500 €** | **90 000 €** | 38 € | **-18 % vs 110 k€ Boond** |

**Lecture** : effective €/consultant/mois converge vers **38-45 €** sur la cible cœur, soit **30-40 % moins cher que Boondmanager équivalent**. ARR moyen ciblé 15-50 k€ sur 80 % des clients, 70-100 k€ sur Enterprise. ARPU mix portefeuille cible : **2 380 €/mois** = **28 600 €/an**.

### 22. Affichage sur le site recommandé

**Recommandation forte** : passer du "100 % sur devis" actuel à un affichage **transparent Starter + Growth + Enterprise**, garder "sur devis" sur Enterprise uniquement.

**Pourquoi** :
- **Transparence = confiance**. 67 % des acheteurs B2B SaaS abandonnent un site sans prix (Gartner 2024).
- **Différenciation Boondmanager** (qui n'affiche pas son prix, irritant marché connu) — Centrium en fait un argument.
- **Qualification leads** : prospect qui voit le prix et demande une démo = qualifié budget.

**Maquette `/pricing` recommandée** :

```
STARTER          GROWTH           ENTERPRISE
À partir de      À partir de      Sur devis
890 €/mois HT    1 690 €/mois HT  À partir de 3 500 €/mois HT
20 consultants   20 consultants   Volumes 100+
inclus           inclus           SSO, SLA, AM dédié
+39 €/consultant +29 €/consultant Tarifs dégressifs
au-delà          au-delà
```

Mention : *"Engagement 12 mois minimum. Facturation annuelle (-10 %). Démo personnalisée gratuite. Programme Pionnier 5 places — -30 % à vie."*

**Composants à ajouter** : tableau comparatif features (15 lignes max), simulateur "Combien ça me coûte ?" (slider 10→500 consultants × plan → ARR calculé temps réel), FAQ pricing (12 questions), CTAs "Réserver une démo 30 min" + "Démarrer mon essai 14 jours".

**Décision principale Partie IV : modèle pricing "Pack 20 inclus + €/cons au-delà" validé. Starter 890 €/mois — Growth 1 690 €/mois — Enterprise à partir de 3 500 €/mois. Programme Pionnier -30 % à vie pour 5 premiers clients 2026. Afficher Starter + Growth publiquement sur `/pricing` avec calculateur slider. Ne jamais brader Starter sous 690 €/mois (risque positionnement TPE incompatible avec promesse enterprise-ready).**

---

## Partie V — Go-to-Market

### 23. Stratégie GTM : Hybrid SLG + content marketing

**Choix : Sales-Led Growth (SLG) dominant, avec couche product-led trial limitée en année 2.**

**Pourquoi SLG et pas PLG sur ce marché** :
1. **Décideur unique très occupé** (dirigeant / Head of Ops / BM senior) — il ne va pas s'inscrire seul, tester 3 semaines, importer 80 CV, migrer sa facturation.
2. **Migration douloureuse** : sortir de Boondmanager / Akuiteo / Notion+Excel demande un accompagnement humain (export, mapping, formation).
3. **ACV élevée (10-60 k€/an)** : le ticket justifie largement un cycle commercial humain. À 25 k€ ACV, un SDR + un AE sont rentables dès le 5ᵉ client signé.
4. **Marché petit (~3 000 ESN cibles)** : on ne va pas faire 10 000 inscriptions/mois. On vise 30 démos qualifiées/mois.

**Couche product-led conservée** :
- **Démo libre-service guidée** (sandbox 5 consultants fictifs) accessible sans rdv.
- **POC 14 jours offert** post-démo : vrai accès tenant isolé, 5 utilisateurs, 20 consultants importés. Déclencheur de signature.

**Cycle de vente attendu** : 2-4 mois ESN 10-50 cons / 4-6 mois ESN 50-200 cons. Pics signature septembre-décembre (budget N+1) et mars-avril (lancement exercice). Creux juillet-août + 15 déc-15 janv.

### 24. Canaux d'acquisition prioritaires (top 5 avec CAC estimé)

| Rang | Canal | Démarrage | CAC estimé | Volume attendu | Conv. lead→client |
|---:|---|---|---:|---|---:|
| **1** | **LinkedIn outbound** (Sales Nav + Lemlist) | Semaine 1 | 800-1 500 € | 200 invitations/sem → 12-20 démos/mois | ~0,23 % |
| **2** | **Founder-led content LinkedIn** (Salim) | Semaine 1 | quasi 0 € | 3 posts/sem → 5-10 leads/mois dès J+60 | ~25 % démo→client |
| **3** | **Cold email outbound** (cadence 6 touches) | Semaine 3 | 1 000-2 000 € | 1 500 emails/mois → 8-12 démos/mois | ~0,12 % |
| **4** | **SEO / Inbound** (blog Centrium) | Mois 3 | 80 € (amorti) | 2k visites mois 6 → 8k mois 12 → 15-60 démos/mois | ~0,8 % visite→démo |
| **5** | **Événements pro** (Numeum + petits déj self-hosted) | Mois 5 | 250 €/lead | 30 contacts/event → 5-8 démos/event | ~20-25 % démo→client |

**Canaux 6-7 (mois 6+)** : GEO / AI Overviews (Capterra FR, G2, Appvizer, schema markup answer-engine ready) + Partenariats (cabinets comptables 10 % commission ACV ; Sage/Pennylane reseller ; Malt Pro/Comet).

**Tunnel régime établi (90 jours)** : 80-120 leads bruts → 30-35 MQL → 18-22 SQL → 12-16 démos qualifiées. Lead → Client : ~1,4 % blended, 1 client tous les 70-80 leads bruts.

### 25. Content marketing 90 jours (lead magnets + calendrier éditorial)

**Cadence éditoriale** :
| Canal | Cadence | Format | Objectif |
|---|---|---|---|
| LinkedIn fondateur | 3 posts/sem | Post natif + 1 carrousel/sem | Notoriété + leads chauds |
| Blog Centrium | 2 articles/mois | Long form 1 500-2 500 mots | SEO + nurturing |
| Newsletter "Le Pilotage ESN" | 1/mois | 400 mots, 3 sections | Rétention + autorité |
| Whitepaper | 1/trimestre | PDF 15-25 pages gated | Lead magnet + RP |
| Webinaire | 1/mois (dès mois 4) | 30 min + Q&A | Demo collective + leads |
| Étude de cas client | 1/trimestre (dès mois 6) | Vidéo + écrit | Preuve sociale |

**Top 20 idées contenu 90 premiers jours** :
- **LinkedIn (founder-led)** : Pourquoi je quitte la consultance pour bâtir Centrium / Intercontrat à 18 % vous coûte X k€ / Boondmanager 2010 vs 2026 / Réduction délai CV de 4h à 8 min / KPI prédictif marge à 6 mois / 5 questions à poser à votre BM en revue mensuelle / Ce que j'ai appris en parlant à 40 dirigeants ESN.
- **Blog SEO** : Logiciel ESN guide d'achat 2026 / Alternative Boondmanager 6 solutions comparées / Calculer et réduire taux intercontrat / Méthode AO ESN qui closent à 30 % / Template CV consultant qui convertit / 6 erreurs CRA qui coûtent du cash / Facturation ESN : Sage, Pennylane ou outil métier.
- **Lead magnets** : Whitepaper "État du staffing ESN 2026 — 250 dirigeants interrogés" / ROI Calculator interactif (input nb consultants × intercontrat × TJM → € économisés) / Template Excel "Tableau de bord ESN simplifié" / Checklist PDF "12 points contrôle avant signature logiciel ESN" / Modèle Word "Cahier des charges logiciel ESN" / Mini-guide "Migrer de Boondmanager sans perdre un jour".

**Top 10 mots-clés SEO à attaquer** : logiciel ESN / logiciel gestion consultants / alternative Boondmanager / CRM ESN / logiciel staffing / outil CRA consultants / logiciel facturation ESN / gestion intercontrat ESN / CV optimizer IA consultants / réponse appel d'offres ESN.

### 26. Cycle de vente B2B ESN (8 étapes)

1. **Génération du lead** — source taggée dans le CRM dès l'entrée. Refus < 8 consultants.
2. **Qualification BANT adapté** — Budget seuil 8 k€/an, Authority décideur dans call#1 ou #2, Need parmi les 5 douleurs classiques, Timing < 90 jours. 3/4 = SQL, 4/4 = Hot SQL.
3. **Découverte 15 min** — 5 questions clés (cf. §27).
4. **Démo 30 min** — script imposé (cf. §27).
5. **Devis chiffré sous 48h** — PDF 4 pages : récap besoin, périmètre, prix décomposé, conditions, planning onboarding. Email + lien relance Calendly J+5.
6. **Négociation** — discount max 15 % sur abonnement annuel contre engagement 24 mois OU paiement annuel avance ; setup offert si engagement 24 mois ; 1 mois offert max pour signer sous 7 jours.
7. **Signature** — contrat 8 pages (SaaS + DPA RGPD + annexe sécu /trust). Yousign ou Dropbox Sign. Délai signature → onboarding : 5 jours ouvrés.
8. **Onboarding J0 → J30** — J0 kick-off 60 min ; J1-J7 import CV + branding + formation admin 90 min ; J8-J14 formation BM 60 min + formation consultants self-service vidéos ; J15-J21 1er CRA + 1ère facture réel ; J22-J30 revue d'usage. **Objectif J30 : 80 % users actifs, 1er CRA + 1ère facture émis depuis Centrium.**

### 27. Script DÉMO 30 minutes (intégral)

**Intro — 3 min**
> "Bonjour [prénom], merci d'être là. Pour la prochaine demi-heure, format proposé : 5 min de cadrage pour bien comprendre votre contexte, 15 min de démo orientée sur vos priorités à vous, 5 min sur le pricing et la suite, 5 min pour vos questions. Ça vous va ?
>
> En deux mots : moi c'est Salim, fondateur de Centrium. J'ai passé 8 ans dans des ESN, et j'ai bâti Centrium parce que je n'ai jamais trouvé un outil qui fasse vivre ensemble la bibliothèque consultants, le CV, le matching mission, la facturation et le pilotage. Aujourd'hui on accompagne des ESN françaises de 10 à 200 consultants. Vous êtes [nb] chez [nom ESN], c'est bien ça ?"

**Découverte — 5 min**
Reposer les questions BANT non couvertes au call de qualif, et surtout :
> *"Si je vous demande aujourd'hui combien vous avez de consultants en intercontrat, vous pouvez me répondre tout de suite ou il faut que vous regardiez quelque part ?"*

C'est la question qui ouvre 80 % des deals. Si le prospect doit chercher dans 3 fichiers, le deal est presque fait.

**Démo guidée — 15 min** (ne pas faire un tour produit exhaustif — storytellée autour de 3 douleurs) :
1. **Douleur "le CV qui prend 4h"** (3 min) — parsing IA d'un CV PDF + édition inline template QuadCore + PDF en 2 clics. Punchline : *"On fait passer ça de 4h à 8 min."*
2. **Douleur "je ne vois pas mon pipeline"** (3 min) — dashboard pilotage, KPI consultants actifs/dispo/intercontrat %, CRM kanban, alertes IA. Punchline : *"Vous savez en 10 secondes qui est dispo dans 15 jours."*
3. **Douleur "le CRA et la facture, c'est l'enfer"** (3 min) — CRA consultant, validation BM, facture PDF branding, export Sage/Pennylane. Punchline : *"10 jours gagnés par mois en back-office."*
4. **Sécurité et confiance** (2 min) — passage rapide /trust, RLS multi-tenant, RGPD, MFA, audit log. Pas plus, sauf DSI en face.
5. **Cas client court** (4 min) — *"Voilà comment l'ESN X (anonymisée) a vu son taux d'intercontrat passer de 19 % à 13 % en 4 mois."*

**Pricing — 3 min**
Annoncer les 3 plans + mode de calcul (prix unitaire par consultant, palier 20). Ne pas négocier en live. *"Je vous envoie un devis chiffré sous 48h avec la simulation pour votre volume."*

**Closing — 4 min**
> "Trois questions :
> 1. Sur ce que je vous ai montré, qu'est-ce qui vous parle le plus ?
> 2. Y a-t-il un blocker que je n'ai pas adressé ?
> 3. Si on partait sur un POC 14 jours, votre démarrage cible serait pour quand ?"
>
> *"Voilà ce que je vous propose : devis chiffré dans votre boîte vendredi avant midi, POC ouvert mardi prochain si vous le souhaitez, sans engagement. Ça vous convient ?"*

**Q&A libre** — toujours finir par une prochaine étape datée dans le calendrier.

### 28. Top 10 objections et réponses

1. **"C'est cher."** → *"À 18 % d'intercontrat sur 50 consultants à 500 € TJM, vous perdez ~450 k€/an. Centrium à 24 k€/an se rembourse si on fait baisser l'intercontrat d'un seul point. Je vous chiffre votre ROI précis dans le devis."*
2. **"On a déjà Boondmanager."** → *"Boondmanager est excellent en gestion. Centrium apporte plus sur l'IA (CV, matching, AO) et le pilotage temps réel. Beaucoup gardent Boondmanager 6 mois en parallèle puis arbitrent. On offre la migration."*
3. **"Mes données sont-elles en sécurité ?"** → *"Trust center public sur centrium-platform.com/trust : Vercel + Supabase EU, RLS multi-tenant, MFA TOTP, audit log, chiffrement at-rest/in-transit, DPA RGPD. On vous envoie le whitepaper si vous voulez le partager à votre DSI."*
4. **"L'IA peut halluciner sur mes CV."** → *"Centrium n'invente rien. Le moteur reformule, réorganise, densifie — jamais d'expérience, date, compétence fabriquées. Chaque sortie passe par une validation humaine. Je peux vous montrer un exemple en live."*
5. **"On va attendre que vous ayez plus de clients."** → *"Justement, les early adopters bénéficient d'un pricing préférentiel verrouillé 24 mois et d'un accès direct à l'équipe produit. Dans 6 mois on n'a plus ces conditions. POC 14 jours sans engagement, vous vous faites votre opinion."*
6. **"Et si vous fermez la boîte ?"** → *"Trois protections : 1) clause réversibilité — export complet JSON+CSV à tout moment ; 2) clause d'escrow code source ; 3) finances transparentes — on peut vous montrer le runway."*
7. **"On est trop petits, 12 consultants."** → *"Notre palier facturation démarre à 20. Vous payez 20 même si vous en avez 12. Si vous prévoyez de grossir dans 12 mois, c'est rentable dès maintenant. Sinon on se reparle à 18 consultants."*
8. **"On a besoin d'intégration Sage / Pennylane."** → *"Exports livrés. Intégration native API Pennylane prévue T3 2026. On peut prioriser pour vous si vous signez maintenant."*
9. **"Vous n'avez pas de case study publique."** → *"v1.0 lancée Q2 2026. On peut organiser un appel de référence sous NDA avec un de nos design partners."*
10. **"On reparle en septembre."** → *"Septembre = rentrée = vous serez débordé. Bloquons 30 min maintenant pour septembre et lançons un POC en août. Sinon le projet glisse à janvier."*

(Voir également top 15 objections détaillé dans `commercial/03-GO-TO-MARKET.md` §6.)

### 29. Outils commerciaux nécessaires

| Catégorie | Outil retenu | Coût mensuel | Justification |
|---|---|---|---|
| CRM | HubSpot Sales Pro | 90 €/user | Pipeline + séquences + reporting + intégration site |
| Sales Nav LinkedIn | Sales Navigator Core | 80 € | Recherche cible + InMails |
| Outbound mail | Lemlist + MailReach | 100 € + 90 € | Deliverability + warmup + automation |
| Enrichissement | Dropcontact + Kaspr | 150 € | Emails B2B France RGPD |
| Scheduling | Calendly Team | 12 €/user | Réservation démos |
| Signature électronique | Yousign | 25 €/user | RGPD FR juridiquement opposable |
| Visio + enregistrement | Loom + Google Meet | 8 € + Google | Démos asynchrones |
| Devis / propal | PandaDoc ou Dropbox Sign | 30 €/user | Tracking ouverture devis |
| Doc commerciale | Notion (interne) | 8 €/user | Battle cards + playbooks |
| Analytics LinkedIn | Shield ou Taplio | 30-80 € | Mesure founder-led content |

Budget outils commercial total : **~600 €/mois en démarrage** (1 fondateur + 1 SDR), évolutif à **~1 800 €/mois à 4 commerciaux**.

### 30. KPIs commerciaux à tracker

| KPI | Cible mois 6 | Cible mois 12 | Cible mois 24 |
|---|---|---|---|
| MQL/mois | 30 | 50 | 120 |
| SQL/mois | 18 | 30 | 75 |
| Démos planifiées/mois | 12 | 22 | 50 |
| Démos réalisées/mois (no-show < 15 %) | 10 | 18 | 42 |
| Devis envoyés/mois | 6 | 12 | 28 |
| Taux Lead→Démo | 8 % | 9 % | 12 % |
| Taux Démo→Devis | 50 % | 60 % | 65 % |
| Taux Devis→Signature | 25 % | 30 % | 35 % |
| CAC blended | 6 k€ | 4,2 k€ | 5,8 k€ |
| ACV moyen | 18 k€ | 22-28 k€ | 28-32 k€ |
| LTV/CAC | n/a | 32× | 31× |
| Churn brut annuel | n/a | 16 % | 13 % |
| Sales velocity (€/jour) | indicateur | indicateur | boussole |

Reporting hebdo en commercial review (vendredi 9h), reporting mensuel en board.

**Décision principale Partie V : Sales-Led Growth dominant, founder-led content + LinkedIn outbound + cold email dès semaine 1, SEO + AI Overviews + événements à partir du mois 3-5, partenariats mois 6+. Cycle de vente 2-4 mois cible 30-80 consultants. Objectif réaliste : 8-13 clients signés à 12 mois = ARR 200-330 k€.**

---

## Partie VI — Modèle financier

### 31. Hypothèses de base

| Hypothèse | Valeur |
|---|---|
| ARPU pondéré moyen (mix 60/30/10 Starter/Growth/Enterprise) | **2 380 €/mois** soit **28 600 €/an** |
| Marge brute SaaS | **87 %** (COGS ~310 €/client/mois dont 95 € Anthropic, 22 € Supabase, 33 € Stripe, 130 € support N1) |
| Churn logo mensuel cible | 1,5 % an 1 → 1,2 % an 2 → 0,8 % an 3 |
| Churn logo annuel cible | 16,6 % an 1 → 13,5 % an 2 → 9,2 % an 3 |
| NRR cible | 95 % an 1 → 105 % an 2 → 115 % an 3 |
| GRR cible | 86 % an 1 → 89 % an 2 → 93 % an 3 |
| Taux conversion lead→client pondéré | 7-9 % en mix réaliste |
| Cycle vente moyen | 90 jours |
| CAC blended | 1 500 € mois 1-6 → 4 200 € mois 7-18 → 5 800 € mois 19+ |
| LTV | 135 k€ an 1 → 180 k€ an 2 → 253 k€ an 3 |
| CAC Payback | 2,1 mois → 2,9 mois → 2,7 mois |

### 32. Projection MRR/ARR sur 36 mois (3 scénarios)

**Scénario réaliste (trimestriel)** :

| Trim | Mois | Nouveaux | Churn | Clients cumul | ARPU € | MRR € | ARR € |
|---|---|---:|---:|---:|---:|---:|---:|
| T1 | M+1-3 | 2 | 0 | 2 | 1 800 | 3 600 | 43 200 |
| T2 | M+4-6 | 3 | 0 | 5 | 1 900 | 9 500 | 114 000 |
| T3 | M+7-9 | 4 | 0 | 9 | 2 000 | 18 000 | 216 000 |
| T4 | M+10-12 | 5 | 1 | 13 | 2 100 | 27 300 | **327 600** |
| T5 | M+13-15 | 6 | 1 | 18 | 2 200 | 39 600 | 475 200 |
| T6 | M+16-18 | 7 | 1 | 24 | 2 300 | 55 200 | 662 400 |
| T7 | M+19-21 | 9 | 2 | 31 | 2 380 | 73 780 | 885 360 |
| T8 | M+22-24 | 11 | 2 | 40 | 2 450 | 98 000 | **1 176 000** |
| T9 | M+25-27 | 13 | 3 | 50 | 2 500 | 125 000 | 1 500 000 |
| T10 | M+28-30 | 15 | 3 | 62 | 2 550 | 158 100 | 1 897 200 |
| T11 | M+31-33 | 17 | 4 | 75 | 2 600 | 195 000 | 2 340 000 |
| T12 | M+34-36 | 19 | 4 | 90 | 2 650 | 238 500 | **2 862 000** |

**Synthèse 3 scénarios (ARR fin de période)** :

| Échéance | Pessimiste | Réaliste | Optimiste |
|---|---:|---:|---:|
| Fin An 1 (M+12) | 151 k€ (7 clients) | **328 k€ (13)** | 600 k€ (20) |
| Fin An 2 (M+24) | 389 k€ (18) | **1 176 k€ (40)** | 2 136 k€ (65) |
| Fin An 3 (M+36) | 864 k€ (40) | **2 862 k€ (90)** | 5 760 k€ (160) |

**Variables qui font basculer le modèle** :
1. **Churn an 1** : passer 16 % → 25 % = perte 35 % de l'ARR fin an 3.
2. **ARPU** : passer 2 380 € → 1 800 € = perte 24 % de l'ARR fin an 3.
3. **CAC** : passer 4 200 € → 7 500 € = +650 k€ de besoin cash cumulé 36 mois.

### 33. Coûts mensuels par phase

| Catégorie | M+0 | M+6 | M+12 | M+24 | M+36 |
|---|---:|---:|---:|---:|---:|
| Infrastructure / COGS | 310 € | 910 € | 2 430 € | 7 172 € | 16 210 € |
| Salaires bruts chargés | 6 800 € | 7 300 € | 20 950 € | 61 911 € | 84 160 € |
| Marketing & commercial | 215 € | 2 735 € | 8 310 € | 17 520 € | 28 100 € |
| Outils SaaS internes | 62 € | 159 € | 435 € | 1 030 € | 1 895 € |
| Frais généraux | 1 200 € | 2 440 € | 6 606 € | 17 791 € | 29 764 € |
| **TOTAL OPEX MENSUEL** | **8 587 €** | **13 544 €** | **38 731 €** | **105 424 €** | **160 129 €** |
| **TOTAL ANNUALISÉ (×12)** | 103 k€ | 163 k€ | **465 k€** | **1 265 k€** | **1 921 k€** |

**Roadmap embauches** : Fondateur seul → Sales SDR (M+7, 6 400 €) → Dev fullstack senior (M+10, 7 250 €) → Head of Sales (M+12, 12 687 €) → CSM + Sales AE n°1 (M+15) → Dev junior (M+18) → Marketing/Growth (M+22) → Sales AE n°2 (M+30) → CSM n°2 (M+32) → Dev senior n°2 (M+34).

### 34. Burn rate et runway

| Phase | Période | MRR moy | OPEX moy | Burn net mensuel |
|---|---|---:|---:|---:|
| Phase 0 — Bootstrap | M+1-6 | 6 500 € | 11 000 € | **-4 500 €** |
| Phase 1 — Premier sales | M+7-12 | 22 000 € | 30 000 € | **-8 000 €** |
| Phase 2 — Structuration | M+13-24 | 65 000 € | 75 000 € | **-10 000 €** |
| Phase 3 — Scale | M+25-36 | 175 000 € | 135 000 € | **+40 000 €** |

**Runway sans levée** (cash départ 80 k€) : s'épuise vers **M+13-M+15**. Fenêtre de levée à ouvrir dès **M+6-M+9** pour closing avant M+12.

**Runway avec Seed 750 k€ closé M+9** : **>36 mois**, break-even cash atteint vers **M+24-M+26**.

### 35. Break-even cible

| Indicateur | Mois cible | Conditions |
|---|---|---|
| Break-even opérationnel (MRR > OPEX hors invest.) | **M+22** | NRR ≥ 95 %, churn cible respecté |
| Break-even cash mensuel | **M+26** | Décalage encaissement 45j |
| EBITDA positif récurrent | **M+28** | Marge EBITDA ~5-10 % |
| EBITDA marge 20 % | **M+36** | Maturité commerciale |

**Trajectoire rentabilité (scénario réaliste)** :

| Indicateur | Année 1 | Année 2 | Année 3 |
|---|---:|---:|---:|
| Revenu reconnu | 195 k€ | 770 k€ | 2 100 k€ |
| Marge brute | 174 k€ (89 %) | 695 k€ (90 %) | 1 905 k€ (91 %) |
| OPEX hors COGS | 410 k€ | 1 190 k€ | 1 730 k€ |
| **EBITDA** | **-236 k€** | **-495 k€** | **+175 k€** |
| Rule of 40 | -50 % | +85 % | +160 % |

### 36. Besoins de financement (bootstrap vs levée Seed)

**Cash maximum à mobiliser** : **~410 k€** (point bas M+26), couvert largement par Seed 750 k€ + aides 150-280 k€.

**Plan de financement consolidé 24 premiers mois** :

| Source | Montant | Timing | Dilution |
|---|---:|---|---:|
| Apport fondateur | 30 k€ | M+0 | 0 % |
| Prêt d'honneur Initiative France | 25 k€ | M+1 | 0 % |
| BPI Création (prêt taux 0 %) | 25 k€ | M+2 | 0 % |
| Bourse French Tech | 30 k€ | M+5 | 0 % |
| CIR an 1 (remboursement) | 50 k€ | M+15 | 0 % |
| JEI (économie charges sur 24 mois) | 60 k€ | étalé | 0 % |
| **Levée Seed equity** | **750 k€** | M+9 | **20 %** |
| Prêt Innovation BPI (matching) | 200 k€ | M+11 | 0 % |
| **TOTAL** | **~1 170 k€** | — | **20 %** |

**Levée Seed cible** : 750 k€ - 1 M€ à valorisation pré-money **3-4 M€** (10-12× ARR projeté an 1, multiple SaaS B2B vertical seed FR 2025). Comparables : Whoz Seed 2,5 M€ à 12 M€ pré (vertical ESN proche), Pennylane Seed 1,2 M€ à 6 M€ pré, Spendesk Seed 1,5 M€ à 7 M€ pré. **Cap table post-Seed** : fondateur 80 % / fonds lead 17 % / BSA-AIR business angels 3 %. **Pool BSPCE à constituer post-Seed** : 10 % dilutif pour recrutements.

### 37. Subventions disponibles (Bpifrance, JEI, CIR, French Tech Tremplin)

| Dispositif | Montant cible | Conditions | Délai |
|---|---|---|---|
| **JEI** (Jeune Entreprise Innovante) | Exonération charges patronales R&D = ~25-35 k€/an | Statut JEI, R&D > 15 % charges | 3 mois |
| **CIR** (Crédit Impôt Recherche) | 30 % dépenses R&D éligibles = 40-80 k€/an | Activité R&D documentée | Remboursement N+1 |
| **CII** (Crédit Impôt Innovation) | 20 % dépenses innovation plafonné = 16 k€ max | PME, dépenses innovation | N+1 |
| **BPI Prêt Innovation FEI** | 50-300 k€ taux 0 % | Avoir levé en equity (matching 1:1) | 3-6 mois post-levée |
| **BPI Bourse French Tech** | 30 k€ subvention | Projet innovant, jeune entreprise | 4-6 mois |
| **French Tech Tremplin** | 30 k€ + accompagnement | Fondateurs sous-représentés | 6 mois |
| **Pass French Tech** | Accès facilité + lobbying | Croissance >100 %/an | Sur dossier |
| **FEI Région IDF** | 50-200 k€ subvention/avance | Innovation + emploi local | 4-8 mois |

**Total aides cumulées 24 mois** : **150-280 k€ non dilutif**. Réduit mécaniquement le besoin de levée de 20-30 %.

### 38. Métriques SaaS clés à atteindre par milestone

| Métrique | M+12 | M+24 | M+36 | Benchmark top-tier |
|---|---:|---:|---:|---|
| MRR | 27 300 € | 98 000 € | 238 500 € | — |
| ARR | 328 k€ | 1 176 k€ | 2 862 k€ | — |
| Croissance ARR YoY | n/a | +259 % | +143 % | T2D3 |
| NRR | 95 % | 105 % | 115 % | >110 % top quartile |
| GRR | 86 % | 89 % | 93 % | >90 % excellent |
| Churn logo mensuel | 1,5 % | 1,2 % | 0,8 % | <1 % top |
| CAC blended | 4 200 € | 5 800 € | 5 800 € | — |
| CAC Payback | 2,1 mois | 2,9 mois | 2,7 mois | <12 mois bon |
| LTV/CAC | 32× | 31× | 43× | >3× minimum |
| Magic Number | 1,2 | 1,5 | 1,8 | >0,75 bon, >1 excellent |
| Rule of 40 | -50 % | +85 % | +160 % | >40 % = SaaS sain |
| Burn Multiple | 1,5× | 0,3× | 0× | <1× excellent |
| ARR / Employé | 109 k€ | 168 k€ | 220 k€ | >200 k€ top quartile |

**Décision principale Partie VI : bootstrap 80 k€ jusqu'à M+9, puis levée Seed 750 k€ à 3-4 M€ pré-money pour 20 % dilution, complétée par Prêt Innovation BPI 200 k€ et 150-280 k€ d'aides non dilutives. Cash maximum à mobiliser 410 k€ (point bas M+26). Break-even opérationnel M+22, break-even cash M+26, EBITDA positif récurrent M+28.**

---

## Partie VII — Équipe et organisation

### 39. Équipe actuelle (Salim fondateur)

- **Salim El Rharbi**, fondateur QuadCore SAS, CEO + CTO + first sales + first marketing + first support.
- Expérience : 8 ans en ESN avant Centrium (cf. pitch démo). Build a livré seul une plateforme de 341 fichiers TS, 63 migrations SQL, 38 tables RLS, 14+ surfaces fonctionnelles, brand identity premium.
- **Bus factor = 1**. Premier vrai risque opérationnel structurel. À mitiger via runbook externalisable et premier recrutement.

### 40. Première embauche prioritaire (Sales ? Customer Success ? Dev ?)

**Recommandation : Sales SDR au mois M+7**, pas dev, pas CSM.

**Pourquoi SDR avant dev** :
- Le produit tient pour 5-10 clients sans nouveau dev (audit code 7,4/10).
- Le verrou de croissance n'est PAS le produit, c'est le pipeline commercial.
- Salim est à 100 % sur sales + produit + ops — un SDR le décharge de la prospection top-funnel (200 invitations/sem + cold email), Salim garde la démo et le closing.
- ROI mesurable à M+10-M+12 : objectif 8-12 démos qualifiées/mois sourcées par le SDR.

**Pourquoi pas dev d'abord** :
- 1 dev sénior coûte 7 250 €/mois chargé = 87 k€/an. Pour quoi faire ? La roadmap critique (Pennylane, Yousign, pentest fix) est ce que Salim peut faire seul en 60 jours.
- Le bus factor s'améliore mieux avec un co-fondateur tech (à chercher en parallèle, pas urgent) qu'avec un dev junior salarié.

**Pourquoi pas CSM d'abord** :
- À 5 clients, Salim peut faire le CSM lui-même (1 call hebdo par client = 5h/sem soutenable).
- À partir de 15 clients (M+15-M+18), CSM devient critique pour NRR > 100 %.

### 41. Roadmap embauches 12 / 24 mois

| Mois | Recrutement | Salaire brut chargé | Justification |
|---|---|---:|---|
| **M+0** | Salim fondateur | 5 800 € | Base soutenable |
| **M+7** | **Sales SDR** | 6 400 € | Génère pipeline pour M+10+ |
| **M+10** | Dev fullstack senior | 7 250 € | Pennylane / Yousign / roadmap V1.x |
| **M+12** | Head of Sales | 12 687 € | Structure commerciale + recrutement AE |
| **M+15** | Customer Success Manager | 5 437 € | NRR critique au-delà de 15 clients |
| **M+15** | Sales AE n°1 | 9 062 € | Closing tickets >2 k€/mois |
| **M+18** | Dev junior | 4 833 € | Velocity équipe produit |
| **M+22** | Marketing / Growth | 6 042 € | Inbound + contenu + ads |
| **M+30** | Sales AE n°2 | 9 062 € | Couverture territoires/segments |
| **M+32** | Customer Success n°2 | 5 437 € | Ratio CSM <1:30 clients |
| **M+34** | Dev fullstack senior n°2 | 7 250 € | Roadmap V2, intégrations |

ETP cumulés : 1 → 3 à M+12 → 7 à M+24 → 13 à M+36. ARR/employé cible : 109 k€ M+12 → 168 k€ M+24 → 220 k€ M+36.

### 42. Conseillers et board envisagés

**Advisors prioritaires à recruter en parallèle de la levée** :
1. **Ex-CEO / Ex-fondateur SaaS B2B vertical FR** (type Pennylane, Spendesk, Lemonway, Lucca, Whoz) — pour conseil GTM + introductions investisseurs/clients.
2. **Ex-RSSI ou pentester PASSI** — crédibilité Trust Center, conseil sécurité, intro RSSI ESN.
3. **Ex-dirigeant ESN** (taille 50-200 consultants, idéalement ayant vendu sa boîte) — voix de l'acheteur dans le board.
4. **Avocat tech SaaS B2B** (RGPD, CGV, DPA, AI Act) — partenaire long terme.

Compensation advisors : BSA 0,25-0,5 % par advisor, vesting 24 mois, cliff 6 mois.

**Board post-Seed** : fondateur + lead investor + 1 advisor externe. Réunion trimestrielle, reporting standard SaaS (cf. §32-38).

**Décision principale Partie VII : 1er recrutement SDR à M+7 (pas dev, pas CSM). Co-fondateur tech à chercher en parallèle non urgent. Roadmap 13 ETP à M+36 cohérente avec ARR 2,86 M€ projeté. Advisor board à constituer avant le closing Seed pour crédibiliser le dossier.**

---

## Partie VIII — Risques et mitigation

### 43. Top 10 risques (produit, marché, concurrence, équipe, cash) avec mitigation

| # | Risque | Probabilité | Impact | Score | Mitigation |
|---|---|---:|---:|---:|---|
| 1 | **RFP demande "tests E2E sécu + CI + pentest" → réponse honnête = NON** | 90 % | Critique | **9,0** | Brancher CI + commander pentest (sprint 30j + 60j) |
| 2 | **Démo CV Optimizer expose le mock devant un BM senior** | 70 % | Critique | **7,0** | Switch LLM avant 1ère démo (sprint 30j item S1.8) |
| 3 | **Acheteur DAF refuse signature sans intégration Pennylane** | 80 % | Élevé | **6,4** | Push factures Pennylane (sprint 60j S2.2) |
| 4 | **Incident sécu / fuite RLS pendant la prospection** | 10 % | Catastrophique | **5,0** | Upstash + Sentry + restore drill + tests RLS en CI |
| 5 | **Lead chaud abandonne car pas de Calendly / pas de prix** | 70 % | Modéré | **4,9** | Calendly embed + fourchette prix + calculateur |
| 6 | **Concurrent Boondmanager bash positioning "0 client"** | 60 % | Modéré | **4,2** | 3 design partners signés gratuits + case study chiffrée |
| 7 | **Stripe billing pas câblé → 1er paiement manuel** | 50 % | Modéré | **3,5** | Câbler 1 plan Stripe bout-en-bout avant signature |
| 8 | **Churn an 1 dérape de 16 % à 25 %** | 30 % | Élevé | **3,3** | CSM dès M+15, onboarding 30j cadré, NPS trim. |
| 9 | **Cron RGPD purge non branché → CNIL flag si plainte** | 20 % | Catastrophique | **3,0** | `vercel.json` cron en 30 min (sprint 30j S1.5) |
| 10 | **Bus factor 1 (Salim malade) pendant pitch** | 15 % | Élevé | **2,4** | Runbook externalisable + co-fondateur tech |
| 11 | **Hallucination IA dans un CV envoyé à client final** | 15 % | Élevé | **2,4** | LLM avec garde-fous + watermark "IA assistée" |
| 12 | **Boondmanager sort v2 modernisée IA en 2026-2027** | 35 % | Élevé | **2,8** | Aller vite : 8-13 clients signés à 12 mois |
| 13 | **Crise macro ESN → budgets outillage gelés** | 25 % | Élevé | **2,0** | Positionnement ROI court (3,5× payback < 4 mois) |
| 14 | **CAC dérape de 4 200 € à 7 500 €** | 30 % | Élevé | **2,1** | Founder-led content (CAC ~0), partenariats, monitor mensuel |
| 15 | **Anthropic rename / discontinue claude-opus-4-7** | 20 % | Élevé | **2,0** | Abstraction modèle + variable env + fallback Sonnet |

**Risque produit majeur à anticiper avec le 1er client** : exposition publique de la dette IA des 3 mocks (CV Optimizer, matching, assistant compta) lors du 1er usage intensif réel. Scénario : le BM du 1er client génère 30 CV optimisés en 1 semaine sur profils techniques variés (data engineer, scrum master, expert SAP, dev mobile). Le mock déterministe produit reformulations ressemblantes d'un consultant à l'autre, bullets génériques, zéro adaptation AO. BM se dit "j'aurais fait mieux à la main en 20 min", se désengage silencieusement après 3-4 semaines, ne renouvelle pas, diffuse mauvaise réputation dans son cercle ESN. **Mitigation impérative avant signature** : (1) switch LLM testé sur 10+ CV réels variés, (2) 2e pass Haiku justification matching, (3) brief honnête design partner "assistant compta IA = roadmap V1.1", (4) onboarding Salim personnel 4 premières semaines + call hebdo, (5) watermark "Assisté par IA — relire avant envoi client" sur tous les livrables.

**Décision principale Partie VIII : risques 1-4 = bloquants prospection, à éliminer dans le sprint 30 jours (CI/Sentry/Upstash/cron RGPD + switch LLM CV Optimizer). Risques 5-9 = bloquants signature, à éliminer dans le sprint 60 jours (Calendly/calculateur/Pennylane/Stripe/3 design partners). Risques 10-15 = surveillance trimestrielle, dashboard mensuel.**

---

## Partie IX — Décisions à prendre maintenant

### 44. Top 10 décisions urgentes (cette semaine, ce mois, ce trimestre)

**Cette semaine (J0-J7)** :
1. **Démarrer le sprint 30 jours sans délai** — 13 jours dev à caler en 4 semaines. Aucune nouvelle feature hors roadmap. Aucun refactor non bloquant.
2. **Publier 3 posts LinkedIn founder-led dès J+1** — pas attendre que tout soit "parfait". La machine de notoriété prend 60 jours à chauffer.
3. **Sourcer 50 ESN cibles segment A (30-80 consultants IDF)** via Sales Nav, scoring ICP > 70, enrichir emails.
4. **Demander 5 warm intros au réseau** — ce sont les 5 premières démos.

**Ce mois (J0-J30)** :
5. **Brancher CI + Sentry SDK + Upstash + cron RGPD + restore drill** (items S1.1, S1.2, S1.5, S1.6, S1.7) — sans ces 5 items, le sprint commercial est cosmétique.
6. **Switch LLM CV Optimizer + justification matching Haiku** (items S1.8, S1.9) — 6 jours dev, ouvre la démo honnête.
7. **Publier page `/centrium-vs-boondmanager`, embed Calendly, vidéo 90s, page `/about`, calculateur prix** — quick wins conversion top funnel.

**Ce trimestre (J0-J90)** :
8. **Commander pentest PASSI** (Synacktiv / Almond / Wavestone, ~12-25 k€, 6 semaines) — sans rapport NDA pas de signature > 50 consultants.
9. **Brancher Pennylane (push factures) + Yousign portail + Stripe câblé bout-en-bout** (items S2.2, S2.3, S2.5).
10. **Signer 3 design partners en Programme Pionnier -30 % à vie** contre logo + case study + référence appelable.

### 45. KPIs de suivi mensuel à partir du jour 1

| Section | KPIs |
|---|---|
| **Revenu** | MRR, ARR, ARPU, Nouveau MRR, Expansion MRR, Churn MRR, Net New MRR |
| **Clients** | Clients actifs, nouveaux signés, churn logo, pipeline ouvert €, pipeline qualifié € |
| **Sales** | Leads par canal, MQL, SQL, démos réalisées, devis envoyés, closings, win rate |
| **Marketing** | Visites site, taux conversion lead, coût/lead par canal, CAC blended, abonnés newsletter |
| **Cash** | Cash banque, burn mensuel, runway restant, encaissements clients, dépenses |
| **Produit** | Tickets support ouverts/clos, NPS, activation rate (consultants importés), uptime |
| **Équipe** | Effectif, cost/ETP, recrutements en cours |
| **Sécurité** | Events sécu Sentry, tentatives MFA, login_events new device, restore drill mensuel exécuté |

Reporting tenu le **5 du mois suivant** sur tableau de bord Notion ou Sheets. Reporting trimestriel investisseurs **T+30 jours après clôture** : 2-3 pages + dashboard (highlights/lowlights, KPIs, risques, cash, demandes).

**Décision principale Partie IX : 10 décisions urgentes dont 4 hebdo, 3 mensuelles, 3 trimestrielles. KPI dashboard mensuel sur 8 sections à tenir dès J+0. Reporting trimestriel investisseurs en place dès la levée Seed.**

---

## Partie X — Annexes

### A. Liste des documents produits (audits + commercial)

**Audits techniques (5 documents)** :
- `docs/business-plan/audit/00-SYNTHESE-MATURITE-GAPS.md` — synthèse maturité 6,8/10 + verdict GO-CONDITIONNEL
- `docs/business-plan/audit/01-CODE-ARCHITECTURE.md` — audit code 7,4/10 (CTO ex-Stripe/Datadog)
- `docs/business-plan/audit/02-SECURITE.md` — audit sécu 7,3/10 (RSSI ex-OVH/Stormshield)
- `docs/business-plan/audit/03-PRODUIT.md` — audit produit 6,5/10 (Head of Product ex-Notion/Pennylane)
- `docs/business-plan/audit/04-OPS-INFRA.md` — audit ops 6,2/10 (Head of Engineering ex-Vercel/Datadog)
- `docs/business-plan/audit/05-VITRINE-BRAND.md` — audit vitrine 6,5/10 (VP Marketing ex-Qonto/Spendesk)

**Documents commerciaux (4 documents)** :
- `docs/business-plan/commercial/01-PRICING-PACKAGING.md` — stratégie pricing complète, grille tarifaire, simulations
- `docs/business-plan/commercial/02-MARCHE-ICP-PERSONAS.md` — TAM/SAM/SOM, segmentation, ICP, 4 personas, concurrence
- `docs/business-plan/commercial/03-GO-TO-MARKET.md` — stratégie GTM, 7 canaux, cycle de vente 8 étapes, script démo, 15 objections
- `docs/business-plan/commercial/04-MODELE-FINANCIER.md` — projection 36 mois, 3 scénarios, CAC/LTV/NRR, financement

**Documentation produit entreprise (12 documents `docs/produit/`)** :
MANUEL_UTILISATEUR_ENTERPRISE, PRESENTATION_ENTREPRISE_ENTERPRISE, SECURITY_WHITEPAPER, TRUST_CENTER, ADMIN_GUIDE, SLA_AND_SUPPORT_GUIDE, ARCHITECTURE_OVERVIEW, ROI_GUIDE, HELP_CENTER_STRUCTURE, CASE_STUDY_TEMPLATE, ENTERPRISE_AUDIT, MISSING_ENTERPRISE_ASSETS, FINAL_EVALUATION + SECURITY_RUNBOOK opérationnel.

### B. Glossaire SaaS B2B

| Terme | Définition |
|---|---|
| **ACV** | Annual Contract Value — valeur annuelle d'un contrat |
| **ARPU** | Average Revenue Per User (ou Account) — revenu moyen par compte |
| **ARR** | Annual Recurring Revenue — MRR × 12 |
| **BANT** | Budget, Authority, Need, Timing — framework de qualification |
| **BFR** | Besoin en Fonds de Roulement |
| **BOFU** | Bottom Of Funnel — bas du tunnel d'achat (intention forte) |
| **CAC** | Customer Acquisition Cost |
| **CAC Payback** | Durée pour récupérer le CAC sur la marge brute |
| **CIR / CII** | Crédit Impôt Recherche / Crédit Impôt Innovation |
| **CSM** | Customer Success Manager |
| **DAU/MAU** | Daily/Monthly Active Users |
| **DSO** | Days Sales Outstanding — délai moyen de paiement clients |
| **EBE / EBITDA** | Excédent Brut d'Exploitation / Earnings Before Interest, Taxes, Depreciation, Amortization |
| **ESN** | Entreprise de Services du Numérique |
| **GRR** | Gross Revenue Retention — rétention revenu brut |
| **JEI** | Jeune Entreprise Innovante (statut fiscal FR) |
| **LTV** | Lifetime Value — valeur vie client |
| **Magic Number** | Net new ARR / OPEX S&M — efficience commerciale |
| **MQL / SQL** | Marketing/Sales Qualified Lead |
| **MRR** | Monthly Recurring Revenue |
| **NIS2 / DORA** | Directives EU cyber (oct. 2024 / janv. 2025) |
| **NPS** | Net Promoter Score |
| **NRR** | Net Revenue Retention (>100 % = expansion organique) |
| **PLG / SLG** | Product-Led / Sales-Led Growth |
| **POC** | Proof Of Concept |
| **PSA** | Professional Services Automation |
| **PSIRT** | Product Security Incident Response Team |
| **RFP / RFI** | Request For Proposal / Information |
| **RLS** | Row Level Security (Postgres) |
| **Rule of 40** | Croissance ARR % + Marge EBITDA % ≥ 40 % = SaaS sain |
| **SAM** | Serviceable Addressable Market |
| **SDR / AE** | Sales Development Rep / Account Executive |
| **SOC 2** | Security/Confidentiality/Privacy report (Type I/II) |
| **SOM** | Serviceable Obtainable Market |
| **TAM** | Total Addressable Market |
| **TJM** | Taux Journalier Moyen |
| **VDP** | Vulnerability Disclosure Policy |

### C. Calendrier d'événements pro à viser

| Événement | Période | Format | Coût | Pertinence |
|---|---|---|---|---|
| **Numeum — Commission Conseil & Services** | Trimestriel | Réunion adhérents | 3 k€/an adhésion | ★★★★★ — décideurs ESN sourcés |
| **Tech in France — Sommet annuel** | Octobre | Salon + conférences | 1,5 k€ + 0,5j | ★★★★ |
| **Salon SaaS Connect Paris** | Octobre | Salon B2B SaaS | 2,5 k€ stand mini | ★★★ |
| **Big — Bpifrance Inno Générations** | Septembre | Salon écosystème | 0 € visiteur | ★★★ |
| **VivaTech Paris** | Juin | Salon tech | 5-15 k€ stand | ★★ (CAC ridicule) |
| **Petits déjeuners Centrium self-hosted** | Mensuel dès M+4 | 15 dirigeants ESN, lieu sympa 8e/2e arr. | 1,5 k€/event | ★★★★★ — meilleur ROI |
| **Salon SaaS Show** | Juin | Salon B2B | 3 k€ | ★★ |
| **Maddyness Founders Friday** | Vendredi mensuel | Networking | 0 € | ★★★ |
| **French Tech meetups locaux** | Continu | Meetups régionaux | 0 € | ★★★ — IDF Lyon Bordeaux |
| **Webinaires produit Centrium** | Mensuel dès M+4 | 30 min + Q&A | 0 € | ★★★★ |

### D. Modèle email de prospection (3 templates)

**Template 1 — Cold email dirigeant ESN (Persona Camille)**

> Objet : Boondmanager 2010 → outil 2026 pour [Nom ESN]
>
> Bonjour [Prénom],
>
> [Nom ESN] gère ~[nb] consultants sur Boondmanager (j'ai vu via [signal LinkedIn / site / Sales Nav]). 3 dirigeants ESN que j'ai croisés récemment me disent la même chose : "C'est lourd, c'est cher, l'UX date, et on n'a pas d'IA."
>
> J'ai bâti Centrium pour eux. Plateforme française, IA-native (CV optimizer, matching, parsing AO), pricing par consultant (vous ne payez pas plus quand vous recrutez un BM), hébergement EU avec Trust Center public. 30-40 % moins cher que Boondmanager à scope équivalent.
>
> 15 min pour vous montrer 3 cas d'usage concrets cette semaine ? [Lien Calendly]
>
> Salim — fondateur Centrium
> centrium-platform.com

**Template 2 — LinkedIn DM Head of Ops (Persona Sophie)**

> Bonjour [Prénom],
>
> J'ai vu votre post sur [sujet]. Je travaille avec des Heads of Ops d'ESN 30-80 consultants — la douleur n°1 qu'on adresse : passer de 8h à 30 min par CV reformatté pour un AO.
>
> On a un produit qui parse les CV PDF/DOCX, génère le template aux couleurs de votre ESN, et propose une justification de match contre le besoin client. 14 jours d'essai sandbox sans CB.
>
> Ouvert à un call de 15 min cette semaine ? Sinon je vous envoie une démo Loom 8 min.
>
> Salim

**Template 3 — Email après "non" timing ("on reparle en septembre")**

> Bonjour [Prénom],
>
> Vous m'avez dit "septembre". Je note dans 2 mois (15 sept).
>
> Petit point : septembre = rentrée = vous serez débordé. Si on veut un go/no-go propre à la rentrée, il faut un POC en août, mois calme, où vous testez sur 5-10 consultants réels. 14 jours, sans engagement, sans CB.
>
> Si oui, je vous ouvre un tenant mardi prochain. Sinon je relance le 12 sept, et on prend les 30 min qui restent ce trimestre-là.
>
> Lequel des deux ?
>
> Salim

### E. Modèle de présentation 12 slides pour investisseur

| # | Slide | Contenu clé |
|---|---|---|
| 1 | **Titre** | Centrium — L'OS opérationnel des ESN modernes. Salim El Rharbi, fondateur. Date. |
| 2 | **Problème** | ESN françaises 10-200 cons : Boondmanager 2010 (cher, sans IA), Akuiteo (ERP 6 mois impl), Notion+Excel (0,5-1 ETP perdu/an). 3 000 ESN cibles FR, 300-400 renégocient leur PSA 2026-2028. |
| 3 | **Solution** | Plateforme SaaS verticale, IA-native (CV / matching / AO / parsing / email), pricing par consultant, hébergement EU. 30-40 % moins cher que Boondmanager. |
| 4 | **Product demo** | 3 screenshots : Dashboard pilotage + CV Optimizer + Matching avec justification IA. Lien vidéo 90s. |
| 5 | **Marché** | TAM 540 M€ Europe — SAM 48 M€ France (~2 700 ESN 10-200 cons) — SOM 1,35 M€ ARR 3 ans (75 clients). Croissance +4-6 %/an. |
| 6 | **Business model** | Per-consultant + pack 20 inclus. Starter 13 k€/an, Growth 38 k€/an, Enterprise 100 k€+/an. ARPU mix 28,6 k€/an. Marge brute 87 %. |
| 7 | **Traction** | v1.0 livrée Q2 2026. 3 design partners signés (Programme Pionnier -30 %). 1ère facture encaissée [date]. Pipeline qualifié [€]. |
| 8 | **GTM** | SLG dominant + founder-led content. 5 canaux priorisés : LinkedIn outbound, Founder-led, Cold email, SEO, Événements. CAC blended 4 200 €, payback 2,1 mois. |
| 9 | **Concurrence** | Matrice 2×2 modernité × verticalité. Centrium seul "moderne + vertical" en 2026. Différenciation : per-consultant + IA native + Trust Center public + UX 2026. |
| 10 | **Équipe + advisors** | Salim (8 ans ESN + build solo). 4 advisors prévus : ex-CEO SaaS B2B FR, ex-RSSI, ex-dirigeant ESN, avocat tech. Roadmap embauches : SDR M+7, dev M+10, Head of Sales M+12. |
| 11 | **Financials** | Projection ARR : 328 k€ M+12 / 1,18 M€ M+24 / 2,86 M€ M+36 (scénario réaliste). Break-even op M+22, cash M+26. EBITDA +175 k€ an 3. |
| 12 | **Ask** | Seed 750 k€ à 3-4 M€ pré-money (20 % dilution). Complété par Prêt BPI 200 k€ + aides 150-280 k€. Use of funds : 60 % sales, 25 % produit, 15 % marketing. Milestone Series A : 2,5 M€ ARR + NRR > 110 %. |

---

## Conclusion exécutive

Centrium est un **beta crédible** — pas un POC, pas (encore) un produit pleinement industrialisé. Note maturité globale **6,8/10**, équivalente à Pennylane 2018 / Spendesk 2017 / Qonto 2017. Le code est sain, la sécurité est sérieuse (au-dessus du marché ESN français), la brand identity est au niveau série A, le Trust Center est public. Les **3 trous majeurs** — pas de pipeline CI, 3 mocks IA encore en code, zéro intégration native Pennylane/Yousign — sont **fixables en 60 jours** par Salim seul.

Le **marché est ouvert** : ~3 000 ESN françaises 10-200 consultants, ~48 M€ ARR adressables, cohorte Boondmanager 2010-2015 en fin d'amortissement (300-400 ESN renégocient leur PSA en 2026-2028). Aucun acteur n'occupe le quadrant "moderne + vertical ESN" en 2026. La fenêtre de tir est ouverte.

Le **pricing tient debout** : per-consultant + pack 20 inclus + 39/29 €/consultant additionnel + Enterprise dégressif. 30-40 % moins cher que Boondmanager à scope équivalent, marge brute 87 %, payback CAC 2,1 mois. ARPU mix cible 28,6 k€/an.

Le **plan financier converge** : bootstrap 80 k€ jusqu'à M+9, Seed 750 k€ closé M+9-M+12 à 3-4 M€ pré-money pour 20 % dilution, prêt BPI 200 k€ matching, aides 150-280 k€ non dilutif. Cash max à mobiliser 410 k€. Break-even op M+22, cash M+26, EBITDA positif M+28.

**Verdict GO-CONDITIONNEL prospection mode design partner** sur 3-5 ESN françaises 30-80 consultants, après sprint 30 jours d'industrialisation et pendant sprint 60 jours commercial. Aller vite, assumer le statut beta, transparence > survente.

**Trajectoire à 12 mois défendable face à investisseur** : 8-13 clients signés, ARR 200-330 k€, 3 ETP, 3 design partners en case study publique, pentest livré, SOC 2 Type I en cours. Trajectoire à 36 mois : 90 clients, ARR 2,86 M€, EBITDA +175 k€, ouverture Belgique/Luxembourg envisagée.

Ce document est un **plan d'action exécutable**, pas une promesse. Il est révisable trimestriellement après confrontation avec la réalité commerciale. **Les 5 premiers clients seront la vraie boussole** : tout signal de churn > 2 %/mois, ARPU < 1 800 € ou CAC > 6 k€ doit déclencher un sprint produit/commercial immédiat.

---

*Document de référence — Direction QuadCore SAS. Centrium by QuadCore — Business Plan v1.0 — 4 juin 2026.*
*Ce document est un livrable interne destiné au fondateur, au board, aux investisseurs Seed, aux banquiers (prêt amorçage), aux associés futurs et aux recruteurs clés. Confidentialité requise.*
