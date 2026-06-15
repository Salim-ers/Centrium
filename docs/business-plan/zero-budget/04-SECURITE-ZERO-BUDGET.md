# Sécurité Zéro Budget — Centrium by QuadCore SAS

> **Document RSSI / Auditeur sécurité indépendant**
> **Produit** : Centrium by QuadCore SAS — SaaS B2B vertical ESN françaises
> **URL** : https://www.centrium-platform.com
> **Date** : Q2 2026
> **Auteur** : Salim El Rasoul (fondateur, DPO interne auto-déclaré)
> **Objectif** : note maturité sécurité **6,8/10 → 9/10** en 12 mois, budget cash externe = **0 €**

---

## 1. Contexte et philosophie de l'approche

Centrium est un SaaS B2B vertical pour ESN françaises (10-200 consultants). Les prospects sont des DSI/RSSI d'ESN qui auditent leurs fournisseurs. La sécurité n'est pas un "nice to have" mais un **critère gating** au-dessus de 20 collaborateurs côté client.

La question n'est pas "**est-ce qu'on peut faire 0 € ?**" mais "**est-ce qu'un dossier sécurité 0 € est défendable face à un RSSI exigeant qui sait poser les bonnes questions ?**" Réponse : **oui, jusqu'à environ 15-30 clients PME**, à condition de :

1. **Transparence radicale** : ne jamais mentir, dire ce qu'on fait *et ce qu'on ne fait pas encore*.
2. **Roadmap datée publique** : SOC 2, ISO 27001, pentest externe = engagements écrits avec dates.
3. **Compensations techniques** : tout ce qu'on ne paie pas, on le compense par de l'effort interne documenté.
4. **Documentation béton** : un RSSI accepte un fournisseur jeune s'il voit du sérieux dans la documentation produite (politiques, registres, runbooks).

Ce document liste les **18 besoins sécurité majeurs** d'un SaaS B2B, propose pour chacun une alternative gratuite, ses limites, et le seuil de bascule vers le payant.

---

## 2. Tableau exhaustif — 18 besoins sécurité

### 2.1 Pentest externe annuel

| Item | Détail |
|---|---|
| **Besoin** | Validation indépendante par tiers que l'application n'a pas de vulnérabilité exploitable critique. |
| **Solution payante classique** | Pentest boîte noire + grise par cabinet certifié PASSI (Synacktiv, XMCO, Algosecure). **5 000-10 000 €/an**. |
| **Alternative GRATUITE** | (a) **OWASP ZAP** self-scan en CI hebdomadaire, (b) **Burp Suite Community Edition** pour tests manuels guidés, (c) **Pentest-Tools.com Free tier** (2 scans/mois URL publiques), (d) parcours **Hacker101 + CTF** pour monter en compétences, (e) **bug bounty privé YesWeHack/Intigriti** en mode "Hall of Fame only" (sans prime monétaire). |
| **Limites / risques** | (i) Pas de rapport signé par tiers indépendant — argument refusé par grands comptes (CAC40, banques). (ii) ZAP/Nikto trouvent ~30% des vulns d'un humain expérimenté. (iii) Pas de couverture business logic. (iv) Risque de faux négatif sur les vulnérabilités complexes (race conditions, IDOR profond). |
| **Mise en œuvre Centrium maintenant** | Pipeline GitHub Actions : ZAP baseline scan quotidien sur `centrium-platform.com` staging + scan full hebdomadaire sur main. Burp Community pour audit manuel mensuel des nouvelles features. Programme YesWeHack privé "Recognition only" ouvert aux 5 chercheurs sourcés via Twitter infosec FR. |
| **Quand basculer payant** | À la **signature du 5e client payant** OU **première demande RFP exigeant pentest PASSI**. Budget cible : 5 k€ pour un pentest 5 jours-homme. |

### 2.2 SOC 2 Type I/II

| Item | Détail |
|---|---|
| **Besoin** | Attestation conformité contrôles sécurité organisationnels (CC1-CC9 AICPA). Demandée par 100% des prospects US et 30% des prospects FR > 100 personnes. |
| **Solution payante** | Audit cabinet (Deloitte, BDO) + outillage Vanta/Drata. **25 000-40 000 € Type I**, 50-80 k€ Type II. |
| **Alternative GRATUITE** | (a) **Auto-évaluation honnête** sur grille AICPA Trust Services Criteria (gratuite), (b) **Vanta free trial 14j** pour cartographier les gaps, (c) **OWASP ASVS v4.0** comme référentiel technique, (d) **NIST CSF 2.0** comme référentiel organisationnel, (e) **OSCAL / compliance-trestle** (NIST open source) pour automatiser le mapping. |
| **Limites / risques** | (i) Aucune valeur juridique — c'est une auto-déclaration. (ii) Risque crédibilité si exagération. (iii) Inutilisable pour clients US régulés (banques, santé). |
| **Mise en œuvre Centrium maintenant** | Page publique `/trust` (ou centrium-platform.com/security) avec : (i) statut "SOC 2 Type I in preparation — audit Q4 2026", (ii) liste des contrôles déjà en place mappés AICPA, (iii) roadmap datée signée fondateur. Compléter la grille AICPA sur tableur partageable au prospect sur demande NDA. |
| **Quand basculer payant** | **3e prospect > 200 personnes qui le demande contractuellement** OU **ARR > 100 k€**. Cible : SOC 2 Type I via Drata + auditeur Prescient Assurance (~12 k$ packagé startup). |

