// =========================================================================
// Matching IA — moteur déterministe et expliqué (v3).
//
// Score sur 100, en six critères :
//   Compétences clés ......... 40  obligatoires, optionnelles et langues ;
//                                  preuve : compétence saisie (niveau),
//                                  équivalence, certification, expérience
//   Expérience ............... 20  séniorité, années sur les technos clés,
//                                  cohérence du parcours avec le besoin
//   Disponibilité ............ 15  date réelle de libération vs démarrage
//   Localisation / mobilité .. 10  ville, mobilité déclarée, sur site /
//                                  hybride / télétravail
//   Budget / TJM ............. 10  TJM du profil vs budget du besoin
//   Bonus mission similaire ..  5  client déjà servi, expérience proche
//
// Plafonds affichés avec le score : couverture des exigences obligatoires
// (aucune → 20, < 25 % → 30, < 50 % → 49, < 75 % → 64, une absente ou à
// confirmer → 79 : pas de « très bon match » sans tout couvrir) ;
// indisponible → 30 ; séniorité deux niveaux en dessous → 69, trois ou
// plus → 50. Un critère sans
// donnée reçoit une note neutre et est signalé « non évalué » : rien n'est
// supposé ni inventé.
// =========================================================================

import { normalizeSkill as normalizeSkillRaw, type NormalizedSkill } from '@/lib/ai/matching/normalize';
import { findEquivalence } from '@/lib/ai/matching/equivalences';
import { dayDiff } from '@/lib/utils/dates';
import { containsWord, fold, languageName } from '@/lib/utils/text';
import type { Certification, Language, SeniorityLevel } from '@/types';

type T = { fr: string; en: string };
/** Texte affiché ; `redacted` le remplace pour qui n'a pas accès aux TJM des consultants. */
export type Note = T & { redacted?: T };

export type RemoteMode = 'onsite' | 'hybrid' | 'remote';

/** Le besoin : opportunité, fiche de poste ou mission. */
export type MatchNeed = {
  title: string;
  companyId: string | null;
  companyName?: string | null;
  /** Compétences obligatoires. */
  mandatory: string[];
  /** Compétences appréciées. */
  optional: string[];
  seniority: SeniorityLevel | null;
  minYears: number | null;
  /** AAAA-MM-JJ ; absent ou passé = dès que possible. */
  startDate: string | null;
  location: string | null;
  remote: RemoteMode | null;
  rateMax: number | null;
  rateMin: number | null;
  /** Codes des langues exigées (« en »). */
  languages: string[];
};

export type ProfileSkill = { name: string; level: number | null; years: number | null; is_highlighted?: boolean | null };
export type ProfileExperience = { client_name: string | null; role: string | null; start_date: string | null; end_date: string | null; environment?: string[] | null };
export type ProfileMission = { company_id: string | null; title: string | null; start_date: string | null; end_date: string | null; status: string | null };

/** Le profil : fiche consultant et, si chargées, expériences et missions. */
export type MatchProfile = {
  id: string;
  job_title: string | null;
  seniority: SeniorityLevel | null;
  years_experience: number | null;
  status: string;
  available_from: string | null;
  current_mission_end: string | null;
  daily_rate_eur: number | null;
  city: string | null;
  mobility: string | null;
  languages: Language[] | null;
  skills: ProfileSkill[];
  certifications?: Certification[] | null;
  /** null / absent : non chargées (le bonus est alors « non évalué »). */
  experiences?: ProfileExperience[] | null;
  missions?: ProfileMission[] | null;
};

export type CriterionId = 'skills' | 'experience' | 'availability' | 'location' | 'rate' | 'bonus';

export const CRITERIA: Array<{ id: CriterionId; max: number; label: T }> = [
  { id: 'skills', max: 40, label: { fr: 'Compétences clés', en: 'Key skills' } },
  { id: 'experience', max: 20, label: { fr: 'Expérience', en: 'Experience' } },
  { id: 'availability', max: 15, label: { fr: 'Disponibilité', en: 'Availability' } },
  { id: 'location', max: 10, label: { fr: 'Localisation / mobilité', en: 'Location / mobility' } },
  { id: 'rate', max: 10, label: { fr: 'Budget / TJM', en: 'Budget / day rate' } },
  { id: 'bonus', max: 5, label: { fr: 'Bonus mission similaire', en: 'Similar mission bonus' } },
];

export type Criterion = { id: CriterionId; points: number; max: number; evaluated: boolean; detail: T; redacted?: T };

export type SkillEvidence = {
  /** Intitulé tel qu'écrit sur le besoin (langue : nom en français). */
  name: string;
  kind: 'skill' | 'language';
  /** Code de la langue (« en »), pour l'afficher dans la langue de l'interface. */
  code?: string;
  mandatory: boolean;
  status: 'matched' | 'equivalent' | 'partial' | 'missing';
  source: 'skill' | 'certification' | 'equivalence' | 'experience' | 'language' | null;
  /** Preuve lisible (« niveau 4/5 · 6 ans », « certification AWS SAA »…). */
  evidence: T | null;
  level: number | null;
  years: number | null;
  /** Crédit de 0 à 1 dans le critère « compétences clés ». */
  credit: number;
};

export type MatchVerdict = 'excellent' | 'good' | 'possible' | 'weak';

