// =========================================================================
// Fiche de poste — modèle de vue + plan de densité (moteur React-PDF)
// -------------------------------------------------------------------------
// Ce module est PUR (aucune dépendance React/react-pdf) → testable en
// isolation par Vitest. Il transforme un `JobOffer` (schéma DB, souvent
// partiellement rempli et rétro-compatible) en un modèle prêt à rendre,
// puis calcule un « plan de densité » qui garantit une tenue sur UNE page
// A4 sans troncature silencieuse : au lieu de mesurer le DOM après coup
// (impossible avec React-PDF), on estime la charge de contenu AVANT le
// rendu et on choisit un palier (spacings / tailles de police / plafonds)
// qui rentre. La garantie « 1 page » est vérifiée par un vrai test de
// rendu (renderToBuffer → comptage des pages du PDF).
//
// PRINCIPE ABSOLU : UNKNOWN ≠ INVENTION. Toute donnée absente est masquée
// (cellule retirée du grid), jamais remplacée par « — » ni inventée.
// =========================================================================

import type { JobOffer } from '@/types';

export type PosterLocale = 'fr' | 'en';

// ── Normalisation typographique sûre ────────────────────────────────────
// React-PDF rend du texte brut (pas de HTML/CSS) → aucune injection
// possible ; on se contente d'un nettoyage conservateur qui ne casse ni
// les décimales (1.5), ni les slashs (JIRA/XRAY), ni les plages (450-550).
export function tidy(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\s+([,;:!?»%])/g, '$1') // pas d'espace AVANT ponctuation
    .replace(/«\s+/g, '« ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Variante mono-ligne : les retours deviennent des espaces (titres, labels). */
export function tidyInline(s: string | null | undefined): string {
  return tidy(s).replace(/\n+/g, ' ').trim();
}

// ── Libellés statiques bilingues ────────────────────────────────────────
export function getPosterLabels(isEn: boolean) {
  return isEn
    ? {
        kicker: 'JOB POSTING',
        bannerLocation: 'LOCATION',
        bannerWorkMode: 'WORK MODE',
        bannerStart: 'START',
        bannerExperience: 'EXPERIENCE',
        onsite: 'On-site',
        remote: 'Full remote',
        hybrid: 'Hybrid',
        startAsap: 'ASAP',
        startImmediate: 'Immediate',
        startTbd: 'To be agreed',
        durationMonths: (m: number) => (m === 1 ? '1 month' : `${m} months`),
        rateLabel: 'Day rate',
        rateUnit: '/ day',
        conditionsType: 'Type',
        conditionsDuration: 'Duration',
        conditionsStart: 'Start',
        sec01: 'Context',
        sec02: 'Mission purpose',
        sec02Label: 'MISSION PURPOSE',
        sec03Both: 'Main missions & profile',
        sec03MissionsOnly: 'Main missions',
        sec03ProfileOnly: 'Profile required',
        sec03ColMissions: 'Missions',
        sec03ColProfile: 'Profile required',
        sec04: 'Tech environment',
        sec05: 'Working conditions',
        pageOf: (a: number, b: number) => `Page ${a} / ${b}`,
      }
    : {
        kicker: 'FICHE DE POSTE',
        bannerLocation: 'LOCALISATION',
        bannerWorkMode: 'MODE DE TRAVAIL',
        bannerStart: 'DÉMARRAGE',
        bannerExperience: 'EXPÉRIENCE',
        onsite: 'Sur site',
        remote: 'Full remote',
        hybrid: 'Hybride',
        startAsap: 'ASAP',
        startImmediate: 'Immédiat',
        startTbd: 'À convenir',
        durationMonths: (m: number) => (m === 1 ? '1 mois' : `${m} mois`),
        rateLabel: 'TJM',
        rateUnit: '/ jour',
        conditionsType: 'Type',
        conditionsDuration: 'Durée',
        conditionsStart: 'Démarrage',
        sec01: 'Contexte',
        sec02: 'Finalité du poste',
        sec02Label: 'FINALITÉ DE LA MISSION',
        sec03Both: 'Missions principales & Profil',
        sec03MissionsOnly: 'Missions principales',
        sec03ProfileOnly: 'Profil recherché',
        sec03ColMissions: 'Missions',
        sec03ColProfile: 'Profil recherché',
        sec04: 'Environnement technique',
        sec05: "Conditions d'exercice",
        pageOf: (a: number, b: number) => `Page ${a} / ${b}`,
      };
}

const SENIORITY_LABEL: Record<string, { fr: string; en: string }> = {
  junior: { fr: 'Junior', en: 'Junior' },
  confirmed: { fr: 'Confirmé', en: 'Confirmed' },
  senior: { fr: 'Senior', en: 'Senior' },
  expert: { fr: 'Expert', en: 'Expert' },
  lead: { fr: 'Lead', en: 'Lead' },
  architect: { fr: 'Architecte', en: 'Architect' },
};

// ── Dérivations rétro-compatibles (anciennes fiches sans nouveaux champs) ─

/** Mode de travail : nouveau champ `work_mode` prioritaire, sinon dérivé de
 * `remote_days` (legacy). Jamais un nombre de jours inventé. */
function deriveWorkMode(offer: JobOffer, L: ReturnType<typeof getPosterLabels>): string | null {
  const mode = offer.work_mode ?? null;
  if (mode === 'onsite') return L.onsite;
  if (mode === 'remote') return L.remote;
  if (mode === 'hybrid') return L.hybrid;
  if (mode === 'custom') return tidyInline(offer.work_mode_detail) || L.hybrid;
  // Legacy : on ne connaît que remote_days.
  const d = offer.remote_days;
  if (d == null) return null;
  if (d >= 5) return L.remote;
  if (d > 0) return L.hybrid;
  return L.onsite;
}

/** Démarrage : type explicite prioritaire, sinon date legacy. Jamais d'ASAP
 * inventé quand rien n'est renseigné (la cellule est simplement masquée). */
function deriveStart(
  offer: JobOffer,
  L: ReturnType<typeof getPosterLabels>,
  isEn: boolean,
): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };
  switch (offer.start_type) {
    case 'asap':
      return L.startAsap;
    case 'immediate':
      return L.startImmediate;
    case 'tbd':
      return L.startTbd;
    case 'custom':
      return tidyInline(offer.start_label) || L.startTbd;
    case 'date':
      return offer.start_date ? fmt(offer.start_date) : tidyInline(offer.start_label) || null;
    default:
      // Legacy : uniquement si une vraie date existe.
      return offer.start_date ? fmt(offer.start_date) : null;
  }
}

