# Synthèse maturité Centrium + gaps avant prospection

> Auteur : VP Strategy SaaS B2B (perspective ex-Atlassian / ex-Notion)
> Date : 15 juin 2026
> Objet : verdict de maturité défendable face à un board ou un investisseur, à partir de 5 audits indépendants (code, sécurité, produit, ops, vitrine)
> Statut produit : Centrium v1.0 livrée Q2 2026, 0 client payant, super-admin = Salim, vitrine en ligne

---

## 1. Tableau de scores par axe

| Axe | Note /10 | Justification (2 phrases max) |
|---|---:|---|
| **Code & Architecture** | 7,4 | Stack moderne (Next 14 + Supabase + TS strict), 341 fichiers, 63 migrations, qualité TS au-dessus de la moyenne MVP. Mais 0 CI, lint implicite, god-module `services/index.ts` 1 433 L, dépendances 3D superflues, `'use client'` trop large. |
| **Sécurité** | 7,3 | Sprint hardening réel : RLS FORCE sur 38 tables, MFA TOTP, HIBP, audit log, VirusTotal, export throttle, Trust Center, VDP — bien au-dessus du marché ESN français. Manque structurel : pas de pentest, pas de SSO, CI sécurité inexistante, Upstash/Sentry pas garantis activés en prod. |
| **Produit** | 6,5 | 14+ surfaces livrées, parcours BM/recruteur/consultant/admin cohérents, CRM polished, parsing CV IA et extraction AO IA réels. 3 mocks survendus comme IA (CV Optimizer, matching, assistant compta), 0 intégration native Pennylane/Sage/Yousign. |
| **Ops & Infra** | 6,2 | Topologie serverless saine (Vercel + Supabase + Anthropic + Stripe), marge brute infra > 90 % dès le 1er client, runbook propre. Trous opérationnels : **0 pipeline CI**, Sentry pas installé, restore drill jamais exécuté, bus factor = 1, cron purge non branché. |
| **Vitrine & Brand** | 6,5 | Brand identity niveau série A (Space Grotesk + Instrument Serif + dark mode + 3D), Trust Center et `/legal/*` au-dessus du marché, SEO technique 9/10. Social proof 3/10 (0 logo client, 0 case study), 0 contenu SEO, pas de calculateur prix, pas de Calendly. |

---

## 2. Note globale pondérée

**Note globale : 6,8 / 10**

Pondération justifiée pour un SaaS B2B vertical au stade "v1.0, 0 client, début de prospection" :

| Axe | Poids | Note | Contribution |
|---|---:|---:|---:|
| Sécurité | 25 % | 7,3 | 1,83 |
| Produit | 25 % | 6,5 | 1,63 |
| Ops & Infra | 20 % | 6,2 | 1,24 |
| Code & Architecture | 15 % | 7,4 | 1,11 |
| Vitrine & Brand | 15 % | 6,5 | 0,98 |
| **Total** | **100 %** | — | **6,79 → 6,8** |

**Rationnel pondération** : la sécurité et le produit pèsent le plus parce que ce sont les deux objections n°1 d'un acheteur ESN ("est-ce que vous tenez mes données ?" et "est-ce que ça fait vraiment ce que vous dites ?"). Ops vient ensuite parce qu'aucun client ne signera sans CI/monitoring documenté en RFP. Code et vitrine pèsent moins car invisibles ou rattrapables vite — un bon code mal vendu se vend, un mauvais code bien vendu casse au 1er client.

**Lecture** : 6,8 = "beta crédible commercialement, prêt à prospecter en mode design partner, pas prêt à prospecter en mode cycle de vente standard". C'est exactement la note d'un Pennylane 2018 ou d'un Spendesk 2017 — vendable, à 2-3 mois de chantier d'industrialisation près.

---

## 3. Forces majeures du projet (top 7 transverses)

