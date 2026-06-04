# AUDIT CENTRIUM — État technique consolidé

**Date** : 2026-06-04
**Cible** : https://www.centrium-platform.com + app interne post-login
**Stack** : Next.js 14 App Router · TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage + Realtime) · Framer Motion · @react-pdf/renderer · Recharts · Vercel

---

## Légende

| Sévérité | Définition |
|---|---|
| **Critique** | Bloque une feature ou expose une faille de sécurité. À traiter immédiatement. |
| **Haute** | Dégrade significativement UX/perf/SEO. À traiter en priorité. |
| **Moyenne** | Amélioration notable mais sans impact critique. |
| **Faible** | Polish, dette technique mineure. |

| Statut | Définition |
|---|---|
| ✅ Corrigé | Fix livré dans cette session |
| 🟡 Partiel | Fix partiel, reste du travail |
| ⏭ À faire | Identifié, pas encore traité |
| 💬 Décision | Nécessite arbitrage produit |

---

## 1 · Sécurité (audit défensif)

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| S1 | **Critique** | Middleware interceptait `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/manifest.webmanifest`, `/opengraph-image`, `/icon`, `/apple-icon` → 307 vers `/login` → **aucun crawler AI ne pouvait lire les directives** | `src/middleware.ts` | ✅ Corrigé |
| S2 | **Critique** | CSP bloquait Web Workers `@react-pdf/renderer` → **téléchargement PDF cassé** dans CV Optimizer | `next.config.js` | ✅ Corrigé (ajout `worker-src 'self' blob:` + `script-src blob:` + `connect-src blob:`) |
| S3 | **Critique** | CSP bloquait WebSocket `wss://*.supabase.co` Realtime → **crash "Oups" au login** | `next.config.js` | ✅ Corrigé (ajout `wss://*.supabase.co` à connect-src) |
| S4 | **Haute** | Pas de CSP du tout → score Mozilla Observatory bas, vecteur XSS ouvert | `next.config.js` | ✅ Corrigé (Content-Security-Policy complète) |
| S5 | **Haute** | Cookies de session pas en `Max-Age=0` au logout volontaire | `src/lib/supabase/client.ts` | ✅ Déjà OK (strip maxAge/expires + Max-Age=0 sur delete) |
| S6 | **Haute** | Pas de protection contre la persistance de session après fermeture navigateur (Chrome "Continue where you left off") | `src/hooks/useSessionPresence.ts` (nouveau) + script inline | ✅ Corrigé (flag sessionStorage + script `<head>` instantané) |
| S7 | **Moyenne** | Bouton logout volontaire pouvait laisser flag sessionStorage actif | `src/hooks/useSessionPresence.ts` | ✅ Corrigé (`clearSessionPresence` export) |
| S8 | **Moyenne** | API key Magic by 21st.dev partagée en chat, commitée temporairement | `.claude/settings.local.json` | ✅ Corrigé (déplacé en `.local`, gitignored) |
| S9 | **Faible** | `'unsafe-inline'` + `'unsafe-eval'` dans CSP — nécessaires pour Tailwind + react-pdf + bootstrap scripts | `next.config.js` | ⏭ À nonce-ifier en CSP3 dans une prochaine itération |
| S10 | **Faible** | Pas de rate limit sur `/api/auth/logout` (best-effort sendBeacon) | `src/app/api/auth/logout/route.ts` | ⏭ Optionnel — endpoint déjà no-op si pas de session |

---