/** Expérience : libellé libre prioritaire, sinon le mot de séniorité
 * (« Senior »), jamais une fourchette d'années inventée. */
function deriveExperience(offer: JobOffer, isEn: boolean): string | null {
  const free = tidyInline(offer.experience_label);
  if (free) return free;
  if (offer.seniority && SENIORITY_LABEL[offer.seniority]) {
    return isEn ? SENIORITY_LABEL[offer.seniority].en : SENIORITY_LABEL[offer.seniority].fr;
  }
  return null;
}

/** TJM : masqué par défaut (`show_rate` absent → false). N'affiche RIEN quand
 * désactivé (pas de « non communiqué »). */
function deriveRate(offer: JobOffer, L: ReturnType<typeof getPosterLabels>): string | null {
  if (!(offer.show_rate ?? false)) return null;
  const min = offer.daily_rate_min ?? null;
  const max = offer.daily_rate_max ?? null;
  if (min == null && max == null) return null;
  const fmt = (n: number) => `${Math.round(n)}`;
  const range =
    min != null && max != null && max !== min
      ? `${fmt(min)} – ${fmt(max)}`
      : fmt((min ?? max) as number);
  return `${L.rateLabel} : ${range} € HT ${L.rateUnit}`;
}

export type BannerCell = { label: string; value: string };

export type PosterModel = {
  isEn: boolean;
  L: ReturnType<typeof getPosterLabels>;
  brandName: string;
  documentLabel: string;
  title: string;
  metaLine: string;
  banner: BannerCell[];
  contextText: string;
  purposeText: string;
  missions: string[];
  profile: string[];
  tech: string[];
  /** Conditions libres (working_conditions) OU recap structuré si vide. */
  conditions: string[];
  showBoth: boolean;
  sec03Title: string;
  rateText: string | null;
};

/**
 * Construit le modèle de vue à partir d'une offre. `caps` (issus du plan de
 * densité) plafonnent longueurs et nombre d'items — appliqué en DERNIER,
 * après priorisation, jamais silencieusement au milieu d'une phrase.
 */