1. **Architecture multi-tenant Postgres-native** — RLS FORCE sur 38 tables, helpers `SECURITY DEFINER`, fence du rôle consultant, `_security_rls_audit` view, `security_invoker` views. C'est la **base** qu'attendent les RSSI sérieux et c'est rarement à ce niveau en early-stage. Argument de vente n°1.
2. **Discipline sécurité applicative réelle** — MFA TOTP, HIBP k-anonymity, password policy NIST, `createAdminClient(reason whitelisté)` sur 51 callsites, audit log typé, login_events, export RGPD self-service, VirusTotal hooké, CSP complète, HSTS preload. C'est un sprint sécu qui tient face à un auditeur PASSI compétent.
3. **Brand identity au niveau série A** — Space Grotesk + Instrument Serif + magenta + dark mode + animations soignées (Starfield 3D, AnimatedOrb, MagneticButton, BootIntro). Niveau Qonto/Linear, donc différenciateur immédiat face à Boondmanager (UI 2010) ou Cegid (UI ERP).
4. **Trust Center et conformité publique** — `/trust`, `/legal/dpa`, `/legal/subprocessors` listant nommément Supabase EU / Vercel EU / Anthropic / Stripe / Resend, `/.well-known/security.txt`, VDP, whitepaper sécu ~6 000 mots. Aucun concurrent ESN français n'a ça.
5. **Stack moderne managée à très haut levier opérationnel** — Vercel + Supabase + Anthropic + Stripe + Upstash. Marge brute infra > 90 % dès le 1er client, scaling linéaire jusqu'à 50 ESN sans refonte, bottlenecks identifiés au-delà. Salim solo peut tenir 5-10 clients sans recrutement.
6. **CRM commercial polished avec realtime collaboratif** — Kanban drag&drop + broadcast peer, carte récap "Terminées", carnet de contacts, import CSV. C'est probablement le module le plus vendable tel quel, et il bat largement le CRM Boondmanager en UX.
7. **IA réelle là où elle compte commercialement** — parsing CV (Claude vision + schema zod + fallback heuristique), extraction AO depuis screenshot, génération email pitch, suggestions de compétences manquantes. 4 modules IA authentiques (vs 3 mocks à corriger), pas du fake.

---

## 4. Faiblesses bloquantes (top 7)

1. **0 pipeline CI/CD** — aucun `.github/workflows/`, aucun `npm audit`, aucun lint/type-check/test automatisé. Tout repose sur la rigueur manuelle de Salim. **Bloquant en RFP** dès la 1ère question "do you run automated tests on every change?".
2. **3 modules vendus IA mais MOCK en code** — `cv-generator.ts` (mock déterministe avec commentaire "remplacer par Claude en V1"), matching (set intersection vendu comme IA, pas de justification), assistant compta (heuristique regex). Démo > 30 min avec un BM senior expose le mock. **Pitch actuellement partiellement mensonger.**
3. **0 social proof exposé** — 0 logo client, 0 case study, 0 chiffre de traction, juste 2 témoignages anonymisés. Friction n°1 en haut du funnel : un BM Capgemini quitte le site sans savoir "qui d'autre l'utilise".
4. **0 intégration native** Pennylane / Sage / Yousign / Gmail / Outlook / LinkedIn. Le pitch "centralise tout le cycle" est partiellement faux puisque l'ESN garde tous ses outils du quotidien (email, comptabilité, signature). **Bloquant chez tout DAF/Daf-adjoint.**
5. **Restore drill jamais exécuté, pentest jamais fait** — runbook propre mais 0 trace d'exécution. Aucune ESN > 50 consultants ne signera sans rapport pentest sous NDA. SOC 2 Type I annoncée Q4 2026 mais sans entamement réel.
6. **Bus factor = 1** — Salim solo connaît tout. Pas de redondance humaine, pas d'astreinte, pas de runbook externalisable. Premier départ en vacances = produit indisponible si incident.
7. **0 pricing public, 0 trial, 0 self-serve** — formulaire `/devis` à 12+ champs, pas de Calendly embed, délai 24-48h. **Funnel 100% sales-led** sur un marché où Boondmanager affiche un simulateur. Perte estimée 40-60 % de leads qualifiés en haut du funnel.

---

## 5. Risques pour démarrer la prospection (top 10, probabilité × impact)