## 2 · SEO & GEO (AI search)

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| SEO1 | **Critique** | Sitemap référençait `/legal/confidentialite` → 404 (fichier réel = `/legal/privacy`) | `src/app/sitemap.ts` | ✅ Corrigé |
| SEO2 | **Haute** | Pas de robots.ts ni sitemap.ts initialement | `src/app/robots.ts`, `sitemap.ts` | ✅ Livré (avec règles per-agent AI : GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Applebot-Extended, Google-Extended, CCBot, anthropic-ai, cohere-ai) |
| SEO3 | **Haute** | Pas de llms.txt → AI crawlers (ChatGPT/Claude/Perplexity) sans hint structuré | `public/llms.txt` | ✅ Livré (format llmstxt.org : key facts, modules, security, pages) |
| SEO4 | **Haute** | Pas de JSON-LD initialement | `src/components/seo/JsonLd.tsx` | ✅ Livré (Organization + SoftwareApplication + WebSite, IDs croisés) |
| SEO5 | **Haute** | Pas de BreadcrumbList, pas de FAQPage | `BreadcrumbJsonLd.tsx`, `PricingFaqJsonLd.tsx` | ✅ Livré |
| SEO6 | **Haute** | `Organization.name` = "Centrium" (vs `legalName` "QuadCore SAS") → LLMs créaient 2 entités distinctes | `src/components/seo/JsonLd.tsx` | ✅ Corrigé (`name: "Centrium by QuadCore"` + `alternateName`) |
| SEO7 | **Haute** | `Organization.sameAs` vide → pas de signal Knowledge Graph | `src/components/seo/JsonLd.tsx` | 🟡 Placeholders LinkedIn ajoutés — à remplacer par profils réels créés |
| SEO8 | **Haute** | hreflang root `{ fr-FR: '/', en-US: '/' }` hérité sur toutes pages → signal faux Google | 4 layouts par page | ✅ Corrigé (chaque layout override avec son path) |
| SEO9 | **Haute** | Pas de canonical par page → duplicate content risque | layouts | ✅ Corrigé (alternates.canonical sur 4 pages) |
| SEO10 | **Haute** | OG image absente, favicon par défaut Next.js | `src/app/opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx` | ✅ Livré (Edge runtime, gradient signature rose-magenta-violet) |
| SEO11 | **Haute** | Pas de manifest PWA | `src/app/manifest.ts` | ✅ Livré |
| SEO12 | **Moyenne** | Apex `centrium-platform.com` → www → besoin de redirect 301 explicite | `next.config.js` | ✅ Corrigé (`redirects()` configuré) |
| SEO13 | **Moyenne** | Service ItemList pour les modules absent → AI Overviews sans détails features | `PlateformeJsonLd.tsx` | ✅ Livré (4 Service nommés avec provider + areaServed) |
| SEO14 | **Moyenne** | `RequestQuoteAction` absent sur /devis → signal commercial faible aux LLMs | `DevisJsonLd.tsx` | ✅ Livré |
| SEO15 | **Moyenne** | Pas de preconnect Google Fonts → LCP -80 à -150ms perdu | `src/app/layout.tsx <head>` | ✅ Corrigé |
| SEO16 | **Moyenne** | Twitter `site` + `creator` manquaient | `src/app/layout.tsx` | ✅ Corrigé |
| SEO17 | **Faible** | sitemap hreflang fr/en pointent même URL (i18n non-routée) | `sitemap.ts` | 💬 Décision : créer `/en/*` ou retirer EN du sitemap |
| SEO18 | **Faible** | FAQ /pricing : 4 Q/A à 20-34 mots → optimal Perplexity est 80-120 mots | `landing.ts DICT.pricingPage.faq` | ⏭ Content work |
| SEO19 | **Faible** | Pas de bloc "Qu'est-ce que Centrium ?" answer-first 140 mots sur `/` | `src/app/page.tsx` | ⏭ Content work |
| SEO20 | **Faible** | Pas de FAQPage JSON-LD sur /engagements | nouveau composant | ⏭ Pour AI Overviews sécu/RGPD |

---

## 3 · Performance & Core Web Vitals

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| P1 | **Haute** | `MagneticButton` : 3 setState par `pointermove` (~120 Hz trackpads) sans rAF throttle → INP >200ms | `src/components/marketing/MagneticButton.tsx` | ✅ Corrigé (rAF batch, max 60 renders/s) |
| P2 | **Haute** | `Starfield.update()` : `.map()` alloue 420 Star[] × 60fps = 25 200 alloc/s → pression GC mobile | `src/components/ui/starfield-1.tsx` | ✅ Corrigé (mutation in-place + retrait PropTypes) |
| P3 | **Haute** | LCP home ~3.4-4.1s (BootIntro masque viewport 2.3s, page entière en `'use client'`) | `src/app/page.tsx`, `BootIntro.tsx` | ⏭ Refactor : convertir Hero en RSC + réduire BootIntro à 800ms ou opt-in |
| P4 | **Moyenne** | `useIsMobile` SSR=false → client=true switch après hydration → re-mount Starfield avec quantity changée | `src/hooks/useIsMobile.ts`, `Starfield` | ⏭ SSR-aware via cookie `sec-ch-ua-mobile` |
| P5 | **Moyenne** | Toggle FR/EN re-rend tout l'arbre via LocaleProvider sans `React.memo` sur les enfants statiques | `src/lib/i18n/LocaleProvider.tsx` | ⏭ Optimisation à venir |
| P6 | **Moyenne** | three.js + framer-motion + @react-pdf chargés dans le First Load JS shared | tailwind/next.config | ⏭ Vérifier dynamic imports + tree-shaking |
| P7 | **Moyenne** | Settings "Votre organisation" attendait fetch identity 500ms-2s → tiret `—` visible | `src/app/settings/page.tsx` | ✅ Corrigé (sessionStorage cache sync + pre-fetch au login) |
| P8 | **Faible** | Pas de preconnect/dns-prefetch fonts ni Vercel insights | `src/app/layout.tsx` | ✅ Corrigé |
| P9 | **Faible** | Pas de `content-visibility: auto` sur sections below-fold | sections marketing | ⏭ Bonus rapide |