export function buildPosterModel(
  offer: JobOffer,
  locale: PosterLocale,
  caps: FitCaps,
): PosterModel {
  const isEn = locale === 'en';
  const L = getPosterLabels(isEn);

  const clamp = (s: string, max: number) =>
    s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

  const contextText = clamp(tidy(offer.context || offer.description || ''), caps.contextMax);
  const purposeText = offer.mission_purpose ? clamp(tidy(offer.mission_purpose), caps.purposeMax) : '';

  const missions = (offer.tasks?.length ? offer.tasks : [])
    .map((t) => tidyInline(t))
    .filter(Boolean)
    .slice(0, caps.maxMissions)
    .map((t) => clamp(t, caps.bulletMax));

  // profile_requirements > required_skills (fallback anciens AO)
  const profileSource = offer.profile_requirements?.length
    ? offer.profile_requirements
    : offer.required_skills?.length
      ? offer.required_skills
      : [];
  const profile = profileSource
    .map((p) => tidyInline(p))
    .filter(Boolean)
    .slice(0, caps.maxProfile)
    .map((p) => clamp(p, caps.bulletMax));

  const tech = (offer.tech_stack?.length ? offer.tech_stack : (offer.required_skills ?? []))
    .map((t) => tidyInline(t))
    .filter(Boolean)
    .slice(0, caps.maxTech);

  // ── Bandeau : uniquement les cellules réellement renseignées ──
  const workMode = deriveWorkMode(offer, L);
  const start = deriveStart(offer, L, isEn);
  const experience = deriveExperience(offer, isEn);
  const location = tidyInline(offer.location);
  const banner: BannerCell[] = [
    location ? { label: L.bannerLocation, value: location } : null,
    workMode ? { label: L.bannerWorkMode, value: workMode } : null,
    start ? { label: L.bannerStart, value: start } : null,
    experience ? { label: L.bannerExperience, value: experience } : null,
  ].filter((c): c is BannerCell => c !== null);

  // ── Ligne meta du hero (type • lieu • mode • durée), sans redondance de F/H ──
  const durationLabel = offer.duration_months ? L.durationMonths(offer.duration_months) : null;
  const contractLabel = tidyInline(offer.contract_kind);
  const metaLine = [contractLabel || null, location || null, workMode, durationLabel]
    .filter(Boolean)
    .join('  •  ');

  const rateText = deriveRate(offer, L);

  // ── Conditions (section 05) : free-text si fourni (compat), sinon recap ──
  let conditions: string[];
  const freeConditions = (offer.working_conditions?.length ? offer.working_conditions : [])
    .map((c) => tidyInline(c))
    .filter(Boolean);
  if (freeConditions.length > 0) {
    conditions = freeConditions.slice(0, caps.maxConditions).map((c) => clamp(c, caps.bulletMax));
    if (rateText && conditions.length < caps.maxConditions) conditions.push(rateText);
  } else {
    // Recap structuré (Type • Durée / Démarrage / TJM) — n'affiche que le connu.
    conditions = [
      [contractLabel ? `${L.conditionsType} : ${contractLabel}` : null, durationLabel ? `${L.conditionsDuration} : ${durationLabel}` : null]
        .filter(Boolean)
        .join('   •   ') || null,
      start ? `${L.conditionsStart} : ${start}` : null,
      rateText,
    ].filter((c): c is string => Boolean(c));
  }

  const showBoth = missions.length > 0 && profile.length > 0;
  const sec03Title = showBoth
    ? L.sec03Both
    : missions.length > 0
      ? L.sec03MissionsOnly
      : L.sec03ProfileOnly;

  return {
    isEn,
    L,
    brandName: '',
    documentLabel: L.kicker,
    title: tidyInline(offer.title) || (isEn ? 'Untitled position' : 'Poste sans intitulé'),
    metaLine,
    banner,
    contextText,
    purposeText,
    missions,
    profile,
    tech,
    conditions,
    showBoth,
    sec03Title,
    rateText,
  };
}

// =========================================================================
// PLAN DE DENSITÉ — garantie « 1 page A4 »
// -------------------------------------------------------------------------
// On estime une « charge » de contenu (unités pondérées) puis on choisit un
// palier de 0 (aéré) à 3 (dense). Le palier module spacings, tailles de
// police et interlignes DANS DES LIMITES LISIBLES, et fixe les plafonds de
// contenu. Ordre de priorité en cas de manque de place (section 20) : on
// rogne d'abord les éléments secondaires (conditions, tech), jamais
// l'intitulé, la finalité, les missions ni les compétences.
// =========================================================================

