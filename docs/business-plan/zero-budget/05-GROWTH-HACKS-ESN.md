# 05 — 20 Growth Hacks Non-Conventionnels pour Centrium

> Produit : **Centrium by QuadCore SAS** — SaaS B2B vertical ESN françaises
> URL : https://www.centrium-platform.com
> Contexte : v1.0 livrée Q2 2026, 0 client payant, fondateur solo (Salim), 0 € budget marketing
> Objectif : 5 clients payants signés en 12 mois, note maturité 9/10, sans dépenser un euro de cash externe (hors API Anthropic usage + domaine ~10 €/an)

Document écrit pour être exécuté **dès lundi prochain**. Pas de théorie, que du concret.

---

## Préambule : la psychologie du marché ESN français

Avant de hacker, comprendre la cible :

- **Dirigeants ESN FR** : 40-55 ans en moyenne, peu présents sur Twitter/X, **massivement sur LinkedIn**, lisent Maddyness / Les Échos / Décideurs Magazine.
- **Cycle de décision long** (3-6 mois) mais **ticket annuel élevé** (5-25 k€/an pour 20-100 consultants).
- **Outil de référence à battre** : Boondmanager (leader historique, ~3000 clients ESN FR), Whoz, Stafiz, Cleemy.
- **Douleur n°1 partagée** : staffing manuel sous Excel + intercontrat coûteux + CV mal formatés envoyés aux clients finaux.
- **Trigger d'achat** : un BM perd un deal parce qu'il n'a pas trouvé le bon consultant à temps. C'est là qu'ils signent.
- **Communautés actives** : Syntec Numérique, Munci, groupes LinkedIn "Dirigeants ESN", "Business Managers ESN", "Recruteurs IT".

---

## CATÉGORIE 1 — FOUNDER-LED SALES HACKS (5)

### Hack #1 — Cold DM LinkedIn ultra-personnalisé "50/sem" (le hook compétiteur)

**Description précise :**
Chaque lundi, identifier 50 dirigeants d'ESN FR de 20-150 consultants via LinkedIn Sales Navigator **plan gratuit 1 mois** (renouvelable via comptes secondaires). Cibler les ESN dont on **voit publiquement** sur leur site une page "Nos consultants" mal foutue ou un PDF CV téléchargeable horrible (le hook). Message DM en 4 phrases :
1. "Je suis tombé sur le CV de [Nom Consultant] sur votre page — il est en PDF lourd et il manque [élément concret]."
2. "Vos concurrents [Concurrent X] présentent leurs profils avec un format brandé interactif."
3. "J'ai construit Centrium pour ce problème exact. Voici 1 capture de ce que ça donnerait avec votre charte → [image]."
4. "Ça vous intéresse 15 min vendredi pour que je vous montre votre propre catalogue refait ?"

**Pourquoi ça marche pour Centrium :**
- Les ESN FR utilisent encore massivement Word/PDF pour les CV → douleur visible **publiquement** sur leur site.
- Dirigeant ESN = ego fort sur le branding de sa boîte → un screenshot de "leur" CV refait, ça fait mouche.
- Pas une demande de demo générique : tu arrives avec **un livrable** déjà commencé.

**Effort fondateur :** 6-8 h/sem (recherche cibles + génération screenshots via Centrium).

**Délai résultat :** 3 RDV qualifiés / sem dès semaine 2. Premier deal signable en 60-90 j.

**Risque / contre-indication :**
- Banni de LinkedIn si volume > 80 DM/sem ou taux de spam reports > 1 %. Reste sous 50.
- Risque image si le screenshot est foireux → toujours vérifier le rendu avant envoi.

**Exécution cette semaine :**
- Lundi : liste 50 ESN via la recherche LinkedIn (filtre : taille 11-200, secteur IT services, France).
- Mardi-mercredi : pour 10 d'entre elles, générer un mockup PDF de **leur catalogue refait** avec Centrium (importer 2-3 profils trouvés sur leur site).
- Jeudi : envoyer les 50 DM (10 avec screenshot, 40 avec hook texte seul pour mesurer le delta).
- Vendredi : suivi des répondeurs.

---

### Hack #2 — "Audit gratuit de votre staffing" (livrable PDF brandé)

**Description précise :**
Créer un livrable PDF de 8-12 pages **"Audit Staffing 360° — [Nom ESN]"** offert gratuitement à 10 ESN cibles/mois. L'audit analyse publiquement disponible : nombre de consultants visibles sur LinkedIn, ancienneté moyenne, technologies affichées, comparaison vs 3 concurrents, estimation de l'intercontrat à partir des profils marqués "open to work". Page finale : "Comment Centrium résoudrait les 3 problèmes identifiés."

**Pourquoi ça marche pour Centrium :**
- Le format "audit" est légitime dans le monde du conseil → un dirigeant ESN sait recevoir ce type de livrable.
- Tu démontres la **valeur analytique** de Centrium sans même qu'ils logguent.
- Effet réciprocité massif : tu as fait 4 h de boulot pour eux → ils acceptent un call.

**Effort fondateur :** 4 h/audit la première fois, 1,5 h ensuite (template Notion + automatisation via Claude API).