export type MatchResult = {
  score: number;
  verdict: MatchVerdict;
  criteria: Criterion[];
  skills: SkillEvidence[];
  strengths: Note[];
  gaps: Note[];
  caps: Array<{ id: 'unavailable' | 'skills' | 'seniority'; max: number; label: T }>;
  /** Critères notés au neutre faute de données. */
  notEvaluated: T[];
  // Compatibilité (alertes, tableau de bord) :
  matchedSkills: string[];
  missingSkills: string[];
  equivalentSkills: string[];
  partialSkills: Array<{ skill: string; evidence: string[] }>;
};

export const VERDICT_LABEL: Record<MatchVerdict, T> = {
  excellent: { fr: 'Très bon match', en: 'Excellent match' },
  good: { fr: 'Bon match', en: 'Good match' },
  possible: { fr: 'À étudier', en: 'Worth a look' },
  weak: { fr: 'Peu adapté', en: 'Weak match' },
};

export function verdictOf(score: number): MatchVerdict {
  return score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'possible' : 'weak';
}

const SENIORITY_ORDER: Record<SeniorityLevel, number> = { junior: 1, confirmed: 2, senior: 3, expert: 4, lead: 5, architect: 6 };
const SENIORITY_NAME: Record<SeniorityLevel, T> = {
  junior: { fr: 'Junior', en: 'Junior' },
  confirmed: { fr: 'Confirmé', en: 'Mid-level' },
  senior: { fr: 'Senior', en: 'Senior' },
  expert: { fr: 'Expert', en: 'Expert' },
  lead: { fr: 'Lead', en: 'Lead' },
  architect: { fr: 'Architecte', en: 'Architect' },
};
const LANGUAGE_LEVEL: Record<string, number> = { natif: 1, bilingue: 1, professionnel: 0.9, intermediaire: 0.6, notions: 0.25 };

// La normalisation (dictionnaire + approximation) est coûteuse : un classement
// la rappelle des milliers de fois sur les mêmes libellés.
const NORM_CACHE = new Map<string, NormalizedSkill>();
function normalizeSkill(raw: string): NormalizedSkill {
  let hit = NORM_CACHE.get(raw);
  if (!hit) {
    if (NORM_CACHE.size > 20_000) NORM_CACHE.clear();
    hit = normalizeSkillRaw(raw);
    NORM_CACHE.set(raw, hit);
  }
  return hit;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const yearsText = (n: number): T => ({ fr: `${n} an${n > 1 ? 's' : ''}`, en: `${n} yr${n > 1 ? 's' : ''}` });
const join = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' · ');
const listText = (items: string[], max = 3) => (items.length > max ? `${items.slice(0, max).join(', ')}…` : items.join(', '));

// ── Intitulés : cohérence du parcours ──────────────────────────────────

const STOPWORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'a', 'au', 'aux', 'un', 'une', 'pour', 'sur', 'h', 'f', 'hf', 'the', 'of', 'and', 'for', 'in',
  'junior', 'jr', 'confirme', 'senior', 'sr', 'expert', 'mission', 'poste', 'profil', 'freelance', 'cdi', 'consultant', 'consultante',
]);
const SYNONYMS: Record<string, string> = {
  developpeur: 'dev', developpeuse: 'dev', developer: 'dev', development: 'dev', developpement: 'dev', dev: 'dev',
  ingenieur: 'engineer', ingenieure: 'engineer', engineer: 'engineer', engineering: 'engineer',
  architecte: 'architect', architect: 'architect',
  chef: 'manager', manager: 'manager', responsable: 'manager', pilote: 'manager',
  donnees: 'data', data: 'data',
  testeur: 'qa', test: 'qa', qa: 'qa', recette: 'qa',
};

