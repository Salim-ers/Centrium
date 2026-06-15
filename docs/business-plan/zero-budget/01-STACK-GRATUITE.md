# Stack 100 % Gratuite — Centrium by QuadCore SAS

> **Mission** : faire tourner Centrium en production (0 → 10 clients ESN) avec **0 € de cash externe** hors domaine (~10 €/an) et usage variable Anthropic API.
> **Cible** : maturité 9/10 sur 12 mois, fondateur seul (Salim), SAS française récente.
> **Date** : 2026-06-15 — toutes les limites sont celles annoncées par les éditeurs en 2026.

---

## Principes directeurs

1. **Free tier only** : aucun abonnement payant ne doit être souscrit tant qu'on n'a pas 3 clients facturés.
2. **Self-host secondaire** : si un Free tier vendor casse, basculer sur self-host (Vercel / Cloudflare gratuits suffisent à héberger 95 % des alternatives OSS).
3. **Vendor lock-in maîtrisé** : préférer les outils dont la migration est triviale (export Postgres, CSV, API REST standard).
4. **Multi-comptes interdit** : on ne triche pas en créant 10 comptes Supabase. Mauvaise réputation + risque de bannissement.
5. **Programmes startup à activer dès Q1** : AWS Activate, Google for Startups, Notion for Startups, HubSpot for Startups, Stripe Atlas Perks → souvent 1 000 à 100 000 $ de crédits gratuits.

---

## 1. Hosting + Compute

| Service | Free tier 2026 | Bascule payant | Alternative OSS | Verdict |
|---|---|---|---|---|
| **Vercel Hobby** | 100 GB bandwidth, 100k Edge req/jour, 1k Serverless GB-h, 6k build min/mois, 1 user, **usage non-commercial** | Dès le 1er client B2B facturé (CGU Vercel : Hobby = perso uniquement) | Self-host Next.js sur Cloudflare Pages | ⚠️ **Bloquant légalement** dès 1er client payant → bascule Cloudflare |
| **Netlify Free** | 100 GB bw, 300 build min/mois, 125k function req | Usage pro OK jusqu'à ~5k MAU | OpenNext + Cloudflare | OK 0-3 clients |
| **Cloudflare Pages** | **Bandwidth illimité**, 500 builds/mois, 100k Worker req/jour, usage commercial autorisé | Workers Paid à 5 $/mois si > 100k req/jour | N/A (déjà CDN edge) | ✅ **Cible recommandée 0-10 clients** |
| **Render Free** | 750h/mois, spin down après 15 min inactivité | Dès production sérieuse (cold start = mort en B2B) | N/A | ❌ Inadapté prod |
| **Railway Free** | 5 $ de crédits/mois (~500h) puis stop | Dès production | Fly.io | ❌ Trop limité |
| **Fly.io** | Plus de Free tier en 2026, $5 crédit puis pay-per-use | N/A | N/A | ❌ Plus gratuit |
| **AWS Free Tier** | 12 mois : 750h EC2 t2.micro, 5 GB S3, RDS 750h | Après 12 mois ou dépassement | N/A | ⚠️ Risque facture surprise |
| **GCP Free Tier** | 300 $ crédits 90j + always free (e2-micro US, 5 GB GCS) | Après crédits | N/A | ⚠️ Carte requise |
| **Azure Free** | 200 $ crédits 30j + always free (B1S 750h) | Après crédits | N/A | ⚠️ Lock-in MS |

**Recommandation** : migrer **Vercel Pro → Cloudflare Pages** dès Q3 2026. Les CGU Vercel Hobby interdisent explicitement l'usage commercial — risque de suspension brutale en cas de signalement. Cloudflare Pages autorise le commercial sur le tier gratuit, offre bandwidth illimité, et le déploiement Next.js via OpenNext est mature. **Économie : 240 $/an immédiate.**

---

## 2. Base de données + Auth