**Délai résultat :** Taux de réponse ~25 % → 2-3 RDV / batch de 10 audits. Premier deal en 45-75 j.

**Risque / contre-indication :**
- Si audit superficiel → effet inverse (tu perds de la crédibilité). Investir 4 h sur les 3 premiers pour cadrer la qualité.
- Ne JAMAIS publier l'audit sur ton site sans accord → RGPD + diffamation potentielle.

**Exécution cette semaine :**
- Lundi : créer le template Notion "Audit Staffing 360°" (10 sections, blocs réutilisables).
- Mardi : Claude API → générer le squelette d'audit pour ESN cible n°1 (ex: Akkodis, Devoteam).
- Mercredi : finition manuelle + export PDF avec logo Centrium en footer.
- Jeudi : envoi par mail nominatif au DG + DM LinkedIn de suivi.
- Vendredi : 2e audit en pipeline.

---

### Hack #3 — "Sparring Session" 45 min gratuite avec dirigeant ESN

**Description précise :**
Page dédiée `centrium-platform.com/sparring` : "45 min en visio avec Salim (fondateur Centrium) pour challenger votre stratégie staffing 2026. Pas de demo, pas de pitch. Vous repartez avec 3 actions concrètes." Calendly Free embedded. Posté chaque semaine sur LinkedIn avec témoignage ("J'ai fait 20 sparring sessions ce trimestre, voici les 5 patterns qui reviennent").

**Pourquoi ça marche pour Centrium :**
- Les DG d'ESN adorent parler de leur boîte → format flatteur.
- Pas la pression "demo" → barrière à l'entrée très basse.
- Tu collectes une **research utilisateur en or** sur les vraies douleurs ESN 2026.
- À la fin du call, si fit → "On peut prolonger 15 min ? Je te montre comment Centrium résout les points 2 et 3 qu'on vient d'évoquer."

**Effort fondateur :** 1 h/session + 30 min prep = 6-8 h/sem si 4 sessions.

**Délai résultat :** Conversion sparring → deal ~15-20 %. Si 4 sessions/sem × 12 sem = 48 sparring → 7-9 deals potentiels en 90 j.

**Risque / contre-indication :**
- Phagocytage agenda : bloquer max 4 créneaux/sem.
- Tirer la valeur du call **pour eux**, pas pour toi (sinon réputation foirée vite via le bouche-à-oreille ESN très petit milieu).

**Exécution cette semaine :**
- Lundi : créer la page `/sparring` avec wording + Calendly Free.
- Mardi : poster sur LinkedIn (texte de 1200 caractères, hook = "J'ai parlé à 12 dirigeants d'ESN ce mois-ci. Voici ce qui les empêche de dormir.").
- Mercredi-vendredi : booking arrive, prep des 2 premières sessions.

---

### Hack #4 — Demo "vos données importées" (drag-drop CV → résultat brandé en live)

