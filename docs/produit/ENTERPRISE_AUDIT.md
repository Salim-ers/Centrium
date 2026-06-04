---
title: "Enterprise Readiness Audit — Centrium"
subtitle: "Évaluation de maturité SaaS B2B (CEO, DSI, RSSI, Achats, Investisseur, Audit)"
version: "1.0"
date: "2026-06-04"
publisher: "QuadCore SAS"
type: "internal-audit"
---

# Enterprise Readiness Audit — Centrium

> **Synthèse pour le comité produit.** Audit honnête de la documentation et de la posture
> commerciale de Centrium, vue par un consultant SaaS Enterprise senior (background
> Stripe / Linear / Notion / Atlassian / Vercel).
>
> Lecture rangée : si vous êtes pressé, lisez la « Synthèse exécutive » page 1 puis sautez aux
> sections rouges. Si vous êtes en préparation d'un go-to-market, lisez tout.

---

## Synthèse exécutive

**Verdict en une phrase** :

> *"Bon produit, identité visuelle de qualité supérieure, transparence légale au-dessus de la moyenne — mais documentation et preuves de maturité opérationnelle insuffisantes pour franchir le seuil 20k€+ sans concession."*

**Maturité actuelle** : **Scale-up** (entre Startup établie et PME SaaS).

**Maturité visée 90 jours** : **Enterprise-ready**.

**Risque #1** : un acheteur Enterprise demandera Security Whitepaper, SLA contractuel, Trust Center, Architecture Overview et DPA dès le premier RDV qualifié. **6 documents sur 8 attendus n'existent pas encore.** Sans eux, le cycle de vente s'allonge de 4–8 semaines ou stoppe net en due diligence.

**Risque #2** : la présentation entreprise mentionne "à venir" sur des éléments clés (status page, profils LinkedIn). Un RSSI attentif voit ces "à venir" comme un signal de jeunesse — acceptable pour un POC, problématique pour un contrat 50k€+.

**Levier #1** : produire les 6 documents Enterprise manquants (cf. `MISSING_ENTERPRISE_ASSETS.md`). Effort : ~3 jours de rédaction + revue juridique. Impact : déblocage immédiat de 80% des objections silencieuses.

**Levier #2** : retirer ou dater explicitement les mentions "à venir" / "post-MVP". Les remplacer par "v1.1 — Q3 2026" ou les retirer. Un acheteur préfère "non disponible aujourd'hui" à "à venir" qui n'engage personne.

---

## Notes par dimension

### Vue d'ensemble

| Dimension | Note | Maturité |
|---|:-:|---|
| Manuel utilisateur | **7,0 / 10** | PME SaaS |
| Présentation entreprise | **7,5 / 10** | PME SaaS |
| Documentation sécurité | **5,5 / 10** | Scale-up |
| Documentation support | **5,0 / 10** | Scale-up |
| Documentation commerciale | **4,5 / 10** | Startup |
| Documentation technique | **3,5 / 10** | Startup |
| **Confiance globale** | **6,2 / 10** | **Scale-up** |

> **Objectif** : passer chaque ligne à ≥ 8,5 / 10 et la confiance globale à ≥ 9,5 / 10 (cf. Phase 5).

### Manuel utilisateur — 7,0 / 10

**Ce qui marche**
- Structure 16 sections cohérente, table des matières, glossaire métier
- Tableaux exploitables (statuts, rôles, raccourcis, types de CRA)
- Encarts visuels Astuce / Attention / Sécurité utilisés à bon escient
- Vocabulaire ESN maîtrisé (BM, AO, TJM, CRA, intercontrat)
- Pas de "screenshot vide" promis qui n'existe pas

**Ce qui manque pour passer à 9 / 10**
- Aucune capture d'écran réelle. Indispensable pour un manuel d'utilisation. À J+30.
- Aucun chemin "Comment je fais X en 3 clics" en début de module. Le manuel décrit la structure, pas les parcours.
- Section "Premiers pas en 15 minutes" manquante — un utilisateur ESN qui découvre Centrium devrait être opérationnel en 15 min sans support.
- Aucun renvoi vers vidéos / tutoriels (mentionnés "à venir").
- Mentions répétées "à venir / post-MVP" → impression de produit inachevé.

**Verdict** : bon manuel de spec interne, perfectible comme manuel utilisateur client. Une équipe Enterprise s'attend à des captures, des walkthroughs, des vidéos. Aujourd'hui c'est trop textuel.