| Service | Free tier 2026 | Bascule payant | Alternative OSS | Verdict |
|---|---|---|---|---|
| **Supabase Free** | 500 MB DB, 1 GB storage, 50k MAU, 5 GB egress, **pause après 7j inactivité** | > 500 MB ou > 50k MAU ou besoin point-in-time recovery | Self-host Supabase sur VPS Hetzner (mais payant) | ✅ OK 0-10 clients ESN (chaque ESN = ~50-500 MB) |
| **Neon Free** | 0,5 GB storage, 191h compute/mois, branching illimité | > 0,5 GB ou > 1 projet | N/A | ✅ Backup secondaire Postgres |
| **Turso Free** | 9 GB total, 500 DB, 1B row reads/mois, 25M writes | SQLite distribué uniquement | LibSQL self-host | ⚠️ Pas adapté schéma relationnel ESN complexe |
| **PlanetScale Hobby** | Supprimé en 2024, plus de free tier | N/A | Vitess self-host (complexe) | ❌ Plus gratuit |
| **Firebase Free (Spark)** | 1 GB Firestore, 10 GB Storage, 50k auth MAU | NoSQL only | N/A | ❌ Mauvais fit (besoin SQL pour ESN) |
| **Clerk Free** | 10k MAU, 100 orgs | > 10k MAU | N/A | ⚠️ Mais Supabase Auth suffit |
| **Auth0 Free** | 7,5k MAU, 2 social connections | > 7,5k MAU | N/A | ❌ Redondant avec Supabase |

**Recommandation** : **rester Supabase Free**. La pause après 7j d'inactivité est gérable (ping cron via Cloudflare Worker). 500 MB DB = ~5-10 ESN moyennes. Activer **Neon Free** comme miroir de backup mensuel via `pg_dump`. **Économie : 300 $/an.**

---

## 3. Storage / CDN

| Service | Free tier 2026 | Bascule payant | Verdict |
|---|---|---|---|
| **Cloudflare R2** | 10 GB stockage, 1M classe A ops/mois, 10M classe B ops/mois, **egress gratuit** | > 10 GB | ✅ **Cible CV + documents** |
| **Backblaze B2** | 10 GB free, 1 GB/jour download | > 10 GB | ✅ Backup secondaire |
| **AWS S3 Free Tier** | 5 GB 12 mois | Après 12 mois | ⚠️ Coût egress imprévisible |
| **Supabase Storage** | 1 GB inclus | > 1 GB | OK pour avatars seulement |
| **ImageKit Free** | 20 GB bandwidth, 20 GB storage | > 20 GB | ✅ Optimisation images CV |

**Recommandation** : **Cloudflare R2** pour CV PDF/DOCX (compatible API S3, zéro egress = pas de surprise facture). Supabase Storage pour avatars uniquement. ImageKit pour previews CV. **0 €/mois jusqu'à 10 GB de docs (= ~5 000 CV).**

---

## 4. Email transactionnel

| Service | Free tier 2026 | Bascule payant | Verdict |
|---|---|---|---|
| **Resend Free** | 3k emails/mois, 100/jour, 1 domain | > 100/jour ou > 3k/mois | ✅ **Cible actuelle** |
| **Postmark Free** | Pas de free, seulement 100 emails trial | N/A | ❌ |
| **Mailtrap Free** | 1k emails/mois (sandbox + transactional) | > 1k | ✅ Sandbox tests/staging |
| **SendGrid Free** | 100/jour à vie | > 100/jour | ⚠️ Réputation IP dégradée |
| **Amazon SES** | 200/jour si envoi depuis EC2, sinon 0,10 $/1k | Volume élevé | ✅ Backup haut volume |
| **Brevo Free** | 300/jour | > 300/jour | ✅ Mix transactionnel + marketing |

**Recommandation** : **Resend** pour transactionnel (auth, invitations, alertes) + **Brevo** pour marketing/onboarding (300/jour = 9 000/mois). Mailtrap pour staging. Domaine `centrium-platform.com` déjà DKIM/SPF/DMARC. Si > 100/jour, basculer **Amazon SES** (~0,30 $/1k emails, pay-as-you-go sans abonnement).

---

## 5. Email marketing / Newsletter

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Brevo Free** | 300/jour illimité subs | ✅ **Cible** |
| **MailerLite Free** | 12k emails/mois, 1k subs | ✅ Alternative |
| **Buttondown Free** | 100 subs | ❌ Trop limité |
| **ConvertKit Free** | 1k subs, broadcast only | ⚠️ Pas d'automation |
| **Substack** | Gratuit hors abonnement payant | ✅ Newsletter publique "ESN Insights" |

