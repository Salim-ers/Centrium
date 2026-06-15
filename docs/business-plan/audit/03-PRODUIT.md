# Audit Produit — Centrium

> **Auditeur** : Head of Product (perspective ex-Notion / ex-Pennylane)
> **Date** : 15 juin 2026
> **Périmètre** : v1.0 livrée Q2 2026, 0 client payant, super-admin = Salim
> **Méthode** : exploration du repo `quadcore-platform`, lecture pages `src/app/`, composants `src/components/`, services `src/lib/services/`, routes API `src/app/api/`, modules IA `src/lib/ai/` + `src/lib/cv/`, doc `docs/produit/`.
> **Verdict en une phrase** : produit beta cohérent, **fonctionnellement crédible sur 7/9 modules**, mais 3 chantiers bloquent une vente facile (matching IA trop léger, optimizer CV mock, zéro intégration comptable native). Vendable en mode "design partner" dès aujourd'hui à condition d'assumer le statut beta et de cadrer l'accompagnement.

---

## 1. Vue produit (modules, état de livraison)

Le repo confirme 14 surfaces applicatives plus la vitrine et la console super-admin. État synthétique :

| # | Module | Routes principales | État livré | Couverture |
|---|---|---|---|---|
| 1 | Bibliothèque consultants | `/consultants`, `/consultants/[id]`, `/prospects`, `/en-mission`, `/cv-pushed` | Complet | 95 % |
| 2 | CV Optimizer | `/cv-optimizer` (1 155 lignes) | Partiel | 70 % |
| 3 | Matching IA | `/matching` (341 lignes) + `matching.service.ts` (84 lignes) | Mock fonctionnel | 50 % |
| 4 | AO / Offres | `/offers` (847 lignes) + `/api/offers/parse-image` (LLM réel) | Complet | 85 % |
| 5 | CRM commercial | `/crm` (732 lignes, kanban + realtime) | Complet | 90 % |
| 6 | CRA / Timesheets | `/timesheets`, `/portal/cra` | Complet | 85 % |
| 7 | Facturation | `/invoices` (398 lignes) + `InvoiceDocument.tsx` | Complet (PDF only) | 75 % |
| 8 | Dashboard pilotage | `/dashboard` (396 lignes) + RPC `dashboardService` | Complet | 90 % |
| 9 | Alertes | `/alerts` + `alertService` (computed) | Complet | 80 % |
| 10 | Carnet de contacts | `/contacts` | Complet | 80 % |
| 11 | Contrats | `/contracts` (413 lignes) + template QuadCoreContractAT | Partiel | 60 % |
| 12 | Portail consultant | `/portal/*` (dashboard, CRA, missions, profil, docs, contrats, factures) | Complet | 85 % |
| 13 | Console admin per-org | `/settings/{team,branding,appearance,privacy,profile}` | Complet | 90 % |
| 14 | Super-admin | `/admin/{clients,audit}` + `ProvisionClientDialog` | Complet | 80 % |
| 15 | Réponses commerciales | `/responses` + `/api/responses/generate-email` (LLM réel) | Complet | 80 % |
| 16 | Assistant compta IA | `/accounting` + `lib/ai/accounting-assistant.ts` | Mock heuristique | 40 % |
| 17 | Billing Stripe | `/billing` + `/api/billing/{checkout,portal,usage,webhook}` | Complet (plans non câblés) | 70 % |

**Lecture rapide** : le scope fonctionnel est large pour une v1.0. Aucune surface n'est totalement vide. Mais 3 modules portent un risque de "mockage produit" qui ne tient pas une démo serrée face à un acheteur expert (matching IA, optimizer, assistant compta).

---

## 2. Parcours utilisateur principaux

J'ai déroulé mentalement chacun des 6 personas en parcourant la `Sidebar.tsx` (5 groupes : Pilotage, Talents, Commercial, Facturation, Organisation) et les pages associées.