export type FitTier = 0 | 1 | 2 | 3;

export type FitCaps = {
  contextMax: number;
  purposeMax: number;
  bulletMax: number;
  maxMissions: number;
  maxProfile: number;
  maxConditions: number;
  maxTech: number;
};

export type FitPlan = {
  tier: FitTier;
  /** Échelle globale des espacements (1 = aéré). */
  scale: number;
  fontBase: number;
  bulletFont: number;
  bannerValueFont: number;
  lineHeight: number;
  bulletLineHeight: number;
  titleFont: number;
  caps: FitCaps;
};

const CAPS_BY_TIER: Record<FitTier, FitCaps> = {
  0: { contextMax: 460, purposeMax: 260, bulletMax: 150, maxMissions: 7, maxProfile: 7, maxConditions: 5, maxTech: 8 },
  1: { contextMax: 520, purposeMax: 280, bulletMax: 150, maxMissions: 7, maxProfile: 7, maxConditions: 5, maxTech: 9 },
  2: { contextMax: 560, purposeMax: 300, bulletMax: 140, maxMissions: 7, maxProfile: 7, maxConditions: 4, maxTech: 10 },
  3: { contextMax: 560, purposeMax: 280, bulletMax: 130, maxMissions: 7, maxProfile: 7, maxConditions: 4, maxTech: 10 },
};

const STYLE_BY_TIER: Record<FitTier, Omit<FitPlan, 'tier' | 'titleFont' | 'caps'>> = {
  0: { scale: 1.0, fontBase: 9.5, bulletFont: 9, bannerValueFont: 9.5, lineHeight: 1.45, bulletLineHeight: 1.4 },
  1: { scale: 0.9, fontBase: 9, bulletFont: 8.6, bannerValueFont: 9, lineHeight: 1.38, bulletLineHeight: 1.34 },
  2: { scale: 0.8, fontBase: 8.6, bulletFont: 8.2, bannerValueFont: 8.6, lineHeight: 1.3, bulletLineHeight: 1.28 },
  3: { scale: 0.72, fontBase: 8.2, bulletFont: 7.9, bannerValueFont: 8.2, lineHeight: 1.24, bulletLineHeight: 1.22 },
};

/** Estime la charge de contenu (unités abstraites) d'une offre brute. */
export function estimateLoad(offer: JobOffer): number {
  const len = (s: string | null | undefined) => (s ? s.length : 0);
  const arr = (a: string[] | null | undefined) => (a?.length ? a : []);
  const ctx = len(offer.context || offer.description);
  const purpose = len(offer.mission_purpose);
  const missions = arr(offer.tasks).length;
  const profile = arr(offer.profile_requirements).length || arr(offer.required_skills).length;
  const tech = arr(offer.tech_stack).length || arr(offer.required_skills).length;
  const conditions = arr(offer.working_conditions).length;

  return (
    (ctx / 300) * 2.1 +
    (purpose / 220) * 1.3 +
    missions * 1.05 +
    profile * 1.05 +
    conditions * 0.85 +
    (tech > 0 ? 1 : 0) +
    (tech > 7 ? 1 : 0)
  );
}

/** Choisit le palier de densité qui tient sur une page. */
export function computeFitPlan(offer: JobOffer): FitPlan {
  const load = estimateLoad(offer);
  // Seuils calibrés empiriquement (cf. test de rendu 1-page sur les fixtures).
  const tier: FitTier = load <= 12 ? 0 : load <= 16.5 ? 1 : load <= 21 ? 2 : 3;
  const caps = CAPS_BY_TIER[tier];
  const style = STYLE_BY_TIER[tier];

  // Taille du titre : adaptative à la longueur ET au palier, 2 lignes max.
  const titleLen = tidyInline(offer.title).length;
  let titleFont = titleLen > 74 ? 12.5 : titleLen > 52 ? 14 : titleLen > 36 ? 15.5 : 17;
  if (tier >= 2) titleFont -= 1;
  if (tier >= 3) titleFont -= 0.5;

  return { tier, titleFont, caps, ...style };
}