**Recommandation** : **Brevo** (subs illimités, contrairement à Mailchimp/CK) pour nurturing prospects ESN. **Substack** pour newsletter publique de thought leadership (SEO + branding gratuit).

---

## 6. Monitoring + Error tracking

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Sentry Free** | 5k errors/mois, 10k perf events, 50 replays | ✅ **Cible** |
| **Highlight.io Free** | 500 sessions/mois | ⚠️ Session replay limité |
| **LogRocket Free** | 1k sessions/mois | ⚠️ |
| **Vercel Analytics** | 2,5k events/mois Hobby | ❌ (bascule Cloudflare) |
| **Cloudflare Web Analytics** | Illimité, privacy-first, gratuit | ✅ Analytics produit |
| **PostHog Cloud Free** | 1M events/mois, 5k session replays, feature flags illimités | ✅ **Cible product analytics** |
| **Plausible self-host** | Gratuit si self-host | ⚠️ Effort déploiement |
| **Umami self-host** | Gratuit | ✅ Alternative légère sur Vercel |

**Recommandation** : **trio Sentry + PostHog + Cloudflare Analytics**. Sentry pour erreurs serveur, PostHog pour analytics produit + feature flags + A/B + session replay, Cloudflare pour traffic web public. Couverture complète, 0 €/mois jusqu'à ~5 000 utilisateurs actifs.

---

## 7. Uptime + Status page

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Better Stack Free** | 10 monitors, 3 min interval, 1 status page | ✅ **Cible** |
| **UptimeRobot Free** | 50 monitors, 5 min interval | ✅ Alternative volume |
| **Statuspage Atlassian** | Plus de free tier (seulement trial) | ❌ |
| **Cstate (OSS)** | Self-host Cloudflare Pages, gratuit | ✅ Page status publique |
| **Instatus Free** | 1 status page, 5 components | ✅ Page publique propre |
| **Hyperping Free** | 10 monitors | ⚠️ Redondant |

**Recommandation** : **Better Stack** (monitoring + incidents) + **Instatus** (status page publique à `status.centrium-platform.com`, gratuit, design premium). Argument commercial fort pour DSI ESN ("on a une status page publique").

---

## 8. Rate limiting + Cache

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Upstash Redis Free** | 10k commandes/jour, 256 MB, 1 DB | ✅ **Cible** (déjà utilisé) |
| **Vercel KV** | 30k req/mois Hobby (lié à Vercel) | ❌ (bascule Cloudflare) |
| **Cloudflare KV** | 100k reads/jour, 1k writes/jour, 1 GB | ✅ Cache edge |
| **Redis Cloud Free** | 30 MB, 30 connexions | ❌ Trop limité |
| **Upstash QStash Free** | 500 messages/jour | ✅ Cron jobs + queues |

**Recommandation** : **Upstash Redis + Upstash QStash** pour rate limiting + jobs asynchrones (génération CV en background). **Cloudflare KV** pour cache edge des templates publics. 10k req/jour = ~100 utilisateurs actifs/jour amplement.

---

## 9. CI/CD

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **GitHub Actions Free** | 2 000 min/mois (private), illimité (public) | ✅ **Cible** |
| **GitLab CI Free** | 400 min/mois | ⚠️ Limité |
| **CircleCI Free** | 6k min/mois | ✅ Alternative |
| **Cloudflare Pages Build** | 500 builds/mois | ✅ Build complémentaire |

**Recommandation** : **GitHub Actions** suffit largement (2 000 min/mois = ~200 PRs avec tests). Optimiser : matrix uniquement sur main, cache `node_modules` agressif, jobs parallèles.

---

## 10. Code review + Quality

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **SonarCloud** | Public repos uniquement gratuit | ❌ (repo privé) |
| **SonarQube self-host** | Gratuit Community Edition | ⚠️ Maintenance |
| **CodeClimate Free** | Open source uniquement | ❌ |
| **DeepSource Free** | 1 repo, fonctionnalités limitées | ✅ Suffit MVP |
| **Codacy Free** | 1 repo private | ✅ Alternative |
| **GitHub Code Scanning (CodeQL)** | Gratuit repos privés Pro/Free | ✅ **Cible native** |
| **Qodana Community** | Gratuit projets OSS, mais Jetbrains free pour startups | ✅ Apply startup |

