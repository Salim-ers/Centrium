/**
 * Moteur de scoring multi-critères consultant ↔ mission.
 *
 * 7 composants pondérés (total 100 pts) :
 *   - Skills requis : 50 pts (continu, valorise niveau + années + criticité)
 *   - Skills nice-to-have : 10 pts (bonus pur)
 *   - Séniorité alignée : 12 pts (gap ordinal)
 *   - Disponibilité : 12 pts (status + available_from vs start_date)
 *   - TJM fit : 8 pts (fourchette respectée)
 *   - Langues : 5 pts (heuristique sur description offre)
 *   - Localisation : 3 pts (city/mobility)
 *
 * Hard-gates appliqués APRÈS sommation :
 *   - Indisponible → score ≤ 25
 *   - Gap séniorité ≥ 4 → score ≤ 40
 *   - Moins de 20% skills requis matchés → score ≤ 35
 *
 * Le scoring est 100% local et déterministe (testable en isolation, pas de LLM).
 */

import type {
  Consultant,
  ConsultantSkill,
  JobOffer,
  Language,
  SeniorityLevel,
} from '@/types';
import { normalizeSkill, normalizeSkillList, type NormalizedSkill } from './normalize';

const SENIORITY_ORDER: Record<SeniorityLevel, number> = {
  junior: 1,
  confirmed: 2,
  senior: 3,
  expert: 4,
  lead: 5,
  architect: 6,
};

export type ScoreBreakdown = {
  /** Score final 0-100 (après hard-gates). */
  score: number;
  /** Recommandation finale. */
  recommendation: 'recommend' | 'maybe' | 'not_recommended';
  /** Confiance globale du matching local. */
  confidence: 'high' | 'medium' | 'low';
  /** Skills raw du consultant qui matchent l'offre (forme originale offre). */
  matchedSkills: string[];
  /** Skills requis non couverts par le consultant (forme originale offre). */
  missingSkills: string[];
  /** Détail des 7 composants. */
  components: {
    skillsRequired: { points: number; max: 50; ratio: number };
    skillsNice: { points: number; max: 10; ratio: number };
    seniority: { points: number; max: 12; gap: number };
    availability: { points: number; max: 12; factor: number };
    dailyRate: { points: number; max: 8; factor: number };
    languages: { points: number; max: 5; factor: number };
    location: { points: number; max: 3; factor: number };
  };
  /** Hard-gates déclenchés (utile pour debug + UI). */
  gates: string[];
};