### Business Manager (BM)
**Parcours nominal** : `/dashboard` → `/offers` (nouvelle AO) → `/api/offers/parse-image` (extraction LLM screenshot) → `/matching?offerId=X` → sélection consultant → `/cv-optimizer?consultantId=X&offerId=Y` → export PDF → `/responses` (génération email pitch) → push CRM (`/crm`).
**Verdict** : **fluide**, c'est le parcours le plus mature. Le `?offerId=` qui suit dans les query strings montre que les enchaînements ont été pensés. Couplage realtime + cache (`useCachedQuery` + `useRealtimeReload`) sur la plupart des pages.
**Friction** : nécessite 5 onglets / clics pour aller de l'AO à l'email. Pas de "AI agent" qui orchestre tout. Pas de side-by-side mission/consultant intégré dans `/matching`.

### Recruteur
**Parcours nominal** : `/consultants` (vivier + bibliothèque via `TalentTabs`) → import CV drag-drop → parsing IA → fiche enrichie → `/prospects`. Création nouveau consultant via `ConsultantFormDialog` + `KycDocuments` + `EducationEditDialog` etc.
**Verdict** : **complet**. Édition par section avec dialogues dédiés (skills, langues, exp, éduc, textBlock). Le parsing CV utilise un vrai LLM (`/api/cv/parse` avec Anthropic SDK + zod schema) avec fallback heuristique.
**Friction** : pas de boîte de réception CV par email, pas de scraping LinkedIn (réglementaire OK mais marché demandeur), pas de "compétences manquantes auto-suggérées" basées sur le marché.

### Consultant (portail)
**Parcours nominal** : `/portal/dashboard` → `/portal/cra/new` (saisie mensuelle) → soumission → `/portal/missions` → `/portal/documents` (contrats, factures, attestations) → `/portal/profile`.
**Verdict** : **propre et minimal**. 7 pages, branding hérité de l'ESN via `useBrandName`. Cohérent avec design system (`PageHeader`, `KPICard`, `DataRow`, `EmptyState`).
**Friction** : pas de signature électronique des contrats directement dans le portail (juste lecture/téléchargement). Pas de notifications push/mobile. Pas de PWA.

### Admin ESN (per-org)
**Parcours nominal** : `/settings` → `/settings/team` (inviter membres) → `/settings/branding` (logo, couleurs, IBAN, signature) → `/settings/privacy` (politique password, MFA, session timeout, audit logs lecture) → `/billing` (Stripe checkout).
**Verdict** : **enterprise-ready apparent**. Couvre la check-list standard SOC 2 light : MFA TOTP, password policy + HIBP check, audit log, MFA enroll/verify/unenroll, login events. Bon vs. concurrence française.
**Friction** : pas de SSO SAML/OIDC, pas de SCIM provisioning. Bloquant pour entreprises >100 utilisateurs (mais cible MVP est 10-200 consultants, donc ~5-20 admins → acceptable phase 1).

### Finance
**Parcours nominal** : `/timesheets` (validation BM) → `/invoices` (factures auto-générées à la validation CRA via migration 024_auto_invoice_on_cra_validation.sql) → export Sage/Pennylane.
**Verdict** : **fonctionnel mais incomplet**. La logique métier (auto-création facture sur CRA validé) est correctement en SQL trigger. Le PDF facture (`InvoiceDocument.tsx`) existe. **MAIS aucune intégration native Pennylane/Sage** (grep négatif sur tout le repo). Les "exports" sont au mieux des CSV/PDF.
**Friction** : pas de connecteur banque (rapprochement automatique), pas de SEPA/relances automatiques, pas de TVA déclarative auto. C'est le module le plus en retard vs. promesse.

### Super-admin (Salim aujourd'hui)
**Parcours nominal** : `/admin/clients` (provisioning ESN via `ProvisionClientDialog`) → `/admin/audit` (200 dernières activités cross-tenant) → consultation des `quote_requests` venant de `/devis`.
**Verdict** : **opérationnel**. Permet de signer un client à la main et de l'onboarder en ~10 min. Pas encore d'onboarding self-service post-signature (volontaire, vu le positionnement enterprise).