**Recommandation** : **GitHub CodeQL** (natif, gratuit même sur private repo) + **DeepSource Free** pour 1 repo. Couverture lint + security scan suffisante.

---

## 11. Security scanning

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Snyk Free** | 200 tests/mois, illimité repos OSS | ✅ Scan deps |
| **Dependabot** | Gratuit GitHub natif, illimité | ✅ **Cible** |
| **npm audit** | Natif, gratuit | ✅ CI obligatoire |
| **OWASP ZAP** | OSS, gratuit | ✅ Pentest interne mensuel |
| **Trivy (Aqua)** | OSS, gratuit | ✅ Scan containers/IaC |
| **Semgrep Cloud Free** | 1 repo private, SAST | ✅ **Cible SAST** |
| **GitGuardian Free** | 25 dev seats, secrets detection | ✅ **Détection secrets** |
| **Checkov** | OSS Terraform/IaC | ⚠️ Pas d'IaC actuel |

**Recommandation stack security 0 €** : Dependabot (deps auto-PR) + Semgrep (SAST CI) + GitGuardian (secrets) + OWASP ZAP (DAST mensuel manuel) + Trivy (scan Docker). **Argument commercial DSI** : "scan SAST/DAST/SCA/secrets sur chaque PR" → couvre 80 % des exigences sécurité ESN sans audit payant.

---

## 12. Stockage code + repos

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **GitHub Free** | Illimité private repos, 2k Actions min | ✅ **Cible** |
| **GitLab Free** | 5 users private, 400 CI min | ❌ Trop restrictif |
| **Bitbucket Free** | 5 users, 50 min CI | ❌ |
| **Codeberg / SourceHut** | Gratuit OSS uniquement | ❌ |

**Recommandation** : **GitHub Free**. Activer GitHub for Startups si éligible (Copilot Business gratuit 12 mois).

---

## 13. Documentation / wiki

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Notion Free** | Illimité pages personal, 10 invités | ✅ Wiki interne |
| **Notion for Startups** | 6 mois Plus gratuit + crédits AI | ✅ **À appliquer** |
| **Outline self-host** | Gratuit Docker | ⚠️ Effort |
| **GitBook Free** | 10 collaborateurs, public docs gratuit | ✅ Docs publiques `docs.centrium-platform.com` |
| **Docusaurus** | OSS, host Cloudflare Pages | ✅ Alternative full control |
| **Mintlify Free** | 1 admin, basique | ✅ Belle UI docs |
| **README.so** | OSS, README generator | ✅ |

**Recommandation** : **Notion** (wiki interne + roadmap publique) + **Mintlify ou GitBook** (docs produit publiques pour onboarding DSI). Appliquer Notion for Startups (gratuit, juste un lien partenaire requis).

---

## 14. Communication équipe

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Slack Free** | 90 jours d'historique, illimité users | ⚠️ Perte historique |
| **Discord Free** | Illimité historique, channels, voice | ✅ Communauté + équipe future |
| **Linear Free** | 250 issues, 10 users, 2 teams | ✅ **Cible ticketing** |
| **Plane (OSS)** | Self-host gratuit | ⚠️ Alternative Linear |
| **Element (Matrix)** | Self-host gratuit, fédéré | ⚠️ Overkill |
| **Zulip Free** | 10k messages, illimité users | ✅ Alternative Slack |