| # | Risque | Probabilité | Impact | Score | Mitigation 30j |
|---|---|---:|---:|---:|---|
| 1 | RFP demande "tests E2E sécu + CI + pentest" → réponse honnête = NON | 90 % | Critique | **9,0** | Brancher CI + commander pentest |
| 2 | Démo CV Optimizer expose le mock devant un BM senior | 70 % | Critique | **7,0** | Switch LLM avant 1ère démo |
| 3 | Acheteur DAF refuse signature sans intégration Pennylane | 80 % | Élevé | **6,4** | Push factures Pennylane (5-8j) |
| 4 | Incident sécu / fuite RLS pendant la prospection | 10 % | Catastrophique | **5,0** | Activer Upstash + Sentry + drill |
| 5 | Lead chaud abandonne car pas de Calendly / pas de prix | 70 % | Modéré | **4,9** | Calendly embed + fourchette prix |
| 6 | Concurrent (Boondmanager) bash positioning "0 client" | 60 % | Modéré | **4,2** | 3 design partners signés gratuits |
| 7 | Stripe Connect / billing pas câblé → 1er paiement manuel | 50 % | Modéré | **3,5** | Câbler plan Stripe avant signature |
| 8 | Cron RGPD purge non branché → CNIL flag si plainte | 20 % | Catastrophique | **3,0** | `vercel.json` cron en 30 min |
| 9 | Bug factor 1 (Salim malade) pendant pitch | 15 % | Élevé | **2,4** | Runbook externalisable + co-fondateur |
| 10 | Hallucination IA dans un livrable CV envoyé à client final | 15 % | Élevé | **2,4** | Activer LLM avec garde-fous + watermark "IA assistée" |

---

## 6. Verdict GO / NO-GO / GO-CONDITIONNEL

**Verdict : GO-CONDITIONNEL** — Centrium est suffisamment mature pour commencer à prospecter **en mode design partner ciblé sur 3-5 ESN françaises de 20 à 50 consultants**, à condition d'exécuter le sprint d'industrialisation 30 jours décrit ci-dessous avant le **premier rendez-vous prospect**, et un second sprint 60 jours avant la **première signature commerciale**. Le produit n'est PAS prêt pour un cycle de vente "cold prospection LinkedIn → démo → devis → signature en 8 semaines" sur cible 100+ consultants : il manque le pentest, le SSO, l'intégration Pennylane et le social proof. Mais il est crédible en cycle "design partner sourcé via réseau, accompagnement fort, statut beta assumé, pricing préférentiel contre logo et case study" — c'est exactement ainsi que Spendesk, Pennylane, Qonto et Lemonway ont fait leurs 5 premiers clients. La fenêtre de tir est ouverte, le coût d'attente (perdre 6 mois à peaufiner sans signal marché) est plus grand que le coût du risque d'image (signer 1 client qui se plaint d'un mock).

---

## 7. Conditions à remplir AVANT le 1er rendez-vous prospect (top 15)

Sprint d'industrialisation minimal. Sans ces 15 items, ne pas envoyer le premier email cold.

1. **Activer en Vercel env Production** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `RESEND_API_KEY`, `VIRUSTOTAL_API_KEY`, `CRON_SECRET`.
2. **Rotation initiale `SUPABASE_SERVICE_ROLE_KEY`** + activer **Vercel Firewall (WAF)**.
3. **Confirmer région Supabase = `eu-central-1` ou `eu-west-3`** (sinon tout l'argumentaire RGPD s'effondre).
4. **Brancher CI GitHub Actions** (`lint` + `type-check` + `vitest` + `playwright marketing+login` + `npm audit --audit-level=high`).
5. **Installer `@sentry/nextjs` réel** + brancher source maps Vercel.
6. **Créer `src/app/api/health/route.ts`** + brancher Better Stack sur health + login.
7. **Status page publique** `status.centrium-platform.com` en ligne.
8. **Switch CV Optimizer mock → Claude API** avec garde-fous "no invention" (3-5 jours dev).
9. **Justification IA matching** : 2e pass Claude Haiku qui génère 2 lignes "pourquoi 87 %" (2 jours dev).
10. **Tourner 1 vidéo produit 90 secondes** (Loom scriptée, voix-off Salim, sous-titres).
11. **Embed Cal.com / Calendly** sur `/devis` et home (gain conversion +20-40 %).
12. **Page comparatif `/centrium-vs-boondmanager`** (tableau parity + différenciateurs).
13. **Page `/about`** avec photo Salim, manifesto, raison d'être.
14. **Activer cron Vercel purge-archives** (`vercel.json` 30 min, RGPD art. 17).
15. **Exécuter UN restore drill réel** + screenshot daté + entrée runbook.