const TOKENS_CACHE = new Map<string, Set<string>>();
function titleTokens(title: string): Set<string> {
  const cached = TOKENS_CACHE.get(title);
  if (cached) return cached;
  if (TOKENS_CACHE.size > 5_000) TOKENS_CACHE.clear();
  const tokens = new Set(
    fold(title)
      .split(/[^a-z0-9+#.]+/)
      .map((t) => t.replace(/\.+$/, ''))
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
      .map((t) => SYNONYMS[t] ?? (normalizeSkill(t).canonical || t)),
  );
  TOKENS_CACHE.set(title, tokens);
  return tokens;
}

/** Similarité de deux intitulés (0 à 1, indice de Jaccard sur les mots utiles). */
export function titleSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0;
  const A = titleTokens(a);
  const B = titleTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

// ── Lieux ──────────────────────────────────────────────────────────────

const IDF = ['paris', 'ile-de-france', 'ile de france', 'idf', 'la defense', 'boulogne', 'nanterre', 'saint-denis', 'issy', 'neuilly', 'levallois', 'courbevoie', 'puteaux', 'montrouge', 'vincennes', 'versailles', 'massy', 'saclay', 'cergy', 'creteil', 'evry', 'marne-la-vallee'];
const isIdf = (place: string) => IDF.some((k) => fold(place).includes(k)) || /\b(75|77|78|91|92|93|94|95)\d{0,3}\b/.test(place);
const NATIONAL = /\b(france|national|nationale|toute la france|europe|international|partout)\b/;

function sameCity(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  if (x.length < 3 || y.length < 3) return x === y;
  return x.includes(y) || y.includes(x);
}

// ── Évaluation d'une compétence du besoin ──────────────────────────────

function evaluateSkill(raw: string, mandatory: boolean, profile: MatchProfile, norm: Array<{ s: ProfileSkill; canonical: string; confidence: number }>): SkillEvidence {
  const base = { name: raw, kind: 'skill' as const, mandatory, level: null, years: null };
  const req = normalizeSkill(raw);
  if (!req.canonical) return { ...base, status: 'missing', source: null, evidence: null, credit: 0 };

  const hit = norm.find((n) => n.canonical === req.canonical);
  if (hit) {
    const level = hit.s.level != null ? clamp(Math.round(hit.s.level), 1, 5) : null;
    const years = hit.s.years ?? null;
    const depth = level == null ? 0.9 : level <= 1 ? 0.6 : level === 2 ? 0.75 : level === 3 ? 0.9 : 1;
    const sure = req.matchConfidence * hit.confidence >= 0.8 ? 1 : 0.9;
    const alias = fold(hit.s.name) !== fold(raw) ? hit.s.name : null;
    return {
      ...base,
      status: 'matched',
      source: 'skill',
      level,
      years,
      credit: depth * sure,
      evidence: {
        fr: join([alias, level != null ? `niveau ${level}/5` : null, years ? yearsText(years).fr : null]) || 'compétence du profil',
        en: join([alias, level != null ? `level ${level}/5` : null, years ? yearsText(years).en : null]) || 'profile skill',
      },
    };
  }

  const cert = (profile.certifications ?? []).find((c) => c?.name && (containsWord(c.name, raw) || containsWord(c.name, req.canonical)));
  if (cert) {
    const label = `${cert.name}${cert.year ? ` (${cert.year})` : ''}`;
    return { ...base, status: 'matched', source: 'certification', credit: 0.9, evidence: { fr: `certification ${label}`, en: `certification ${label}` } };
  }

  const eq = findEquivalence(req.canonical, norm.map((n) => ({ canonical: n.canonical, raw: n.s.name })));
  if (eq.strength === 'full') {
    return { ...base, status: 'equivalent', source: 'equivalence', credit: 0.85, evidence: { fr: `équivalent : ${listText(eq.evidence)}`, en: `equivalent: ${listText(eq.evidence)}` } };
  }

  const exp = (profile.experiences ?? []).find((e) => (e.environment ?? []).some((t) => normalizeSkill(t).canonical === req.canonical || containsWord(t, raw)));
  if (exp) {
    const year = exp.end_date?.slice(0, 4) ?? exp.start_date?.slice(0, 4) ?? '';
    const where = join([exp.client_name, year]);
    return {
      ...base,
      status: 'partial',
      source: 'experience',
      credit: 0.6,
      evidence: { fr: `cité dans l’expérience ${where || 'du profil'}, absent des compétences`, en: `mentioned in the ${where || 'profile'} experience, not in the skills` },
    };
  }
  if (eq.strength === 'partial') {
    return { ...base, status: 'partial', source: 'equivalence', credit: 0.4, evidence: { fr: `indice : ${listText(eq.evidence)}`, en: `hint: ${listText(eq.evidence)}` } };
  }
  return { ...base, status: 'missing', source: null, evidence: null, credit: 0 };
}

function evaluateLanguage(code: string, profile: MatchProfile): SkillEvidence {
  const hit = (profile.languages ?? []).find((l) => l?.code?.toLowerCase() === code.toLowerCase());
  const credit = hit ? (LANGUAGE_LEVEL[fold(hit.level ?? '')] ?? 0.5) : 0;
  const name = languageName(code, 'fr');
  return {
    name,
    code: code.toLowerCase(),
    kind: 'language',
    mandatory: true,
    status: credit >= 0.85 ? 'matched' : credit > 0 ? 'partial' : 'missing',
    source: hit ? 'language' : null,
    evidence: hit ? { fr: `${name} : ${hit.level.toLowerCase()}`, en: `${languageName(code, 'en')}: ${hit.level.toLowerCase()}` } : null,
    level: null,
    years: null,
    credit,
  };
}

// ── Score ──────────────────────────────────────────────────────────────

export function scoreMatch(need: MatchNeed, profile: MatchProfile, options: { today?: string } = {}): MatchResult {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  // Forces et écarts, triés par importance avant d'être tronqués.
  const strengthList: Array<{ note: Note; weight: number }> = [];
  const gapList: Array<{ note: Note; weight: number }> = [];
  const addStrength = (note: Note, weight: number) => strengthList.push({ note, weight });
  const addGap = (note: Note, weight: number) => gapList.push({ note, weight });
  const notEvaluated: T[] = [];
  const caps: MatchResult['caps'] = [];

  const norm = profile.skills.map((s) => {
    const n = normalizeSkill(s.name);
    return { s, canonical: n.canonical, confidence: n.matchConfidence };
  });

  // ─── 1. Compétences clés (40) ─────────────────────────────────────
  const seen = new Set<string>();
  const unique = (list: string[]) =>
    list.filter((raw) => {
      const k = normalizeSkill(raw).canonical || fold(raw);
      if (!raw.trim() || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const skills: SkillEvidence[] = [
    ...unique(need.mandatory).map((raw) => evaluateSkill(raw, true, profile, norm)),
    ...unique(need.optional).map((raw) => evaluateSkill(raw, false, profile, norm)),
    ...[...new Set(need.languages.map((l) => l.toLowerCase()))].map((code) => evaluateLanguage(code, profile)),
  ];
  const weight = (s: SkillEvidence) => (s.mandatory ? 1 : 0.5);
  const totalWeight = skills.reduce((t, s) => t + weight(s), 0);
  const mandatory = skills.filter((s) => s.mandatory);
  const covered = mandatory.filter((s) => s.status === 'matched' || s.status === 'equivalent');
  const optional = skills.filter((s) => !s.mandatory);
  const optionalCovered = optional.filter((s) => s.status === 'matched' || s.status === 'equivalent');
  const skillsCriterion: Criterion =
    totalWeight === 0
      ? { id: 'skills', points: 20, max: 40, evaluated: false, detail: { fr: 'Aucune compétence renseignée sur le besoin', en: 'No skill listed on the requirement' } }
      : {
          id: 'skills',
          points: r1((40 * skills.reduce((t, s) => t + s.credit * weight(s), 0)) / totalWeight),
          max: 40,
          evaluated: true,
          detail: {
            fr: join([mandatory.length ? `${covered.length} obligatoire${covered.length > 1 ? 's' : ''} sur ${mandatory.length}` : null, optional.length ? `${optionalCovered.length} optionnelle${optionalCovered.length > 1 ? 's' : ''} sur ${optional.length}` : null]),
            en: join([mandatory.length ? `${covered.length} of ${mandatory.length} mandatory` : null, optional.length ? `${optionalCovered.length} of ${optional.length} optional` : null]),
          },
        };
  if (!skillsCriterion.evaluated) notEvaluated.push(skillsCriterion.detail);
  const missing = mandatory.filter((s) => s.status === 'missing');
  const partial = skills.filter((s) => s.status === 'partial');
  const partialMandatory = partial.filter((s) => s.mandatory);
  if (mandatory.length > 0 && covered.length === mandatory.length) {
    addStrength(mandatory.length > 1 ? { fr: `Couvre les ${mandatory.length} exigences obligatoires`, en: `Covers all ${mandatory.length} mandatory requirements` } : { fr: 'Couvre l’exigence obligatoire', en: 'Covers the mandatory requirement' }, 10);
  } else if (mandatory.length > 0 && covered.length / mandatory.length >= 0.7) {
    addStrength({ fr: `Couvre ${covered.length} des ${mandatory.length} exigences obligatoires`, en: `Covers ${covered.length} of ${mandatory.length} mandatory requirements` }, 9);
  }
  if (missing.length) {
    const names = missing.map((s) => (s.kind === 'language' && s.code ? languageName(s.code, 'fr') : s.name));
    addGap({ fr: `Absent du profil : ${listText(names)}`, en: `Not in the profile: ${listText(missing.map((s) => (s.kind === 'language' && s.code ? languageName(s.code, 'en') : s.name)))}` }, 10);
  }
  if (partial.length) {
    const names = partial.map((s) => s.name);
    addGap({ fr: `À confirmer : ${listText(names)}`, en: `To confirm: ${listText(names)}` }, 6);
  }
  // Une exigence obligatoire absente pèse plus que ses seuls points : plafonds
  // par paliers de couverture (une preuve « à confirmer » compte pour moitié).
  if (mandatory.length > 0) {
    const coverage = (covered.length + 0.5 * partialMandatory.length) / mandatory.length;
    const tier: { max: number; label: T } | null =
      coverage === 0
        ? { max: 20, label: { fr: 'Aucune exigence obligatoire couverte', en: 'No mandatory requirement covered' } }
        : coverage < 0.25
          ? { max: 30, label: { fr: 'Moins d’un quart des exigences obligatoires couvertes', en: 'Under a quarter of mandatory requirements covered' } }
          : coverage < 0.5
            ? { max: 49, label: { fr: 'Moins de la moitié des exigences obligatoires couvertes', en: 'Under half of mandatory requirements covered' } }
            : coverage < 0.75
              ? { max: 64, label: { fr: 'Moins des trois quarts des exigences obligatoires couvertes', en: 'Under three quarters of mandatory requirements covered' } }
              : missing.length + partialMandatory.length > 0
                ? { max: 79, label: { fr: 'Exigence obligatoire absente ou à confirmer', en: 'A mandatory requirement is missing or unconfirmed' } }
                : null;
    if (tier) caps.push({ id: 'skills', ...tier });
  }

  // ─── 2. Expérience (20) ───────────────────────────────────────────
  // 2a. Séniorité (8)
  let seniorityPts = 6;
  let seniorityEval = false;
  let seniorityDetail: T = { fr: 'Séniorité non précisée par le besoin', en: 'Seniority not specified by the requirement' };
  if (need.seniority && profile.seniority) {
    const gap = SENIORITY_ORDER[profile.seniority] - SENIORITY_ORDER[need.seniority];
    seniorityPts = gap === 0 ? 8 : gap === 1 ? 7 : gap === 2 ? 5 : gap >= 3 ? 3 : gap === -1 ? 4 : gap === -2 ? 1 : 0;
    seniorityEval = true;
    const p = SENIORITY_NAME[profile.seniority];
    const n = SENIORITY_NAME[need.seniority];
    seniorityDetail = gap === 0 ? { fr: `${p.fr}, comme demandé`, en: `${p.en}, as required` } : { fr: `${p.fr} pour un besoin ${n.fr}`, en: `${p.en} for a ${n.en} requirement` };
    if (gap === 0) addStrength({ fr: `Séniorité alignée (${p.fr})`, en: `Seniority aligned (${p.en})` }, 3);
    if (gap < 0) addGap(seniorityDetail, 8);
    if (gap <= -3) caps.push({ id: 'seniority', max: 50, label: { fr: 'Séniorité très en dessous du besoin', en: 'Seniority far below the requirement' } });
    else if (gap === -2) caps.push({ id: 'seniority', max: 69, label: { fr: 'Séniorité nettement en dessous du besoin', en: 'Seniority well below the requirement' } });
  } else if (need.minYears != null && profile.years_experience != null) {
    const ratio = profile.years_experience / Math.max(1, need.minYears);
    seniorityPts = ratio >= 1 ? 8 : ratio >= 0.75 ? 5 : ratio >= 0.5 ? 2 : 0;
    seniorityEval = true;
    seniorityDetail = { fr: `${profile.years_experience} ans d’expérience pour ${need.minYears} demandés`, en: `${profile.years_experience} years for ${need.minYears} required` };
    if (ratio < 0.75) addGap(seniorityDetail, 7);
  } else if (need.seniority || need.minYears != null) {
    seniorityPts = 4;
    seniorityDetail = { fr: 'Séniorité du profil non renseignée', en: 'Profile seniority not set' };
  }
  // 2b. Années sur les technos clés (6)
  const deep = skills.filter((s) => s.mandatory && s.kind === 'skill' && s.status === 'matched' && s.source === 'skill');
  let depthPts = mandatory.some((s) => s.kind === 'skill') ? 0 : 3;
  let avgYears: number | null = null;
  if (deep.length) {
    const withYears = deep.filter((s) => s.years != null);
    avgYears = withYears.length ? withYears.reduce((t, s) => t + (s.years ?? 0), 0) / withYears.length : null;
    const v = deep.reduce((t, s) => t + (s.years != null ? Math.min(s.years / 4, 1) : s.level != null ? (s.level / 5) * 0.8 : 0.5), 0) / deep.length;
    depthPts = 6 * v;
    const best = [...deep].sort((a, b) => (b.years ?? 0) - (a.years ?? 0) || (b.level ?? 0) - (a.level ?? 0))[0];
    if (best && ((best.years ?? 0) >= 4 || (best.level ?? 0) >= 4)) {
      const bits = { fr: join([best.years ? yearsText(best.years).fr : null, best.level ? `niveau ${best.level}/5` : null]), en: join([best.years ? yearsText(best.years).en : null, best.level ? `level ${best.level}/5` : null]) };
      addStrength({ fr: `${best.name} : ${bits.fr}`, en: `${best.name}: ${bits.en}` }, 6);
    }
  }
  // 2c. Cohérence du parcours (6)
  const roles = (profile.experiences ?? [])
    .slice()
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
    .slice(0, 3)
    .map((e) => e.role);
  const coherence = Math.max(titleSimilarity(need.title, profile.job_title), ...roles.map((r) => titleSimilarity(need.title, r) * 0.9), 0);
  const coherenceEval = !!(need.title && profile.job_title);
  const coherencePts = !coherenceEval ? 3 : coherence >= 0.5 ? 6 : coherence >= 0.25 ? 4 : coherence > 0 ? 2 : 0;
  if (coherenceEval && coherence === 0) addGap({ fr: `Parcours éloigné de l’intitulé (« ${profile.job_title} »)`, en: `Background far from the title (“${profile.job_title}”)` }, 4);
  const experienceCriterion: Criterion = {
    id: 'experience',
    points: r1(seniorityPts + depthPts + coherencePts),
    max: 20,
    evaluated: seniorityEval || deep.length > 0 || coherenceEval,
    detail: {
      fr: join([seniorityDetail.fr, avgYears != null ? `${r1(avgYears).toLocaleString('fr-FR')} an(s) en moyenne sur les technos clés` : null, coherenceEval ? (coherence >= 0.5 ? 'parcours cohérent' : coherence > 0 ? 'parcours en partie cohérent' : 'parcours éloigné') : null]),
      en: join([seniorityDetail.en, avgYears != null ? `${r1(avgYears)} yr(s) on average on key techs` : null, coherenceEval ? (coherence >= 0.5 ? 'consistent background' : coherence > 0 ? 'partly consistent background' : 'distant background') : null]),
    },
  };
  if (!seniorityEval && (need.seniority || need.minYears != null)) notEvaluated.push(seniorityDetail);

  // ─── 3. Disponibilité (15) ────────────────────────────────────────
  const start = need.startDate && need.startDate > today ? need.startDate : today;
  let availPts: number;
  let availDetail: T;
  if (profile.status === 'unavailable' || profile.status === 'archived') {
    availPts = 0;
    availDetail = { fr: 'Indisponible', en: 'Unavailable' };
    caps.push({ id: 'unavailable', max: 30, label: { fr: 'Profil indisponible', en: 'Profile unavailable' } });
    addGap(availDetail, 10);
  } else {
    const free = profile.status === 'available' ? (profile.available_from ?? today) : (profile.available_from ?? profile.current_mission_end);
    if (!free) {
      availPts = 4;
      availDetail = { fr: 'En mission, date de fin non renseignée', en: 'On mission, end date not set' };
      addGap(availDetail, 3);
    } else {
      const diff = dayDiff(start, free);
      availPts = diff <= 0 ? 15 : diff <= 15 ? 12 : diff <= 30 ? 9 : diff <= 60 ? 5 : 2;
      availDetail =
        diff <= 0
          ? need.startDate && need.startDate > today
            ? { fr: 'Disponible avant le démarrage', en: 'Available before the start' }
            : { fr: 'Disponible maintenant', en: 'Available now' }
          : need.startDate && need.startDate > today
            ? { fr: `Libre ${diff} j après le démarrage`, en: `Free ${diff} d after the start` }
            : { fr: `Libre dans ${diff} j`, en: `Free in ${diff} d` };
      if (diff <= 0) addStrength(availDetail, 8);
      else if (diff > 15) addGap(availDetail, 7);
    }
  }
  const availabilityCriterion: Criterion = { id: 'availability', points: availPts, max: 15, evaluated: true, detail: availDetail };

  // ─── 4. Localisation / mobilité (10) ──────────────────────────────
  let locPts: number;
  let locDetail: T;
  let locEval = true;
  const mobility = fold(profile.mobility ?? '');
  if (need.remote === 'remote') {
    locPts = 10;
    locDetail = { fr: 'Télétravail complet : lieu indifférent', en: 'Fully remote: location irrelevant' };
  } else if (!need.location || !profile.city) {
    locPts = 6;
    locEval = false;
    locDetail = !need.location ? { fr: 'Lieu de mission non renseigné', en: 'Mission location not set' } : { fr: 'Ville du profil non renseignée', en: 'Profile city not set' };
    notEvaluated.push(locDetail);
  } else if (sameCity(need.location, profile.city)) {
    locPts = 10;
    locDetail = { fr: `Basé à ${profile.city}, comme la mission`, en: `Based in ${profile.city}, like the mission` };
    addStrength(locDetail, 4);
  } else if (isIdf(need.location) && isIdf(profile.city)) {
    locPts = 9;
    locDetail = { fr: `${profile.city} et ${need.location} : Île-de-France`, en: `${profile.city} and ${need.location}: Paris region` };
  } else if (mobility && (NATIONAL.test(mobility) || mobility.includes(fold(need.location)) || (isIdf(need.location) && /\b(idf|ile-de-france|ile de france|paris)\b/.test(mobility)))) {
    locPts = 8;
    locDetail = { fr: `Mobilité déclarée : ${profile.mobility}`, en: `Declared mobility: ${profile.mobility}` };
    addStrength(locDetail, 4);
  } else if (need.remote === 'hybrid') {
    locPts = 4;
    locDetail = { fr: `Hybride : déplacements depuis ${profile.city}`, en: `Hybrid: commuting from ${profile.city}` };
    addGap(locDetail, 4);
  } else {
    locPts = 2;
    locDetail = { fr: `Basé à ${profile.city}, mission à ${need.location}, sans mobilité déclarée`, en: `Based in ${profile.city}, mission in ${need.location}, no declared mobility` };
    addGap(locDetail, 5);
  }
  const locationCriterion: Criterion = { id: 'location', points: locPts, max: 10, evaluated: locEval, detail: locDetail };

  // ─── 5. Budget / TJM (10) ─────────────────────────────────────────
  let ratePts: number;
  let rateDetail: T;
  let rateRedacted: T | undefined;
  let rateEval = true;
  const rate = profile.daily_rate_eur != null ? Number(profile.daily_rate_eur) : null;
  if (rate == null || need.rateMax == null) {
    ratePts = 6;
    rateEval = false;
    rateDetail = rate == null ? { fr: 'TJM du profil non renseigné', en: 'Profile day rate not set' } : { fr: 'Budget du besoin non renseigné', en: 'Requirement budget not set' };
    notEvaluated.push(rateDetail);
  } else if (rate <= need.rateMax) {
    ratePts = need.rateMin != null && rate < need.rateMin * 0.8 ? 9 : 10;
    rateDetail = { fr: `${Math.round(rate)} € pour un budget de ${Math.round(need.rateMax)} €`, en: `€${Math.round(rate)} for a €${Math.round(need.rateMax)} budget` };
    rateRedacted = { fr: 'Dans le budget', en: 'Within budget' };
    addStrength({ fr: `TJM dans le budget (${rateDetail.fr})`, en: `Day rate within budget (${rateDetail.en})`, redacted: { fr: 'TJM dans le budget', en: 'Day rate within budget' } }, 5);
  } else {
    const over = (rate - need.rateMax) / need.rateMax;
    ratePts = over <= 0.05 ? 8 : over <= 0.1 ? 6 : over <= 0.2 ? 3 : 0;
    const pct = Math.round(over * 100);
    rateDetail = { fr: `TJM ${pct} % au-dessus du budget (${Math.round(rate)} € pour ${Math.round(need.rateMax)} €)`, en: `Day rate ${pct}% over budget (€${Math.round(rate)} for €${Math.round(need.rateMax)})` };
    rateRedacted = { fr: 'TJM au-dessus du budget', en: 'Day rate over budget' };
    if (over > 0.05) addGap({ ...rateDetail, redacted: rateRedacted }, 6);
  }
  const rateCriterion: Criterion = { id: 'rate', points: ratePts, max: 10, evaluated: rateEval, detail: rateDetail, redacted: rateRedacted };

  // ─── 6. Bonus mission similaire (5) ───────────────────────────────
  const evidenceLoaded = profile.missions != null || profile.experiences != null;
  let bonusPts = 0;
  const bonusParts: T[] = [];
  if (evidenceLoaded) {
    const sameClientMission = need.companyId ? (profile.missions ?? []).find((m) => m.company_id === need.companyId) : undefined;
    const sameClientExp = !sameClientMission && need.companyName ? (profile.experiences ?? []).find((e) => e.client_name && fold(e.client_name) === fold(need.companyName!)) : undefined;
    if (sameClientMission || sameClientExp) {
      bonusPts += 3;
      const current = sameClientMission?.status === 'active';
      const part = current ? { fr: 'En mission chez ce client', en: 'Currently on a mission for this client' } : { fr: 'A déjà travaillé pour ce client', en: 'Has already worked for this client' };
      bonusParts.push(part);
      addStrength(part, 9);
    }
    const mandatorySkills = need.mandatory.map((s) => normalizeSkill(s).canonical).filter(Boolean);
    const similar = (profile.experiences ?? []).find((e) => {
      const env = new Set((e.environment ?? []).map((t) => normalizeSkill(t).canonical));
      const shared = mandatorySkills.filter((k) => env.has(k)).length;
      return titleSimilarity(need.title, e.role) >= 0.5 || shared >= 2;
    });
    if (similar) {
      bonusPts += 2;
      const years = [similar.start_date?.slice(0, 4), similar.end_date?.slice(0, 4)].filter(Boolean);
      const span = years.length === 2 && years[0] !== years[1] ? `${years[0]}–${years[1]}` : (years[0] ?? '');
      const where = [similar.client_name, span].filter(Boolean).join(', ');
      const part = { fr: `Expérience proche${where ? ` (${where})` : ''}`, en: `Similar experience${where ? ` (${where})` : ''}` };
      bonusParts.push(part);
      addStrength(part, 7);
    }
    bonusPts = Math.min(5, bonusPts);
  }
  const bonusCriterion: Criterion = {
    id: 'bonus',
    points: bonusPts,
    max: 5,
    evaluated: evidenceLoaded,
    detail: !evidenceLoaded
      ? { fr: 'Expériences et missions non chargées', en: 'Experiences and missions not loaded' }
      : bonusParts.length
        ? { fr: bonusParts.map((p) => p.fr).join(' · '), en: bonusParts.map((p) => p.en).join(' · ') }
        : { fr: 'Aucune mission ou expérience similaire trouvée', en: 'No similar mission or experience found' },
  };

  // ─── Total, plafonds, verdict ─────────────────────────────────────
  const criteria = [skillsCriterion, experienceCriterion, availabilityCriterion, locationCriterion, rateCriterion, bonusCriterion];
  let score = Math.round(criteria.reduce((t, c) => t + c.points, 0));
  for (const cap of caps) score = Math.min(score, cap.max);
  score = clamp(score, 0, 100);

  return {
    score,
    verdict: verdictOf(score),
    criteria,
    skills,
    strengths: strengthList.sort((a, b) => b.weight - a.weight).slice(0, 5).map((x) => x.note),
    gaps: gapList.sort((a, b) => b.weight - a.weight).slice(0, 5).map((x) => x.note),
    caps,
    notEvaluated,
    matchedSkills: skills.filter((s) => s.kind === 'skill' && (s.status === 'matched' || s.status === 'equivalent')).map((s) => s.name),
    missingSkills: skills.filter((s) => s.kind === 'skill' && s.mandatory && s.status === 'missing').map((s) => s.name),
    equivalentSkills: skills.filter((s) => s.status === 'equivalent').map((s) => s.name),
    partialSkills: skills.filter((s) => s.kind === 'skill' && s.status === 'partial').map((s) => ({ skill: s.name, evidence: s.evidence ? [s.evidence.fr] : [] })),
  };
}

// ── Comparaison : pourquoi l'un devance l'autre ───────────────────────

export type LeadReason = { id: CriterionId; delta: number; label: T };

/**
 * Écarts de critères entre deux résultats (a classé devant b) : les deux
 * plus grands avantages de a, et le critère où b reste devant, s'il y en a.
 */
export function compareMatches(a: MatchResult, b: MatchResult): { lead: number; ahead: LeadReason[]; behind: LeadReason | null; skillsOnlyA: string[] } {
  const deltas = a.criteria.map((c) => {
    const other = b.criteria.find((x) => x.id === c.id);
    const meta = CRITERIA.find((x) => x.id === c.id)!;
    return { id: c.id, delta: r1(c.points - (other?.points ?? 0)), label: meta.label };
  });
  const ahead = deltas.filter((d) => d.delta >= 1).sort((x, y) => y.delta - x.delta).slice(0, 2);
  const behind = deltas.filter((d) => d.delta <= -1).sort((x, y) => x.delta - y.delta)[0] ?? null;
  const bCovers = new Set(b.skills.filter((s) => s.status === 'matched' || s.status === 'equivalent').map((s) => fold(s.name)));
  const skillsOnlyA = a.skills.filter((s) => s.mandatory && (s.status === 'matched' || s.status === 'equivalent') && !bCovers.has(fold(s.name))).map((s) => s.name);
  return { lead: a.score - b.score, ahead, behind, skillsOnlyA };
}

/** Phrase courte : « Devance Yanis de 9 pts : compétences clés (+7 : Spark, Kafka)… ». */
export function leadSentence(a: MatchResult, b: MatchResult, otherName: string, lang: 'fr' | 'en'): string | null {
  const { lead, ahead, behind, skillsOnlyA } = compareMatches(a, b);
  const fr = lang === 'fr';
  if (ahead.length === 0) return lead > 0 ? (fr ? `Devance ${otherName} de ${lead} pt${lead > 1 ? 's' : ''}, à critères proches.` : `Ahead of ${otherName} by ${lead} pt${lead > 1 ? 's' : ''}, criteria are close.`) : null;
  const fmt = (d: LeadReason) => {
    const sign = `${d.delta > 0 ? '+' : ''}${d.delta.toLocaleString(fr ? 'fr-FR' : 'en-GB')}`;
    const extra = d.id === 'skills' && d.delta > 0 && skillsOnlyA.length ? ` : ${listText(skillsOnlyA, 2)}` : '';
    const label = d.label[lang];
    return `${label.charAt(0).toLowerCase()}${label.slice(1)} (${sign}${extra})`;
  };
  const tail = behind ? (fr ? ` ; ${otherName} reste devant sur ${fmt(behind)}` : `; ${otherName} stays ahead on ${fmt(behind)}`) : '';
  // Scores égaux (souvent plafonnés) : on dit seulement où ce résultat est meilleur.
  if (lead <= 0) return fr ? `À égalité avec ${otherName} ; devant sur ${ahead.map(fmt).join(', ')}${tail}.` : `Level with ${otherName}; ahead on ${ahead.map(fmt).join(', ')}${tail}.`;
  const head = fr ? `Devance ${otherName} de ${lead} pt${lead > 1 ? 's' : ''}` : `Ahead of ${otherName} by ${lead} pt${lead > 1 ? 's' : ''}`;
  return `${head} : ${ahead.map(fmt).join(', ')}${tail}.`;
}

// ── Lecture du besoin ─────────────────────────────────────────────────

const LANGUAGE_PATTERNS: Array<{ code: string; re: RegExp }> = [
  { code: 'en', re: /\b(anglais|english|anglophone)\b/i },
  { code: 'de', re: /\b(allemand|german|deutsch|germanophone)\b/i },
  { code: 'es', re: /\b(espagnol|spanish|espanol|hispanophone)\b/i },
  { code: 'it', re: /\b(italien|italian|italiano)\b/i },
  { code: 'pt', re: /\b(portugais|portuguese|portugues|lusophone)\b/i },
  { code: 'nl', re: /\b(neerlandais|dutch|nederlands)\b/i },
  { code: 'zh', re: /\b(chinois|chinese|mandarin)\b/i },
  { code: 'ar', re: /\b(arabe|arabic)\b/i },
];

/** Langues exigées, repérées dans le texte du besoin (« anglais courant »). */
export function detectLanguages(text: string): string[] {
  const t = fold(text);
  return LANGUAGE_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.code);
}

/**
 * Séniorité écrite dans l'intitulé (« Data engineer senior », « Développeur
 * confirmé »). Seuls les niveaux sont lus — « lead » et « architecte »
 * désignent aussi des rôles et ne sont pas interprétés.
 */
export function seniorityFromTitle(title: string | null | undefined): SeniorityLevel | null {
  const t = fold(title ?? '');
  if (/\b(junior|jr)\b/.test(t)) return 'junior';
  if (/\b(confirme|confirmee|intermediate|mid-level)\b/.test(t)) return 'confirmed';
  if (/\b(senior|sr)\b/.test(t)) return 'senior';
  if (/\bexpert\b/.test(t)) return 'expert';
  return null;
}

/** Années d'expérience minimales d'un libellé (« 5 ans », « 3-5 ans », « +8 ans »). */
export function parseMinYears(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = fold(label).match(/(\d{1,2})\s*(?:(?:-|–|a|to)\s*\d{1,2}\s*)?(?:\+\s*)?(?:ans?|years?|yrs?)\b/);
  return m ? Number(m[1]) : null;
}

/** Mode de travail d'un besoin à partir des champs disponibles. */
export function remoteModeOf(policy: string | null | undefined, workMode?: string | null, remoteDays?: number | null): RemoteMode | null {
  if (policy === 'onsite' || policy === 'hybrid' || policy === 'remote') return policy;
  if (workMode === 'onsite' || workMode === 'hybrid' || workMode === 'remote') return workMode;
  if (workMode === 'custom') return 'hybrid';
  if (remoteDays != null) return remoteDays >= 5 ? 'remote' : remoteDays > 0 ? 'hybrid' : 'onsite';
  return null;
}