**Recommandation** : **Linear Free** (issues + roadmap, beau, rapide) + **Discord** (équipe future + communauté open beta ESN). Slack écarté (perte d'historique = catastrophe support).

---

## 15. Outils dev day-to-day

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Cursor Free** | 2 weeks Pro trial puis modèles slow | ⚠️ Limité |
| **Continue.dev** | OSS, gratuit avec ta clé Anthropic | ✅ **Cible IDE AI** |
| **Claude Code** | Variable (déjà payé via API) | ✅ Quotidien |
| **GitHub Copilot Free** | 2 000 completions/mois, 50 chat/mois | ✅ Backup |
| **GitHub Copilot for OSS/Students** | Gratuit si critères | ⚠️ Non éligible SAS |
| **TablePlus Free** | 2 onglets, 2 connexions | ✅ DB browser |
| **DBeaver Community** | OSS, illimité | ✅ Alternative complète |
| **Postman Free** | 3 collaborateurs, 1k API req/mois | ✅ |
| **Insomnia Free** | 1 user, illimité | ✅ Alternative Postman |
| **Bruno (OSS)** | Gratuit, fichiers .bru versionnés Git | ✅ **Cible** (collab via Git) |

**Recommandation** : Claude Code (principal) + Continue.dev (IDE inline) + DBeaver (DB) + Bruno (API tests versionnés). 100 % gratuit ou pay-per-use.

---

## 16. IA / LLM (produit)

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Anthropic API** | Pay-per-use, pas d'abo. Crédits dev possibles | ✅ **Cible production** |
| **Anthropic for Startups** | 1k$ crédits si éligible YC/AWS/etc. | ✅ **À appliquer** |
| **Hugging Face Inference** | 1k req/jour serverless models | ✅ Embeddings/classification |
| **Groq Free** | 30 req/min Llama 3.3 70B, 14k tokens/min | ✅ **Tâches secondaires rapides** |
| **Mistral La Plateforme** | Free tier 1 req/sec | ✅ Backup EU compliance |
| **Cohere Free Trial** | 1k req/mois trial | ⚠️ Court terme |
| **Ollama local** | Gratuit, GPU local | ✅ Dev/staging tests |
| **Replicate** | $0.30 free crédits initial | ❌ Trop court |
| **LangSmith Free** | 5k traces/mois | ✅ Debugging LLM |
| **Langfuse Cloud Free** | 50k observations/mois, illimité users | ✅ **Alternative LangSmith** |

**Recommandation** : **Anthropic Claude 4.7** pour CV Optimizer (qualité critique) + **Groq Llama 3.3 70B** pour tâches secondaires (classification skills, parsing). **Langfuse** pour observabilité LLM (mieux que LangSmith en free). Coût Anthropic estimé : ~0,05-0,15 €/CV généré, soit ~5-30 €/mois à 5 clients ESN actifs.

---

## 17. Image / Vidéo generation

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Hugging Face Spaces** | Gratuit (CPU lent, GPU payant) | ✅ Prototypes |
| **Replicate Free Trial** | 0,30 $ initial | ⚠️ |
| **Recraft Free** | 50 crédits/jour | ✅ Assets marketing |
| **Ideogram Free** | 10 prompts/jour modèle 2.0 | ✅ Logos/social posts |
| **Wan2GP local** | Gratuit si GPU local | ⚠️ Pas indispensable |
| **Krea AI Free** | Limité | ⚠️ |
| **Gemini Imagen via AI Studio** | Free tier généreux | ✅ Assets blog |
| **Banana / nanobanana via Gemini** | Free tier API | ✅ Génération assets SEO |

**Recommandation** : **Ideogram + Recraft + Gemini Imagen** suffisent pour tous les assets marketing/blog/social. Aucun besoin de Midjourney payant.

---

## 18. Signature électronique

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Yousign Free Trial** | 14 jours puis payant | ❌ |
| **DocuSign Free** | 3 docs total puis stop | ❌ Insuffisant |
| **HelloSign / Dropbox Sign Free** | 3 docs/mois | ⚠️ Limite |
| **BoldSign Free** | 1 user, 5 envois/mois | ⚠️ |
| **Documenso (OSS)** | Self-host gratuit, eIDAS compliant | ✅ **Cible** |
| **OpenSign (OSS)** | Self-host gratuit | ✅ Alternative |
| **PandaDoc Free** | 3 documents/mois | ⚠️ |

**Recommandation** : **Documenso self-host** sur Cloudflare Pages + Supabase. eIDAS compliant, conforme RGPD, illimité. Argument commercial fort : "signature électronique inclus". Sinon BoldSign 5 contrats/mois suffit jusqu'à 3 clients.

---

## 19. Comptabilité / Facturation

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Pennylane** | Pas de free, sandbox API gratuit | ❌ |
| **Sage** | Pas de free | ❌ |
| **Stripe Tax** | Inclus Stripe (0,5 % par transaction taxée) | ✅ TVA auto |
| **Stripe Invoicing** | Gratuit jusqu'à transactions | ✅ **Cible** |
| **Stripe Atlas Perks** | Crédits AWS, Notion, etc. si Atlas | ⚠️ Atlas = US only |
| **Invoicely Free** | 3 clients, illimité factures | ⚠️ |
| **Zoho Invoice Free** | Illimité (réellement gratuit) | ✅ Backup |
| **Tiime (FR)** | Compte pro gratuit + facturation gratuite | ✅ **Cible compte pro + facture** |
| **Qonto Essentials** | Payant 9 €/mois mais essai gratuit + perks | ⚠️ |
| **Indy** | Gratuit auto-entrepreneur uniquement | ❌ SAS exclue |

**Recommandation** : **Stripe Invoicing** pour clients récurrents B2B + **Tiime** (compte pro gratuit FR + facturation gratuite + intégration banque). Migration Pennylane à 10 clients seulement.

---

## 20. CRM commercial (avant le sien interne)

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **HubSpot CRM Free** | Illimité contacts, 1M companies, 5 users | ✅ **Cible pipeline ESN** |
| **HubSpot for Startups** | 30-90% off 1 an si éligible | ✅ À appliquer |
| **Pipedrive Free Trial** | 14 jours puis payant | ❌ |
| **Brevo Free CRM** | Inclus dans Brevo Free | ✅ Backup |
| **Folk Free Trial** | 14 jours | ❌ |
| **Attio Free** | 3 users, illimité records | ✅ Alternative moderne |
| **Notion CRM template** | Gratuit, illimité | ✅ Démarrage |

**Recommandation** : **HubSpot Free CRM** (contacts illimités, pipeline visuel, email tracking, séquences manuelles). Migrer dans le CRM interne Centrium quand celui-ci sera GA.

---

## 21. LinkedIn outbound (gratuit)

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **LinkedIn Sales Navigator** | 1 mois free trial (renouvelable parfois) | ⚠️ Court |
| **Apollo Free** | 100 email crédits/mois, 60 mobile crédits | ✅ **Cible find emails ESN** |
| **Lusha Free** | 5 contacts/mois | ❌ Trop limité |
| **Hunter Free** | 25 recherches/mois | ✅ Vérif emails |
| **Skrapp Free** | 50 emails/mois | ✅ Complément |
| **RocketReach Free** | 5 lookups/mois | ❌ |
| **Dropcontact Free** | Pas de free, mais sandbox API | ❌ |
| **PhantomBuster Free Trial** | 14 jours, 2h exécution | ⚠️ Risque ban LinkedIn |
| **Waalaxy Free** | 80 invitations/mois | ⚠️ Risque ban LinkedIn |

**Recommandation** : **Apollo Free + Hunter Free + Skrapp Free** = ~175 emails/mois cumulés, largement assez pour outbound ciblé ESN françaises (univers ~3 000 ESN). Activité LinkedIn organique manuelle (zéro outil = zéro risque ban).

---

## 22. Cold email gratuit

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Gmail** | 500 emails/jour limite SMTP, sans tracking | ⚠️ Basique |
| **Google Workspace + Apps Script** | Gratuit (si déjà Workspace) | ✅ Mail merge custom |
| **Smartlead Free Trial** | 14 jours | ❌ |
| **Lemlist Free Trial** | 14 jours | ❌ |
| **Instantly Free Trial** | 14 jours | ❌ |
| **Mailmerge Gmail + Sheets** | Gratuit illimité (sous limite Gmail) | ✅ **Cible** |
| **Brevo Free** | 300/jour transactionnel | ✅ Si DKIM domaine perso |
| **Yet Another Mail Merge (YAMM)** | 50/jour free, 1500/jour payant | ✅ Limite douce |

**Recommandation** : **YAMM (free) + Google Sheets + Gmail** = 50 cold emails/jour ciblés, suffit pour démarrer (~1 000/mois). Personnalisation manuelle profonde > volume. Tracker ouvertures via Apps Script custom (gratuit).

---

## 23. Calendrier / Booking

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Cal.com Free** | Illimité event types, illimité bookings | ✅ **Cible** (OSS, self-host possible) |
| **Calendly Free** | 1 event type, 1 calendar | ⚠️ |
| **TidyCal Free Trial** | Limité | ❌ |
| **Zcal Free** | Illimité bookings, branding | ✅ Alternative |
| **SavvyCal Free Trial** | Court | ❌ |

**Recommandation** : **Cal.com** (open source, illimité, joli). Embarquable dans le site Centrium. Lien `cal.centrium-platform.com` pour démos.

---

## 24. Réunions / Vidéo

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Google Meet Free** | 1h pour > 2 participants (avec Gmail), illimité 1-1 | ✅ **Cible démos** |
| **Zoom Free** | 40 min, 100 participants | ⚠️ Coupure pénible démo |
| **Whereby Free** | 100 min/réunion, 100 participants, lien permanent | ✅ Alternative joli lien |
| **Loom Free** | 25 vidéos, 5 min/vidéo | ⚠️ Limite vidéos courtes |
| **Tella Free** | 5 vidéos | ⚠️ |
| **Screen.studio** | Trial seulement | ❌ |
| **OBS Studio** | OSS, gratuit, illimité | ✅ Screen recording produit |
| **Vimeo Free** | 25 vidéos, 5 GB | ✅ Hébergement |
| **YouTube unlisted** | Gratuit, illimité | ✅ **Cible démos asynchrones** |

**Recommandation** : **Google Meet** (démos clients ESN) + **OBS Studio** (enregistrement walkthrough produit) + **YouTube unlisted** (hébergement, embeddable). Loom seulement pour quickies.

---

## 25. Design + Assets

| Service | Free tier 2026 | Verdict |
|---|---|---|
| **Figma Free** | 3 fichiers Figma, illimité FigJam, illimité dev mode | ✅ Design produit |
| **Penpot (OSS)** | Self-host gratuit, illimité | ✅ Alternative open |
| **Canva Free** | Templates limités, 1 GB storage | ✅ Social posts |
| **Excalidraw** | OSS gratuit | ✅ Diagrammes/architecture |
| **Tldraw** | OSS gratuit | ✅ Whiteboard |
| **Lucide Icons** | OSS, déjà utilisé | ✅ |
| **Tabler Icons** | OSS | ✅ Complément |
| **Heroicons** | OSS | ✅ |
| **Unsplash** | Gratuit attribution | ✅ Photos |
| **Pexels** | Gratuit, attribution optionnelle | ✅ |
| **Pixabay** | Gratuit | ✅ |
| **unDraw** | Illustrations SVG gratuites couleurs personnalisables | ✅ **Cible illustrations site** |
| **Storyset** | Illustrations gratuites animables | ✅ |
| **Lottiefiles** | Animations gratuites | ✅ |

**Recommandation** : **Figma Free** + **Excalidraw** + **Lucide** + **unDraw**. Pas besoin de Canva Pro ni Sketch.

---

## 26. Bonus : Programmes Startup à appliquer (jour 1)

| Programme | Bénéfice | Éligibilité Centrium |
|---|---|---|
| **AWS Activate Founders** | 1 000 $ crédits 2 ans + support | ✅ SAS récente |
| **Google for Startups Cloud** | Jusqu'à 100 k$ crédits si fonds levés | ⚠️ Demande accélérateur |
| **Microsoft for Startups** | 5 k$ → 150 k$ Azure + 2,5 k$ M365 | ✅ Tier 1 facile |
| **Notion for Startups** | 6 mois Plus + AI gratuit | ✅ Lien partenaire YC/Atlas |
| **HubSpot for Startups** | 30-90 % off 1 an | ⚠️ Accélérateur requis |
| **Stripe Atlas** | Pas pour SAS FR | ❌ |
| **Anthropic for Startups** | 1k-5k $ crédits | ✅ Postuler dès traction |
| **Vercel for Startups** | Crédits Pro 1 an | ⚠️ Si on garde Vercel |
| **Supabase Launch Program** | 12 mois Pro gratuit si accepté | ✅ **À appliquer** |
| **DigitalOcean Hatch** | 25 k$ crédits, mentorat | ⚠️ Accélérateur |
| **Cloudflare for Startups** | Pro gratuit 1 an si critères | ⚠️ |
| **Sentry for Startups** | Team plan gratuit 6 mois | ✅ |
| **Linear for Startups** | Linear Business gratuit | ✅ |
| **Mixpanel Startup** | 50k MTU gratuit 1 an | ✅ Alternative PostHog |
| **MongoDB Atlas Free** | M0 cluster gratuit à vie | ✅ Si besoin NoSQL |
| **Algolia Free** | 10k recherches/mois | ✅ Search produit |
| **Bpifrance Création** | Diag gratuit, prêt d'honneur 5-30 k€ | ✅ **FR : à activer** |
| **French Tech Tremplin** | Mentorat + 30k€ subvention | ⚠️ Selon critères |
| **Initiative France** | Prêt d'honneur 0 % | ✅ Région IDF |
| **JEI (Jeune Entreprise Innovante)** | Exonérations sociales/fiscales | ✅ **À demander** |
| **CIR / CII** | Crédit impôt recherche/innovation | ✅ |

**Recommandation** : appliquer **dès cette semaine** à AWS Activate, Microsoft for Startups, Supabase Launch, Sentry, Linear, Notion, Anthropic Startup. Cumul : > 30 k€ de valeur en crédits **sans aucun cash sorti**.

---

## Récapitulatif stack cible Centrium 0-10 clients

```
┌─────────────────────────────────────────────────────────────┐
│                  STACK CENTRIUM ZERO BUDGET                  │
├─────────────────────────────────────────────────────────────┤
│ Hosting         → Cloudflare Pages (gratuit, commercial OK) │
│ DB + Auth       → Supabase Free + Neon Free (backup)        │
│ Storage         → Cloudflare R2 (10 GB free, egress 0)      │
│ Email tx        → Resend Free → SES si > 100/j              │
│ Email mkt       → Brevo Free (300/jour)                     │
│ Monitoring      → Sentry + PostHog + Cloudflare Analytics   │
│ Uptime          → Better Stack + Instatus                   │
│ Cache/Queue     → Upstash Redis + QStash                    │
│ CI/CD           → GitHub Actions Free                       │
│ Security        → Dependabot + Semgrep + GitGuardian + Trivy│
│ Repos           → GitHub Free                               │
│ Docs            → Notion + Mintlify                         │
│ Ticketing       → Linear Free                               │
│ IDE AI          → Claude Code + Continue.dev                │
│ LLM             → Anthropic + Groq + Langfuse               │
│ Signature       → Documenso self-host ou BoldSign 5/mois    │
│ Facturation     → Stripe Invoicing + Tiime                  │
│ CRM             → HubSpot Free                              │
│ Prospection     → Apollo + Hunter + Skrapp Free             │
│ Cold email      → YAMM + Gmail (50/jour)                    │
│ Booking         → Cal.com                                   │
│ Démos           → Google Meet + OBS + YouTube unlisted      │
│ Design          → Figma Free + Excalidraw + Lucide + unDraw │
└─────────────────────────────────────────────────────────────┘
```

---

## RÉSUMÉ EXÉCUTIF (< 200 mots)

**Stack 100 % gratuite recommandée pour Centrium 0-10 clients ESN** :

Cloudflare Pages (hosting, remplace Vercel) + Supabase Free (DB/auth) + Cloudflare R2 (storage) + Resend (emails tx) + Brevo (email marketing) + Sentry + PostHog + Better Stack + Upstash Redis + GitHub Actions + Dependabot/Semgrep/GitGuardian + Linear + Notion + HubSpot Free CRM + Apollo/Hunter + Cal.com + Documenso (signature) + Stripe Invoicing + Tiime.

**Coût total mensuel à 5 clients ESN** :
- Domaine OVH : ~0,83 €/mois (10 €/an)
- Anthropic API : ~15-40 €/mois (5 clients × ~20 CV/mois × 0,10-0,15 €)
- Tous les autres SaaS : **0 €**
- **Total cash : ~16-41 €/mois**, dont 95 % en usage variable IA producteur de valeur directe.

**Quand le free tier va se casser** :
- **Supabase Free** à ~10-15 clients ESN (dépassement 500 MB DB ou 50k MAU) → bascule Supabase Pro 25 $/mois.
- **Cloudflare Workers** à ~100k req/jour (~30 clients actifs) → 5 $/mois.
- **Resend** à 100 emails/jour (~7-8 clients actifs) → SES pay-per-use ou Resend Pro 20 $/mois.
- **HubSpot CRM Free** : OK jusqu'à plusieurs centaines de contacts (migration vers CRM Centrium prévue).
- **Décrochage payant inévitable estimé** : entre **client #8 et client #12**, pour un coût total < 100 €/mois — soit après que Centrium ait commencé à générer du MRR.

**Premier euro à dépenser hors API : à partir du 8e client payant.**