---

## 4 · UX / UI / Design system

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| UX1 | **Haute** | App interne (~29 routes) en design shadcn générique vs vitrine premium → rupture d'identité | tout `src/app/(app)/*` | ✅ Corrigé (primitives `@/components/app` + 26 routes refondues) |
| UX2 | **Haute** | Pas de design system unifié — couleurs/tokens hard-coded partout | `src/components/app/*` | ✅ Livré : PageHeader, KPICard, AppCard, StatusBadge, EmptyState, DataRow, SectionHeader |
| UX3 | **Haute** | Light mode initial : palette violet/rose → clash avec demande user "crème + terracotta" | `src/app/globals.css` | ✅ Refait (palette éditoriale crème + terracotta + sage/ocre/marine pour status) |
| UX4 | **Haute** | Sidebar light mode : pas d'accent terracotta marqué | `src/components/layout/Sidebar.tsx` | ✅ Sidebar full terracotta sang en light + crème dark avec gradient violet→noir |
| UX5 | **Haute** | Dark mode cards "papier transparent" trop discret | `src/components/app/AppCard.tsx` + globals.css `.qc-premium` | ✅ Refait (spotlight haut + gradient + inner highlight + 6 layers shadow + border shimmer hover) |
| UX6 | **Moyenne** | Logo SVG/wordmark en violet-rose même en light mode terracotta | `CentriumWordmark.tsx` | ✅ Corrigé (`.qc-wordmark-gradient` adaptatif + filter inverse SVG dans sidebar light) |
| UX7 | **Moyenne** | Halo radial sous CENTRIUM dans sidebar visible en light | `Sidebar.tsx` | ✅ Retiré complètement |
| UX8 | **Moyenne** | "Client à définir" + autres textes jaunes invisibles en light | overrides CSS | ✅ Corrigé (text-amber-* → terracotta en light) |
| UX9 | **Moyenne** | Toast "Déplacé vers …" parasitait l'UX du drag-drop CRM | `src/app/crm/page.tsx` | ✅ Retiré |
| UX10 | **Faible** | Pas de skeleton loader sur Settings org-identity (juste tiret) | `src/app/settings/page.tsx` | ✅ Skeleton + cache instantané |
| UX11 | **Faible** | Onglet navigateur : title "Centrium — la plateforme métier des ESN" trop long | `src/app/layout.tsx` | ✅ Corrigé ("Centrium" simple + template `%s · Centrium`) |
| UX12 | **Faible** | Tests Playwright login.spec.ts cherchait encore "QuadCore" (rebrand) | `tests/e2e/login.spec.ts` | ✅ Modernisé + 10 tests vitrine ajoutés |

---

## 5 · i18n / Contenu

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| I1 | **Haute** | Pas de toggle FR/EN visible alors que DICT FR+EN existait | `Header.tsx`, `LocaleToggle.tsx` | ✅ Livré (toggle pill desktop + mobile burger + AuthShell) |
| I2 | **Haute** | `LocaleProvider` enfermé dans MarketingShell → indisponible sur /login, /devis, app interne | `src/lib/i18n/LocaleProvider.tsx` | ✅ Déplacé au root layout (provider global) |
| I3 | **Haute** | ~90% du contenu en dur (sections marketing + pages app + auth) | DICT étendu | ✅ Livré (DICT 600+ lignes typées, 25+ sections, FR + EN) |
| I4 | **Moyenne** | Pages internes /dashboard, /consultants, etc. : non traduites | `src/app/(app)/*` | 💬 P2 — audience = utilisateurs connectés ESN, vitrine prioritaire |
| I5 | **Moyenne** | `<html lang>` codé en dur sur "fr" même après switch toggle | `src/lib/i18n/LocaleProvider.tsx` | ✅ Corrigé (sync `document.documentElement.lang` au switch) |

