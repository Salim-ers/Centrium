# Centrium — Plan ZÉRO BUDGET 12 mois

> **Comment passer de 6,8/10 à 9/10 sans dépenser un euro de cash externe.**
> Pré-requis : fondateur seul (Salim), 0 client payant, repo Centrium v1.0 livré Q2 2026, brand identity en place, domaine `centrium-platform.com` actif.
> Date de référence : juin 2026 — horizon : juin 2027.

---

## Executive Summary

### Verdict global : FAISABLE — avec deux nuances explicites

Atteindre **9,0/10 de note maturité globale** en 12 mois avec **0 € de cash externe** est **réaliste mais conditionnel** : il faut (1) tenir une discipline d'exécution quotidienne sur 52 semaines sans interruption ; (2) accepter que trois "trous" (pentest signé PASSI, cyber-assurance, certification SOC 2 attestée) restent non bouchables sans cash et soient compensés par de la **transparence radicale + roadmap publique datée + droit d'audit prospect**. La cible **9,0/10** est atteignable sur 7 axes sur 8 ; le 8e (cyber-assurance) coince à 7/10 sans débourser ~1 200 € chez Stoïk — ce qui peut être réinvesti dès la 1ʳᵉ signature payante.

### Note cible réaliste atteignable avec 0 €