export function computeMatchingV2(
  consultant: Consultant,
  consultantSkills: ConsultantSkill[],
  offer: JobOffer,
  options?: { startDate?: Date }
): ScoreBreakdown {
  const startDate = options?.startDate
    ? options.startDate
    : offer.start_date
      ? new Date(offer.start_date)
      : new Date();

  // ─── Normalisation skills ───────────────────────────────────────────
  const consultantNorm = consultantSkills.map((s) => ({
    raw: s.name,
    norm: normalizeSkill(s.name),
    level: s.level,
    years: s.years,
    highlighted: s.is_highlighted,
  }));
  const consultantByCanon = new Map(
    consultantNorm.map((s) => [s.norm.canonical, s])
  );

  const requiredRaw = offer.required_skills ?? [];
  const niceRaw = offer.nice_to_have ?? [];
  const requiredNorm = normalizeSkillList(requiredRaw);
  const niceNorm = normalizeSkillList(niceRaw);

  // ─── 1) Skills requis (50 pts) ──────────────────────────────────────
  const matched: string[] = [];
  const missing: string[] = [];
  let requiredScore = 0;
  let requiredMax = 0;

  requiredNorm.forEach((req, idx) => {
    // Critique = premier tiers des requis (must-have)
    const isCritical = idx < Math.max(1, Math.ceil(requiredNorm.length / 3));
    const weight = isCritical ? 1.5 : 1.0;
    requiredMax += weight;

    const hit = consultantByCanon.get(req.canonical);
    if (hit) {
      const matchQuality =
        req.matchConfidence * hit.norm.matchConfidence; // 1.0 si tous deux exact
      const levelFactor = levelMultiplier(hit.level);
      const highlightBonus = hit.highlighted ? 1.05 : 1.0;
      requiredScore += matchQuality * levelFactor * highlightBonus * weight;
      matched.push(req.raw);
    } else {
      missing.push(req.raw);
    }
  });

  const requiredRatio = requiredMax > 0 ? clamp(requiredScore / requiredMax, 0, 1) : 0.5;
  const requiredPoints = requiredRatio * 50;

  // ─── 2) Nice-to-have (10 pts) ───────────────────────────────────────
  let niceMatched = 0;
  niceNorm.forEach((nice) => {
    if (consultantByCanon.has(nice.canonical)) niceMatched++;
  });
  const niceRatio = niceNorm.length > 0 ? niceMatched / niceNorm.length : 0;
  const nicePoints = niceRatio * 10;

  // ─── 3) Séniorité (12 pts) ──────────────────────────────────────────
  let seniorityPoints = 12; // neutre si pas demandé
  let seniorityGap = 0;
  if (offer.seniority && consultant.seniority) {
    const reqLevel = SENIORITY_ORDER[offer.seniority];
    const consLevel = SENIORITY_ORDER[consultant.seniority];
    seniorityGap = consLevel - reqLevel;
    let base = Math.max(0, 1 - 0.15 * Math.abs(seniorityGap));
    if (seniorityGap < 0) base *= 0.8; // sous-qualifié pénalisé plus fort
    seniorityPoints = base * 12;
  }

  // ─── 4) Disponibilité (12 pts) ──────────────────────────────────────
  const availFactor = availabilityFactor(consultant, startDate);
  const availPoints = availFactor * 12;

  // ─── 5) TJM (8 pts) ─────────────────────────────────────────────────
  const tjmFactor = dailyRateFactor(
    consultant.daily_rate_eur,
    offer.daily_rate_min,
    offer.daily_rate_max
  );
  const tjmPoints = tjmFactor * 8;

  // ─── 6) Langues (5 pts) ─────────────────────────────────────────────
  const langFactor = languageFactor(consultant.languages, offer);
  const langPoints = langFactor * 5;

  // ─── 7) Localisation (3 pts) ────────────────────────────────────────
  const locFactor = locationFactor(consultant, offer);
  const locPoints = locFactor * 3;

  // ─── Somme + hard-gates ─────────────────────────────────────────────
  let total = Math.round(
    requiredPoints + nicePoints + seniorityPoints + availPoints + tjmPoints + langPoints + locPoints
  );
  const gates: string[] = [];

  if (availFactor === 0) {
    total = Math.min(total, 25);
    gates.push('unavailable');
  }
  if (Math.abs(seniorityGap) >= 4) {
    total = Math.min(total, 40);
    gates.push('seniority-mismatch');
  }
  if (requiredNorm.length > 0 && requiredRatio < 0.2) {
    total = Math.min(total, 35);
    gates.push('skills-too-low');
  }
  total = clamp(total, 0, 100);

  const recommendation: ScoreBreakdown['recommendation'] =
    total >= 78 ? 'recommend' : total >= 55 ? 'maybe' : 'not_recommended';

  const matchedCount = matched.length;
  const confidence: ScoreBreakdown['confidence'] =
    total >= 75 && matchedCount >= 4
      ? 'high'
      : total >= 50
        ? 'medium'
        : 'low';

  return {
    score: total,
    recommendation,
    confidence,
    matchedSkills: matched,
    missingSkills: missing,
    components: {
      skillsRequired: { points: round1(requiredPoints), max: 50, ratio: round2(requiredRatio) },
      skillsNice: { points: round1(nicePoints), max: 10, ratio: round2(niceRatio) },
      seniority: { points: round1(seniorityPoints), max: 12, gap: seniorityGap },
      availability: { points: round1(availPoints), max: 12, factor: round2(availFactor) },
      dailyRate: { points: round1(tjmPoints), max: 8, factor: round2(tjmFactor) },
      languages: { points: round1(langPoints), max: 5, factor: round2(langFactor) },
      location: { points: round1(locPoints), max: 3, factor: round2(locFactor) },
    },
    gates,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function levelMultiplier(level: number | null): number {
  if (level == null) return 0.85; // neutre si pas renseigné
  if (level <= 1) return 0.6;
  if (level === 2) return 0.75;
  if (level === 3) return 0.9;
  if (level === 4) return 1.0;
  return 1.05;
}

function availabilityFactor(consultant: Consultant, startDate: Date): number {
  const today = new Date();
  const start = startDate.getTime() >= today.getTime() ? startDate : today;

  if (consultant.status === 'available') {
    if (!consultant.available_from) return 1.0;
    const af = new Date(consultant.available_from);
    return af.getTime() <= start.getTime() ? 1.0 : 0.85;
  }
  if (consultant.status === 'soon_available') {
    if (!consultant.available_from) return 0.85;
    const diffDays = (new Date(consultant.available_from).getTime() - start.getTime()) / (86400 * 1000);
    if (diffDays <= 0) return 1.0;
    if (diffDays <= 30) return 0.85;
    if (diffDays <= 60) return 0.6;
    return 0.4;
  }
  if (consultant.status === 'on_mission') {
    if (!consultant.current_mission_end) return 0.3;
    const diffDays = (new Date(consultant.current_mission_end).getTime() - start.getTime()) / (86400 * 1000);
    if (diffDays <= 0) return 0.85; // libère avant
    if (diffDays <= 30) return 0.7;
    if (diffDays <= 60) return 0.5;
    return 0.3;
  }
  // unavailable / autres
  return 0;
}

function dailyRateFactor(
  consultantRate: number | null,
  offerMin: number | null,
  offerMax: number | null
): number {
  if (consultantRate == null) return 0.7; // neutre si pas renseigné
  if (offerMin == null && offerMax == null) return 0.85; // pas pénalisant
  if (offerMax != null && consultantRate <= offerMax) {
    if (offerMin != null && consultantRate < offerMin) return 0.95; // rabais
    return 1.0;
  }
  // Au-dessus du max : décroissance linéaire jusqu'à 0 à max+50%
  if (offerMax != null) {
    const overage = (consultantRate - offerMax) / (0.5 * offerMax);
    return Math.max(0, 1 - overage);
  }
  return 0.85;
}

const LANGUAGE_REGEX: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\b(anglais|english|english\s+language)\b/i, code: 'en' },
  { pattern: /\b(allemand|german|deutsch)\b/i, code: 'de' },
  { pattern: /\b(espagnol|spanish|español)\b/i, code: 'es' },
  { pattern: /\b(italien|italian|italiano)\b/i, code: 'it' },
  { pattern: /\b(portugais|portuguese|portugu(ê|e)s)\b/i, code: 'pt' },
  { pattern: /\b(chinois|chinese|mandarin)\b/i, code: 'zh' },
  { pattern: /\b(arabe|arabic|عربي)\b/i, code: 'ar' },
];