**Effort total** : ~10-12 jours dev concentrés. Réalisable en 30 jours par Salim seul.

---

## 8. Conditions à remplir AVANT la signature du 1er contrat (top 15)

Sprint commercial avant ARR. À itérer pendant la prospection sur les 60 jours qui suivent.

1. **3 design partners signés** (gratuit ou 50 %) en échange du droit de publier logo + case study chiffrée.
2. **Intégration Pennylane minimale** (push factures payées) — 5-8 jours dev.
3. **Signature électronique Yousign** intégrée au portail consultant — 4-6 jours dev.
4. **Support PDF dans extraction AO** (en plus de PNG/JPG) — 2-3 jours dev.
5. **Activer Stripe** sur 1 plan câblé bout-en-bout (Checkout + webhook + portal).
6. **Pentest externe PASSI commandé** (Synacktiv / Wavestone / Almond, ~12-25 k€, 6 semaines).
7. **Tests RLS multi-tenant en CI** avec seed Org A / Org B obligatoire (passe le test "vert sans rien tester" du sprint sécu).
8. **CSP nonce-ifiée** (sortie de `'unsafe-inline'` / `'unsafe-eval'`).
9. **Calculateur prix sur `/pricing`** (slider 10→500 consultants → fourchette indicative).
10. **3-5 articles de blog SEO BOFU** ("comment répondre à un AO ESN", "calculer un TJM", "checklist intercontrat").
11. **Roadmap publique** sur `/changelog` et `/roadmap` (signal "produit vivant").
12. **Splitter `.env.example`** en `.env.development.example` et `.env.production.example`.
13. **CHANGELOG.md** + tags Git versionnés (`v1.0.0`, `v1.0.1`).
14. **Refondre `src/lib/services/index.ts`** (1 433 L) en 8 services dédiés (maintenabilité avant 2e dev).
15. **OPERATIONAL_RUNBOOK_EXTERNAL.md** lisible par un dev externe (mitigation bus factor).

**Effort total** : ~25-35 jours dev + 6 semaines de pentest externe + 30 jours de hustle commercial (design partners). Réalisable en 60 jours réels si Salim consacre 100 % de son temps.

---

## 9. Plan d'action 30 jours (sprint 1) — Industrialisation pré-prospection

**Objectif** : être prospect-ready et tenir un Security Questionnaire honnête.

| # | Action | Effort | Owner | Bloque ? |
|---|---|---:|---|:---:|
| 1.1 | CI GitHub Actions (lint+TC+tests+audit) | 1 j | Salim | OUI |
| 1.2 | Activer Upstash + Sentry SDK + Resend prod | 0,5 j | Salim | OUI |
| 1.3 | Confirmer région Supabase EU + Vercel Firewall | 0,5 j | Salim | OUI |
| 1.4 | `/api/health` + Better Stack monitor + status page | 0,5 j | Salim | NON |
| 1.5 | Cron Vercel purge-archives | 0,25 j | Salim | OUI |
| 1.6 | Restore drill #1 documenté + capture | 0,25 j | Salim | OUI |
| 1.7 | Rotation `SUPABASE_SERVICE_ROLE_KEY` | 0,25 j | Salim | OUI |
| 1.8 | Switch CV Optimizer mock → Claude API | 4 j | Salim | OUI |
| 1.9 | Justification IA matching (Haiku 2e pass) | 2 j | Salim | OUI |
| 1.10 | Vidéo produit 90s (Loom) | 1 j | Salim | NON |
| 1.11 | Calendly embed + page `/about` | 0,5 j | Salim | NON |
| 1.12 | Page comparatif `/centrium-vs-boondmanager` | 1 j | Salim | NON |
| 1.13 | 3 chiffres assumés en Home (60 migrations, 38 tables RLS) | 0,25 j | Salim | NON |
| 1.14 | Identifier 10 ESN cibles pour design partners | 1 j | Salim | OUI |
| 1.15 | LinkedIn Insight + Plausible/PostHog | 0,25 j | Salim | NON |

**Total effort** : ~13 jours dev sur 30 jours calendaires. Le reste = prospection cold et refresh produit.

---

## 10. Plan d'action 60 jours (sprint 2) — Premiers design partners

**Objectif** : signer 2 design partners + brancher Pennylane + livrer pentest.