### Présentation entreprise — 7,5 / 10

**Ce qui marche**
- Transparence légale exemplaire (SIREN annoncé, RGPD détaillé, sous-traitants nommés)
- 6 piliers de sécurité avec vocabulaire technique exact (RLS, AES-256, PITR, CCT)
- 4 axes de conformité RGPD avec détails (CNIL 72h, droits des personnes, audit annuel)
- 5 critères de tarification + 3 personas types = posture commerciale claire
- Onboarding 5 étapes datées (J0 → J+14) = engagement de service mesurable

**Ce qui manque pour passer à 9 / 10**
- `Organization.sameAs` vide → Knowledge Graph Google ne peut pas trianguler l'entité
- Pas de profil LinkedIn QuadCore SAS public (mentionné "à compléter")
- Aucun chiffre de production réel (combien d'ESN clients, combien de consultants gérés total, combien de CV générés). Tous les chiffres sont des promesses, pas des preuves.
- Aucun témoignage attribuable. Les 2 témoignages du site sont anonymisés.
- "À venir" sur status.centrium-platform.com → si une page status n'existe pas, ne pas l'annoncer.
- Aucun benchmark vs concurrents (Boondmanager, Akuiteo, ConnectWise, etc.). Un acheteur compare toujours.
- Aucun lien vers blog ou contenu thought-leadership → impression de société sans voix.

**Verdict** : présentation "trop honnête" — c'est un compliment et un défaut. Compliment car la franchise sur les limites (sans grille publique, engagement 12 mois) inspire confiance. Défaut car aucune preuve sociale forte ne compense.

### Documentation sécurité — 5,5 / 10

**Ce qui marche**
- 6 piliers de sécurité documentés (chiffrement, hébergement EU, RLS, auth, audit trail, backups)
- Headers HTTP listés explicitement (HSTS preload, CSP, X-Frame, etc.)
- Conformité RGPD détaillée
- Sous-traitants identifiés nommément
- Mention DPA signable sur demande

**Ce qui manque pour passer à 9 / 10**
- **PAS de Security Whitepaper formel.** Un RSSI Enterprise demande un PDF de 15-25 pages signé "QuadCore SAS — Security Whitepaper v1.0". Aujourd'hui : sections éparses dans la présentation entreprise.
- **PAS de Trust Center public** (security.centrium-platform.com ou /security). Indispensable pour un acheteur qui veut "voir" la sécurité sans signer un NDA.
- **PAS d'audit externe annoncé**. SOC 2 Type II n'est pas mentionné. ISO 27001 non plus. Pas de pentest annuel documenté.
- **PAS de page vulnérabilité disclosure / bug bounty**.
- **PAS d'incident response plan public** (modèle "Stripe Incident Communication").
- **PAS de Business Continuity Plan documenté** (RTO/RPO chiffrés).
- "À venir" sur statut applicatif : un acheteur préfère "pas de status page aujourd'hui" à "à venir".

**Verdict** : la sécurité technique est probablement très correcte (RLS multi-tenant + headers + RGPD). Mais la **documentation** de cette sécurité est insuffisante pour un cycle Enterprise. Un RSSI ne signe pas sur "trust me, c'est bien fait".

### Documentation support — 5,0 / 10

**Ce qui marche**
- Canaux annoncés (email, chat, visio, urgences sécurité)
- Délais cibles indiqués (24h ouvrées, 4h, 1h)
- 3 niveaux de support (Standard, Premium, Enterprise)
- Onboarding 5 étapes datées

**Ce qui manque pour passer à 9 / 10**
- **PAS de SLA contractuel** détaillé. "Cible 99,9%" n'est pas un engagement, c'est une intention. Un acheteur Enterprise veut : *"Si l'uptime mensuel descend sous 99,9%, l'éditeur crédite X% du MRR. Si sous 99,0%, l'acheteur peut résilier sans pénalité."*
- **PAS de processus d'escalade documenté**. Si je suis client et qu'un P1 traîne 6h, à qui je parle ?
- **PAS de runbooks publics** pour les opérations courantes (réinitialiser mon org, exporter mes données, migrer une instance).
- **PAS de centre d'aide / FAQ** structuré (juste un manuel monolithique).
- **PAS de status page** opérationnelle (mentionnée "à venir").
- **PAS de uptime history** publique. Un acheteur veut voir : "Uptime des 12 derniers mois : 99,94%".
- "Sous 1h pour urgences sécurité 24/7" — qui répond la nuit ? Une astreinte est-elle réellement en place ?

**Verdict** : promesse de support correcte sur le papier mais aucune preuve d'opérations matures. Pour un contrat 50k€+, c'est insuffisant.

### Documentation commerciale — 4,5 / 10

**Ce qui marche**
- 3 personas types bien définis (ESN en croissance, Cabinet de conseil, Groupe/ETI)
- Critères de tarification transparents (5 critères)
- Engagement et conditions clairs
- Site vitrine premium (Hero éditorial, sections benefits)

**Ce qui manque pour passer à 9 / 10**
- **0 case study client**. Pas un. Pour un acheteur ESN, la première question est "qui utilise Centrium aujourd'hui dans ma situation ?".
- **0 témoignage attribuable**. Les 2 du site sont anonymisés "à leur demande" — explication crédible une fois, pas pour les 10 prochains témoignages.
- **0 logo client public**. Une wall of logos même petite (3-5 ESN) change la perception immédiatement.
- **PAS de ROI calculator** ni de modélisation économique. Un BM coûte 60-80k€/an. Si Centrium fait gagner 30% de son temps, c'est 20-25k€/an de productivité. Centrium devrait montrer ce calcul.
- **PAS de comparatif vs concurrents** (Boondmanager, ConnectWise, Akuiteo, MakeIT). Un acheteur compare toujours.
- **PAS de pricing public indicatif** ("à partir de X€/utilisateur/mois pour Z consultants"). L'absence totale freine certains prospects sérieux.
- **PAS de demo interactive** (sandbox, vidéo product tour).

**Verdict** : tout est en construction côté preuve. C'est l'urgence n°1 commerciale.

### Documentation technique — 3,5 / 10

**Ce qui marche**
- Stack technique listée dans la présentation entreprise
- Mention "Documentation API sur devis, accès Enterprise" → bonne idée commerciale
- README technique du repo (pour l'équipe interne)

**Ce qui manque pour passer à 9 / 10**
- **PAS d'API publique documentée**. Si "Documentation API sur devis" est annoncé, il faut au moins une API spec ouverte (OpenAPI / Swagger).
- **PAS d'Architecture Overview** avec diagrammes (composants, données, sécurité, déploiement). Un DSI/RSSI Enterprise demande ce document AVANT le premier RDV technique.
- **PAS de SDK / clients officiels** (TypeScript, Python).
- **PAS de webhooks** documentés (alors qu'ils existent côté Supabase Realtime).
- **PAS de guide d'intégration SSO** (alors que c'est annoncé en option).
- **PAS de guide d'export de données** détaillé (réversibilité réglementaire).
- **PAS de Database Schema** documenté publiquement (pour les groupes qui veulent valider leur modèle d'intégration).

**Verdict** : la doc technique est aujourd'hui inexistante pour un public externe. C'est cohérent avec un produit early-stage, mais bloquant pour un cycle Enterprise.

---

## Évaluation multi-personas

### CEO d'ESN (acheteur "métier")

**Ce qu'il voit** : un produit beau, une histoire claire ("vous ne devriez pas avoir à choisir entre rapidité et rigueur"), 4 modules qui correspondent à ses problèmes réels.

**Ce qui le rassure** : transparence légale, RGPD, hébergement européen, ton honnête sur le pricing.

**Ce qui le bloque** : "Qui utilise déjà Centrium chez des ESN comme la mienne ?" → 0 logo, 0 case study, 0 nom de référence.

**Probabilité de signature seul** : 25-35% sur la promesse produit. Demandera des références avant signature.

### DSI (acheteur "intégration")

**Ce qu'il voit** : stack moderne (Next.js, Supabase, Vercel), multi-tenant RLS, hébergement EU, mentions techniques précises.

**Ce qui le rassure** : Supabase / Postgres / Vercel sont des choix défendables. RLS multi-tenant est mentionné explicitement.

**Ce qui le bloque** : pas d'Architecture Overview, pas d'API doc, pas de schéma de données, pas de plan de réversibilité. Comment intégrer avec son SIRH ? Avec son ERP ?

**Probabilité de signature seul** : 20-30%. Demandera une session technique de 1h avant de débloquer le budget IT.

### RSSI (acheteur "sécurité")

**Ce qu'il voit** : 6 piliers de sécurité documentés, headers HTTP listés, sous-traitants nommés, RGPD détaillé.

**Ce qui le rassure** : RLS multi-tenant, AES-256, HSTS preload, Permissions-Policy stricte. Le vocabulaire technique est juste.

**Ce qui le bloque** :
- Pas de Security Whitepaper formel à transmettre à sa hiérarchie.
- Pas d'attestation SOC 2 / ISO 27001 ni annonce de calendrier.
- Pas de pentest externe documenté.
- Pas de Bug Bounty / VDP (Vulnerability Disclosure Program).
- "À venir" sur status page = pas de monitoring externe de l'uptime.

**Probabilité de signature seul** : 15-25%. Demandera SOC 2 ou pentest annuel avant de valider. Pour un contrat 100k€+, il bloquera sans audit externe documenté.

### Responsable Achats

**Ce qu'il voit** : pas de pricing public, engagement 12 mois, devis sous 48h.

**Ce qui le rassure** : transparence des critères, pas d'engagement avant signature, onboarding inclus.

**Ce qui le bloque** :
- Pas d'ordre de grandeur tarifaire publié → ne peut pas pré-cadrer son budget.
- Pas de SLA contractuel détaillé → ne peut pas calculer le risque de service.
- Pas de clause de réversibilité documentée → angoisse vendor lock-in.
- Pas de comparatif concurrent → ne peut pas justifier le choix à sa hiérarchie.

**Probabilité de signature seul** : 30-40%. Aura besoin d'un dossier comparatif et d'un DPA standard pour avancer.

### Investisseur SaaS B2B

**Ce qu'il voit** : un produit propre, une vraie identité visuelle, une posture commerciale assumée.

**Ce qui le rassure** : produit construit avec soin, vocabulaire métier maîtrisé, transparence sur ce qui n'est pas encore livré.

**Ce qui le bloque** :
- Aucun MRR / ARR / nombre de clients communiqué.
- Aucun cas d'usage commercialisé documenté.
- Aucune métrique de rétention (NDR, GDR, churn) annoncée.
- "À venir" sur des éléments qui devraient déjà exister (status, LinkedIn, blog).

**Probabilité de signature investissement seul** : 10-20%. Demandera un dataroom avec métriques produit, financières et juridiques avant tout commitment.

---

## Risques majeurs identifiés

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|:-:|:-:|---|
| R1 | Cycle de vente Enterprise > 6 mois faute de doc sécurité formelle | **Haute** | **Critique** | Produire Security Whitepaper + Trust Center sous 30 jours |
| R2 | Refus DSI faute d'Architecture Overview et API doc | Moyenne | Haute | Produire Architecture Overview + OpenAPI sous 60 jours |
| R3 | Perte de prospects sérieux par absence de comparatif et ROI | Haute | Moyenne | Produire ROI calculator + comparatif sous 30 jours |
| R4 | Décrédibilisation par mentions "à venir" répétées | Haute | Moyenne | Auditer et retirer/dater toutes les mentions "à venir" |
| R5 | Perte de signaux Knowledge Graph Google / LLMs | Certaine | Moyenne | Créer profils LinkedIn + remplir `sameAs` JSON-LD |
| R6 | Inability à passer due diligence acheteur 100k€+ sans SOC 2 | Haute | Critique | Préparer roadmap audit SOC 2 Type I sous 90 jours |

---

## Note finale (avant Phase 3)

> **Maturité actuelle** : **Scale-up confirmée** (≈ 6,2 / 10)
>
> **Maturité visée** après Phase 3 (production des 8 documents manquants) : **PME SaaS solide** (≈ 8,5 / 10)
>
> **Maturité visée** après Phase 4 (réécriture Enterprise) + Phase 5 (preuves clients + SOC 2 annoncé) : **Enterprise-ready** (≈ 9,5 / 10)
>
> **Délai estimé pour atteindre 9,5 / 10** : 90 jours avec une priorisation correcte (Security Whitepaper + Trust Center + SLA contractuel = 30 jours · Architecture + API + ROI = 60 jours · 3 premières case studies + SOC 2 Type I roadmap publiée = 90 jours).

Cet audit constate. Il ne juge pas. Centrium est un produit bien construit avec une identité visuelle au-dessus de la moyenne du marché ESN. Il manque uniquement la couche de **documentation Enterprise** pour valider 80% des objections silencieuses en due diligence. C'est rattrapable rapidement.

**Prochain document à lire** : [`MISSING_ENTERPRISE_ASSETS.md`](./MISSING_ENTERPRISE_ASSETS.md).