**Description précise :**
Pendant un RDV de discovery, demander : "Envoie-moi 3 CVs de tes consultants par mail maintenant, je te montre dans 5 min ce que ça donne." Tu importes via Centrium, tu applies leur charte (logo de l'ESN, couleurs scrappées via WebFetch sur leur site), tu partages l'écran et tu fais défiler **leur catalogue Centrium** avec leurs vrais consultants. Effet "Wow" garanti.

**Pourquoi ça marche pour Centrium :**
- Centrium a un **CV optimizer** + templates de catalogue → c'est le moment où tu transformes une promesse en preuve visible.
- "Aha moment" en LIVE pendant le call → bypass de la friction "il faut que je teste plus tard".
- Le DG visualise déjà ses commerciaux utiliser l'outil → projection immédiate.

**Effort fondateur :** 0 h additionnel (s'inscrit dans le call discovery).

**Délai résultat :** Conversion demo → POC payant ×2 vs demo générique. Effet immédiat sur le pipeline.

**Risque / contre-indication :**
- Si le rendu plante en live → catastrophique. Tester l'import sur 10 formats de CV différents avant de lancer ce hack en client.
- RGPD : ne JAMAIS garder les CVs importés. Suppression devant eux en fin de call ("Voilà, je supprime maintenant").

**Exécution cette semaine :**
- Lundi-mardi : stress-test l'import CV sur 20 formats (Word ancien, PDF scanné, LinkedIn export, Europass, etc.).
- Mercredi : créer un script "demo en 5 min" reproductible (étapes + minuteur).
- Jeudi : 1er test live sur le prochain prospect.

---

### Hack #5 — "Reverse pitch" : interviewer les déçus de Boondmanager / Whoz / Stafiz

**Description précise :**
Sur G2, Capterra, Trustpilot, LinkedIn, identifier les **avis négatifs ou tièdes** sur Boondmanager / Whoz / Stafiz. Contacter l'auteur en MP : "J'ai vu votre avis sur [outil]. Je construis Centrium qui résout le point que vous mentionnez. Pouvez-vous me dire 20 min en quoi [outil] vous a déçu ? En échange je vous offre un accès Centrium gratuit 6 mois."

**Pourquoi ça marche pour Centrium :**
- Audience pré-qualifiée : ils sont déjà clients d'un outil concurrent = budget existant.
- Ils ont déjà vécu l'onboarding, donc ils savent **vraiment** ce qu'ils veulent.
- 6 mois gratuits = barrière nulle, et si la valeur est là, ils paieront à mois 7.

**Effort fondateur :** 3-4 h/sem (recherche + interviews).

**Délai résultat :** 2-3 conversions en 90 j sur 20-30 contactés. Bonus : ces utilisateurs deviennent souvent **case studies** publics.

**Risque / contre-indication :**
- Les écosystèmes ESN FR se connaissent : ne JAMAIS attaquer frontalement Boondmanager dans le DM. Format : "Je résous un cas d'usage spécifique."
- 6 mois gratuits = engagement. Préciser que ce n'est valable qu'aux 10 premiers pour créer scarcity.

**Exécution cette semaine :**
- Lundi : scrape les avis G2/Capterra de Boondmanager/Whoz (~50 avis publics).
- Mardi : trier les 15 avis 1-3 étoiles avec auteur identifiable.
- Mercredi : envoyer 15 DM LinkedIn personnalisés.
- Jeudi : caler les 3 premiers calls.

---

## CATÉGORIE 2 — COMMUNITY-LED GROWTH (5)

### Hack #6 — Prise en main / création groupe LinkedIn "Dirigeants ESN France"

**Description précise :**
Option A : créer "Dirigeants ESN France 2026" (groupe LinkedIn). Option B (plus malin) : identifier 5-10 groupes LinkedIn existants sur la thématique, **proposer aux admins inactifs** de devenir co-admin "pour relancer la dynamique". Tu poses 1 question/sem ("Comment vous gérez l'intercontrat ?"), tu publies 1 ressource gratuite/mois (template Excel, baromètre).

**Pourquoi ça marche pour Centrium :**
- Les dirigeants ESN cherchent du peer-to-peer (rare et précieux).
- Owner d'un groupe = autorité implicite → quand tu pitches Centrium en MP, tu n'es plus "un vendor random".
- Visibilité gratuite et récurrente sur ta cible exacte.

**Effort fondateur :** 2-3 h/sem.

**Délai résultat :** 500 membres en 90 j si actif. 2-3 deals issus directement du groupe en 6 mois.

**Risque / contre-indication :**
- Promo trop directe = bannissement du groupe. Règle : 90 % de valeur, 10 % de mention Centrium en signature.

**Exécution cette semaine :**
- Lundi : recherche LinkedIn "ESN France" + tri par taille et activité.
- Mardi : DM aux 5 admins de groupes avec dernière activité > 6 mois.
- Mercredi : créer en parallèle le groupe "Centrium Cercle — Dirigeants ESN" (filet de sécurité).
- Jeudi : premier post de valeur.

---

### Hack #7 — Podcast "Centrium Cercle" : 1 invité dirigeant ESN/sem

**Description précise :**
Format audio 30 min, distribué Spotify/Apple Podcasts/LinkedIn audio. Stack 100 % gratuite : Riverside.fm Free tier (2 h/mois) ou Zencastr Free. Invités : dirigeants d'ESN 50-200 personnes. Questions formatées : "Ton plus gros échec staffing ?", "Comment tu gagnes un deal contre [Akkodis] ?", "Quel est ton outil daily ?". Tu publies un extrait carré vidéo (audiogramme via Headliner Free) sur LinkedIn.

**Pourquoi ça marche pour Centrium :**
- Les dirigeants ESN acceptent quasi-systématiquement → ego massage + visibilité pour eux.
- Pendant l'enregistrement tu construis une relation 1:1 avec un futur prospect / ambassadeur.
- Les autres dirigeants écoutent → effet "social proof" décuplé.

**Effort fondateur :** 4-5 h/épisode (prep + tournage + édition + promo).

**Délai résultat :** Épisode 1-5 → réseau qui se construit. Épisode 6+ → premiers leads inbound qui te disent "j'ai écouté X chez toi". Premier deal direct en 60-90 j.

**Risque / contre-indication :**
- Engagement long terme (1 ép/sem pendant 6 mois minimum sinon ça meurt). Mieux vaut 1/2 sem que d'abandonner.
- Qualité audio crap = mort. Investir 0 € mais bien régler micro casque (Auriculaires Apple à la rigueur).

**Exécution cette semaine :**
- Lundi : créer la liste de 30 invités cibles (dirigeants ESN 30-200 pers, profil LinkedIn actif).
- Mardi : envoi de 10 invitations personnalisées en MP LinkedIn.
- Mercredi : set up Riverside + template intro/outro.
- Jeudi : enregistrer un épisode pilote en solo (ton "manifeste") pour le push d'inauguration.

---

### Hack #8 — Slack "BM Connect" : communauté gratuite pour Business Managers ESN

**Description précise :**
Créer un Slack gratuit (workspace Free, illimité en messages depuis 2024) pour les **Business Managers** d'ESN (les opérationnels, pas les DG). Channels : `#intercontrat`, `#sourcing`, `#templates-cv`, `#salaires-marché`, `#outils`, `#offtopic`. Toi en animateur + 5-10 "founding members" recrutés via tes DM. Règle : pas de pitch d'éditeurs, sauf un "vendor day" mensuel où tu présentes Centrium aux participants.

**Pourquoi ça marche pour Centrium :**
- Les BM = **utilisateurs quotidiens** de Centrium → ce sont eux qui demanderont à leur DG d'acheter.
- Bottom-up sales : tu sèmes chez les opérationnels, tu récoltes chez les décideurs.
- Aucune communauté FR n'existe pour cette cible (vérifié) → first mover advantage absolu.

**Effort fondateur :** 3 h/sem.

**Délai résultat :** 50 membres en 30 j, 200 en 90 j. 1er deal "bottom-up" en 90-120 j.

**Risque / contre-indication :**
- Modération chronophage si ça décolle. Recruter 2 co-modérateurs bénévoles dès 100 membres.
- Si tu pitch trop tôt → exode. Tenir 60 j sans aucune mention commerciale.

**Exécution cette semaine :**
- Lundi : créer le Slack workspace + structurer 6 channels + créer une charte courte.
- Mardi-mercredi : inviter en MP LinkedIn 30 BM d'ESN ciblées.
- Jeudi : lancer le premier sujet "Quel est votre coût intercontrat moyen 2026 ?"
- Vendredi : screenshots et publication LinkedIn pour amorcer la pompe.

---

### Hack #9 — Newsletter "État du staffing" — Substack gratuit

**Description précise :**
Newsletter hebdomadaire envoyée le mardi 8h sur Substack (gratuit, illimité). Format : 10 brèves de 3-4 lignes (chiffres marché, mouvements ESN, levée Tech FR, deal staffing, recrutement clé) + 1 outil de la semaine + 1 mini-analyse de 200 mots. Signature : "Salim, fondateur Centrium". CTA discret en footer.

**Pourquoi ça marche pour Centrium :**
- Format brèves = lu en 3 min dans le métro → addiction installée.
- Hebdo dans la boîte mail = ta marque devant les yeux du décideur **52 fois/an**.
- Substack a déjà du SEO + recommandations algorithmiques → croissance organique gratuite.

**Effort fondateur :** 3-4 h/sem (curation + rédaction via Claude API pour brouillon, finition manuelle).

**Délai résultat :** 100 abonnés en 30 j, 500 en 90 j (si bien promu sur LinkedIn). Conversion newsletter → deal ~2-3 % à 12 mois.

**Risque / contre-indication :**
- Si tu rates 2 semaines → mort. Préparer 4 numéros d'avance avant le lancement.
- Pas de pitch lourd : rapport valeur/promo = 95/5.

**Exécution cette semaine :**
- Lundi : créer le Substack `etatdustaffing.substack.com`, design minimal.
- Mardi : rédiger le numéro 0 "manifeste" (pourquoi cette newsletter existe).
- Mercredi-vendredi : préparer 4 numéros en avance (banque de brèves Notion).

---

### Hack #10 — Baromètre annuel "Marché ESN France 2026" co-créé avec Syntec / une école

**Description précise :**
Contacter Syntec Numérique, Munci, ou une école type Epitech / 42 / EFREI pour **co-signer** un baromètre annuel basé sur un sondage de 200 ESN. Toi tu fais tout le boulot : Google Forms gratuit + traitement Claude API + design Canva Free. Eux apportent leur tampon de crédibilité + leur diffusion. Output : PDF de 30 pages + page web `centrium-platform.com/barometre-esn-2026` + relations presse co-signées.

**Pourquoi ça marche pour Centrium :**
- Citation presse permanente : tout journaliste qui écrit sur le secteur ESN cite ton baromètre = backlinks d'autorité.
- Excuse parfaite pour contacter 200 dirigeants ESN ("Vous avez 3 min pour participer à notre baromètre ?") → top of funnel massif.
- Crédibilité instantanée pour un solo founder.

**Effort fondateur :** 40-60 h sur 60 j (sprint puis rentabilisation 12 mois).

**Délai résultat :** Publication M+2-3. Pic de leads inbound dès la sortie + queue longue pendant 6-12 mois.

**Risque / contre-indication :**
- Si moins de 100 répondants → baromètre non crédible. Promettre confidentialité absolue et fournir résultats en avant-première aux participants pour booster.

**Exécution cette semaine :**
- Lundi : DM aux délégués Syntec Numérique régionaux + 3 écoles.
- Mardi : prep d'un pitch deck 1 page "Baromètre ESN 2026 — partenariat".
- Mercredi : envoyer le pitch + RDV.

---

## CATÉGORIE 3 — PRODUCT-LED TRICKS (5)

### Hack #11 — Démo en libre-service (Storylane alternative gratuite)

**Description précise :**
Implémenter une démo interactive **sans login** directement sur `centrium-platform.com/demo`. Alternatives gratuites à Storylane : **Arcade** (Free 5 tours), **Supademo** (Free 5 tours), ou self-hosted via screenshots + tour CSS pur (`shepherd.js` open source). Le tour montre : dashboard → import CV → optimisation IA → export catalogue → matching mission.

**Pourquoi ça marche pour Centrium :**
- Élimine la friction "il faut booker un call" → les early adopters peuvent valider en 3 min seuls.
- Génère des leads chauds : ceux qui finissent le tour de 3 min sont **massivement engagés**.
- Capture email à la fin pour "recevez le replay" → list building gratuit.

**Effort fondateur :** 8-10 h one-shot, ensuite 0.

**Délai résultat :** Multiplie par 2-3 le taux de conversion visiteur → lead. Effet visible en 30 j.

**Risque / contre-indication :**
- Si l'UI est encore en mouvement, refresh nécessaire à chaque release majeure.

**Exécution cette semaine :**
- Lundi : créer un compte Arcade ou Supademo, mapper les 7 étapes clés.
- Mardi-mercredi : enregistrer le tour avec données de seed.
- Jeudi : intégrer iframe + appel à l'action sur `/demo`.

---

### Hack #12 — Pricing calculator interactif sur `/tarifs`

**Description précise :**
Calculator JavaScript : "Combien de consultants gérez-vous ? [slider 10-500]" → "Combien de BMs ? [slider 1-20]" → affichage du prix Centrium + comparatif estimé Boondmanager (à partir de prix publics ou estimés). Bouton "Recevoir le devis détaillé par mail" → capture lead. Inspiration : Notion `/pricing`, Linear `/pricing`.

**Pourquoi ça marche pour Centrium :**
- Les ESN détestent les "demandez-nous un prix" → transparence radicale = différenciateur fort.
- Le simple fait de **bouger les sliders** crée un engagement émotionnel.
- Capture l'intention d'achat avec un signal très fort (taille de la boîte).

**Effort fondateur :** 6-8 h one-shot.

**Délai résultat :** +30-50 % de leads qualifiés sur la page tarifs en 30 j.

**Risque / contre-indication :**
- Si ton pricing évolue souvent → maintenance. Solution : variables centralisées dans un fichier `pricing.config.ts`.
- Risque de "sous-pricer" face à des concurrents → tester avec 5 prospects avant de figer.

**Exécution cette semaine :**
- Lundi : définir la grille tarifaire finale (paliers de consultants).
- Mardi-mercredi : implémenter le calculator (React + Tailwind, 200 lignes max).
- Jeudi : A/B test simple (50 % old page, 50 % new page).

---

### Hack #13 — Outil gratuit public : Free CV Parser

**Description précise :**
Page `centrium-platform.com/free-cv-parser` : upload CV (PDF/Word/LinkedIn) → analyse Claude API → output JSON structuré + version reformatée en aperçu. Pas de login, juste un email pour "recevoir les résultats par mail". 100 % gratuit, illimité **après collecte d'email**. SEO-friendly (mots-clés : "parser CV gratuit", "extraire texte CV", "convertir CV PDF").

**Pourquoi ça marche pour Centrium :**
- Volume SEO énorme sur "parser CV" / "convertir CV" → trafic organique gratuit récurrent.
- Recruteurs et BMs d'ESN s'inscrivent pour tester → ta liste s'allonge.
- Démontre concrètement la qualité du parsing Centrium (le cœur de la valeur).

**Effort fondateur :** 12-15 h one-shot (front + Claude API call + storage temporaire + mail Resend).

**Délai résultat :** 100-500 emails capturés en 90 j si bien SEO-isé. Conversion lead → deal ~1-2 %.

**Risque / contre-indication :**
- Coût Claude API si abus : limiter 3 CV/email/jour + captcha hCaptcha Free.
- RGPD : suppression auto du CV à J+7 maximum.

**Exécution cette semaine :**
- Lundi : architecture (Next.js route handler + Resend + Supabase storage 7 j).
- Mardi-jeudi : implémentation.
- Vendredi : SEO on-page + soumission Google Search Console.

---

### Hack #14 — Open source : `@centrium/cv-parser` (TypeScript lib)

**Description précise :**
Extraire une partie réutilisable de Centrium (ex: parser CV, schémas zod ESN, normaliseur de skills tech) → la publier sur GitHub sous licence MIT + sur npm. README soigné avec logo Centrium. Bonus : un blog post "Pourquoi nous avons open-sourcé notre parser CV" + soumission à `awesome-typescript`, `awesome-nodejs`, Product Hunt, Hacker News.

**Pourquoi ça marche pour Centrium :**
- Backlinks d'autorité (npmjs.com, GitHub) → SEO long terme.
- Crédibilité tech auprès des CTOs d'ESN qui vérifient ton GitHub avant d'acheter.
- Contributeurs externes = bug reports gratuits → meilleure qualité produit.
- Effet "indie hacker FR" très en vogue auprès des DG ESN qui suivent le mouvement.

**Effort fondateur :** 15-25 h one-shot + 1-2 h/sem de maintenance.

**Délai résultat :** SEO indirect 90-180 j. Effet réputation immédiat.

**Risque / contre-indication :**
- Ne pas open-sourcer une partie qui constitue ton moat (le matching IA, le générateur de catalogue).

**Exécution cette semaine :**
- Lundi : identifier la partie OS-able (parser CV est le candidat évident).
- Mardi-mercredi : extraction propre, tests, README, license.
- Jeudi : publication npm + GitHub.
- Vendredi : post LinkedIn + Hacker News + r/typescript.

---

### Hack #15 — Status page + roadmap publiques (signal de transparence)

**Description précise :**
- **Status page** : `status.centrium-platform.com` via **Instatus Free tier** (10 composants gratuits) ou **BetterStack Status Free**.
- **Roadmap publique** : page Notion publique `centrium-platform.com/roadmap` avec colonnes "En cours / Sortie ce trimestre / Backlog". Permettre aux visiteurs de **voter** (réactions emoji Notion gratuites).

**Pourquoi ça marche pour Centrium :**
- Les DSI/DPO des ESN demandent quasi-systématiquement "où est votre status page ?" en due diligence → signal de maturité enterprise immédiat.
- Roadmap publique = différenciateur vs Boondmanager (qui est opaque).
- Force la discipline interne (tu publies = tu livres).

**Effort fondateur :** 4 h setup + 30 min/sem update.

**Délai résultat :** Pas un hack "lead-gen" mais un **lubrifiant de closing** : raccourcit le cycle de vente de 2-3 sem.

**Risque / contre-indication :**
- Si la status page affiche du red régulièrement → contre-productif. À mettre en prod uniquement quand ton uptime > 99.5 %.

**Exécution cette semaine :**
- Lundi : setup Instatus Free + connexion monitoring Sentry/Uptime Kuma.
- Mardi : créer la page Notion roadmap publique.
- Mercredi : lier les deux depuis le footer du site Centrium.

---

## CATÉGORIE 4 — PR / MEDIA GRATUIT (5)

### Hack #16 — Pitch journalistes FR tech (Maddyness, Frenchweb, BFM Tech, Décideurs)

**Description précise :**
Angle gagnant pour un solo founder : **"Fondateur seul, SAS française, monte SaaS B2B niche ESN avec 0 € de levée — comment et pourquoi."** Cibler 15 journalistes via LinkedIn :
- Maddyness : Geraldine Russell, Maxence Fabrion
- Frenchweb : Richard Menneveux
- BFM Tech : Anthony Morel
- Les Échos Start
- Décideurs Magazine
Pitch en 3 lignes : "Vous écrivez sur SaaS FR / bootstrapping. J'ai 1 angle : SaaS B2B vertical ESN, fondateur solo, méthodologie de construction sans levée détaillée. Je peux fournir chiffres + screenshots produit + témoignages early users."

**Pourquoi ça marche pour Centrium :**
- Niche ESN = sujet sous-couvert dans la presse tech FR → angle frais.
- Bootstrapping en 2026 = très en vogue post-correction VC.
- 1 article Maddyness = 5000-20 000 vues qualifiées tech FR + backlink premium.

**Effort fondateur :** 5-8 h prep + suivi pendant 3-4 sem.

**Délai résultat :** 1-2 articles publiés en 60-90 j si pitch bien construit. Effet lead-gen indirect mais durable (citation + SEO).

**Risque / contre-indication :**
- Taux de réponse ~10-15 % → ne pas s'arrêter aux premiers ghosts.
- Préparer un kit presse léger (logo, photo founder, fact sheet 1 page) prêt à envoyer.

**Exécution cette semaine :**
- Lundi : lister 15 journalistes + lire leurs 3 derniers articles pour personnaliser.
- Mardi : créer le press kit (1 page PDF + screenshots).
- Mercredi-jeudi : envoyer les 15 pitches LinkedIn + email pro.
- Vendredi : suivi des lectures.

---

### Hack #17 — Décrocher 3 podcasts FR tech / business

**Description précise :**
Cibles prioritaires :
- **GDIY (Génération Do It Yourself)** — Matthieu Stefani
- **Saas Connection** — Axel Mouquet
- **La Martingale** — Matthieu Stefani
- **Marketing Square** — Jeremy Goillot
- **Le Board** — Yannick Sanchez
- **Café Croissant** — communauté SaaS FR
Pitch en MP au host : "J'ai un angle peu couvert : staffing ESN françaises, marché à 60 Md€, mais aucun épisode SaaS dessus chez vous. Je peux apporter chiffres + storytelling de fondateur solo."

**Pourquoi ça marche pour Centrium :**
- 1 épisode GDIY = 50k-100k auditeurs CSP+, dont ~5 % sont des DG d'ESN ou ont une connexion.
- Format long (1-2 h) = relation profonde avec l'audience → conversion lead démultipliée.
- Backlink podcast = SEO + perpétuel.

**Effort fondateur :** 2-3 h pitch + 2 h/podcast (prep + tournage + promo).

**Délai résultat :** 1 décrochage podcast en 60-90 j. Premier deal directement attribuable en 90-120 j.

**Risque / contre-indication :**
- Les gros podcasts ont des waitlists 3-6 mois → viser aussi les podcasts de niche (audience plus petite mais plus chaude).

**Exécution cette semaine :**
- Lundi : écouter 1 épisode complet de chaque podcast cible.
- Mardi : pitch personnalisé à 6 hosts.
- Mercredi : suivi.

---

### Hack #18 — Tribune libre Maddyness / LinkedIn Pulse sur sujet brûlant ESN

**Description précise :**
Écrire une tribune de 1500-2000 mots sur un sujet polémique du secteur ESN, du type :
- "Les ESN françaises vont-elles survivre à la consolidation Capgemini / Accenture ?"
- "Pourquoi 80 % des outils staffing ESN ne servent à rien (et ce qu'on doit construire à la place)"
- "Freelance vs salarié en ESN : la guerre cachée du staffing 2026"
- "IA générative et CV : la fin des recruteurs IT ?"
Soumettre à Maddyness (tribune libre, gratuit), Frenchweb, ou publier en LinkedIn article + push réseau.

**Pourquoi ça marche pour Centrium :**
- Format long = signal d'autorité **bien plus fort** que les posts courts LinkedIn.
- Provocation mesurée = partages exponentiels dans le micro-cosme ESN FR.
- Le DG d'une ESN qui te lit pense : "Ce mec comprend mon métier mieux que les éditeurs en place."

**Effort fondateur :** 8-12 h/tribune.

**Délai résultat :** 30 j pour publication, lead inbound dans les 7 j post-publication.

**Risque / contre-indication :**
- Provocation trop forte → ennemis dans le secteur. Toujours **constructif**, pas destructeur.
- Si tu n'as pas le temps de défendre les commentaires → contre-productif. Bloquer 4 h après publication pour répondre.

**Exécution cette semaine :**
- Lundi : choisir le sujet via sondage LinkedIn (engagement avant rédaction).
- Mardi-jeudi : écrire la tribune.
- Vendredi : soumettre à Maddyness + LinkedIn article + relayer dans groupes.

---

### Hack #19 — "Build in public" LinkedIn hebdomadaire

**Description précise :**
Chaque vendredi 17h, post LinkedIn format "Semaine X de Centrium" : 1 chiffre clé (MRR, signups, beta users), 1 leçon apprise, 1 feature shippée, 1 question ouverte à la communauté. Format inspiré de Pierre de Wulf (Scrapingbee), Marc Louvion, Romain Aubert. Hashtag : `#bootstrapfrance` ou `#100semainesdebootstrap`.

**Pourquoi ça marche pour Centrium :**
- L'algorithme LinkedIn FR adore ce format actuellement.
- Construit une narration de "founder relatable" → empathie + envie d'aider.
- Effet recommandation : les abonnés deviennent ambassadeurs sans même avoir testé le produit.

**Effort fondateur :** 1 h/sem.

**Délai résultat :** 1 000 abonnés LinkedIn en 90 j si tu maintiens. 3-5 deals attribuables en 6 mois.

**Risque / contre-indication :**
- Sur-partager les chiffres si négatifs peut effrayer les prospects. Régle : transparence sur process, pudeur sur les nombres avant le 1er deal.

**Exécution cette semaine :**
- Vendredi : poster "Semaine 1 — On lance le build in public. Voici l'état initial : 0 client, 0 MRR, 1 fondateur, 1 produit. Suivez-moi pendant 100 semaines."

---

### Hack #20 — Concours d'innovation BPI / i-Lab / French Tech Tremplin

**Description précise :**
Postuler à 5 concours **gratuits** ouverts à un solo founder :
- **i-Lab** (BPI / MESRI) — deadline annuelle, 0 € à payer, dotation jusqu'à 600 k€.
- **French Tech Tremplin** — boost pour fondateurs sous-représentés.
- **Concours Bpifrance Big Tour** — pitch régional.
- **Prix EY Entrepreneur de l'Année** (catégorie startup).
- **Trophée du DSI Excellence Award** (médias B2B).
- **Concours Réseau Entreprendre** — prêt d'honneur 30-90 k€ à 0 %.

**Pourquoi ça marche pour Centrium :**
- Visibilité massive (même finaliste) : presse régionale + nationale couvre.
- Réseau Entreprendre = 0 €, prêt d'honneur jusqu'à 90 k€ = **cash non dilutif** qui ne casse pas la règle "0 € externe" (c'est un prêt remboursable, pas du marketing payé).
- Effet badge "lauréat" sur le site Centrium = trust signal énorme pour signer enterprise.

**Effort fondateur :** 15-25 h par dossier (rentabilisé sur plusieurs candidatures avec un dossier maître réutilisable).

**Délai résultat :** Premier résultat 60-120 j. Premier prêt d'honneur signable en 90-150 j.

**Risque / contre-indication :**
- Temps perdu si pas sélectionné. Stratégie : 1 dossier maître, 5 candidatures dérivées.
- Réseau Entreprendre = prêt → engagement de remboursement à anticiper.

**Exécution cette semaine :**
- Lundi : lister les 5 concours avec deadlines + critères.
- Mardi-jeudi : préparer le dossier maître (executive summary, pitch deck, fact sheet, projections).
- Vendredi : soumettre le premier (Réseau Entreprendre, le plus accessible).

---

## PLAN D'EXÉCUTION — 90 JOURS SEMAINE PAR SEMAINE

### Semaines 1-4 (Mois 1 — **Foundations & Pipeline**)

| Sem | Focus | Hacks activés | Livrables fin de semaine |
|-----|-------|---------------|--------------------------|
| **S1** | Setup outils + cold outbound | #1, #3, #15 | 50 DM envoyés, page `/sparring` live, status page live |
| **S2** | Premier contenu + outils gratuits | #9, #11, #19 | Newsletter n°1 envoyée, démo Arcade live, post BIP n°1 |
| **S3** | Audit-driven + community seed | #2, #8 | 10 audits livrés, Slack BM Connect créé + 30 invités |
| **S4** | Podcast launch + pitches presse | #7, #16, #17 | Épisode pilote enregistré, 15 journalistes pitchés, 6 hosts podcasts pitchés |

**KPIs M1 :**
- 200 DM LinkedIn envoyés
- 15 sparring sessions bookées
- 100 abonnés newsletter
- 30 membres Slack BM Connect
- 4 RDV qualifiés en pipeline

---

### Semaines 5-8 (Mois 2 — **Authority Building**)

| Sem | Focus | Hacks activés | Livrables |
|-----|-------|---------------|-----------|
| **S5** | Pricing transparency + free tool | #12, #13 | Calculator pricing live, Free CV Parser MVP shippé |
| **S6** | Tribune + reverse pitch | #5, #18 | Tribune publiée Maddyness/LinkedIn, 15 déçus Boondmanager contactés |
| **S7** | Open source + concours | #14, #20 | `@centrium/cv-parser` publié npm, 1er dossier concours soumis |
| **S8** | Community LinkedIn + podcast ramp | #6, #7 | Groupe LinkedIn ESN co-modéré, ép 4 podcast en ligne |

**KPIs M2 :**
- 300 abonnés newsletter
- 100 membres Slack
- 1 article presse confirmé
- 2 POC en cours
- 1 LOI signée

---

### Semaines 9-12 (Mois 3 — **Conversion & Compounding**)

| Sem | Focus | Hacks activés | Livrables |
|-----|-------|---------------|-----------|
| **S9** | Baromètre + demos live | #4, #10 | Sondage baromètre lancé sur 200 ESN, 5 demos live faites |
| **S10** | Bottom-up sales push | #8 vendor day | Premier "vendor day" Slack BM Connect (présentation Centrium) |
| **S11** | Optimisation conversions | retest tous canaux | A/B test wording, optimisation flow gratuit → payant |
| **S12** | Closing + rétrospective | tous canaux | Closing des LOI en contrats signés, retrospective 90 j |

**KPIs M3 :**
- 500 abonnés newsletter
- 200 membres Slack
- 1 article presse publié
- 2-3 clients payants signés
- 8-10 deals en pipeline avancé

---

## KPIs TRANSVERSAUX (à tracker chaque vendredi)

| Métrique | Cible J30 | Cible J60 | Cible J90 |
|----------|-----------|-----------|-----------|
| DM LinkedIn envoyés (cumul) | 200 | 500 | 800 |
| Sparring sessions réalisées | 8 | 25 | 45 |
| Abonnés newsletter | 100 | 300 | 500 |
| Membres Slack BM Connect | 30 | 100 | 200 |
| Abonnés LinkedIn personnel | +200 | +500 | +1000 |
| Trafic organique site | 200 | 800 | 2000 |
| Leads qualifiés (MQL) | 10 | 30 | 60 |
| Opportunités (SQL) | 3 | 10 | 20 |
| Demos faites | 2 | 8 | 18 |
| LOI / POC | 0 | 2 | 4 |
| Contrats signés | 0 | 1 | 2-3 |

---

## RÉSUMÉ EXÉCUTIF

### TOP 7 hacks à activer dans les 7 prochains jours

1. **Hack #1** — Cold DM LinkedIn avec screenshot personnalisé (le hook compétiteur)
2. **Hack #3** — Page `/sparring` + Calendly + premier post LinkedIn
3. **Hack #15** — Status page + roadmap publique (lubrifiant de closing immédiat)
4. **Hack #9** — Newsletter Substack "État du staffing" — lancer le numéro 0
5. **Hack #19** — Build in public LinkedIn — premier post vendredi 17h
6. **Hack #8** — Création Slack BM Connect + 30 premiers invités
7. **Hack #11** — Démo en libre-service Arcade/Supademo sur `/demo`

### Prospects qualifiés prévisibles

- **J+30** : 10 MQL, 3 SQL, 0-1 client signé (cycle FR ESN trop long pour deal complet en 30 j)
- **J+60** : 30 MQL, 10 SQL, 1 client signé + 2 POC en cours
- **J+90** : 60 MQL, 20 SQL, 2-3 clients signés + 4 LOI / POC

### Le hack à ne PAS rater — LA PÉPITE #1

**Hack #8 — Slack "BM Connect" pour Business Managers ESN.**

Pourquoi : aucune communauté FR n'existe pour cette cible exacte (vérifié), les BMs sont les utilisateurs quotidiens (donc les prescripteurs internes auprès du DG), et tu construis un actif communautaire durable qui te survivra à toi-même. C'est ton **moat de distribution**. Tous les autres hacks sont des feux d'artifice ; celui-ci est une centrale nucléaire qui produit pendant 5 ans.

### Verdict en 1 phrase

**Oui — signer 5 clients payants en 12 mois avec 0 € de marketing externe est réaliste pour Centrium, à condition d'exécuter sans relâche les hacks #1, #3, #7, #8 et #9 chaque semaine pendant 52 semaines, sachant que les 3 premiers clients viendront du founder-led sales pur (DM + sparring), et les 2 suivants de la combinaison communauté + podcast + tribune.**