| # | Action | Effort | Owner | Bloque signature ? |
|---|---|---:|---|:---:|
| 2.1 | Commander pentest PASSI (Synacktiv/Almond) | 0,5 j cmd | Salim | OUI |
| 2.2 | Intégration Pennylane push factures | 6 j | Salim | OUI |
| 2.3 | Signature électronique Yousign portail | 5 j | Salim | OUI (pour 50+ consultants) |
| 2.4 | Support PDF extraction AO | 2 j | Salim | NON |
| 2.5 | Activer Stripe Connect plan câblé | 3 j | Salim | OUI |
| 2.6 | Tests RLS multi-tenant en CI avec seed | 2 j | Salim | OUI |
| 2.7 | CSP nonce-ifiée | 1 j | Salim | NON |
| 2.8 | Calculateur prix slider `/pricing` | 1 j | Salim | NON |
| 2.9 | 3 articles blog SEO BOFU | 2 j | Salim/copywriter | NON |
| 2.10 | Page `/changelog` + `/roadmap` publiques | 0,5 j | Salim | NON |
| 2.11 | Refondre `services/index.ts` en 8 fichiers | 1 j | Salim | NON |
| 2.12 | CHANGELOG.md + tags Git | 0,25 j | Salim | NON |
| 2.13 | Prospection 30 ESN cibles (cold LinkedIn + intros) | continu | Salim | OUI |
| 2.14 | 2 démos par semaine | continu | Salim | OUI |
| 2.15 | 1er design partner signé (gratuit/préférentiel) | jalon | Salim | OUI |

**Total effort dev** : ~24 jours. Jalon attendu fin du sprint : 1-2 lettres d'engagement design partner signées.

---

## 11. Plan d'action 90 jours (sprint 3) — Premier paiement

**Objectif** : encaisser le 1er € + livrer pentest + initier SOC 2.

| # | Action | Effort | Owner | Objectif |
|---|---|---:|---|---|
| 3.1 | Réception rapport pentest + plan remediation | 5 j | Salim | Livrable client RSSI |
| 3.2 | Remediation findings critiques pentest | 3-7 j | Salim | Re-test |
| 3.3 | 1ère case study publique chiffrée (design partner) | 2 j | Salim | Social proof |
| 3.4 | 1er paiement encaissé Stripe (design partner converti payant ou 2e client) | jalon | Salim | MRR |
| 3.5 | Lancement procédure SOC 2 Type I (cabinet + Vanta/Drata) | 1 j cmd | Salim | Q1 2027 livrable |
| 3.6 | Recherche co-fondateur tech ou 1er CDI | continu | Salim | Bus factor |
| 3.7 | OPERATIONAL_RUNBOOK_EXTERNAL.md | 1 j | Salim | Bus factor |
| 3.8 | TTL `activities` (purge logs 24 mois) | 0,5 j | Salim | RGPD |
| 3.9 | Connecteur Sage 100c export comptable | 4-6 j | Salim | Élargit ICP |
| 3.10 | Roadmap SSO SAML/OIDC publique | 0,25 j | Salim | Débloque RFP > 100 consultants |
| 3.11 | PWA + saisie CRA mobile-first | 3 j | Salim | UX consultants |
| 3.12 | Storylane / Navattic product tour | 2 j | Salim | Conversion |
| 3.13 | 2e + 3e design partners signés | jalon | Salim | Pipeline |
| 3.14 | Page intégrations `/integrations` (SEO + crédibilité) | 1 j | Salim | SEO BOFU |
| 3.15 | 2e + 3e + 4e articles blog | 2 j | Salim | SEO inbound |

**Jalon final 90 jours** : 1er € encaissé + 3 design partners signés + pentest livré + SOC 2 lancée + 1 case study publique.

---

## 12. Profil idéal du 1er client

**ESN française de 25 à 45 consultants, basée Île-de-France ou métropoles régionales (Lyon/Bordeaux/Nantes), spécialisée IT (dev / data / cyber / cloud), fondateurs encore opérationnels (BM + dirigeant = même personne ou tandem), 3-7 M€ de CA annuel, en croissance (+20 %/an), aujourd'hui sous Boondmanager-mais-pas-content OU Excel+Notion+QuickBooks empilés, sensibles à la sécurité (vendent à grands comptes type CAC 40 / banques / défense), francophones (pas de filiale internationale active), avec un fondateur qui a un compte LinkedIn actif et un réseau startup/tech.**

