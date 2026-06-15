# Audit Vitrine / Brand / Go-to-Market — Centrium

> Auditeur : VP Marketing SaaS B2B (ex-Qonto / ex-Spendesk).
> Périmètre : `https://www.centrium-platform.com` + composants marketing du repo `quadcore-platform/`.
> Date : juin 2026. Statut produit : v1.0 livrée, 0 client payant.
> Référentiel de polish : Pennylane, Qonto, Lemonway, Spendesk.

---

## 1. Architecture du site vitrine (pages, hiérarchie, conversion funnel)

Le site est compact, propre, **stratégiquement focalisé sur un seul CTA primaire : `/devis`**. C'est un choix mature pour une early-stage : pas d'éparpillement, pas de 12 sous-pages produit.

Pages publiques détectées :
- `/` (Home) — Hero + Pillars + LiveDemos + Trio de portes + Metrics + Testimonials + CTA finale
- `/plateforme` — Modules + ProductShowcase + HowItWorks + TrustedBy + PricingPreview + Contact
- `/engagements` — Manifesto + 6 piliers sécu + 4 blocs conformité + CTA
- `/pricing` — Sur devis (5 critères + 3 personas + FAQ + CTA)
- `/devis` — Formulaire commercial complet (entreprise, contact, helpOptions, logo upload, message)
- `/trust` — Trust Center (6 sections : sécu, RGPD, sous-traitants, certifications, SLA, divulgation)
- `/legal/*` — privacy / mentions / cgu / cookies / dpa / subprocessors / responsible-disclosure
- `/login`, `/manifesto`, `/security` (probable miroir interne)
- `/.well-known/security.txt`, `/llms.txt`

**Funnel de conversion** : Home → Plateforme OU Engagements OU Pricing → Devis. Quatre points d'entrée convergent tous vers le même formulaire. La hiérarchie est claire.