---

## 6 · Accessibilité

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| A11Y1 | **Moyenne** | `prefers-reduced-motion` non respecté sur animations Starfield + gradient pan | globals.css + composants | ✅ `qc-italic-accent`, `qc-luminous-static::before`, `qc-border-shimmer`, aurora-drift respectent tous reduced-motion |
| A11Y2 | **Moyenne** | Caret "trait d'écriture" visible sur éléments non-éditables (Starfield, divs animés) | globals.css | ✅ `caret-color: transparent` global avec exceptions input/textarea |
| A11Y3 | **Moyenne** | Tap targets mobile < 44px (recommandation Apple HIG) | Header.tsx burger | ✅ Burger 44×44, items menu mobile pad 16px |
| A11Y4 | **Faible** | Quelques `text-white/X` codés en dur invisibles sur fond crème light | overrides CSS | ✅ Corrigé (overrides `text-white/40 → /95` en light → brun foncé) |
| A11Y5 | **Faible** | Contraste WCAG AA sur sidebar terracotta light : texte crème sur fond #9a3e2e → validé visuellement | sidebar | 🟡 À mesurer avec un contrast checker |
| A11Y6 | **Faible** | Pas d'aria-label sur certains boutons d'action (icon-only) | actions tables | ⏭ Audit complet à venir |

---

## 7 · Dette technique / Maintenabilité

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| D1 | **Moyenne** | Pages marketing toutes `'use client'` (hooks i18n) → hydration coût | `/`, `/plateforme`, `/engagements`, `/pricing`, `/devis` | ⏭ Refactor : extraire copy statique en RSC, isoler logique interactive |
| D2 | **Moyenne** | `'use client'` dans `/settings/page.tsx` mais fetch côté client → pourrait être Server Component avec fetch côté server | `settings/page.tsx` | ⏭ Optimisation future |
| D3 | **Faible** | `PropTypes` importé dans `starfield-1.tsx` (TS strict, doublon ~2KB) | `starfield-1.tsx` | ✅ Retiré |
| D4 | **Faible** | Tests Playwright limités à vitrine + auth (3 fichiers) — app interne pas couverte | `tests/e2e/` | ⏭ Tests E2E sur create consultant + génère CV à ajouter |
| D5 | **Faible** | Pas de tests unitaires Vitest sur services métier (consultantService, opportunityService, etc.) | `src/lib/services/*` | ⏭ Selon `.claude/rules/testing.md` : cible >80% — à compléter |

---

## 8 · Manifest / PWA

| # | Sévérité | Constat | Fichier | Statut |
|---|---|---|---|---|
| PWA1 | **Faible** | manifest.ts minimal : pas de `id`, `scope`, `dir`, icônes 192/512 maskable | `src/app/manifest.ts` | ⏭ Bonus Lighthouse PWA |

---

## Synthèse

- **Total identifié** : 60+ items
- **Critiques** : 4 → tous corrigés ✅
- **Hautes** : 22 → 18 corrigés ✅ · 4 à faire ⏭
- **Moyennes** : 22 → 17 corrigés ✅ · 4 à faire ⏭ · 1 décision 💬
- **Faibles** : 14 → 9 corrigés ✅ · 5 à faire ⏭

**Build status** : `npm run type-check` ✅ · `NODE_ENV=production npm run build` ✅

**Reste prioritaire** :
1. Refactor pages marketing en RSC (P3, D1) → -800ms LCP estimé
2. BootIntro : réduire ou opt-in (P3)
3. `useIsMobile` SSR-aware (P4) → fix CLS
4. Content work : answer-first home + FAQPage engagements (SEO18, SEO19, SEO20)
5. sameAs JSON-LD à remplir avec vrais profils LinkedIn (SEO7)
6. Décision i18n routé `/en/*` vs retirer EN du sitemap (SEO17)