**Pourquoi ce profil** :
- **25-45 consultants** = au-dessus du palier facturation (20) donc revenu significatif (1 200-2 250 €/mois à 50 €/consultant), en dessous du seuil RFP grand compte (qui demande SSO/SCIM/SOC 2 livrés).
- **IT spécialisé** = sensibilité IA + sécurité + UI moderne → ils valorisent ce qu'on a bien fait (brand, RLS, parsing CV IA).
- **Fondateurs opérationnels** = cycle de décision court (1-2 personnes), pas de comité d'achat à 6 mois.
- **Insatisfaits Boondmanager OU stack Excel** = "pull demand" existe déjà, on n'invente pas le besoin.
- **Vendent à grands comptes** = valorisent le Trust Center et le whitepaper sécurité = différenciation accessible.
- **CA 3-7 M€** = peuvent payer 15-25 k€/an SaaS sans validation board.
- **Fondateur réseau startup** = case study facilement vendable + intros pour clients 2 et 3.

**Anti-portrait** : ESN portage salarial gros volume bas TJM (200+ consultants, 0 sensibilité brand, sensibilité prix uniquement) ; ESN du CAC 40 (RFP avec SSO/SOC 2 bloquants) ; cabinet conseil stratégie pur (besoin différent, pas de CV optimizer adapté).

---

## 13. Risque produit majeur à anticiper avec ce 1er client

**Risque #1 : exposition publique de la dette IA des 3 mocks (CV Optimizer, matching, assistant compta) lors du 1er usage intensif réel.**

Scénario concret : le BM du 1er client génère 30 CV optimisés en 1 semaine sur des consultants à profils techniques variés (data engineer, scrum master, expert SAP, dev mobile). Le mock déterministe va produire des reformulations très ressemblantes d'un consultant à l'autre, des bullets génériques qui ne reflètent pas le savoir-faire spécifique, et zéro adaptation au wording de l'AO ciblée. Le BM va comparer à un CV qu'il aurait fait lui-même à la main et se dire "j'aurais fait mieux en 20 min". Idem matching : 12 consultants comparés à 5 AO, set intersection produit toujours les 2-3 mêmes "top match" mécanistes, sans nuance ("ce profil a déjà fait du Capgemini, ce client est Capgemini, mais l'algo ne le sait pas"). Conséquence : le client se désengage silencieusement après 3-4 semaines, ne renouvelle pas, ne signe pas la case study, et **diffuse une mauvaise réputation dans son réseau ESN** (3-4 ESN voisines en région parisienne au même cercle CCI / French Tech).

**Mitigation impérative AVANT signature** :
1. Switch LLM CV Optimizer fait et testé sur 10+ CV réels variés (action sprint 1, item 1.8).
2. 2e pass Haiku "justification" sur matching avec ancrage faits (action sprint 1, item 1.9).
3. Brief commercial honnête au design partner : "assistant comptable IA = roadmap V1.1, on l'allume avec vous quand on le débloque" (transparence > survente).
4. Onboarding accompagné par Salim personnellement les 4 premières semaines (1 call hebdo, feedback structuré).
5. Watermark visible "Assisté par IA — relire avant envoi client" sur tous les livrables CV — protège juridiquement ET signale que l'humain reste responsable, ce qui rejoint la promesse "IA assistée pas autonome" du manifesto.

Le second risque latent — fuite RLS cross-tenant ou incident sécu pendant les 90 premiers jours — est statistiquement faible mais d'impact catastrophique : il anéantirait la promesse de marque "compliance by default" et brûlerait QuadCore SAS au-delà de Centrium. Il faut donc absolument que les 15 items du sprint pré-prospection (CI sécu, Upstash, Sentry réel, restore drill, audit RLS automatisé en CI) soient cochés ligne par ligne **avant** d'envoyer le 1er email à un prospect réel.

---

*Document destiné au business plan défendable face à un investisseur (Seed 500k€-1M€), à un banquier (BPI prêt amorçage), ou à un board client (1er contrat ESN). Synthèse de 5 audits indépendants : code, sécurité, produit, ops, vitrine. Version 1.0 — 15 juin 2026.*