const LANG_LEVEL_SCORE: Record<Language['level'], number> = {
  Natif: 1.0,
  Bilingue: 1.0,
  Professionnel: 0.9,
  Intermédiaire: 0.7,
  Notions: 0.4,
};

function languageFactor(consultantLanguages: Language[], offer: JobOffer): number {
  const corpus = [
    offer.description ?? '',
    ...(offer.profile_requirements ?? []),
    ...(offer.working_conditions ?? []),
  ].join(' ');
  if (!corpus.trim()) return 0.85; // pas de signal langue → neutre

  const required: string[] = [];
  for (const { pattern, code } of LANGUAGE_REGEX) {
    if (pattern.test(corpus)) required.push(code);
  }
  if (required.length === 0) return 0.85; // pas demandé explicitement

  const consultantByCode = new Map(consultantLanguages.map((l) => [l.code.toLowerCase(), l]));
  const scores = required.map((code) => {
    const hit = consultantByCode.get(code);
    // Fallback 0 si language level inconnu (données legacy / autre niveau)
    return hit ? (LANG_LEVEL_SCORE[hit.level] ?? 0) : 0;
  });
  return scores.reduce((s, x) => s + (x ?? 0), 0) / scores.length;
}

/** Strip accents pour comparaison ville/région insensible aux diacritiques. */
function stripAccents(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

function locationFactor(consultant: Consultant, offer: JobOffer): number {
  // 100% remote → toujours OK
  if (offer.remote_days != null && offer.remote_days >= 5) return 1.0;

  const offerLoc = stripAccents((offer.location ?? '').toLowerCase().trim());
  const cCity = stripAccents((consultant.city ?? '').toLowerCase().trim());
  if (!offerLoc || !cCity) return 0.7; // pas de signal → neutre

  // Match ville exact (insensible aux accents)
  if (offerLoc.includes(cCity) || cCity.includes(offerLoc)) return 1.0;

  // Mobilité déclarée → bonus (comparaison sans accents)
  const mobility = stripAccents((consultant.mobility ?? '').toLowerCase());
  if (mobility.includes('france') || mobility.includes('national') || mobility.includes('europe')) return 0.85;
  if (mobility.includes('idf') || mobility.includes('ile-de-france')) {
    const isIdf = ['paris', 'idf', 'ile-de-france', '92', '93', '94', '95'].some((kw) =>
      offerLoc.includes(kw),
    );
    if (isIdf) return 0.9;
  }

  // Forte distance présumée sans mobilité
  return 0.4;
}