**Ce qui manque** :
- Pas de page **`/blog`** ni `/ressources` (zéro contenu SEO long-tail, zéro acquisition organique inbound).
- Pas de page **`/case-studies`** ni `/clients` (le `CASE_STUDY_TEMPLATE.md` existe en doc interne mais n'est pas publié).
- Pas de page **`/integrations`** (Sage, Pennylane, Slack, Outlook, SSO sont mentionnés mais aucune page dédiée → mauvais pour SEO "Centrium Sage", "Centrium Pennylane").
- Pas de page **`/changelog`** ni **`/roadmap`** publique (signal "produit vivant" attendu par les acheteurs SaaS B2B).
- Pas de **`/about`** ni `/équipe` (faute critique pour fonder la confiance quand il n'y a pas encore de logos clients).
- Pas de **calculateur ROI** (le `ROI_GUIDE.md` existe en doc interne, pas exposé en lead magnet).
- Pas de **`/comparatif`** vs Boondmanager, Cegid, Akuiteo (énorme opportunité SEO bottom-funnel).

**Note architecture : 7/10** — squelette propre, mais 5-6 pages clés manquent pour soutenir une vraie acquisition.

---

## 2. Messaging & positionnement (clarté, différenciation vs Boondmanager/ConnectWise)

Le messaging est **éditorial premium**, très typé Qonto/Linear : phrases courtes, italiques serif accent, vocabulaire haut-de-gamme ("salle de pilotage", "orchestrée", "flux continu", "0 invention").

**Promesse** :
> « L'ESN moderne, orchestrée. La salle de pilotage des cabinets de conseil et ESN exigeants. Consultants, missions, CV, facturation — un seul flux, sans friction, hébergé en Europe. »

**Forces messaging** :
1. Le triptyque pédagogique **"Le métier d'abord / IA assistée pas autonome / Conformité par défaut"** est l'angle le plus différenciant et le plus mémorable du site. C'est l'équivalent du "Spend faster, smarter" de Spendesk.
2. La phrase **"0 invention"** sur le CV Optimizer est un wedge messaging brillant pour le marché ESN qui craint l'IA hallucinatoire dans un livrable contractuel.
3. L'angle anti-Excel ("Le staffing ne devrait pas être un sport d'endurance Excel") sur `/engagements` parle directement à la douleur quotidienne des BMs.

**Faiblesses messaging** :
1. **Pas de comparatif explicite vs Boondmanager**. Le leader (~1500 clients) est l'éléphant dans la pièce. Sans un wedge "Centrium vs Boondmanager" affiché, le prospect ne sait pas pourquoi vous quitter. Pennylane a explicitement positionné "Pennylane vs Sage" pour gagner ; vous devez faire pareil.
2. **Le positionnement "moderne" est mou**. "Moderne" est ce que disent tous les concurrents (Cegid se dit moderne aussi). Il faut un wedge dur : "le seul ESN-OS avec IA assistée certifiée 0-invention", "la première plateforme ESN cloud-native post-2024", ou "Boondmanager prend 4 mois à déployer — Centrium 15 minutes".
3. **Le mot "ESN" est gardé partout, mais "cabinet de conseil" est moins servi**. Vous adressez deux ICP différents avec un seul message. Spendesk segmente sa home par persona ; envisagez `/esn` et `/cabinet-conseil` au minimum dans le H2.
4. **Pas de "category creation"**. Vous appelez ça "plateforme métier ESN" — c'est descriptif, pas catégorique. Qonto a créé "compte pro tout-en-un", Spendesk "spend management". Trouvez votre catégorie ("ESN Operating System" ? "Staffing OS" ?).

**Note messaging : 6.5/10** — voix forte et premium, mais wedge concurrentiel absent et catégorie non revendiquée.

---

## 3. Brand identity (palette, typo, ton, cohérence)

**Excellente surprise** : la brand identity est au niveau d'une série A SaaS premium. C'est probablement le meilleur asset du site.

**Palette** :
- Fond noir profond (#000) → posture luxe/cockpit, contre-pied total du blanc clinique de Boondmanager
- Magenta/terracotta (#E11D74-ish) → accent chaud, distinctif, mémorable
- Violet glow → halo IA assumé
- Cyan/emerald → métriques live

**Typographie** :
- **Space Grotesk** display (titres) → moderne, géométrique, signature
- **Inter** sans (body) → standard SaaS, lisible
- **Instrument Serif italique** (accents éditoriaux) → c'est LA signature, très Vogue/New Yorker. Personne sur le marché ESN n'a ça.

**Animations** :
- Hero 3D Starfield warp, AnimatedOrb, AuroraField, GalaxyField, NetworkCanvas, SolarSystem, ShaderShowcase, MagneticButton
- BootIntro (séquence d'amorçage)
- LoadingSplash, PageReveal
- Halos color-cycle au hover sur les cards

**Cohérence** : forte. Le wordmark Centrium est posé, la palette tient sur toutes les pages, les divider patterns (`qc-section-divider`, `qc-italic-accent`) sont systémiques.

**Risques brand** :
1. **Trop de moteur 3D peut casser la perf** sur mobile bas de gamme et hurter le LCP. À auditer avec PageSpeed.
2. **Le ton "magazine"** (titres à 4.5rem en italique serif) est sublime mais peut éloigner un acheteur très conservateur (DAF d'ESN 55 ans). Mais cette cible n'est sans doute pas votre primary persona.
3. **Pas de mode light pour le marketing public** : choix radical assumé (forced dark dans `layout.tsx`). C'est cohérent avec le positionnement premium mais 0% des concurrents font ça, donc à assumer comme un parti pris fort.

**Note brand : 9/10** — niveau Qonto/Pennylane confirmé. C'est votre meilleur actif.

---

## 4. Hero + value prop (qualité du hook)

```
L'ESN moderne,
orchestrée.

La salle de pilotage des cabinets de conseil et ESN exigeants.
Consultants, missions, CV, facturation — un seul flux, sans friction,
hébergé en Europe.

[Demander une démo]  [Voir la plateforme]
Onboarding accompagné · Hébergement européen
```

**Ce qui fonctionne** :
- "Orchestrée" en italique serif → posture éditoriale immédiate
- Liste courte de 4 verticales métier (consultants/missions/CV/facturation) → on comprend le scope en 2 secondes
- "Hébergé en Europe" → trust signal immédiat
- CTAs hiérarchisés (primary gradient + secondary ghost)

**Ce qui manque** :
1. **Pas de social proof above the fold**. Pas de logos clients (vous n'en avez pas — assumez-le avec "Built with 3 design partners" ou similaire), pas de mention "X ESN nous font confiance", pas de quote.
2. **Pas de visuel produit**. Pour un SaaS B2B, c'est lourd : Pennylane, Qonto, Spendesk montrent un screenshot/mockup de l'app dès le H1. Vous montrez un Starfield 3D. C'est joli, c'est éditorial, mais on ne sait pas à quoi ressemble le produit. **Risque concret : prospect part avant scroll**.
3. **Pas de chiffre dans le hero**. "Réduisez de 80% le temps de réponse aux AO" ou "30 minutes de la mission ouverte au CV envoyé" sont absents.
4. **CTA secondaire faible** : "Voir la plateforme" est une redirection, pas un soulagement. Tester "Voir une démo de 2 min" (vidéo intégrée).

**Note hero : 6/10** — beau mais trop "agence créative" pour un SaaS. Le hook doit ajouter un proof point (chiffre, screenshot, logo) above the fold.

---

## 5. Pages produit (plateforme, fonctionnalités, démo)

`/plateforme` est la page la plus dense et la plus convaincante du site. Enchaînement :
- Modules (4 modules détaillés avec bullets concrets)
- ProductShowcase (mockup dashboard + dialogue d'IA)
- HowItWorks (3 étapes onboarding 15 min)
- TrustedBy (badges RGPD / AES-256 / EU hosting / Multi-tenant RLS / DPA)
- PricingPreview (highlights commerciaux)
- Contact

**Forces** :
- Le bloc Modules a une vraie densité utile (4 bullets concrets par module, vocabulaire métier juste : "DOCX, PDF, scan", "TJM cible", "intercontrat", "Sage/Pennylane export")
- Le ProductShowcase montre enfin une UI (dashboard avec "Marc, BM senior", "+18% CA", "3 consultants correspondent à Capgemini Tech Lead React") → c'est le seul endroit où on voit le produit
- LiveDemos (sur la home) joue 3 mini-scénarios animés (CV draft → CV brandé / Matching mission Capgemini / CRA → facture 13 000 €) → très smart, c'est le meilleur asset démo

**Faiblesses** :
- **Pas de page dédiée par module** : `/plateforme/cv-optimizer`, `/plateforme/matching`, `/plateforme/cra-facturation`. Chaque module mérite sa landing pour SEO long-tail et pour rep commerciaux qui envoient un lien ciblé. Spendesk a une page par cas d'usage.
- **Pas de vidéo produit 90s**. Sur Loom ou Wistia, scriptée. Indispensable pour pré-qualifier en silencieux avant la démo.
- **Pas de Loom / Storylane démo cliquable** (interactive product tour). Devkit ou Navattic font ça en 2 jours.
- **Pas de screenshots PNG haute résolution** dans une galerie. Les mockups React animés sont sublimes mais lourds — un fallback PNG aide aussi pour les decks commerciaux et les emails.
- **Le bloc "ProductShowcase" texte "Marc, BM senior"** est en français en dur dans le dict mais le mockup reste pauvre en preuves (pas de capture réelle de la console de matching, pas de vrai PDF CV brandé exposé).

**Note pages produit : 7/10** — bonne densité, vrais bullets, mais manque pages-par-module + vidéo + storylane.

---

## 6. Page tarifs (présente ? claire ? sur-mesure ?)

`/pricing` existe et est **bien construite** :
- Hero "Un seul prix : le vôtre"
- 3 badges (réponse 24-48h / aucun engagement / hébergement EU)
- 5 critères de calibrage (volume consultants, utilisateurs ESN, modules IA, intégrations, conformité)
- 3 personas avec bullets (ESN en croissance / Cabinet conseil / Groupe-ETI)
- FAQ (4 questions dont "pourquoi pas de grille publique")
- CTA "Demander un devis"

**Analyse stratégique** :

Le choix **"pas de pricing public"** est **défendable mais discutable** :

**Pour** :
- Vous adressez 10-200 consultants → la fourchette est tellement large que le prix public effraierait les petits et déclasserait les gros
- Pas de risque de "ancrage tarifaire concurrent" (Boondmanager ne peut pas répliquer si le prix n'est pas posé)
- Permet d'optimiser la marge contrat par contrat en début

**Contre** :
- **Friction massive en haut du funnel**. Au moins 40-60% des visiteurs B2B SaaS qualifient via le pricing. Sans grille → ils partent chez Boondmanager qui a un simulateur public.
- **Pas favorable au SEO BOFU**. La query "centrium prix" ou "centrium tarif" n'a rien à indexer. Concurrents : "boondmanager prix" est searché ~150 fois/mois.
- **Signal de défiance** pour un acheteur PME français qui veut comparer 3 outils en 30 min.

**Recommandation strong** :
- Garder "Sur devis" comme positionnement principal MAIS afficher une **fourchette indicative** : "à partir de X €/consultant/mois, dégressif au-delà de 50 consultants". Pennylane fait ça. Lemonway aussi.
- Ajouter un **calculateur** : "Combien de consultants gérez-vous ? [slider 10→500] → Estimation indicative : Y €/mois". Vous obtenez le lead ET le qualifiez en même temps.

**Note pricing : 6.5/10** — bien designée mais le choix "100% sur devis" est trop friction pour démarrer la prospection cold.

---

## 7. Trust signals (Trust Center, légal, sécurité, certifications affichées)

C'est **l'autre grande force** du site. Le niveau d'investissement est très au-dessus de la moyenne early-stage.

**Présents et solides** :
- `/trust` — Trust Center avec 6 sections (sécurité, RGPD, sous-traitants, roadmap SOC 2, SLA, disclosure)
- `/legal/privacy` + `mentions` + `cgu` + `cookies` + `dpa` + `subprocessors` + `responsible-disclosure`
- `/.well-known/security.txt`
- Badges RGPD / AES-256 / EU hosting / Multi-tenant RLS / DPA (composant TrustedBy)
- Page `/engagements` (6 piliers sécu + 4 blocs conformité)
- Sous-traitants publics listés (Supabase EU, Vercel EU, Anthropic, Stripe EU, Resend) — **rare à ce stade**, excellent signal
- Roadmap certif publique (SOC 2 Type I Q4 2026, Type II Q1 2027, ISO 27001 Q2 2027) — assumée comme NOT YET, c'est très bien
- Cookie banner conforme CNIL (essentiel + analytics opt-in)
- Bandeau "12 mois minimum d'engagement" assumé en FAQ pricing

**Ce qui manque** :
1. **Status page publique**. Le lien `status.centrium-platform.com` est cité mais probablement vide ou à monter (Better Stack / Statuspage / Instatus à 30 €/mois). Sans ça, le SLA 99.9% est de la pure parole.
2. **Pas de **badge "Hébergé chez Vercel + Supabase"** assumé visuellement** alors que c'est crédibilisant pour un acheteur tech.
3. **Pas de rapport de pentest** (planifié Q4 2026 selon trust center, donc cohérent — mais à publier ASAP).
4. **Pas de "DPA signable en ligne"** (DocuSign ou similaire embed). Demande email = friction.
5. **Pas de mention sectorielle CNIL / référencement Cyber Score** si applicable.

**Note trust : 8.5/10** — meilleur Trust Center de votre catégorie pour un produit à 0 client. **Argument de vente massif**.

---

## 8. Social proof (témoignages, logos clients, case studies, badges sécurité)

C'est **le plus gros gap** du site et le **plus gros frein commercial**.

**Présents** :
- 2 témoignages anonymisés ("Directeur général · ESN 38 consultants" + "Business Manager Senior · Cabinet conseil 62 consultants")
- Note honnête "Témoignages clients · noms et organisations préservés à leur demande"
- Badges sécu (RGPD / AES-256 / EU hosting / Multi-tenant RLS / DPA) → indirect proof

**Absents** :
- **Aucun logo client** (vous n'en avez pas — il faut donc une stratégie alternative)
- **Aucune case study** publiée (`CASE_STUDY_TEMPLATE.md` existe en doc interne, jamais sorti)
- **Aucun chiffre de traction** ("X consultants gérés sur la plateforme", "Y CVs optimisés", "Z missions matchées")
- **Aucun témoignage vidéo**
- **Aucun "as seen in" presse / podcasts / Maddyness / Frenchweb / Les Echos**
- **Aucun rating G2 / Capterra / GetApp / Truspilot**
- **Aucun NPS affiché**

**Risque commercial** : un BM de Capgemini qui visite Centrium va se demander **"qui d'autre utilise ça ?"** et trouver zéro réponse. C'est la friction n°1 d'un SaaS B2B early.

**Hack à mettre en place immédiat** :
1. **Stratégie "Design Partner"** : signez 3 ESN gratuites ou à 50% en échange du droit d'afficher leur logo et de tourner une case study vidéo de 2 min. Spendesk a fait ça en 2017.
2. **Badge "Soutenu par BPI / Station F / French Tech"** si applicable
3. **Logos d'investisseurs** si vous levez (Eutopia, Serena, Frst…)
4. **Chiffres internes assumés** : "Construit avec 3 ESN partenaires sur 18 mois", "1 200 tests de matching en QA", "60 migrations SQL versionnées" → preuves d'effort à défaut de preuves d'usage

**Note social proof : 3/10** — bloquant pour prospection à froid. À régler en priorité 1.

---

## 9. SEO & GEO (technique, contenu, llms.txt, AI search readiness)

**Technique SEO : très bon**
- `robots.ts` propre avec règles per-agent (Googlebot + GPTBot + ClaudeBot + PerplexityBot + Bingbot + Applebot-Extended + Google-Extended + CCBot + anthropic-ai + cohere-ai) → c'est un **niveau 2025-2026** que 95% des concurrents n'ont pas
- `sitemap.ts` avec alternates FR/EN sur 10 pages
- `metadata` Next.js complet (OG, Twitter, canonical, locale, keywords)
- JsonLd composants (Organization, Breadcrumb, FAQ, Plateforme, Devis) → schema markup en place
- `opengraph-image` dynamique
- Preconnect fonts Google
- `manifest.webmanifest`
- `apple-icon` + `icon`

**GEO / AI Search : excellent**
- `/llms.txt` détaillé (key facts, modules, pages, contact)
- ClaudeBot, GPTBot, PerplexityBot explicitement allowed
- Description structurée pour citation IA

**Contenu SEO : presque inexistant**
- **0 article de blog**
- **0 page comparatif** ("centrium vs boondmanager", "alternative boondmanager", "logiciel ESN")
- **0 page sectorielle** (ESN portage / ESN cybersec / cabinet de conseil RH…)
- **0 page intégration** (Sage, Pennylane, Stripe, Slack)
- **0 contenu BOFU** ("template fiche de poste consultant", "modèle CRA gratuit", "checklist appel d'offres ESN")

**Conséquence directe** : vous ne capterez **AUCUN trafic organique** avant 12-18 mois si vous ne lancez pas un contenu hub dès maintenant.

**Note SEO technique : 9/10** — Note SEO contenu : 2/10. **Moyenne : 5.5/10**.

---

## 10. Conversion (CTAs, formulaire devis, friction, follow-up)

**CTAs** :
- CTA primaire "Demander une démo" / "Demander un devis" → 100% des pages
- CTA secondaire "Voir la plateforme" → consistent
- Magnetic buttons (effet hover premium)
- Pas de chatbot / pas d'Intercom / pas de Calendly embed sur Home → friction +1
- Pas de "Book 15-min call" direct sur Cal.com → friction +1

**Formulaire `/devis`** :
- 5 sections : entreprise / contact / aide / logo / message
- 8 helpOptions cochables (template CV, contrat, logo, charte couleurs, mentions, signature, fiche de poste, autre)
- Upload logo PNG/SVG (UX cohérente avec promesse "espace à votre image")
- Légal RGPD assumé
- Tutoiement assumé ("Décris-nous ton ESN") — choix générationnel cohérent avec la cible BM 30-45 ans
- Page de confirmation "Demande envoyée ✓ · réponse sous 24-48h"

**Forces du formulaire** :
- Le bloc "aide" est génial : il qualifie le besoin (template CV, logo, charte) ET permet de chiffrer un onboarding personnalisé. Spendesk fait ça (cochez modules désirés).
- 24-48h annoncé est honnête et tenable
- Bonne UX mobile

**Frictions** :
1. Le formulaire est **long** (12+ champs) pour un premier contact. Hubspot recommande 3-4 champs MAX en cold inbound. Idéal : "split funnel" — premier formulaire à 3 champs (nom, email, taille équipe) → page de confirmation avec calendrier Calendly direct ; second formulaire long uniquement après book.
2. **Pas de Calendly / Cal.com embed** post-soumission → délai 24-48h = 30% de perte de leads chauds
3. **Pas d'email de confirmation visible dans le copy** (alors qu'il existe probablement côté Resend)
4. **Pas de A/B test** sur les CTAs (variantes "Voir une démo de 2 min" / "Calculer mon prix" / "Tester gratuitement 14 jours")
5. **Pas de "trial" / pas de "freemium 1 consultant"** → 0 self-serve, 100% sales-led. C'est cohérent avec votre cycle B2B 2-6 mois mais bouche le funnel TOFU.

**Follow-up** : non auditable depuis le repo (CRM / sequence email non visible).

**Note conversion : 6/10** — formulaire bien fait mais friction réelle en haut de funnel. Calendly embed = quick win.

---

## 11. Manque pour démarrer prospection — TOP 10

1. **3 logos clients (design partners) ou 3 case studies anonymisées avec chiffres** — bloquant social proof
2. **Calendly / Cal.com embed sur Home + `/devis`** — quick win conversion
3. **Vidéo produit 90s** (Loom ou Wistia, scriptée) intégrée dans le Hero et le pitch deck
4. **Page comparatif `/centrium-vs-boondmanager`** — BOFU SEO + arme de la force de vente
5. **Fourchette de prix indicative** sur `/pricing` (calculator avec slider consultants → estimation €/mois)
6. **Status page publique** (Better Stack 30 €/mois) — crédibilise le SLA 99.9%
7. **Storylane / Navattic product tour interactif** sur `/plateforme` — pré-qualifie en silencieux
8. **Page "À propos / Équipe"** avec photos fondateurs, parcours, mission — fonde la confiance quand il n'y a pas de logos
9. **3-5 articles de blog SEO BOFU** ("comment répondre à un AO ESN", "calculer un TJM consultant", "optimiser son intercontrat") — démarre l'inbound
10. **Pixel Facebook + LinkedIn Insight Tag + Google Tag Manager** correctement posés — sinon zéro retargeting possible sur trafic payant

---

## 12. Quick wins (top 10 sur 30 jours)

1. **Embed Cal.com / Calendly** sur `/devis` (gain conversion estimé +20-40%)
2. **Ajouter un screenshot produit haute résolution** dans le Hero (réduit le doute "à quoi ça ressemble")
3. **Tourner 1 vidéo produit 90s** (Loom scriptée, voix-off Salim, sous-titres) — 2 jours de boulot
4. **Lister 3 chiffres assumés sur la Home** ("60 migrations SQL", "38 tables RLS-protégées", "Construit avec 3 ESN partenaires") — preuve d'effort à défaut de preuve d'usage
5. **Page comparatif `/centrium-vs-boondmanager`** : tableau feature parity + différenciateurs (15 lignes, 1h de copy)
6. **Calculateur prix** sur `/pricing` : slider 10→500 consultants → estimation indicative € — 1 jour de dev
7. **Status page** Better Stack ou Instatus (gratuit en starter) connecté à 3 endpoints Centrium
8. **Page `/about`** avec photo Salim + 200 mots manifesto + raison d'être — 2h
9. **Premier article de blog** : "Pourquoi nous avons construit Centrium" (post-fondateur, distribuable LinkedIn) — 3h
10. **LinkedIn Insight Tag + Plausible/PostHog** : track conversion par page pour piloter — 30 min

---

## 13. Verdict vitrine /10

| Critère | Note |
|---|---|
| Architecture | 7/10 |
| Messaging | 6.5/10 |
| Brand identity | 9/10 |
| Hero | 6/10 |
| Pages produit | 7/10 |
| Pricing | 6.5/10 |
| Trust signals | 8.5/10 |
| Social proof | 3/10 |
| SEO technique | 9/10 |
| SEO contenu | 2/10 |
| Conversion | 6/10 |

**Note globale vitrine : 6.5/10**

Le site est **au-dessus de la moyenne** pour un SaaS B2B early-stage français. Il est **au niveau Pennylane 2018, Qonto 2017** côté polish et trust, mais à **3 ans de retard** côté social proof, contenu SEO et conversion in-funnel.

C'est une **vitrine d'agence créative qui veut devenir une vitrine commerciale**. Il manque 30 jours de hustle (vidéo, calculateur, Calendly, comparatif, page about) pour qu'elle soit prête à recevoir du trafic payant.

---

(Audit produit pour QuadCore SAS / Centrium · v1.0 · juin 2026.)