- **Note globale plafond strict 0 €** : **8,5/10**.
- **Note globale 0 € hors cyber-assurance (~1 200 €/an éventuel)** : **9,0/10**.
- **Note globale si on accepte de réinjecter du cash gagné** (premier client paie l'assurance + pentest) : **9,2-9,5/10**.

### Cumul aides / subventions / crédits cloud disponibles

| Bloc | Montant cash | Valeur (crédits) |
|---|---|---|
| Bourse French Tech | 20-30 k€ | — |
| Innov'Up Faisabilité IDF | 20-30 k€ | — |
| Prêts d'honneur (Initiative + Réseau Entreprendre) | 45-90 k€ à 0 % | — |
| Prêt Amorçage Bpifrance (post-PH) | 50-100 k€ bonifié | — |
| Crédits cloud (AWS + MS + Google + Anthropic + Cloudflare + Notion + HubSpot + Supabase Launch + Sentry + Linear) | — | **80-150 k$** |
| ACRE + JEI + CII (cumul fiscal récurrent) | 30-50 k€/an d'économies + 15-40 k€ CII reportable | — |
| Concours, prix, visibilité (cash divers) | 5-15 k€ | — |
| **Total réaliste 12 mois** | **140-270 k€** | **+ 80-150 k$** |
| **Total conservateur (50 % succès dossiers)** | **80-150 k€** | **+ 40-80 k$** |

### Trade-offs assumés (ce qu'on ne PEUT PAS faire sans payer)

1. **Pentest externe PASSI signé** (Synacktiv, XMCO) → compensé par OWASP ZAP + Burp Community + Nuclei en CI hebdo + programme bug bounty privé YesWeHack "Recognition only".
2. **Audit SOC 2 Type I attesté** → compensé par auto-évaluation AICPA publique + roadmap Q4 2026 contractuellement opposable.
3. **Cyber-assurance** (~1 200 €/an Stoïk) → compensé par engagement de souscription Q4 2026 inscrit en clause suspensive contrat client.
4. **DPO externe certifié AFCDP** → compensé par Salim DPO interne désigné formellement + MOOC CNIL "Atelier RGPD" complété + registre des traitements Notion + AIPD CV documentée.
5. **Avocat IT négocié sur mesure** → compensé par templates Mutual.fr / CNIL relus croisés par 2-3 fondateurs SaaS amis.
6. **Conférences payantes (SaaStr, VivaTech VIP)** → compensé par speaking gratuit Meetups + Bpifrance Big Tour + STATION F French Tech Central.
7. **Embauche dev senior** (~80-100 k€ chargés) → compensée par apprenti dev + CIFRE en année 2 (coût net ~15-20 k€/an grâce aux aides JEI).
8. **Outils sales payants (Apollo, Lemlist, Sales Nav permanent)** → compensé par Apollo Free 100 crédits + Hunter Free 25/mois + Skrapp 50 + Sales Nav trial cyclique + recherche manuelle Pappers.

### Trajectoire commerciale réaliste 12 mois en mode 0 €

| Mois | Signatures cumul | ARR cumul | Source dominante |
|---|---|---|---|
| M1 | 0 | 0 | Setup |
| M2 | 0 | 0 | Pipeline qualifié |
| M3 | 1 design partner | ~14 k€ | Founder-led DM + sparring |
| M4 | 1 | 14 k€ | POC en cours |
| M5 | 2 | 28 k€ | Audit-driven |
| M6 | 2 | 28 k€ | Closing en cours |
| M7 | 4 | 60-70 k€ | Bottom-up Slack BMs + reverse pitch |
| M8 | 4 | 60-70 k€ | — |
| M9 | 6 | 95-110 k€ | Communauté + podcast + tribune |
| M10 | 6 | 95-110 k€ | Webinaire co-marqué |
| M11 | 7 | 115-135 k€ | Bouche-à-oreille design partners |
| M12 | **8 clients** | **150-200 k€ ARR** | Mix stabilisé |

### Cash collecté grâce aux aides = potentiel investissement futur

Le scénario réaliste capte **140 à 270 k€ cash non-dilutif** sur 12 mois. Comme les coûts opérationnels mensuels restent < 50-200 € (Anthropic API variable + domaine), **80 % de ce cash est disponible pour les bascules stratégiques de fin d'année 1** : pentest payant 5 k€, SOC 2 Type I 12 k$, première embauche apprenti, cyber-assurance, marketing payant ciblé. Le plan 0 € de l'année 1 finance le déverrouillage payant de l'année 2 sans diluer.

---

## Partie I — Le stack technique GRATUIT pour 0-10 clients ESN

### Synthèse

Centrium peut tourner en production B2B sérieuse jusqu'à **8-12 clients ESN actifs** sans dépenser un centime au-delà du domaine (~10 €/an) et de l'usage variable Anthropic API (~50-200 €/mois selon volume CV générés).

### Principes directeurs

1. **Free tier only** : aucun abonnement payant tant qu'il n'y a pas 3 clients facturés.
2. **Vendor lock-in maîtrisé** : préférer les outils dont la migration est triviale (export Postgres, CSV, API REST standard).
3. **Bascule Vercel Pro → Cloudflare Pages immédiate** : les CGU Vercel Hobby interdisent l'usage commercial — risque de suspension brutale. Cloudflare Pages autorise le commercial sur tier gratuit + bandwidth illimité. **Économie : 240 $/an immédiate.**
4. **Multi-comptes interdit** : pas de triche en créant 10 comptes Supabase — mauvaise réputation + risque ban.
5. **Programmes startup à activer dès Q1** : AWS Activate + Google for Startups + Microsoft Founders Hub + Notion for Startups + HubSpot for Startups + Anthropic Startup → 80-150 k$ de crédits cumulés.

### Tableau récap — Stack cible Centrium 0-10 clients

| # | Couche | Service | Free tier | Bascule payant estimée |
|---|---|---|---|---|
| 1 | Hosting | **Cloudflare Pages** | Bandwidth illimité, commercial OK | Workers Paid 5 $/mois > 100k req/jour |
| 2 | DB + Auth | **Supabase Free** | 500 MB, 50k MAU, pause 7j | Pro 25 $/mois à 10-15 clients |
| 3 | Backup DB | **Neon Free** | 0,5 GB, branching | Miroir secondaire |
| 4 | Storage | **Cloudflare R2** | 10 GB, egress 0 | > 10 GB de docs (~5 000 CV) |
| 5 | Email tx | **Resend Free** | 3k/mois, 100/jour | SES pay-per-use > 100/jour |
| 6 | Email marketing | **Brevo Free** | 300/jour, subs illimités | Volume > 9k/mois |
| 7 | Newsletter publique | **Substack** | Illimité | Jamais (paid si premium) |
| 8 | Error tracking | **Sentry Free** | 5k errors/mois | Team 26 $/mois |
| 9 | Product analytics | **PostHog Free** | 1M events/mois, replays, flags | > 5k DAU |
| 10 | Web analytics | **Cloudflare Web Analytics** | Illimité, privacy-first | Jamais |
| 11 | Uptime | **Better Stack Free** | 10 monitors | > 10 monitors |
| 12 | Status page publique | **Instatus / Better Stack** | 1 page custom domain | — |
| 13 | Cache + Queue | **Upstash Redis + QStash** | 10k cmds/jour, 500 msg/jour | Volume |
| 14 | CI/CD | **GitHub Actions** | 2 000 min/mois | Jamais avant 5 devs |
| 15 | Security (deps) | **Dependabot + Snyk + Trivy + socket.dev** | Tous Free | Jamais avant 20 devs |
| 16 | Security (code) | **CodeQL + Semgrep + GitGuardian** | Tous Free private repo | — |
| 17 | Security (DAST) | **OWASP ZAP + Nuclei + Burp Community** | OSS | — |
| 18 | Repos | **GitHub Free** | Illimité private | Jamais |
| 19 | Docs publiques | **Mintlify / GitBook Free** | 10 collab | — |
| 20 | Wiki interne | **Notion Free** + Notion for Startups | 6 mois Plus + AI | Free suffit |
| 21 | Ticketing | **Linear Free** | 250 issues, 10 users | + Linear for Startups |
| 22 | IDE AI | **Claude Code + Continue.dev** | Variable Anthropic | — |
| 23 | LLM prod | **Anthropic API + Groq + Langfuse** | Pay-per-use + Groq Free | Anthropic Startup 1-5 k$ |
| 24 | CRM | **HubSpot Free** | Contacts illimités, 5 users | Jamais avant migration interne |
| 25 | Sign électronique | **Documenso self-host** ou **BoldSign 5/mois** | OSS eIDAS | — |

**Coût total cash à 5 clients ESN** : ~16-41 €/mois (Anthropic API + domaine), 0 € le reste.

**Décrochage payant inévitable estimé** : entre client #8 et #12, pour un coût total < 100 €/mois — soit après début du MRR.

---

## Partie II — Aides, subventions, prêts d'honneur cumulables

### Synthèse

Centrium présente un profil **exceptionnellement favorable** au système français de financement non-dilutif : SAS récente (< 8 ans → éligible JEI/JEC), produit IA propriétaire (éligible CII / i-Nov), fondateur seul (éligible ACRE / Bourse French Tech / Réseau Entreprendre), B2B SaaS vertical (cible idéale crédits cloud startup), pas encore de salariés (optimisation JEI dès 1ʳᵉ embauche).

### TOP 5 à demander dans les 90 prochains jours

| Rang | Aide | Délai | Montant | Effort fondateur |
|---|---|---|---|---|
| **1** | **Bourse French Tech (BFT) Bpifrance** | 8-12 semaines | jusqu'à **30 k€** subvention | Moyen — dossier sérieux (BP + budget + devis prestataires) |
| **2** | **Pack crédits cloud immédiat** (MS Founders Hub + AWS Activate + Anthropic Startup + Google Tier 1 + Cloudflare + Notion + Brevo + Supabase Launch) | 1-2 semaines | **~80 à 150 k$** crédits cumulés | Très faible — formulaires en ligne |
| **3** | **Initiative France PH + Réseau Entreprendre** | 3-5 mois | **40 à 140 k€** prêt 0 % | Moyen — comités d'agrément + accompagnement 24 mois |
| **4** | **Innov'Up Faisabilité IDF** (Région) | 3-4 mois | jusqu'à **30 k€** subvention 50 % | Moyen — cumulable avec BFT, finance prochaine feature IA |
| **5** | **Préparation CII + Rescrit JEI** (DGFiP) | 2 mois préparation | **30 %** retour sur dépenses innovation + **30-45 %** exo charges dès embauche | Faible — surtout administratif |

### Calendrier candidatures détaillé sur 90 jours

| Semaine | Action |
|---|---|
| S1 | Vérifier ACRE déjà actif (URSSAF) + ouvrir comptes AWS Activate + MS Founders Hub + Google Cloud Tier 1 + Cloudflare for Startups + Notion for Startups + Brevo Startup + Supabase Launch Program |
| S2 | Postuler **Anthropic Startup Program** (essentiel pour coût API), Sentry for Startups, Linear for Startups, MongoDB Atlas Startups, Algolia for Startups |
| S3 | Ouvrir dossier **Bourse French Tech** sur bpifrance.fr (espace "Mes aides"), demander un pré-rendez-vous diagnostic avec un conseiller Bpifrance |
| S4 | Contacter **Initiative Île-de-France** pour pré-diagnostic téléphonique + **Wilco** + **STATION F** candidature programme Founders + **Innov'Up Faisabilité IDF** dossier |
| S5-6 | Préparer pitch deck + business plan 3 ans + prévisionnel chiffré + dossier maître réutilisable (BFT + Innov'Up + concours + PH) |
| S7 | Soumettre BFT et Innov'Up Faisabilité IDF |
| S8 | Soumettre dossier Initiative France PH (comité local) |
| S9 | Pré-sélection **Réseau Entreprendre Booster** (15-90 k€ PH) |
| S10 | Soumettre dossier concours **i-Nov vague Numérique** (100 k€+) |
| S11 | Préparer rescrit **JEI** auprès DGFiP (3 mois de délai) en vue 1ʳᵉ embauche |
| S12 | Premier passage en comité d'agrément Initiative France (si pré-sélection validée) |

### Tableau récap — Montant non-dilutif cumulable réaliste sur 12 mois

| Scénario | Cash + dette 0 % | Crédits cloud | Total valeur |
|---|---|---|---|
| **Conservateur (50 % succès dossiers)** | 80-150 k€ | 40-80 k$ | **120-230 k€** |
| **Réaliste (60-70 % succès)** | 140-270 k€ | 80-150 k$ | **220-420 k€** |
| **Optimiste (80 %+ succès + i-Nov)** | 240-470 k€ | 100-200 k$ | **340-670 k€** |

### Matrice cumul / incompatibilités essentielles

- **BFT + CII** : OUI (dépenses distinctes).
- **BFT + ADI/AFI** : NON sur mêmes dépenses → choisir.
- **CII + CIR + JEI** : OUI cumul total.
- **PH Initiative + PH Réseau Entreprendre** : OUI très souvent cumulés.
- **PH + Prêt Amorçage BPI** : OUI et **recommandé** (effet levier 1:1).
- **Crédits cloud + toute aide** : OUI toujours (pas du cash).

### Bonnes pratiques anti-rejet

1. **Ne jamais commencer un programme avant d'avoir candidaté à l'aide liée** (rétroactivité refusée).
2. **Documenter rigoureusement** chaque dépense R&D (indispensable CII + JEI + contrôle fiscal).
3. **Toujours déposer BFT avant ADI** (faisabilité avant développement).
4. **Anticiper rescrit JEI 3 mois avant 1ʳᵉ embauche**.
5. **Compte bancaire dédié** pour traçabilité aides.
6. **Registre crédits cloud** Notion (date activation, montant restant, expiration).

---

## Partie III — Sécurité défendable sans payer

### Synthèse

Une posture sécurité **0 € est défendable jusqu'à environ 15-30 clients PME ESN françaises**, à condition de tenir 4 piliers : (1) transparence radicale via page `/trust` publique, (2) roadmap conformité datée et contractuellement opposable, (3) compensations techniques documentées, (4) documentation béton (registre RGPD, AIPD, runbooks, hash-chained audit logs, programme bug bounty privé actif).

### Argumentaire RSSI prêt-à-l'emploi

> *"Notre maturité sécurité n'est pas dans des logos achetés mais dans la défensibilité technique et la transparence. Notre stack repose sur Vercel + Supabase + Cloudflare + GitHub, eux-mêmes SOC 2 Type II et ISO 27001 — nous héritons de cette posture pour 80 % de la surface d'attaque. Le 20 % restant (notre code) est audité en continu par 6 outils gratuits en CI (Dependabot, Snyk, CodeQL, Trivy, ZAP, Nuclei) + un programme bug bounty privé YesWeHack actif. Notre page `/trust` publique liste l'intégralité de nos contrôles avec preuves vérifiables, nos trous assumés, et notre roadmap conformité datée et contractuellement opposable. Nous offrons un droit d'audit gratuit, une notification d'incident sous 24h, et un dépôt fiduciaire du code source. Vous prenez moins de risque avec un fournisseur jeune transparent qu'avec un fournisseur mature opaque qui brandit un logo sans en révéler le scope ni les incidents passés."*

### Les 3 trous "non-bouchables sans payer" et comment les négocier

| # | Trou | Coût payant éliminé | Compensation 0 € | Négociation prospect ESN |
|---|---|---|---|---|
| **1** | **Pentest externe signé PASSI** | 5-10 k€/an | OWASP ZAP + Burp Community + Nuclei en CI hebdo + bug bounty privé YesWeHack "Recognition only" + auto-pentest manuel trimestriel | Positionner Centrium en **statut beta** ou **design partner** sur les 5 premiers clients. Proposer **accès gratuit au rapport ZAP/Nuclei trimestriel** + engagement contractuel "pentest PASSI réalisé avant 31/12/2026" en **clause suspensive** (si non tenu = résiliation sans pénalité). |
| **2** | **Cyber-assurance** | 1 200-3 000 €/an | Aucune équivalente | Inscrire ligne "Cyber-assurance Stoïk souscription Q4 2026" dans le plan de trésorerie + **clause suspensive contrat client** déclenchée à la signature. Mention sur `/trust` : *"Devis Stoïk obtenu, souscription effective dès le 1er client signé."* |
| **3** | **SOC 2 Type I attestée** | 25-40 k€ Type I + 50-80 k€ Type II | Auto-évaluation AICPA Trust Services Criteria publique + grille mappable sur demande sous NDA + roadmap Q4 2026 avec auditeur pré-identifié (Prescient Assurance ~12 k$ packagé startup) | Proposer **droit d'audit gratuit** au prospect (clause DPA) + **engagement notification incident 24h** (RGPD art. 33 + plus court) + **dépôt fiduciaire du code source** activable si Centrium cesse d'exister (gratuit via repo miroir GitHub + clé GPG client). |

### Stack sécu 0 € à activer dès la semaine 1

```
Production       → Vercel/Cloudflare Free (TLS auto, edge), Supabase Free,
                   Cloudflare DNS Free (DDoS L3/L4), Upstash Redis (rate limit),
                   Resend DKIM/SPF/DMARC
Monitoring       → Sentry Free + Better Stack logs Free + PostHog Free
                   + Vercel Analytics Web Vitals + Status page Better Stack
Sécurité applicative → Dependabot + Snyk Free + Trivy + socket.dev + CodeQL
                       + GitGuardian + Gitleaks CI + ZAP/Nuclei/Burp hebdo
Antivirus upload → VirusTotal Free (hash only) + ClamAV self-host
Bug bounty       → YesWeHack programme privé "Hall of Fame"
Conformité       → Salim DPO interne + MOOC CNIL + registre Notion + AIPD CV
                   + auto-éval AICPA + NIST CSF 2.0 + CIS Controls v8
Threat intel     → HIBP API + ANSSI CERT-FR RSS + GitHub Advisories
                   + URLhaus + Twitter listes infosec FR
Backup / DR      → Supabase backups 7j + pg_dump cron → R2 chiffré GPG
                   + runbook DR + test restauration trimestriel
Documentation    → /trust + /legal + /security/disclosure + /changelog
                   + security.txt + status.centrium-platform.com
```

### Trajectoire maturité sécurité 6,8 → 9,0 / 10

| Axe | Q2 2026 | Q2 2027 cible | Levier 0 € |
|---|---|---|---|
| Sécurité applicative | 7/10 | 9/10 | CI sécurité complète + bug bounty privé actif |
| Conformité RGPD | 6/10 | 9/10 | DPO formé + registre + AIPD + DPA validé |
| Conformité SOC 2/ISO | 4/10 | 7/10 | Auto-éval + roadmap + preuves publiques |
| Observabilité / IR | 6/10 | 9/10 | Sentry + Better Stack + runbooks incidents |
| Gestion accès / SSO | 7/10 | 9/10 | Supabase OAuth + 2FA forcé + audit log immuable |
| Backup / DR | 6/10 | 9/10 | pg_dump R2 + test restauration trimestriel |
| Documentation | 8/10 | 10/10 | Trust center + legal + disclosure + status |
| Cyber-assurance | 0/10 | 7/10 | Souscription Q4 2026 (1 200 €, financée 1er client) |
| **Moyenne pondérée** | **6,8** | **9,0** | |

---

## Partie IV — Acquisition zéro budget (30 hacks)

### Synthèse

30 hacks marketing/acquisition classés par score ICE (Impact × Confiance × Easiness). Les 10 premiers représentent à eux seuls ~85 % du ROI prévisionnel sur 12 mois.

### Top 10 hacks à activer immédiatement

| Rang | Hack | Catégorie | ICE | Activation |
|---|---|---|---|---|
| 1 | **LinkedIn organique founder** (3 posts/sem, manifeste/POV/insight chiffré) | Content | 64.8 | S1 |
| 2 | **Cold email Gmail + Mailmerge** (500 emails/sem, séquences 3-touch) | Outbound | 57.6 | S1 |
| 3 | **LinkedIn outbound manuel** (50 invits/sem ciblées BMs ESN) | Outbound | 57.6 | S1 |
| 4 | **Bouche-à-oreille design partners** (3 intros/signature) | Growth | 54.0 | S1 puis post-signature |
| 5 | **Blog SEO Centrium** (30 articles en 30 j via Claude API) | Content | 50.4 | S2 |
| 6 | **Recherche dirigeants ESN via Pappers + Hunter + Apollo Free** | Outbound | 50.4 | S1 |
| 7 | **Customer advocacy** (NPS + reviews Appvizer + vidéos) | Growth | 50.4 | S6+ |
| 8 | **Lead magnets** (10 templates Excel/Notion gating Tally email) | Content | 44.8 | S2 |
| 9 | **`llms.txt` + GEO optimisation** (citation ChatGPT/Perplexity/AI Overviews) | Content | 44.8 | S1 |
| 10 | **Communauté Slack BMs ESN privée** (50 → 200 membres) | Growth | 44.1 | S8 |

### Calendrier semaine par semaine sur 90 jours

#### Mois 1 — Fondations & premières tractions

| Semaine | Focus | Hacks activés | Livrables fin de semaine |
|---|---|---|---|
| **S1** | Setup outils + cold outbound | #1 LinkedIn organique, #3 Sparring page, #15 Status page | Profil LinkedIn optimisé, 200 prospects Pappers identifiés, 50 invits envoyées, 3 posts, status page live |
| **S2** | Premier contenu + outils gratuits | #2 Blog SEO, #11 Démo libre-service, #19 Build in public | Newsletter n°1 envoyée, démo Arcade live, 5 articles SEO publiés |
| **S3** | Audit-driven + community seed | #2 Audit gratuit ESN, #8 Slack BMs | 10 audits livrés, Slack BM Connect créé + 30 invités |
| **S4** | Podcast launch + pitches presse | #7 Podcast Centrium Cercle, #16 Pitch journalistes, #17 Podcasts invités | Épisode pilote enregistré, 15 journalistes pitchés, 6 hosts podcasts pitchés |

**KPI fin M1** : 200 DM LinkedIn envoyés, 15 sparring sessions bookées, 100 abonnés newsletter, 30 membres Slack, 4 RDV qualifiés en pipeline.

#### Mois 2 — Amplification

| Semaine | Focus | Hacks activés | Livrables |
|---|---|---|---|
| **S5** | Pricing + free tool | #12 Pricing calculator, #13 Free CV Parser | Calculator pricing live, MVP Free CV Parser shippé |
| **S6** | Tribune + reverse pitch | #5 Reverse pitch déçus Boondmanager, #18 Tribune Maddyness | Tribune publiée, 15 utilisateurs concurrents contactés |
| **S7** | Open source + concours | #14 `@centrium/cv-parser` npm, #20 Dossier concours | Lib OSS publiée, dossier Réseau Entreprendre soumis |
| **S8** | Community LinkedIn + podcast ramp | #6 Groupes LinkedIn, #7 Podcast ép 4 | Groupe LinkedIn co-modéré, podcast ép 4 en ligne |

**KPI fin M2** : 300 abonnés newsletter, 100 membres Slack, 1 article presse confirmé, 2 POC en cours, 1 LOI signée.

#### Mois 3 — Conversion & compounding

| Semaine | Focus | Hacks activés | Livrables |
|---|---|---|---|
| **S9** | Baromètre + démos live | #4 Demo "vos données importées", #10 Baromètre ESN | Sondage baromètre lancé 200 ESN, 5 démos live faites |
| **S10** | Bottom-up sales push | #8 vendor day Slack, ProductHunt launch | 1er "vendor day" Slack BM Connect, PH top 5 du jour |
| **S11** | Optimisation conversions | A/B tests + retest tous canaux | Wording optimisé, flow gratuit → payant amélioré |
| **S12** | Closing + rétrospective | Tous canaux | Closing LOI en contrats signés, retrospective 90 j |

**KPI fin M3** : 500 abonnés newsletter, 200 membres Slack, 1 article presse publié, **2-3 clients payants signés**, 8-10 deals pipeline avancé.

---

## Partie V — Growth hacks spécifiques ESN

### Synthèse

Le secteur ESN français est petit (~3 000 ESN cibles 10-200 consultants), endogamique, et son leader Boondmanager (~3 000 clients) à 80 €/user crée une **vraie ouverture pour une alternative à 39 €/user**. Les BMs (Business Managers) sont les **utilisateurs prescripteurs** : c'est par eux qu'on entre, pas par les DG.

### Les 7 hacks à activer dans les 7 prochains jours

| # | Hack | Pourquoi LUNDI | Effort 1ère semaine |
|---|---|---|---|
| **1** | **Cold DM LinkedIn avec screenshot personnalisé du CV refait** (le hook compétiteur) | Trigger émotionnel immédiat sur ego dirigeant ESN qui voit "son" catalogue refait | 6-8 h (10 mockups + 50 DM) |
| **2** | **Page `/sparring` "45 min gratuites sans pitch"** + post LinkedIn de lancement | Format flatteur, barrière entrée nulle, recherche utilisateur en or, conversion call → demo 15-20 % | 4 h (page Calendly + post) |
| **3** | **Status page + roadmap publiques** (Instatus Free + Notion votable) | Lubrifiant de closing : raccourcit cycle de vente de 2-3 semaines, demande systématique DSI/DPO | 4 h setup + 30 min/sem |
| **4** | **Newsletter Substack "État du Staffing ESN"** numéro 0 manifeste | Hebdo dans la boîte mail = ta marque devant le décideur 52×/an, addiction installée, SEO Substack natif | 4 h numéro 0 + 4 numéros d'avance |
| **5** | **Build in public LinkedIn** — premier post vendredi 17h ("Semaine 1 / 100") | L'algorithme LinkedIn FR adore ce format en 2026, narration "founder relatable", ambassadeurs naturels | 1 h/sem |
| **6** | **Slack "BM Connect" créé + 30 premiers invités** | Aucune communauté FR n'existe pour cette cible (vérifié) — first mover absolu. Bottom-up sales : tu sèmes chez BMs, tu récoltes chez DG. **C'est le moat de distribution.** | 5 h setup + 30 DM invits |
| **7** | **Démo libre-service Arcade/Supademo sur `/demo`** | Élimine friction "il faut booker", génère leads chauds, capture email post-tour | 8-10 h one-shot |

### LA PÉPITE #1 — Hack #8 Slack BM Connect (à ne PAS rater)

Pourquoi cette communauté est plus précieuse que tous les autres hacks réunis :
- **Aucune communauté FR n'existe** pour les BMs d'ESN (vérifié sur Slack/Discord/LinkedIn).
- Les BMs sont les **utilisateurs quotidiens** de Centrium → les prescripteurs internes auprès du DG.
- Construit un **actif communautaire durable** qui survit à toi-même.
- **Tous les autres hacks sont des feux d'artifice ; celui-ci est une centrale nucléaire** qui produit pendant 5 ans.

Règle d'or : 60 jours sans aucune mention commerciale. À J+60, "vendor day" mensuel autorisé.

### Hacks ESN-spécifiques différenciants

- **Audit gratuit du staffing** (livrable PDF 8-12 pages) → format légitime conseil, effet réciprocité massif, taux de réponse ~25 %.
- **Démo "vos données importées"** (drag-drop 3 CV → catalogue brandé live) → "Aha moment" pendant le call, conversion ×2 vs demo générique. **Toujours supprimer les CV devant eux en fin de call** (RGPD).
- **Reverse pitch déçus Boondmanager/Whoz/Stafiz** → audience pré-qualifiée (budget existant), 6 mois gratuits = barrière nulle, sources de case studies publics.
- **Baromètre annuel "Marché ESN France 2026"** co-signé Syntec Numérique ou EFREI/Epitech → citation presse permanente + excuse parfaite pour contacter 200 dirigeants.

---

## Partie VI — Plan opérationnel 12 mois détaillé

### Mois 1 — Setup gratuit complet + 1er hack growth

#### Semaine 1 — Stack technique & growth socle
- **Lundi-Mardi (technique)** : créer comptes Sentry Free + Better Stack Free + PostHog Free + Cloudflare R2 + Upstash Redis Free + GitHub Actions (Dependabot, CodeQL, Semgrep, GitGuardian activés). Configurer pipeline ZAP baseline hebdo.
- **Mercredi (sécurité)** : créer pages `/trust`, `/legal`, `/security/disclosure`, `security.txt`. Setup programme YesWeHack privé "Hall of Fame". Désigner Salim DPO formellement (décision SAS) + déclaration CNIL.
- **Jeudi (growth)** : optimiser profil LinkedIn Salim (bannière Centrium, headline "Aide les ESN FR à staffer +30 % de leurs consultants"), poster manifeste #1, créer page `/sparring` avec Calendly Free.
- **Vendredi (prospection)** : extraction Pappers 200 ESN cibles 10-200 consultants + 50 premières invitations LinkedIn manuelles ciblées BMs/Directeurs Staffing.

#### Semaine 2 — Aides & financement
- **Lundi** : ouvrir dossier **Bourse French Tech** sur bpifrance.fr (espace "Mes aides"). Lire les guides BPI Création.
- **Mardi** : postuler **AWS Activate Founders**, **Microsoft Founders Hub**, **Google Cloud Tier 1**, **Anthropic Startup Program** (essentiel), **Cloudflare for Startups**, **Notion for Startups**, **Brevo Startup**, **Supabase Launch Program**.
- **Mercredi** : contacter **Initiative Île-de-France** pour pré-diagnostic téléphonique.
- **Jeudi** : pré-sélection **Réseau Entreprendre Booster**.
- **Vendredi** : candidatures **STATION F** programme Founders + **Wilco**.

#### Semaine 3 — Community & content seed
- **Lundi** : créer Slack workspace "BM Connect" + 6 channels + charte courte.
- **Mardi-Mercredi** : DM LinkedIn personnalisés à 30 BMs d'ESN pour invitation (formulation "tu es co-fondateur, pas client").
- **Jeudi** : lancer le premier thread "Quel est votre coût intercontrat moyen 2026 ?" + publier 1ère vidéo founder face-cam 60s sur LinkedIn.
- **Vendredi** : 50 nouvelles invits LinkedIn + 100 cold emails Gmail/Mailmerge (1ère séquence).

#### Semaine 4 — Audit-driven + premier closing
- **Lundi-Mardi** : créer template Notion "Audit Staffing 360°" + 5 premiers audits PDF pour 5 ESN cibles (Akkodis, Devoteam, Sopra Steria filiale PME, etc.).
- **Mercredi** : envoyer les 5 audits par mail nominatif au DG + DM LinkedIn de suivi.
- **Jeudi** : premier article SEO blog publié via Claude API (sujet "Inter-contrat : 7 stratégies pour le réduire").
- **Vendredi** : implémenter NPS template Customer Advocacy (C10) sur premiers trials.

**KPI fin M1** : 200 DM envoyés, 15 sparring sessions bookées, 30 membres Slack, 1 dossier BFT déposé, 8 programmes startup activés, 4 RDV qualifiés en pipeline, 5 articles SEO publiés, 5 audits livrés.

---

### Mois 2-3 — Premiers design partners + content régulier

#### Mois 2

**Semaine 5 (S5)** : lancement newsletter "État du Staffing ESN" (Substack, premier email à 50 abonnés seed) + 2 nouveaux templates Excel/Notion (lead magnets). Continuer cadence : 100 emails/sem, 50 invits/sem, 3 posts/sem, 5 articles/sem. Premier RDV physique au French Tech Central STATION F.

**Semaine 6 (S6)** : pitcher 10 SaaS B2B FR pour référencement croisé (PayFit, Lucca, Pennylane, Sellsy, Brevo, Free-Work, LeHibou). Contacter 10 podcasts FR pour intervention (GDIY, Saas Connection, La Martingale). Premier article invité Medium / Hashnode. **Préparer rescrit JEI** auprès DGFiP (anticipation 3 mois).

**Semaine 7 (S7)** : publier fiches Appvizer + GetApp + Capterra + Crozdesk + Société.com SaaS. Premier webinaire pitché à un partenaire (par exemple Pennylane). 1 article invité publié. Soumettre dossier Innov'Up Faisabilité IDF.

**Semaine 8 (S8)** : lancer collecte data "Baromètre Staffing ESN 2026" via Typeform sur 200 ESN. 1 podcast enregistré. 1 carrousel LinkedIn "Boondmanager vs Centrium vs Excel". Concours **i-Nov vague Numérique** dossier prêt.

**KPI fin M2** : 300 abonnés newsletter, 100 membres Slack, 1 article presse confirmé, **1er design partner signé (-50 % Year 1 ~14 k€ ARR)**, 2 POC en cours.

#### Mois 3

**Semaine 9 (S9)** : publier Baromètre Staffing ESN (lead magnet majeur). Pitcher 10 journalistes (Maddyness, Frenchweb, Numerama, BFM Tech, Décideurs) avec angle "Étude exclusive 200 ESN". Lancer premier webinaire co-marqué.

**Semaine 10 (S10)** : lancement **ProductHunt** mardi/mercredi 00:01 PST. Mobiliser réseau pour upvotes première heure. 1 podcast enregistré et diffusé. Activation programme affiliation 20 % Year 1.

**Semaine 11 (S11)** : ouverture officielle communauté Slack "BM Connect" — inviter 30 nouveaux BMs. 1 webinaire co-marqué animé. Premier article presse publié (Maddyness ou Frenchweb).

**Semaine 12 (S12)** : mesurer KPI vs cible. Identifier top 3 canaux performants → doubler effort. Killer 1-2 canaux faibles. Premier dossier candidature Pass French Tech. Customer advocacy push : 3 reviews collectées sur Appvizer.

**KPI fin M3** : 500 abonnés newsletter, 200 membres Slack, 1 article presse publié, **2 clients signés** (~28 k€ ARR), 8-10 deals pipeline avancé.

---

### Mois 4-6 — Premières signatures payantes + visibilité

**Mois 4** :
- Réception probable de la **BFT** (idéal 30 k€ subvention) — first cash significatif sur compte.
- Continuation cadence : 200 emails/sem, 50 invits/sem, 3 posts LinkedIn/sem, 5 articles SEO/sem.
- 2e design partner signé via réseau intro 1er design partner.
- Newsletter 800 abonnés.
- Slack BMs 250 membres.
- Speaking gratuit 1er meetup STATION F.

**Mois 5** :
- **Comités d'agrément PH** (Initiative + Réseau Entreprendre) → décisions probables.
- Si PH validés : demande **Prêt Amorçage Bpifrance** (effet levier 1:1, 50-100 k€).
- **3e signature** (effet bouche-à-oreille).
- Slack BMs 350 membres, premier "vendor day" mensuel.
- 2e article presse publié.
- Publication mensuelle baromètre mis à jour avec données du mois.

**Mois 6** :
- Réception **rescrit JEI** validé → préparation 1ʳᵉ embauche.
- Newsletter 1 200 abonnés.
- 12 articles SEO publiés cumulés → premier pic trafic SEO (~1 500 visites/mois GSC).
- **Audit interne sécurité semestriel** : test restauration backup, audit ZAP authentifié manuel, mise à jour `/trust`.
- 4 clients cumul (~55-60 k€ ARR).

**KPI fin M6** : 1 200 abonnés newsletter, 350 membres Slack, 3 articles presse, **4 clients signés**, BFT reçue, PH en passe d'être validés, 1er Prêt Amorçage en cours.

---

### Mois 7-9 — Consolidation + dossier SOC 2 (gratuit auto-évaluation) + premier pentest gratuit (bug bounty privé)

**Mois 7** :
- **5e + 6e signature** (effet compounding).
- Premier **apprenti dev** recruté (aide 6 k€ + exonérations JEI) — coût net entreprise ~5-8 k€/an.
- Préparation dossier **SOC 2 Type I auto-évalué** publié sur `/trust` : grille AICPA complète + preuves vérifiables + roadmap audit Q4 2026.
- Premier "**pentest gratuit**" via **bug bounty privé YesWeHack** ouvert à 5-10 chercheurs FR sourcés via Twitter infosec — Hall of Fame public.
- Newsletter 1 800 abonnés.

**Mois 8** :
- 7e + 8e POC en cours.
- Concours **i-Nov vague Numérique** : décision probable.
- Speaking gratuit Meetup Tech Paris + Lyon (storytelling "0 à 1 client en 6 mois sans budget").
- Slack BMs 600 membres.
- 4e article presse publié.

**Mois 9** :
- Réception probable subvention **Innov'Up Faisabilité IDF** (20-30 k€).
- **6e client signé** (~85-95 k€ ARR cumul).
- Publication **rapport pentest interne semestriel** sur `/trust` (consolidation ZAP + Burp manuel + Nuclei + bug bounty).
- Préparation dossier **Pass French Tech**.
- Newsletter 2 500 abonnés.
- 30 articles SEO publiés cumulés → trafic organique 3 000-5 000 visites/mois.

**KPI fin M9** : **6 clients signés** (~95-110 k€ ARR), 2 500 abonnés newsletter, 600 membres Slack, BFT + Innov'Up reçues, PH + Prêt Amorçage en cours, dossier SOC 2 auto-éval publié, bug bounty actif, apprenti recruté.

---

### Mois 10-12 — 8-10 clients signés + statut JEI accepté + cash disponible

**Mois 10** :
- 7e signature.
- **Statut JEI confirmé** par DGFiP → exonérations sociales sur apprenti + tout futur recrutement R&D.
- Google Cloud **Tier 2 débloqué** via sponsor STATION F (passage 200 k$).
- HubSpot for Startups 90 % off (via STATION F).
- Premier **webinaire pré-noël** "Bilan 2026 du staffing ESN" co-marqué Pennylane.
- Pass French Tech décision attendue.

**Mois 11** :
- 8e signature (~130-150 k€ ARR cumul).
- Premier article tribune libre publié sur Maddyness ("Pourquoi 80 % des ESN françaises tournent encore sur Excel en 2026").
- Newsletter 3 500 abonnés.
- Slack BMs 900 membres.
- Préparation déclaration **CII** sur exercice 2026 (récupération 30 % des dépenses innovation en 2027).
- Lancement campagne "Référence design partner" : demander à chaque client 3 intros bouche-à-oreille.

**Mois 12** :
- **Bilan année 1** : 8 clients signés, ~150-200 k€ ARR, 140-270 k€ cash non-dilutif sécurisé, 80-150 k$ crédits cloud utilisables, 9,0/10 maturité atteint (hors cyber-assurance déjà souscrite avec premier cash client).
- **Rétrospective trimestrielle 4** : identification 3 canaux à doubler en année 2, kill 1-2 canaux faibles.
- **Préparation année 2** : recrutement 1er dev senior (~80-100 k€ chargés mais ~50 k€ net JEI) + commande premier pentest payant (5 k€) + souscription cyber-assurance Stoïk (1 200 €) + démarrage SOC 2 Type I.
- Premier dossier **Eurostars** monté avec partenaire universitaire belge/allemand (module IA matching, jusqu'à 360 k€ pour Centrium).

**KPI fin M12** : **8 clients signés** (~150-200 k€ ARR), 4 000+ abonnés newsletter, 1 000 membres Slack, JEI validé, CII préparé, cash disponible pour bascule payante year 2.

---

## Partie VII — Compte de résultat prévisionnel 0 € — 12 mois

### Hypothèses

- **1ʳᵉ signature design partner mois 3** (offre -50 % year 1, soit ~14 k€ ARR au lieu de 28 k€).
- **2e signature mois 5** (~14 k€ ARR design partner).
- **3e + 4e mois 7** (transition design partner → tarif normal ~16-18 k€ ARR).
- **5e + 6e mois 9** (tarif normal ~16-22 k€ ARR).
- **7e + 8e mois 11** (tarif normal ~18-25 k€ ARR).
- **Total fin année 1 : 8 clients, ARR consolidé ~150-200 k€** (MRR ~12,5-17 k€).
- **Coût mois récurrent** : ~50-200 € variable (Anthropic API + domaine).
- **Aides reçues année 1** : ~60-110 k€ cash non-dilutif (scénario réaliste, hors crédits cloud).

### Tableau mensuel — scénario réaliste

| Mois | Revenu MRR | Revenu cumul ARR | Coût mensuel | Aides reçues mois | Cash net mois | Cash cumul |
|---|---|---|---|---|---|---|
| M1 | 0 € | 0 € | 50 € | 0 € | -50 € | -50 € |
| M2 | 0 € | 0 € | 50 € | 0 € | -50 € | -100 € |
| M3 | 1 167 € | 14 000 € | 60 € | 0 € | +1 107 € | +1 007 € |
| M4 | 1 167 € | 14 000 € | 70 € | **30 000 € (BFT)** | +31 097 € | +32 104 € |
| M5 | 2 333 € | 28 000 € | 80 € | 0 € | +2 253 € | +34 357 € |
| M6 | 2 333 € | 28 000 € | 90 € | **15 000 € (PH Initiative 1ère tranche)** | +17 243 € | +51 600 € |
| M7 | 4 833 € | 58 000 € | 100 € | **25 000 € (Innov'Up 1ère tranche + PH RE)** | +29 733 € | +81 333 € |
| M8 | 4 833 € | 58 000 € | 110 € | 0 € | +4 723 € | +86 056 € |
| M9 | 7 750 € | 93 000 € | 130 € | **15 000 € (Innov'Up reliquat + PH RE 2e)** | +22 620 € | +108 676 € |
| M10 | 7 750 € | 93 000 € | 150 € | **20 000 € (PH Initiative 2e)** | +27 600 € | +136 276 € |
| M11 | 11 167 € | 134 000 € | 170 € | 0 € | +10 997 € | +147 273 € |
| M12 | 12 500-16 700 € | **150-200 k€ ARR** | 200 € | 0 € | +12 300-16 500 € | **+159 573 € à +163 773 €** |
| **Total an 1** | — | **150-200 k€ ARR** | ~1 250 € | **105 000 €** | — | **~160 k€ cash** |

### Lecture

- **Cash brûlé total année 1 (hors aides + hors revenus)** : ~1 250 € (Anthropic API + domaine).
- **Aides cash reçues** : ~105 k€ (BFT + Innov'Up + 2 PH, scénario médian).
- **Revenu cumul year 1** : ~50-65 k€ (MRR croissant de 0 à ~15 k€).
- **Cash disponible fin M12 (avant impôts)** : ~150-165 k€ — disponible pour bascule payante year 2 (embauche, pentest, cyber-assurance, SOC 2).
- **ARR fin année 1** : 150-200 k€ → base solide pour levée seed pré-revenue ou continuation bootstrap rentable.

### Scénario conservateur (50 % succès aides + 6 clients seulement)

- **Cash cumul fin M12** : ~75-90 k€ — toujours suffisant pour year 2.
- **ARR fin M12** : ~100-130 k€ — pas catastrophique, valide PMF.

### Scénario optimiste (i-Nov gagné + 10 clients)

- **Cash cumul fin M12** : ~280-320 k€ — bascule payante très confortable.
- **ARR fin M12** : ~220-260 k€ — fenêtre levée Seed à valorisation attractive.

---

## Partie VIII — Risques et plan de mitigation

| Risque | Probabilité | Impact | Mitigation 0 € |
|---|---|---|---|
| **Burn-out fondateur solo** | Élevée | Critique | (1) Bloquer 1 jour OFF/sem **non négociable** (samedi). (2) Limiter sparring sessions à 4/sem max. (3) Automatiser tout ce qui est automatisable (Claude API drafts, templates Notion réutilisables, Mailmerge). (4) Networking peer-to-peer fondateurs solos (groupes Indie Hackers FR, La Brigade) pour ventiler. (5) Recruter apprenti dès M7 (aide 6 k€ + exo JEI). |
| **Churn rapide d'un design partner** (avant fin contrat) | Moyenne | Élevé | (1) Onboarding qualitatif : minimum 3 sessions 1-1 dans le 1er mois. (2) NPS systématique J+30, J+60, J+90 — détection précoce signaux faibles. (3) Roadmap publique votable — design partner se sent écouté. (4) Réduction Year 2 conditionnée à présence Year 1 complète. (5) Backup pipeline : toujours 3 prospects ready en cas de remplacement. |
| **Anthropic facture qui explose** | Moyenne | Moyen | (1) Quota dur par client (X CV générés/mois inclus, surplus facturé). (2) Cache Claude pour prompts répétitifs (CV templates). (3) Bascule Groq Llama 3.3 70B pour tâches secondaires (classification skills, parsing). (4) Monitor coût Anthropic via Langfuse (alerte si > 100 €/sem). (5) Plafond mensuel hard côté SDK Anthropic. |
| **RGPD : oubli côté ops** (CV stocké hors UE, transfert non documenté, AIPD obsolète) | Moyenne | Critique | (1) Registre traitements Notion mis à jour à chaque release. (2) AIPD CV revue trimestrielle. (3) Tous les sous-traitants documentés dans DPA (Supabase EU, Resend EU, Anthropic — DPA signé). (4) Suppression auto CV à J+7 sur Free CV Parser. (5) Formation MOOC CNIL maintenue à jour. (6) Pas de transfert hors UE sans clauses contractuelles types. |
| **Mauvaise utilisation des aides** (mauvais dossier = refus + perte de temps) | Élevée | Élevé | (1) **Dossier maître réutilisable** unique (BP + pitch deck + prévisionnel + 1-pager) → décliné en 5+ candidatures. (2) Pré-diagnostic téléphonique systématique avant dépôt (Bpifrance, Initiative, BPI Création — gratuit). (3) Relecture croisée par 2-3 fondateurs amis ayant déjà obtenu l'aide. (4) Respecter la règle "ne pas démarrer un programme avant d'avoir candidaté à l'aide liée". |
| **Concurrence qui copie** (Boondmanager sort un module IA, Whoz baisse prix) | Moyenne | Moyen | (1) Vitesse d'itération supérieure (1 release/semaine vs 1/trimestre pour Boondmanager) — démonstration via changelog public. (2) Communauté Slack BMs = moat de distribution dont les compétiteurs ne disposent pas. (3) Pricing transparent 39 €/user = positionnement différenciant qu'ils ne peuvent pas matcher sans cannibaliser leur base. (4) Open source `@centrium/cv-parser` = signal d'authenticité tech impossible à copier. |
| **Bannissement LinkedIn** (volume excessif DM) | Faible | Critique sur canal #1 | (1) Strict 50 invits/sem max (limite officielle 100/sem). (2) Aucun outil tiers d'automation (Waalaxy, PhantomBuster = bans systématiques). (3) Compte backup pro de Salim créé en secours. (4) Diversification canaux dès M2 (newsletter, blog SEO, Slack — pour ne plus dépendre de LinkedIn seul). |
| **Anthropic Startup Program refusé** | Moyenne | Moyen | (1) Backup Mistral La Plateforme Free + Groq Free + Hugging Face Inference. (2) Optimisation prompts (templates Claude + cache). (3) Réessayer Anthropic Startup tous les 3 mois (programme évolue). |
| **PH refusés ou réduits** (un seul des deux validés) | Moyenne | Moyen | Cash cumul restant suffisant (BFT 30 k€ + Innov'Up 30 k€ + 1 PH 30 k€ = 90 k€). Scénario conservateur reste viable. |

---

## Partie IX — Quand basculer en MODE PAYANT (seuils précis)

| Bascule | Seuil de déclenchement | Coût estimé | Justification |
|---|---|---|---|
| **Supabase Pro** | > 10-15 clients ESN actifs (dépassement 500 MB DB ou 50k MAU) | 25 $/mois | Préserver perf + PITR backup |
| **Vercel Pro ou Cloudflare Workers Paid** | > 30 clients actifs (> 100k req/jour) | 5-20 $/mois | Bandwidth + CPU edge |
| **Resend Pro ou SES** | > 7-8 clients actifs (> 100 emails/jour) | 20 $/mois Resend ou pay-per-use SES | Volume email transactionnel |
| **Cyber-assurance Stoïk** | **Dès le 1er client signé** (impérativement avant le 3e) | ~1 200 €/an | Couverture incident cyber, demande contractuelle B2B |
| **Premier pentest PASSI signé** (Synacktiv, XMCO, Algosecure) | **5e client payant** OU 1ère demande RFP exigeant pentest tiers | ~5 000 € pentest 5 jours-homme | Crédibilité grands comptes |
| **Avocat IT relecture CGV/DPA sur mesure** | 1ʳᵉ négo contrat entreprise > 250 salariés OU ARR > 50 k€ | ~1 500 € relecture ciblée | Clause limitation responsabilité solide |
| **SOC 2 Type I démarré** (Drata + auditeur Prescient Assurance) | 3e prospect > 200 personnes le demandant OU ARR > 100 k€ | ~12 k$ packagé startup | Déverrouille grands comptes US + FR > 100p |
| **Embauche 1er dev senior** | **8-10 clients signés** OU ARR > 150 k€ | ~80-100 k€ chargés (mais ~50 k€ net JEI exonération) | Capacité produit + dev features clients |
| **Embauche 1er commercial / SDR** | **15 clients signés** OU MRR > 15 k€ | ~50-70 k€ chargés | Founder peut sortir du sales mode pour passer à CEO mode |
| **DPO externe nommément distinct** (Dipeeo, DPO Consulting) | 20e client B2B OU 1ère demande grand compte | ~250 €/mois | Régularisation conflit intérêt fondateur=DPO |
| **CRM payant** (HubSpot Sales Pro ou migration vers CRM interne Centrium dogfood) | Quand HubSpot Free limite (séquences, automation poussée) | 0 € si dogfood, 50 €/user/mois si HubSpot Pro | Productivité commerciale |
| **ISO 27001 audit** | 3 demandes RFP grand compte exigeant ISO OU ARR > 500 k€ | ~25 k€ packagé startup | Déverrouille marchés régulés (banque, santé, secteur public) |
| **Lever Seed** | MRR > 25-30 k€ stable 3 mois (= ~300 k€ ARR) | N/A (dilutif) | Accélération recrutement + marketing + verticales export |

---

## Partie X — Annexes

### Annexe A — Liste exhaustive des 25 services SaaS gratuits

1. **Cloudflare Pages** (hosting)
2. **Supabase Free** (DB + Auth)
3. **Neon Free** (DB backup)
4. **Cloudflare R2** (storage)
5. **Resend Free** (email transactionnel)
6. **Brevo Free** (email marketing 300/jour)
7. **Substack** (newsletter publique)
8. **Sentry Free** (error tracking)
9. **PostHog Cloud Free** (product analytics)
10. **Cloudflare Web Analytics** (web analytics)
11. **Better Stack Free** (uptime + status page)
12. **Upstash Redis + QStash Free** (cache + queue)
13. **GitHub Actions Free** (CI/CD)
14. **Dependabot + Snyk Free + Trivy + socket.dev + CodeQL + GitGuardian + Semgrep** (security stack complet)
15. **GitHub Free** (repos)
16. **Mintlify Free / GitBook Free** (docs publiques)
17. **Notion Free** + Notion for Startups (wiki)
18. **Linear Free** (ticketing)
19. **Claude Code + Continue.dev** (IDE AI)
20. **Anthropic API + Groq Free + Langfuse Free** (LLM)
21. **HubSpot Free CRM** (pipeline commercial)
22. **Apollo Free + Hunter Free + Skrapp Free** (prospection)
23. **Cal.com Free** (booking)
24. **Google Meet + OBS Studio + YouTube unlisted** (démos)
25. **Figma Free + Excalidraw + Lucide + unDraw** (design)

### Annexe B — Liste des 15+ aides/subventions à demander

**Programmes startup (crédits) — semaine 1-2**
1. AWS Activate Founders (1-5 k$)
2. Microsoft for Startups Founders Hub (jusqu'à 150 k$ Azure + 2,5 k$ OpenAI/M365)
3. Google for Startups Cloud Tier 1 (2 k$)
4. Anthropic Startup Program (1-5 k$ crédits API)
5. Cloudflare for Startups (Workers/Pages/R2/Stream gratuits)
6. Notion for Startups (6 mois Plus + AI)
7. Brevo Startup (12 mois)
8. Supabase Launch Program (12 mois Pro)
9. Sentry for Startups (Team plan 6 mois)
10. Linear for Startups (Linear Business gratuit)

**Subventions et prêts (cash) — mois 1-12**
11. **Bourse French Tech (BFT) Bpifrance** — jusqu'à 30 k€ subvention
12. **Innov'Up Faisabilité IDF** — jusqu'à 30 k€ subvention 50 %
13. **Initiative France PH** — 15-50 k€ à 0 %
14. **Réseau Entreprendre Booster PH** — 30-90 k€ à 0 %
15. **Prêt Amorçage Bpifrance** (post-PH) — 50-100 k€ bonifié
16. **Concours i-Nov vague Numérique** — 100 k€+ subvention
17. **CII (Crédit Impôt Innovation)** — 30 % des dépenses innovation, plafond 400 k€
18. **Statut JEI** — exonération cotisations sociales 30-45 % personnel R&D
19. **ACRE** — exonération cotisations sociales fondateur 12 mois
20. **Pass French Tech** — label + accès facilités année 1-2

**Bonus accompagnement (gratuit)**
21. STATION F programme Founders (sans equity)
22. Wilco (12 mois accompagnement + intro investisseurs)
23. AGORANOV (incubateur deeptech IDF subventionné Région)
24. Microsoft Startup Garage (100 % en ligne + crédits)

### Annexe C — Template email pitch journaliste FR tech

```
Sujet : Story — Solo founder bootstrap un SaaS ESN en 4 mois,
alternative FR à Boondmanager

Bonjour {Prénom},

J'ai vu ton article sur {sujet récent}, qui m'a fait penser
à mon parcours.

Je suis Salim, j'ai lancé Centrium (PMS pour ESN françaises)
il y a 4 mois en solo, 0 levée, stack Supabase + Claude API.

Angles possibles pour un article :
1. "Comment un solo founder bootstrap un SaaS B2B en 2026"
2. "Alternative française à Boondmanager — pourquoi maintenant"
3. "Claude API + Supabase : la stack low-cost pour MVP B2B"

Je peux te partager :
- chiffres réels (MRR, coûts infra, time to market)
- étude maison "50 ESN françaises interrogées"
- démo produit

15 min cette semaine ?

Salim — Fondateur Centrium
https://www.centrium-platform.com
```

### Annexe D — Template message LinkedIn dirigeant ESN

**Invitation (300 caractères max)**
```
Bonjour {Prénom}, je travaille sur les outils métier ESN
(alternative FR à Boondmanager) — j'aimerais connecter
avec des BMs/DG comme toi pour échanger. Aucun pitch derrière.
Salim
```

**Message J+3 après acceptation**
```
Merci pour l'accept {Prénom}.

Vraiment juste une question si t'as 30 sec : quel est
ton plus gros galère côté staffing aujourd'hui ?
(sourcing, matching, suivi CRA, autre ?)

Tu fais comment actuellement ?

Salim
```

**Message J+10 si conversation engagée**
```
{Prénom}, ce que tu décris c'est pile ce qu'on règle chez Centrium.
Je te montre en 15 min sans pitch ?
https://cal.com/salim-centrium/15min
```

### Annexe E — Template invitation audit gratuit staffing

```
Sujet : Audit Staffing 360° offert — {Société}

Bonjour {Prénom},

Je suis Salim, fondateur de Centrium (PMS pour ESN françaises).

J'ai compilé un audit gratuit de 8 pages sur le staffing de
{Société}, à partir des données publiques (LinkedIn, site,
profils consultants visibles) :
- Nombre de consultants visibles vs effectifs réels
- Top 3 technologies positionnées
- Comparatif avec {Concurrent 1} et {Concurrent 2}
- Estimation taux d'inter-contrat
- 3 recommandations actionnables

PDF en pièce jointe (4 minutes de lecture).

Si tu veux qu'on en discute 20 min, voici mon agenda :
https://cal.com/salim-centrium/20min

Pas de pitch. Juste tes retours sur le format et les chiffres.

Salim
https://www.centrium-platform.com
```

### Annexe F — Template demande référence design partner

```
Salut {Prénom},

Tu m'as dit que Centrium t'a fait gagner X heures/sem.

J'ai besoin d'un coup de main : tu pourrais penser à 3 BMs
ou dirigeants d'ESN dans ton réseau qui auraient le même
problème ?

Je te file un template d'intro pré-écrit, t'as juste à
forwarder + ajouter "Salim est sérieux, jette un œil".

Cadeau : 1 mois offert sur ton abo Centrium pour chaque
ESN qui signe via ton intro.

Salim
```

**Template d'intro à forwarder**
```
Sujet : Intro — Salim (Centrium) <> {Prénom contact}

Hello {Prénom contact},

Je te présente Salim, fondateur de Centrium
(le SaaS qu'on utilise chez nous pour le staffing — on gagne
~X heures/sem dessus, plus aucun Excel partagé).

Vu ce que tu m'avais dit sur ton bordel actuel, ça vaut
20 min de démo.

Salim, à toi !
```

---

**Fichier généré le 2026-06-15 — version 1.0 — propriété QuadCore SAS — Plan d'exécution Centrium 12 mois zéro budget cash externe.**