---

## 3. Module Bibliothèque consultants

**État** : complet, 95 % couverture.

**Pages** : `/consultants` (772 lignes), `/consultants/[id]` (fiche détail), `/prospects`, `/en-mission`, `/cv-pushed`. `TalentTabs.tsx` orchestre le switch bibliothèque/vivier.

**Composants** : 16 dans `src/components/consultants/` — un dialog par bloc éditable (skills, langues, éducation, expérience, textBlock, KYC, documents, ville filter, job family filter, CSV import, grant portal, promotion prospect→consultant).

**Service** : `consultant.service.ts` 561 lignes — list, byId, listItems pour table, archive/unarchive, search filters, byJobFamily, byCity, métriques.

**Routes API** : `/api/consultants/[create,import-csv,[id]/skills,[id]/portal-access]` — tout en place.

**Forces** :
- Filtres multi-critères (job family, ville, statut, séniorité, archive).
- Pagination + bulk selection + realtime reload.
- Parsing CV IA (Claude API) + fallback heuristique : `parseCVSmart` dans `lib/cv/parse-cv-llm.ts` gère timeout, abort, mode dégradé.
- Promotion prospect → consultant atomique.
- Plan limits enforced via `lib/billing/enforce.ts` (PlanLimitError + 402).

**Gaps** :
- Pas de "skill graph" / hiérarchie compétences (ex: "React" sous "Frameworks JS").
- Pas de scoring automatique de "freshness" (CV non mis à jour depuis X mois).
- Pas de recherche full-text BM-friendly ("trouve-moi un Java/AWS dispo en mars à Lyon").
- Pas de timeline visuelle des passages mission/intercontrat (carrière chez l'ESN).

---

## 4. Module CV Optimizer

**État** : partiel, 70 % couverture. **C'est le module le plus oversold par le marketing vs. ce qui est livré.**

**Page** : `/cv-optimizer/page.tsx` — 1 155 lignes (le plus gros fichier app). Suspense, query params consultant+offre, 3 templates, preview live, édition inline.

**Templates** : 3 variantes en code (`QuadCoreCVStandard.tsx` 469 lignes, `QuadCoreCVDense.tsx` 445 lignes, `QuadCoreCVExecutive.tsx` 419 lignes) + versions PDF (`/pdf/QuadCoreCV*PDF.tsx`) via `@react-pdf/renderer`.

**Export** : `exportCVToPdf` (react-pdf), `generateCVDocx` (DOCX). QR code branding embarqué en data URL.

**Édition inline** : `Editable.tsx` (116 lignes), `EditableDate.tsx` (148 lignes), overrides persistés en local (`applyOverrides`).

**Forces** :
- 3 templates réels avec rendu PDF natif (pas un screenshot).
- Branding par org (logo, couleurs, IBAN, signature) hérité via `useOrganization`.
- Réducteur de sources transparent (`sources` field dans `GenerateCVOutput`).
- Garde-fous "no invention" formalisés dans `cv-generator.ts` (commentaire l.12-14).
- Suggestion compétences manquantes via `/api/cv/skills/suggest` (LLM réel, 265 lignes).

**Gaps majeurs** :
- **`generateCVContent` est encore MOCK déterministe** (l.6-9 du fichier : "En mode MVP : mock déterministe ; En V1 : remplacer par un appel Claude API en gardant les mêmes garde-fous"). C'est faux de prétendre "CV Optimizer IA" dans le marketing tant que ce switch n'est pas fait.
- **Le matching local** (`computeMatching` l.88-122) est un simple set intersection avec coverage * 0.85 + bonus 0.15. Aucune NLP, pas de synonymes ("React" ≠ "React.js"), pas de poids par séniorité.
- Pas de versioning persistant des CV générés (chaque génération = un brouillon volatile, pas de table `cv_versions` peuplée).
- Pas de comparaison "avant/après" optimisation.
- Pas d'A/B sur templates avec stats acceptation client.

**Verdict module** : démo crédible mais ne tient pas un POC sérieux > 30 min avec un BM expérimenté. **Switch LLM = priorité absolue avant 1er client payant.**

---

## 5. Module Matching IA + AO

**État** : matching mock + extraction AO LLM réelle.

### Extraction AO (`/api/offers/parse-image`)
**Forces** :
- Vrai LLM Claude (Anthropic SDK + `zodOutputFormat`) sur image (PNG/JPEG/WebP, 10 MB max) OU texte (30 000 chars max).
- Schema zod riche : title, description, required_skills, nice_to_have, seniority, daily_rate_min/max, location, remote_days, dates, contract_kind, ET fiche de poste reformulée (context, mission_purpose, tasks, tech_stack, profile_requirements, working_conditions).
- Prompt système solide avec règles "no invention", contraintes par champ, exemples.

**Gaps** :
- Pas de PDF (image only). 80 % des AO arrivent en PDF dans le marché ESN.
- Pas de scraping LinkedIn / Free-Work / Malt / Welcome to the Jungle.
- Pas d'agrégation d'AO depuis une boîte email (parsing inbox).

### Matching consultant↔offre
**Service** : `matching.service.ts` (84 lignes) — load offer → load consultants `available|soon_available|on_mission` non archivés → load skills → `computeMatching` (set intersection) → sort by score+dispo.

**Gaps majeurs** :
- Pas d'IA. C'est une heuristique. Marketing dit "Matching IA scoring consultant↔mission, justification IA" : la **justification IA n'existe pas dans le code** côté matching, juste la liste `matchedSkills` / `missingSkills`. Pas de texte explicatif généré par LLM.
- Pas de pondération expérience récente, pas de proximité géo réelle (distance), pas de TJM compatibilité.
- Pas de vector embeddings consultants/offres (pgvector disponible sur Supabase, non utilisé).
- Pas de "consultants similaires à celui qui a gagné cette mission".

**Verdict module** : **vendable en l'état comme "pré-shortlist intelligente"** si on ne survend pas le mot IA. À enrichir d'urgence avec un second LLM pass qui justifie le score en 2 lignes ("Marie matche à 87% parce que…"). Coût faible (1 appel Claude haiku par candidat shortlist).

---

## 6. Module CRA + Facturation

**État** : complet mais isolé du monde compta.

**Pages** : `/timesheets` (292 lignes), `/portal/cra/{[id],new}`, `/invoices` (398 lignes), `/invoices/[id]`.

**Workflow** : saisie consultant via `TimesheetFormDialog` + `TimesheetCalendar` → submitted → validation BM (`client_validated`) → trigger SQL `024_auto_invoice_on_cra_validation.sql` crée la facture automatiquement.

**Service** : `invoiceService` + `timesheetService` exposent list, listWithConsultant, archive, markAsPaid, markAsSent, markAsUnpaid.

**PDF** : `InvoiceDocument.tsx` + `TimesheetDocument.tsx` via react-pdf.

**Forces** :
- Workflow validé/dénormalisé bien posé (statuts cohérents draft/submitted/client_validated/rejected, draft/sent/paid pour facture).
- Auto-création facture à la validation CRA = différenciateur réel vs. Excel/QuickBooks.
- IBAN, TVA, branding hérité de l'org.

**Gaps majeurs** :
- **Zéro intégration Pennylane** (grep `pennylane` : 0 résultat). C'est l'intégration #1 attendue par toute ESN française 2026.
- **Zéro intégration Sage** (export "csv format Sage" pas implémenté à ce jour).
- Pas de relance automatique factures impayées (markAsSent/markAsUnpaid existe, mais pas de cron de rappel email).
- Pas de SEPA prélèvement / Stripe direct debit pour les clients finaux ESN.
- Pas de rapprochement bancaire.
- Pas de génération attestation fiscale annuelle.
- Pas de gestion multi-devise.

**Verdict module** : **fonctionnel pour facturation interne ESN**. À coupler urgence avec Pennylane (API publique disponible) sinon le DAF de l'ESN va refuser de migrer. Cette intégration seule peut faire la différence entre "outil sympa" et "remplace Excel + Pennylane partiellement".

---

## 7. Module Dashboard / Pilotage

**État** : complet, 90 % couverture.

**Page** : `/dashboard/page.tsx` (396 lignes) — KPIs (consultants actifs/dispo/en mission, intercontrat %, CA M+1, missions ouvertes), alertes calculées (`alertService.computeAlerts`), tutorial onboarding (`NewUserTutorial.tsx`), `RevenueChart`, reset dashboard (super-admin).

**RPC SQL** : `028_dashboard_rpc.sql` + `029_alerts_compute.sql` = calculs serveur, pas N+1.

**Forces** :
- Animations soignées (`AnimatedNumber`).
- 4 niveaux d'alerte priorité (critical/high/medium/low) avec tone visuel.
- Realtime reload via `useRealtimeReload`.
- Tutorial first-run pour onboarder un nouveau user.

**Gaps** :
- Pas de drill-down depuis KPI (cliquer "8 consultants intercontrat" devrait pousser vers une vue filtrée).
- Pas de comparaison période N vs. N-1 ni courbes tendance > 1 mois.
- Pas de personnalisation widgets (un BM, un DAF, un dirigeant veulent des KPIs différents).
- Pas d'export rapport mensuel PDF (CEO-friendly).

---

## 8. Module CRM

**État** : complet, 90 % couverture. **Probablement le module le plus polished.**

**Page** : `/crm/page.tsx` (732 lignes). Kanban 6 colonnes pipeline (new→contacted→discussion→cv_sent→client_interview→negotiation) + 1 carte récap "Terminées" (won/lost/on_hold).

**Composants** : `OpportunityFormDialog`, `ContactFormDialog`, `ContactInteractionsDialog`, `ContactReminderDialog`, `ContactCsvImportDialog`.

**Forces** :
- Drag & drop natif HTML5 (`application/x-opportunity-id` MIME) + realtime collaboratif (`useCrmRealtime` : `peerByOpp`, `peerByColumn`, broadcast drag/drop/cancel + optimistic peer drop).
- Workflow complet : opportunité → contact → interactions → reminder.
- Carte récap "Terminées" évite 3 colonnes vides à droite.
- Carnet contacts (`/contacts`) + import CSV.

**Gaps** :
- Pas d'intégration email (Gmail/Outlook) → toute la communication reste hors plateforme.
- Pas de calendrier intégré (Google/Outlook) → meetings invisibles.
- Pas de power dialer / VOIP (Aircall, Ringover).
- Pas d'enrichissement automatique contacts (Apollo, Dropcontact).
- Pas de séquences d'emailing automatique.

**Verdict module** : **vendable tel quel** si l'ESN accepte que le CRM Centrium soit "le pipeline + le carnet" et que la communication client reste sur leur outil email actuel.

---

## 9. Portail consultant

**État** : complet, 85 % couverture.

**Pages** : `/portal/{dashboard,cra,missions,profile,documents,contracts/[id],invoices/[id]}`. Layout dédié (`PortalShell.tsx`, `PortalSidebar.tsx`).

**Forces** :
- 7 surfaces couvrant les besoins consultant : tableau de bord (CRA en cours, factures payées), saisie CRA mensuel, missions actuelles/passées, profil éditable, documents (contrats + factures + KYC), accès individuel par invitation (`GrantPortalDialog`).
- Branding ESN appliqué (le consultant voit "Centrium by Capgemini" si l'ESN s'appelle Capgemini, pas Centrium).
- Realtime + cache.

**Gaps** :
- **Pas de signature électronique** des contrats dans le portail (lecture/téléchargement seulement). C'est un manque criant en 2026.
- Pas de chat consultant↔BM dans le portail.
- Pas de PWA / app mobile (consultant en déplacement = friction saisie CRA).
- Pas de notifications push (web ou mobile).
- Pas de coffre-fort documents persistant (style DigiPoste) pour fiches de paie, attestations.

---

## 10. Console admin per-org

**État** : complet, 90 % couverture.

**Pages** : `/settings/{team,branding,appearance,privacy,profile}` + `/admin/audit` (super-admin).

**Forces** :
- Politique mot de passe + HIBP check (`/api/auth/password-check`).
- MFA TOTP (enroll/verify/unenroll routes).
- Session timeout configurable.
- Audit log lecture (table `activities`, 200 dernières lignes, filtrable entité/action).
- Notif email nouvelle device (table `login_events` + Resend).
- Export RGPD self-service (`/api/me/export`).
- Suppression compte avec délai 30j (`/api/me/delete-request`).
- Throttle exports massifs (5/h/user, 1000 rows max).
- Rate limiting Upstash sur auth.

**Gaps** :
- Pas de SSO SAML/OIDC. Bloquant pour grand compte > 100 utilisateurs (mais hors cible MVP).
- Pas de SCIM provisioning automatique.
- Pas de webhooks sortants (un client voudra notifier son Slack quand un CRA est validé).
- Pas d'API publique documentée (`docs/produit/API.md` existe — à vérifier dans audit séparé).
- Pas de "delegate admin" granulaire (le rôle business_manager voit tout du domaine commercial mais pas de scopes plus fins).

---

## 11. Modules IA — qualité réelle vs marketing

**Récap honnête** :

| Promesse marketing | Implémentation réelle | Honnêteté |
|---|---|---|
| Parsing IA CV (PDF/DOCX/scan) | LLM Claude Sonnet via `/api/cv/parse` avec schema zod ; fallback heuristique | **Vrai** |
| Extraction besoin AO depuis screenshot | LLM Claude vision via `/api/offers/parse-image` (PNG/JPG/WebP only) | **Vrai mais limité au format image** |
| CV Optimizer IA | `generateCVContent` = MOCK déterministe (templates + reformulation regex) | **Survendu** |
| Matching IA scoring consultant↔mission | Set intersection skills + coverage * 0.85 + bonus 0.15 | **Survendu** |
| Justification IA | N'existe pas côté matching (juste matched/missing lists) | **Survendu** |
| Génération email pitch | LLM Claude via `/api/responses/generate-email` (3 tons) | **Vrai** |
| Suggestions compétences manquantes | LLM Claude via `/api/cv/skills/suggest` | **Vrai** |
| Assistant comptable IA | Mock intent matcher regex + queries Supabase ; commentaire "en V1 : remplacer par Claude tool use" | **Survendu** |
| Alertes IA | Calcul SQL déterministe (`alertService.computeAlerts`) | **OK si on dit "alertes intelligentes"** |

**Verdict** : 4 modules IA réels (parsing CV, AO, email pitch, skills suggest), 3 mocks (optimizer, matching, accounting assistant). Le pitch doit être recalibré pour cadrer le 3 mocks soit en démo-only soit en chantier roadmap explicit.

---

## 12. Intégrations manquantes — top 10 par impact business

1. **Pennylane** — incontournable DAF français, ouvre la porte chez 70 % du marché ESN cible. **Bloquant vente.**
2. **Sage 100c / Sage Cloud** — incontournable pour ESN > 50 collab qui ont déjà Sage. **Bloquant grand compte.**
3. **Signature électronique** (Yousign FR > DocuSign) pour contrats portail. **Bloquant adoption portail.**
4. **Gmail / Outlook** (lecture + envoi depuis CRM, log automatique). **Différenciateur CRM.**
5. **Google Calendar / Outlook Calendar** (sync rendez-vous opportunités). Complément Gmail.
6. **LinkedIn Recruiter / LinkedIn standard** (import profil 1 clic, scraping limité aux InMails). **Différenciateur recruteur.**
7. **Free-Work / Malt / Welcome to the Jungle / Talent.io** (ingestion offres). **Différenciateur sourcing AO.**
8. **Slack / Microsoft Teams** (notifications opportunités, CRA validés, alertes). **Différenciateur adoption.**
9. **Stripe Connect / GoCardless** (prélèvement SEPA factures clients ESN). **Différenciateur cash flow.**
10. **API publique + webhooks sortants** (laisse les ESN brancher leur stack interne). **Différenciateur extensibilité.**

Aujourd'hui : **0 intégration native** parmi ces 10. Le pitch "centralise tout le cycle" est donc partiellement faux : Centrium centralise tout sauf les outils où vit vraiment l'ESN aujourd'hui (email, Pennylane, LinkedIn).

---

## 13. UX globale

### Design system
**Forces** :
- `src/components/app/` = vrai design system internalisé : `PageHeader`, `KPICard`, `AppCard`, `SectionHeader`, `EmptyState`, `StatusBadge`, `DataRow`, `BulkActionBar`. Présence d'un `README.md`. C'est rare et c'est bien.
- shadcn/ui + Tailwind cohérents.
- Brand magenta + violet + emerald → ambiance "fintech moderne", lisible.
- Dark mode forcé sur l'app, light + dark sur `/admin/*` (commit récent).
- Vitrine séparée (`MarketingShell`) avec hero 3D galaxy, GSAP animations, scènes Three.js — visuellement impressionnant mais probablement trop chargé pour des DAF/dirigeants ESN.

**Faiblesses** :
- 1 155 lignes sur `/cv-optimizer/page.tsx` et 732 sur `/crm/page.tsx` : difficile à maintenir, signal de dette technique.
- Vitrine très "next-gen Notion / Linear" — risque de désaligner avec la cible ESN française (acheteurs 45-60 ans, sensible au sérieux institutionnel).

### Accessibilité
- Pas de mention d'audit a11y dans `docs/produit/`.
- Pas de tests Playwright a11y dans le repo.
- Lecteur d'écran non testé.
- Contraste sur les `qc-italic-accent` magenta sur fond sombre = pas certain de passer WCAG AA.

### Mobile
- Pas de breakpoints `sm:` / `md:` partout (à valider).
- `useIsMobile` existe, pas de PWA / manifest visible.
- Aucun composant React Native, pas de plan mobile natif.
- **Problème** : un consultant en déplacement va vouloir saisir son CRA sur mobile. Le portail est "responsive" mais pas "mobile-first".

---

## 14. Verdict produit par module — note /10

| Module | Note | Justification |
|---|---|---|
| Bibliothèque consultants | 8/10 | Riche, propre, parsing CV IA réel. Manque skill graph + recherche full-text smart. |
| CV Optimizer | 5/10 | 3 templates réels + export PDF/DOCX top. **Mais cœur IA = MOCK.** Plafond bas. |
| Matching IA | 4/10 | Set intersection vendu comme IA. Pas de justification. À refondre. |
| AO / Offres | 7/10 | Extraction LLM réelle solide. Manque PDF + scraping marchés. |
| CRA / Timesheets | 7/10 | Workflow complet, auto-facture. Manque mobile-first. |
| Facturation | 6/10 | PDF + workflow OK. **Zéro intégration compta = plafond bas.** |
| Dashboard / Pilotage | 7/10 | KPIs solides, alertes propres. Manque drill-down + comparaison. |
| CRM | 8/10 | Kanban + realtime collaboratif = polished. Manque email + calendar. |
| Portail consultant | 7/10 | 7 surfaces propres. Manque e-signature + PWA. |
| Console admin per-org | 8/10 | Enterprise basics OK : MFA, HIBP, audit, RGPD. Manque SSO/SCIM. |
| Super-admin | 7/10 | Provisioning + audit cross-org. Manque dashboard santé clients. |
| Réponses commerciales | 7/10 | Vraie IA, 3 tons, ancré faits. Bonne touche. |
| Assistant compta IA | 4/10 | Mock heuristique. À refondre LLM ou retirer du pitch. |
| Billing Stripe | 6/10 | Checkout + portal OK. Plans pas tous câblés Stripe. |

**Note globale produit** : **6,5/10** — solide beta cohérent, 3 chantiers bloquants, plein de petits gaps qui font la différence en démo serrée.

---

## 15. Top 5 gaps à combler AVANT le 1er client payant

1. **Activer le LLM dans `cv-generator.ts`** (switch mock → Claude API avec mêmes garde-fous "no invention"). Sans ça, le pitch CV Optimizer est mensonger. **Effort : 3-5 j de dev.**
2. **Enrichir le matching avec un 2e pass LLM "justification"** : Claude Haiku qui prend (consultant + offre + score) et génère 2 lignes "Pourquoi 87 %". Coût marginal. **Effort : 2 j de dev.**
3. **Intégration Pennylane minimale (export factures)** via l'API publique Pennylane. Au minimum push automatique des factures payées. **Effort : 5-8 j de dev.**
4. **Signature électronique Yousign dans le portail consultant** sur les contrats. Sans ça, l'acheteur dit "donc en fait je signe encore par email comme avant". **Effort : 4-6 j de dev.**
5. **Support PDF (en plus du PNG/JPG) dans l'extraction AO** : 80 % des AO arrivent en PDF. **Effort : 2-3 j de dev.**

Total : **15-25 jours/dev** pour passer de "beta cohérent" à "vendable sérieusement à un DAF d'ESN 30 consultants".

---

## 16. Top 10 features manquantes à roadmap 12 mois

1. **Connecteur Pennylane bidirectionnel** (factures + clients + paiements).
2. **Connecteur Sage 100c export comptable**.
3. **Signature électronique Yousign** sur tous les documents (contrats, devis, fiches mission).
4. **Recherche full-text BM-friendly** ("Java AWS dispo mars Lyon") avec embeddings pgvector + reranking LLM.
5. **Email + calendar integration** Gmail/Outlook dans le CRM (read-only puis send).
6. **PWA + saisie CRA mobile-first** pour les consultants en déplacement.
7. **Webhooks sortants + API publique documentée** (`docs/produit/API.md` à publier).
8. **Sourcing AO automatique** : connecteurs Free-Work, Malt, Talent.io, plus un parser inbox email.
9. **SSO SAML/OIDC + SCIM** pour passer le palier 100+ utilisateurs.
10. **Vrai matching IA vectoriel** : embeddings consultants + offres + reranking LLM avec explication. Cache pgvector pour <300 ms.

---

# Synthèse exécutive — réponse à Salim

**Note produit : 6,5/10**

**3 modules forts (vendables tels quels)** :
- CRM commercial (kanban realtime collaboratif, 8/10)
- Console admin enterprise (MFA, HIBP, audit, RGPD, 8/10)
- Bibliothèque consultants + parsing CV IA réel (8/10)

**3 modules faibles (à compléter avant vente)** :
- CV Optimizer (cœur IA encore mock, 5/10)
- Matching IA (set intersection vendu comme IA, 4/10)
- Facturation (zéro intégration Pennylane/Sage, 6/10)

**Verdict** : **produit beta cohérent**. Pas encore "prod-ready PME". Vendable dès aujourd'hui en mode design partner / early adopter à 3-5 ESN tolérantes au statut beta, avec accompagnement fort et roadmap publique. Pour passer "prod-ready PME" et démarcher en cycle commercial standard : **15-25 jours dev sur les 5 gaps prioritaires** (LLM CV Optimizer, justification matching, Pennylane, Yousign, PDF AO).