### 2.3 DPO externalisé

| Item | Détail |
|---|---|
| **Besoin** | Délégué Protection Données obligatoire si traitement à grande échelle données sensibles (art. 37 RGPD). Centrium = oui par principe (CV = données candidats). |
| **Solution payante** | DPO mutualisé (Dipeeo, DPO Consulting, BSSI). **200-400 €/mois soit 2,5-5 k€/an**. |
| **Alternative GRATUITE** | (a) **DPO interne = Salim** désigné formellement par décision SAS, (b) **MOOC CNIL "Atelier RGPD"** (gratuit, 6h, attestation officielle), (c) **certificat AFCDP** (membre adhérent ~150 €/an, optionnel), (d) **guides CNIL gratuits** (registre, AIPD, mesures techniques), (e) **forum AFCDP** et **groupe LinkedIn DPO FR** pour Q&R. |
| **Limites / risques** | (i) Conflit d'intérêt apparent (fondateur = DPO = ne peut pas se contrôler lui-même) — toléré pour PME mais à régulariser. (ii) Pas d'expertise juridique profonde sur cas complexes (transferts hors UE, droit à l'oubli avec litiges). |
| **Mise en œuvre Centrium maintenant** | (1) Décision unilatérale associé unique désignant Salim DPO Centrium, déclaration CNIL en ligne (gratuite), (2) MOOC CNIL complété + attestation publiée sur /trust, (3) registre des traitements RGPD tenu dans Notion partagé (template CNIL), (4) AIPD (Analyse d'Impact Protection Données) réalisée pour le traitement "CV consultants". |
| **Quand basculer payant** | Au **20e client B2B** OU **première demande grand compte d'un DPO externe nommément distinct**. ~250 €/mois Dipeeo. |

### 2.4 Avocat IT (CGV, CGU, DPA, CGS)

| Item | Détail |
|---|---|
| **Besoin** | Conditions générales de vente, contrat de sous-traitance RGPD (DPA), conditions générales de service SaaS, mentions légales, politique de confidentialité. |
| **Solution payante** | Cabinet IT (Reed Smith, Osborne Clarke, Aurélie Banck) : **2 000-5 000 €** pour pack complet, 800 €/h en consultation. |
| **Alternative GRATUITE** | (a) **Template DPA CNIL** (officiel, gratuit, FR/EN), (b) **CGV/CGU SaaS open source** (Mutual.fr, French Tech ecosystem), (c) **Politique confidentialité CNIL generator**, (d) **CommonPaper.com** (templates US/EU SaaS open), (e) **Bouclier français RGPD** (CNIL), (f) **relecture croisée** par 2-3 fondateurs SaaS amis ayant déjà signé avec grands comptes. |
| **Limites / risques** | (i) Templates génériques pas toujours adaptés au métier ESN. (ii) Clause limitation responsabilité fragile face à grands comptes (souvent rejetée). (iii) Pas de défense si contentieux. |
| **Mise en œuvre Centrium maintenant** | Pack contractuel publié sur `/legal` : CGV (base Mutual.fr), DPA (CNIL), CGU (custom), politique cookies (générateur CNIL), mentions légales SAS conformes. Versioning Git public dans repo `centrium-legal`. |
| **Quand basculer payant** | **1ère négo contrat avec entreprise > 250 salariés** (qui amendera systématiquement) OU **dépassement ARR 50 k€**. Budget : 1,5 k€ pour relecture/correction ciblée. |

### 2.5 Cyber-assurance

| Item | Détail |
|---|---|
| **Besoin** | Couverture incident cyber (rançongiciel, fuite données, interruption service). Devient demande contractuelle à partir d'un certain seuil. |
| **Solution payante** | Hiscox, AIG, Stoïk, Dattak. **1 000-3 000 €/an** pour TPE/PME. |
| **Alternative GRATUITE** | Aucune équivalente. Mais : (a) **différer** jusqu'aux premiers clients, (b) **provision** dans plan de trésorerie, (c) **mentionner "souscription Q4 2026"** sur fiche sécurité. |
| **Limites / risques** | (i) Vrai trou non couvert. (ii) Risque personnel patrimonial fondateur si incident grave avant souscription. (iii) Demande contractuelle peut bloquer signature. |
| **Mise en œuvre Centrium maintenant** | Plan de trésorerie : ligne "Cyber-assurance" fléchée Q4 2026 (~1 500 € Stoïk SaaS jeune pousse). Document /trust : "Cyber-assurance : souscription prévue Q4 2026, devis Stoïk obtenu." |
| **Quand basculer payant** | **Dès le 1er client signé** si possible, **impérativement avant le 3e**. Stoïk : ~1 200 €/an pour SaaS jeune. |

### 2.6 Monitoring APM (Datadog / NewRelic)

| Item | Détail |
|---|---|
| **Besoin** | Observabilité applicative : traces, logs, métriques, alerting incidents. |
| **Solution payante** | Datadog APM : **200-500 €/mois** dès 10 hôtes. |
| **Alternative GRATUITE** | (a) **Sentry Free** (5 k errors/mois, déjà branché Centrium), (b) **Vercel Analytics Free** (Web Vitals), (c) **Posthog Cloud Free** (1 M events/mois), (d) **OpenTelemetry SDK** + collector self-host gratuit, (e) **Better Stack logs Free** (1 Go/mois). |
| **Limites / risques** | (i) Pas de tracing distribué profond gratuit. (ii) Rétention logs faible (3-7 jours en free). (iii) Alerting limité au volume. |
| **Mise en œuvre Centrium maintenant** | Sentry capture erreurs front + edge functions + API routes Next.js. Posthog event tracking funnel + session replay. Vercel Analytics pour Core Web Vitals. Better Stack pour logs structurés JSON. |
| **Quand basculer payant** | **Au-delà de 30 clients actifs** ou **dépassement quota Posthog**. Datadog Pro Starter ~150 $/mois. |

### 2.7 Status page publique

| Item | Détail |
|---|---|
| **Besoin** | Page publique uptime + historique incidents, demandée par tous les RSSI. |
| **Solution payante** | Statuspage.io (Atlassian) : **99-399 $/mois**. Instatus : **20-300 $/mois**. |
| **Alternative GRATUITE** | (a) **Better Stack Status Free** (10 monitors, page publique custom domain), (b) **Cstate** (open source self-host Hugo, 0 € sur Vercel), (c) **UptimeRobot Free** (50 monitors, 5 min interval). |
| **Limites / risques** | (i) Better Stack Free : pas de SSO, pas de subscribers email > 50. (ii) Cstate : maintenance manuelle des incidents (commit Markdown). |
| **Mise en œuvre Centrium maintenant** | Better Stack Free, status page hébergée sur `status.centrium-platform.com`. Monitors : homepage, API /healthz, Supabase REST, Resend API. Incidents communiqués manuellement par Salim sur Better Stack + email subscribers. |
| **Quand basculer payant** | **Dépassement 10 monitors** ou **demande SLA contractuel 99,9%**. Better Stack Team : 25 $/mois. |

### 2.8 WAF / Anti-bot / DDoS

| Item | Détail |
|---|---|
| **Besoin** | Filtrage attaques applicatives (OWASP Top 10), rate-limiting, protection DDoS L7. |
| **Solution payante** | Cloudflare Pro **20 $/mois**, Cloudflare Business **200 $/mois**, AWS WAF variable. |
| **Alternative GRATUITE** | (a) **Vercel Firewall** (inclus Hobby/Pro, règles basiques + DDoS L3/L4), (b) **Cloudflare Free** (DNS + DDoS L3/L4 + WAF basique + Bot Fight Mode), (c) **Upstash Redis rate-limit** côté API (déjà branché Centrium), (d) **Arcjet Free** (rate-limit + bot detection JS SDK). |
| **Limites / risques** | (i) Pas de règles WAF custom OWASP managées en free. (ii) Cloudflare Free : log retention 3h seulement. (iii) Pas de challenge JS avancé. |
| **Mise en œuvre Centrium maintenant** | DNS sur Cloudflare Free, mode "Under Attack" activable en 1 clic. Vercel Firewall règles : block country list noire, rate-limit /api/auth/* à 10/min, block User-Agent vides. Upstash Redis : token bucket 100 req/min par IP sur API. |
| **Quand basculer payant** | **1ère attaque DDoS L7 sérieuse** OU **demande conformité PCI** (jamais pour Centrium). Cloudflare Pro 20 $/mois suffit. |

### 2.9 SSO SAML Enterprise

| Item | Détail |
|---|---|
| **Besoin** | Single Sign-On SAML/OIDC pour clients enterprise (Okta, Azure AD, Ping). |
| **Solution payante** | WorkOS : **125 $/mois + 1,25 $/connexion**. Auth0 Enterprise : 200-1000 $/mois. |
| **Alternative GRATUITE** | (a) **Supabase Auth OAuth** (Google, Microsoft, Azure AD, GitHub — gratuit illimité), (b) **Keycloak self-host** (open source full SAML/OIDC), (c) **WorkOS Free tier** (1M MAU OAuth, SSO SAML payant uniquement). |
| **Limites / risques** | (i) SAML strict pas en free chez Supabase (Pro+). (ii) Keycloak = charge ops (1 VM + maintenance). (iii) Clients exigent souvent SAML, pas OIDC. |
| **Mise en œuvre Centrium maintenant** | Supabase Auth Google + Microsoft OAuth pour 95% des cas (ESN françaises = Microsoft 365 majoritaire). Page /security : "SSO SAML disponible sur demande à partir du plan Business" (= signal qu'on l'activera Supabase Pro le jour où c'est demandé). |
| **Quand basculer payant** | **1er prospect Enterprise exigeant SAML strict** → Supabase Pro 25 $/mois + activation SAML native. |

### 2.10 Anti-virus upload fichiers

| Item | Détail |
|---|---|
| **Besoin** | Scan antiviral des fichiers uploadés (CV PDF, documents). |
| **Solution payante** | VirusTotal API Premium ~1 500 $/mois, MetaDefender Cloud variable. |
| **Alternative GRATUITE** | (a) **VirusTotal Public API Free** (500 lookups/jour, 4 req/min), (b) **ClamAV self-host** (open source, lourd ~1 Go RAM), (c) **Cloudmersive Free** (800 calls/mois). |
| **Limites / risques** | (i) VirusTotal Free : envoie le fichier au cloud public — **interdit pour données client sensibles**. (ii) ClamAV : signatures pas toujours à jour, faible détection 0-day. (iii) Rate-limit faible. |
| **Mise en œuvre Centrium maintenant** | Stratégie hybride : (1) hash SHA256 du fichier → lookup VT (pas d'envoi du fichier, juste le hash), (2) si hash inconnu → ClamAV scan dans Supabase Edge Function avant écriture Storage, (3) ContentType whitelist strict (PDF, DOCX, JPG, PNG uniquement), (4) taille max 10 Mo. |
| **Quand basculer payant** | **Dépassement 500 lookups/jour** OU **demande client "no public cloud scan"**. VT Premium ~1500 $/mois inutile avant 500 clients. |

### 2.11 Vulnerability scanning dépendances

| Item | Détail |
|---|---|
| **Besoin** | Détection CVE dans dépendances npm/pip et images Docker. |
| **Solution payante** | Snyk Pro **25-100 $/dev/mois**, Mend, Sonatype. |
| **Alternative GRATUITE** | (a) **GitHub Dependabot** (gratuit illimité repos publics + privés gratuits), (b) **Snyk Free** (200 tests/mois, dashboard), (c) **OWASP Dependency-Check** (open source), (d) **Trivy** (open source, scan containers + filesystem), (e) **npm audit** natif, (f) **socket.dev Free** (analyse supply chain malware npm). |
| **Limites / risques** | (i) Pas de scoring contextuel "reachability" (Snyk Pro le fait). (ii) Bruit important sur transitives. |
| **Mise en œuvre Centrium maintenant** | GitHub Dependabot alerts + PR auto sur `npm` et `actions`. CI GitHub Actions : `npm audit --audit-level=high` + Trivy filesystem scan + socket.dev check sur chaque PR. Politique : merge bloqué si vuln HIGH/CRITICAL non waivée explicitement avec commentaire. |
| **Quand basculer payant** | **20+ devs** OU **demande SBOM signé**. Snyk Team 25 $/mois/dev. |

### 2.12 Pentest automatisé continu

| Item | Détail |
|---|---|
| **Besoin** | Scan régulier vulnérabilités application + infrastructure. |
| **Solution payante** | Pentest-Tools.com Pro **100-500 $/mois**, Detectify ~150 $/mois, Intruder.io. |
| **Alternative GRATUITE** | (a) **OWASP ZAP** baseline + full scan en CI, (b) **Nuclei** templates communautaires (5000+), (c) **Nikto** scan serveur web, (d) **sqlmap** test injection, (e) **Burp Community** scan passif. |
| **Limites / risques** | (i) Pas de scan authentifié facile (sessions). (ii) Beaucoup de faux positifs. (iii) Pas de support produit. |
| **Mise en œuvre Centrium maintenant** | GitHub Actions cron hebdo : ZAP baseline + Nuclei sur centrium-platform.com (uniquement staging public, jamais prod). Trimestriellement, scan authentifié ZAP avec compte test (3h manuel). Documenter résultats dans `security/scans/YYYY-MM/`. |
| **Quand basculer payant** | **Au passage du 1er pentest externe** (cohérent avec 2.1). |

### 2.13 Backup chiffré + DR (Disaster Recovery)

| Item | Détail |
|---|---|
| **Besoin** | Sauvegardes régulières chiffrées, plan reprise activité, RTO/RPO définis. |
| **Solution payante** | Druva, Veeam, Cohesity. **500-2000 €/mois**. |
| **Alternative GRATUITE** | (a) **Supabase backups quotidiens** (inclus Free 7j, Pro 30j PITR), (b) **pg_dump cron** vers **Cloudflare R2 Free** (10 Go gratuits) chiffré GPG, (c) **Restic** vers R2 (dedup + chiffrement AES-256), (d) **rclone crypt** vers Backblaze B2 Free (10 Go). |
| **Limites / risques** | (i) Supabase Free : backup 7j seulement, pas de PITR. (ii) Restauration manuelle = RTO ~2-4h. (iii) Pas de test DR automatisé. |
| **Mise en œuvre Centrium maintenant** | (1) Supabase backups quotidiens activés, (2) GitHub Actions cron mensuel : `pg_dump | gpg -c | rclone copyto r2:centrium-backups/$(date)`, clé GPG stockée dans Bitwarden Free + papier coffre. (3) Runbook DR documenté `docs/dr/RUNBOOK.md` avec procédure restauration step-by-step. (4) Test restauration trimestriel sur projet Supabase de test. |
| **Quand basculer payant** | **Dès qu'un client signe un SLA avec RPO < 1h** OU **ARR > 100 k€**. Supabase Pro PITR + Druva ou similaire. |

### 2.14 Audit logs immuables

| Item | Détail |
|---|---|
| **Besoin** | Journalisation des actions sensibles non modifiable (exigence RGPD art. 32 + clients régulés). |
| **Solution payante** | HashiCorp Vault Enterprise, AWS CloudTrail Lake, Splunk. **Cher** (>500 €/mois). |
| **Alternative GRATUITE** | (a) **Table `activities` append-only Postgres** + **hash chain SQL** (chaque ligne contient hash de la précédente), (b) **OpenSearch self-host** (open source, lourd), (c) **Loki Grafana Cloud Free** (50 Go/mois ingest). |
| **Limites / risques** | (i) Hash chain Postgres : immuabilité logique pas physique (un admin DB peut tout réécrire). (ii) Pas de WORM storage gratuit. (iii) Pas de signature tiers temporelle. |
| **Mise en œuvre Centrium maintenant** | Table `audit_log` Supabase avec : `id`, `actor_id`, `action`, `resource`, `payload JSONB`, `prev_hash`, `current_hash = sha256(prev_hash + payload + timestamp)`. RLS = INSERT only pour service role, SELECT pour admins, UPDATE/DELETE bloqués par RLS. Vérification chaîne via cron hebdomadaire qui recalcule et alerte si rupture. Export mensuel JSON signé GPG vers R2 (preuve externe). |
| **Quand basculer payant** | **Demande contractuelle WORM** (PCI, HDS, banque). |

### 2.15 Threat intelligence

| Item | Détail |
|---|---|
| **Besoin** | Veille menaces (CVE émergentes, fuites comptes, campagnes phishing ciblées). |
| **Solution payante** | Recorded Future, Mandiant Advantage, CrowdStrike Falcon X. **>1000 €/mois**. |
| **Alternative GRATUITE** | (a) **Have I Been Pwned API Free** (déjà branché Centrium pour vérifier emails clients), (b) **CIRCL.lu feeds** (MISP communautaire), (c) **ANSSI CERT-FR alertes** RSS, (d) **Abuse.ch** (URLhaus, MalwareBazaar, ThreatFox), (e) **GitHub Security Advisories** RSS, (f) **OpenCTI Community** (self-host MISP-compatible). |
| **Limites / risques** | (i) Pas de threat intel ciblée Centrium spécifiquement. (ii) Feeds bruts à traiter manuellement. |
| **Mise en œuvre Centrium maintenant** | (1) Abonnement RSS ANSSI CERT-FR + GitHub Advisories repo Centrium dans Feedly Free, (2) HIBP API check email lors inscription (warning si compromis), (3) Cron quotidien : check domaines Centrium contre URLhaus/PhishTank pour détecter clones, (4) Veille passive via Twitter listes infosec FR (Korben, Damien Bancal, ANSSI). |
| **Quand basculer payant** | **Jamais** sous 100 clients. Recorded Future = pour grands comptes uniquement. |

### 2.16 Bug bounty program

| Item | Détail |
|---|---|
| **Besoin** | Crowdsourcing détection vulnérabilités par chercheurs externes. |
| **Solution payante** | HackerOne Bounty (commission 20% + setup), Bugcrowd, YesWeHack VIP. **Variable, rapidement >5 k€/an**. |
| **Alternative GRATUITE** | (a) **YesWeHack programme privé "Recognition only"** (gratuit, Hall of Fame seul), (b) **Intigriti programme privé "no bounty"**, (c) **security.txt** + responsible disclosure policy publique + page `/hall-of-fame`, (d) **Hacker101 / HackerOne community CTF** pour recruter chercheurs intéressés. |
| **Limites / risques** | (i) Peu d'attractivité sans prime (chercheurs sérieux ignorent). (ii) Risque légal flou (autorisation explicite indispensable). (iii) Volume rapports faible. |
| **Mise en œuvre Centrium maintenant** | (1) Page `/security/disclosure` avec scope explicite, safe harbor légal (template Disclose.io), email security@centrium-platform.com, PGP key publiée, (2) Fichier `/.well-known/security.txt` conforme RFC 9116, (3) Programme YesWeHack privé invitation-only ouvert à 5-10 chercheurs FR sourcés via Twitter, (4) Hall of Fame public crédité par chercheur. |
| **Quand basculer payant** | **20e client** ou **demande RFP "bug bounty actif rémunéré"**. Budget : 500 €/rapport critique. |

### 2.17 Conformité ISO 27001

| Item | Détail |
|---|---|
| **Besoin** | Certification ISO 27001 SMSI. Demandée par grands comptes européens, banques, secteur public. |
| **Solution payante** | Implémentation + audit Bureau Veritas / AFNOR. **30 000-50 000 €** + 10-15 k€/an surveillance. |
| **Alternative GRATUITE** | (a) **Self-implementation** avec **ISO 27001 templates open source** (IT Governance Ltd templates gratuits partiels, ISMS Online), (b) **NIST CSF 2.0** comme cadre équivalent partiel, (c) **CIS Controls v8** (gratuit, mappable ISO Annex A), (d) **ANSSI Guide Hygiène Informatique** (42 mesures gratuit). |
| **Limites / risques** | (i) Pas de certification = pas de logo ISO. (ii) Effort interne ~150-200 jours-homme. (iii) Trous de couverture probables sans expert. |
| **Mise en œuvre Centrium maintenant** | Différer la certification, mais **construire le SMSI dès maintenant** : (1) Politique de sécurité publiée /trust, (2) Registre des risques (template ISO Annex A 93 contrôles, tableur), (3) Procédures opérationnelles documentées (onboarding, offboarding, incident, backup, change management), (4) Roadmap publique "ISO 27001 audit Q4 2027". |
| **Quand basculer payant** | **3 demandes RFP grand compte exigeant ISO 27001** OU **ARR > 500 k€**. Cabinet startup ~25 k€ packagé. |

### 2.18 Pen-test as a Service continu (PtaaS)

| Item | Détail |
|---|---|
| **Besoin** | Tests d'intrusion continus avec retesting après corrections. |
| **Solution payante** | Cobalt.io, Synack, HackerOne Assessments. **5 000-12 000 €/trimestre**. |
| **Alternative GRATUITE** | Combinaison : (a) **auto-pentest trimestriel** (cf 2.12 ZAP/Burp/Nuclei), (b) **bug bounty privé YesWeHack** "Recognition only" (cf 2.16), (c) **SecurityHeaders.com / Mozilla Observatory / SSL Labs** scans hebdo gratuits, (d) **Pentest-Tools.com Free** 2 scans/mois. |
| **Limites / risques** | Cf 2.1 et 2.12. Pas de continuité humaine sur l'année. |
| **Mise en œuvre Centrium maintenant** | Calendrier rolling : T1 ZAP full + Burp manuel, T2 Nuclei + bug bounty pulse, T3 ZAP authentifié + Pentest-Tools, T4 récap + roadmap année suivante. Tous résultats compilés dans `docs/security/pentest-log.md`. |
| **Quand basculer payant** | **5 clients payants** (cf 2.1). |

---

## 3. Bonus — besoins transverses (gratuits déjà couverts)

| Besoin | Solution gratuite Centrium |
|---|---|
| **Password manager équipe** | Bitwarden Free (perso) → Bitwarden Family gratuit avec 1 fondateur |
| **2FA / MFA** | TOTP via Bitwarden + YubiKey perso (40 € amortis) |
| **Chiffrement secrets en CI** | GitHub Encrypted Secrets (gratuit) |
| **Email security (SPF/DKIM/DMARC)** | Resend DKIM auto + DMARC `p=quarantine` policy via Cloudflare DNS |
| **TLS / certificats** | Let's Encrypt via Vercel (auto, gratuit) |
| **CSP / security headers** | Headers Next.js config + vérif Mozilla Observatory |
| **Phishing training** | Self-quiz mensuel via Google Forms + lecture CERT-FR |
| **Inventaire actifs** | Tableur Notion / Google Sheet (ISO Annex A.8 compliant) |
| **Politique mot de passe** | Supabase Auth password policy + zod 12+ chars |
| **Secrets scanning** | GitHub Secret Scanning (gratuit repos privés) + Gitleaks CI |
| **Container scanning** | Trivy CI |
| **Mobile device management** | N/A (1 personne, MacBook chiffré FileVault) |

---

## 4. Stack sécurité 0 € recommandée pour Centrium (snapshot Q2 2026)

### Production
- **Hébergement** : Vercel Free tier (TLS auto, edge runtime, basic firewall)
- **Base de données** : Supabase Free (Postgres, Auth, Storage, RLS, backup 7j)
- **DNS + Anti-DDoS L3/L4** : Cloudflare Free
- **Rate limiting** : Upstash Redis Free
- **Email transactionnel** : Resend Free (DKIM/SPF/DMARC)

### Monitoring & observabilité
- **Errors** : Sentry Free
- **Logs** : Better Stack Free
- **Analytics produit** : Posthog Free
- **Web vitals** : Vercel Analytics Free
- **Status page** : Better Stack Status Free

### Sécurité applicative
- **Dépendances** : GitHub Dependabot + Snyk Free + Trivy + socket.dev Free
- **Code** : GitHub CodeQL (gratuit public, Advanced Security gratuit pour repos publics)
- **Secrets** : GitHub Secret Scanning + Gitleaks
- **Pentest auto** : ZAP + Nuclei + Burp Community en CI hebdo
- **Antivirus upload** : VirusTotal Free (hash only) + ClamAV
- **Bug bounty** : YesWeHack programme privé "Hall of Fame"

### Conformité & juridique
- **DPO** : Salim interne + MOOC CNIL
- **CGV/DPA** : templates CNIL + Mutual.fr
- **SOC 2** : auto-évaluation grille AICPA, roadmap publique
- **ISO 27001** : NIST CSF + CIS Controls comme équivalents, roadmap publique
- **RGPD** : registre Notion + AIPD CV

### Threat intel & veille
- **HIBP** Free pour comptes compromis
- **ANSSI CERT-FR** RSS
- **GitHub Advisories** RSS
- **URLhaus / PhishTank** quotidien
- **Twitter listes infosec FR**

### Backups & DR
- **Supabase backups** 7j inclus
- **pg_dump → Cloudflare R2 Free** chiffré GPG mensuel
- **Runbook DR** documenté + test trimestriel

### Documentation publique
- **/trust** page sécurité complète
- **/legal** CGV, DPA, mentions, politique cookies
- **/security/disclosure** + security.txt
- **/changelog** transparence releases
- **status.centrium-platform.com**

**Coût total cash externe annuel : 0 €** (hors domaine ~10 €/an et coûts Anthropic API variables).

---

## 5. Argumentaire défendable face à un RSSI ESN sceptique

> *"Vous êtes une startup à un fondateur, vous n'avez pas de SOC 2, pas de pentest externe, pas de cyber-assurance, pas d'ISO. Pourquoi je signerais avec vous ?"*

**Réponse en 4 points :**

1. **Transparence totale sur ce que nous avons et n'avons pas.** Notre page `/trust` liste publiquement TOUS nos contrôles, avec preuves (lien GitHub Actions, exports scans, registre traitements). Aucun fournisseur de votre panel ne fait ça aussi explicitement. Tout ce qui est listé "en place" est démontrable en 5 minutes screen-sharing.

2. **Stack technique défensive de niveau enterprise, payée par les fournisseurs SaaS.** Notre stack repose sur Vercel, Supabase, Cloudflare, GitHub : ces acteurs sont eux-mêmes SOC 2 Type II, ISO 27001, FedRAMP. Nous héritons de leur posture. Le risque résiduel "Centrium specific" est notre code applicatif, audité en continu par Dependabot, Snyk, CodeQL, ZAP, et un programme bug bounty actif.

3. **Engagements contractuels datés et opposables.** Notre roadmap conformité est publique et engageante : SOC 2 Type I Q4 2026, ISO 27001 Q4 2027, cyber-assurance souscrite Q4 2026. Ces dates sont reprises dans notre DPA. Si nous ne les tenons pas, vous résiliez sans pénalité.

4. **Vous prenez moins de risque avec nous qu'avec un fournisseur "mature" opaque.** Un RSSI préfère un fournisseur qui dit *"voici nos 12 contrôles en place, nos 6 contrôles en cours, nos 3 trous identifiés et compensés par X, Y, Z"* à un fournisseur qui brandit un logo SOC 2 sans expliquer son scope, ses exclusions, ni ses incidents passés. Notre auto-évaluation AICPA est plus honnête qu'un audit acheté.

**Et pour rassurer définitivement** : nous proposons un **droit d'audit gratuit** au client (clause DPA), un **engagement de notification incident sous 24h** (RGPD art. 33 + plus court), et un **dépôt fiduciaire du code source** activable si Centrium cesse d'exister (gratuit via repo miroir GitHub + clé GPG client).

---

## 6. Maturité cible : 6,8 → 9 / 10 — comment on y arrive

| Axe | Note Q2 2026 | Note Q2 2027 cible | Levier 0 € |
|---|---|---|---|
| Sécurité applicative | 7/10 | 9/10 | CI sécurité complète + bug bounty privé actif |
| Conformité RGPD | 6/10 | 9/10 | DPO formé + registre + AIPD + DPA validé |
| Conformité SOC 2/ISO | 4/10 | 7/10 | Auto-éval + roadmap + preuves publiques |
| Observabilité / IR | 6/10 | 9/10 | Sentry + Better Stack + runbooks incidents |
| Gestion accès / SSO | 7/10 | 9/10 | Supabase OAuth + 2FA forcé + audit log |
| Backup / DR | 6/10 | 9/10 | pg_dump R2 + test restauration trimestriel |
| Documentation | 8/10 | 10/10 | Trust center + legal + disclosure + status |
| Cyber-assurance | 0/10 | 7/10 | Souscription Q4 2026 (1 200 €) |
| **Moyenne pondérée** | **6,8** | **9,0** | |

Cible 9/10 atteignable. Le seul item qui requiert du cash est la cyber-assurance (~1 200 €/an), réinjectable sur revenus dès 1er client signé.

---

# RÉSUMÉ EXÉCUTIF

## Stack sécu 0 € défendable pour PME ESN 10-50 consultants ?

**Oui, défendable jusqu'à environ 15-30 clients PME ESN françaises**, à condition de tenir trois engagements : (1) transparence totale via une page `/trust` publique listant contrôles en place ET trous, (2) roadmap conformité datée (SOC 2 Type I Q4 2026, cyber-assurance Q4 2026, ISO 27001 Q4 2027), (3) documentation béton (registre RGPD, AIPD, runbooks, hash-chained audit logs, programme bug bounty privé YesWeHack actif). La stack technique sous-jacente (Vercel + Supabase + Cloudflare + GitHub) hérite déjà d'un SOC 2 Type II et ISO 27001 fournisseur — ce qui couvre 80% de la surface réellement auditée.

## Top 3 trous "non-bouchables sans payer" et comment les négocier

1. **Pentest externe signé PASSI** — négo : proposer accès gratuit prospect à notre rapport ZAP/Nuclei trimestriel + engagement contractuel pentest payant avant 31/12/2026 (clause de sortie sans pénalité si non tenu).
2. **Cyber-assurance** — négo : assumer la responsabilité civile via les fonds propres SAS, engager souscription Stoïk (~1 200 €/an) déclenchée à la signature, l'inscrire en condition suspensive contrat.
3. **SOC 2 Type I attestée** — négo : fournir auto-évaluation AICPA complète + droit d'audit gratuit prospect + roadmap SOC 2 Q4 2026 avec auditeur pré-identifié (Prescient Assurance ~12 k$ packagé startup).

## Argumentaire RSSI sceptique (1 paragraphe)

*"Notre maturité sécurité n'est pas dans des logos achetés mais dans la défensibilité technique et la transparence. Notre stack repose sur Vercel + Supabase + Cloudflare + GitHub, eux-mêmes SOC 2 Type II et ISO 27001 — nous héritons de cette posture pour 80% de la surface d'attaque. Le 20% restant (notre code) est audité en continu par 6 outils gratuits en CI (Dependabot, Snyk, CodeQL, Trivy, ZAP, Nuclei) + un programme bug bounty privé YesWeHack actif. Notre page `/trust` publique liste l'intégralité de nos contrôles avec preuves vérifiables, nos trous assumés, et notre roadmap conformité datée et contractuellement opposable. Nous offrons un droit d'audit gratuit, une notification d'incident sous 24h, et un dépôt fiduciaire du code source. Vous prenez moins de risque avec un fournisseur jeune transparent qu'avec un fournisseur mature opaque qui brandit un logo sans en révéler le scope ni les incidents passés."*
