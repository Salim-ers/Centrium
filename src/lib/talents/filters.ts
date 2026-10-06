// =========================================================================
// Talents — disponibilité lisible, filtres avancés (compétences, séniorité,
// expérience, ville ou mobilité, langue, contrat, TJM, portail) et mise en
// avant des compétences recherchées. Fonctions pures.
// =========================================================================

import { dayDiff } from '@/lib/utils/dates';
import { fold, languageName } from '@/lib/utils/text';
import type { ConsultantStatus, ContractType, Language, SeniorityLevel } from '@/types';

export { fold, languageName };

export type TalentLite = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  status: ConsultantStatus;
  available_from: string | null;
  current_mission_end: string | null;
  seniority: SeniorityLevel | null;
  years_experience: number | null;
  city: string | null;
  mobility: string | null;
  languages: Language[] | null;
  daily_rate_eur: number | null;
  contract_type: ContractType | null;
  owner_id: string | null;
  has_portal?: boolean;
};

export type SkillLite = { id: string; name: string; level: number | null; years: number | null; is_highlighted: boolean | null };

// ── Disponibilité ──────────────────────────────────────────────────────

/** Une date libre à moins de 30 jours est « bientôt ». */
export const SOON_DAYS = 30;

export type Availability =
  | { kind: 'now'; date: null; days: 0 }
  | { kind: 'soon'; date: string; days: number }
  | { kind: 'later'; date: string; days: number }
  | { kind: 'unknown'; date: null; days: null }
  | { kind: 'unavailable'; date: null; days: null };

/**
 * Disponibilité réelle : statut, date de disponibilité déclarée, ou fin de
 * la mission en cours. Une date passée vaut « disponible ».
 */
export function availabilityOf(c: Pick<TalentLite, 'status' | 'available_from' | 'current_mission_end'>, today: string): Availability {
  if (c.status === 'unavailable' || c.status === 'archived') return { kind: 'unavailable', date: null, days: null };
  const date = c.status === 'available' ? c.available_from : (c.available_from ?? c.current_mission_end);
  if (!date) return c.status === 'available' ? { kind: 'now', date: null, days: 0 } : { kind: 'unknown', date: null, days: null };
  const days = dayDiff(today, date);
  if (days <= 0) return { kind: 'now', date: null, days: 0 };
  return days <= SOON_DAYS ? { kind: 'soon', date, days } : { kind: 'later', date, days };
}

/** Clé de tri : disponibles d'abord, puis par date de libération. */
export function availabilitySortKey(a: Availability): string {
  if (a.kind === 'now') return '0';
  if (a.kind === 'soon' || a.kind === 'later') return `1${a.date}`;
  if (a.kind === 'unknown') return '2';
  return '3';
}

// ── Compétences ────────────────────────────────────────────────────────

/** Compétence correspondant à une recherche (sous-chaîne, accents ignorés). */
export function skillMatches(skillName: string, wanted: string): boolean {
  const w = fold(wanted);
  return !!w && fold(skillName).includes(w);
}

/**
 * Compétences à montrer : celles recherchées d'abord, puis les mises en
 * avant, puis par niveau et années d'expérience.
 */
export function rankSkills<S extends SkillLite>(skills: S[], wanted: string[] = []): Array<S & { matched: boolean }> {
  return skills
    .map((s) => ({ ...s, matched: wanted.some((w) => skillMatches(s.name, w)) }))
    .sort(
      (a, b) =>
        Number(b.matched) - Number(a.matched) ||
        Number(!!b.is_highlighted) - Number(!!a.is_highlighted) ||
        (b.level ?? 0) - (a.level ?? 0) ||
        (b.years ?? 0) - (a.years ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

// ── Filtres ────────────────────────────────────────────────────────────

export type TalentAvailabilityFilter = 'any' | 'now' | '30' | '60';

export type TalentFilters = {
  query: string;
  /** Toutes requises. */
  skills: string[];
  availability: TalentAvailabilityFilter;
  status: string;
  owner: string;
  /** Vide : toutes les séniorités. */
  seniority: SeniorityLevel[];
  minYears: number | null;
  /** Ville, ou mobilité déclarée qui la couvre. */
  city: string;
  /** Code de langue (« en »). */
  language: string;
  contract: string;
  rateMax: number | null;
  portal: 'any' | 'yes' | 'no';
};

export const DEFAULT_TALENT_FILTERS: TalentFilters = {
  query: '',
  skills: [],
  availability: 'any',
  status: 'all',
  owner: 'all',
  seniority: [],
  minYears: null,
  city: '',
  language: '',
  contract: 'all',
  rateMax: null,
  portal: 'any',
};

/** Filtres du tiroir « Filtres » (hors recherche, compétences et disponibilité). */
export function advancedFilterCount(f: TalentFilters): number {
  return (
    (f.status !== 'all' ? 1 : 0) +
    (f.owner !== 'all' ? 1 : 0) +
    (f.seniority.length ? 1 : 0) +
    (f.minYears != null ? 1 : 0) +
    (f.city ? 1 : 0) +
    (f.language ? 1 : 0) +
    (f.contract !== 'all' ? 1 : 0) +
    (f.rateMax != null ? 1 : 0) +
    (f.portal !== 'any' ? 1 : 0)
  );
}

export function hasActiveFilters(f: TalentFilters): boolean {
  return !!f.query.trim() || f.skills.length > 0 || f.availability !== 'any' || advancedFilterCount(f) > 0;
}

function coversCity(c: Pick<TalentLite, 'city' | 'mobility'>, city: string): boolean {
  const want = fold(city);
  if (fold(c.city ?? '').includes(want)) return true;
  const mobility = fold(c.mobility ?? '');
  return !!mobility && (mobility.includes(want) || /\b(france|national|nationale|europe|international)\b/.test(mobility));
}

/** Le talent correspond-il à tous les filtres ? */
export function matchesTalent(c: TalentLite, skills: SkillLite[], f: TalentFilters, today: string): boolean {
  if (f.status !== 'all' && c.status !== f.status) return false;
  if (f.owner !== 'all' && c.owner_id !== f.owner) return false;
  if (f.seniority.length && !(c.seniority && f.seniority.includes(c.seniority))) return false;
  if (f.minYears != null && (c.years_experience ?? 0) < f.minYears) return false;
  if (f.contract !== 'all' && c.contract_type !== f.contract) return false;
  if (f.rateMax != null && !(c.daily_rate_eur != null && Number(c.daily_rate_eur) <= f.rateMax)) return false;
  if (f.portal === 'yes' && !c.has_portal) return false;
  if (f.portal === 'no' && c.has_portal) return false;
  if (f.language && !(c.languages ?? []).some((l) => l.code?.toLowerCase() === f.language.toLowerCase())) return false;
  if (f.city.trim() && !coversCity(c, f.city)) return false;

  if (f.availability !== 'any') {
    const a = availabilityOf(c, today);
    if (f.availability === 'now' && a.kind !== 'now') return false;
    const within = f.availability === '30' ? 30 : f.availability === '60' ? 60 : null;
    if (within != null && !(a.kind === 'now' || ((a.kind === 'soon' || a.kind === 'later') && a.days <= within))) return false;
  }
  if (f.skills.length && !f.skills.every((w) => skills.some((s) => skillMatches(s.name, w)))) return false;

  const q = fold(f.query);
  if (!q) return true;
  return fold(`${c.first_name} ${c.last_name} ${c.job_title} ${c.city ?? ''}`).includes(q);
}

// ── Vues enregistrées (chaînes) ────────────────────────────────────────

export const TALENT_SCOPES = ['staff', 'pool', 'positioned', 'archived'] as const;
export type TalentScope = (typeof TALENT_SCOPES)[number];

const SENIORITIES: SeniorityLevel[] = ['junior', 'confirmed', 'senior', 'expert', 'lead', 'architect'];

/** Filtres → vue enregistrée (valeurs texte). */
export function toViewFilters(scope: TalentScope, f: TalentFilters): Record<string, string> {
  return {
    scope,
    query: f.query,
    skills: f.skills.join(','),
    availability: f.availability,
    status: f.status,
    owner: f.owner,
    seniority: f.seniority.join(','),
    minYears: f.minYears == null ? '' : String(f.minYears),
    city: f.city,
    language: f.language,
    contract: f.contract,
    rateMax: f.rateMax == null ? '' : String(f.rateMax),
    portal: f.portal,
  };
}

const num = (v: string | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : null);

/** Vue enregistrée → filtres ; accepte les anciennes vues (une seule compétence `skill`). */
export function fromViewFilters(v: Record<string, string | undefined>): { scope: TalentScope; filters: TalentFilters } {
  const scope = (TALENT_SCOPES as readonly string[]).includes(v.scope ?? '') ? (v.scope as TalentScope) : 'staff';
  // `||` et non `??` : une vue ancienne fusionnée avec les défauts a `skills: ''`.
  const skills = (v.skills || v.skill || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const availability = (['any', 'now', '30', '60'] as const).find((a) => a === v.availability) ?? 'any';
  const portal = (['any', 'yes', 'no'] as const).find((p) => p === v.portal) ?? 'any';
  return {
    scope,
    filters: {
      query: v.query ?? '',
      skills,
      availability,
      status: v.status || 'all',
      owner: v.owner || 'all',
      seniority: (v.seniority ?? '').split(',').filter((s): s is SeniorityLevel => (SENIORITIES as string[]).includes(s)),
      minYears: num(v.minYears),
      city: v.city ?? '',
      language: v.language ?? '',
      contract: v.contract || 'all',
      rateMax: num(v.rateMax),
      portal,
    },
  };
}

// ── Options des listes ─────────────────────────────────────────────────

/** Langues et villes présentes dans la liste (pour les menus des filtres). */
export function filterOptions(list: TalentLite[]): { languages: string[]; cities: string[] } {
  const languages = new Set<string>();
  const cities = new Map<string, string>();
  for (const c of list) {
    for (const l of c.languages ?? []) if (l.code) languages.add(l.code.toLowerCase());
    if (c.city?.trim()) cities.set(fold(c.city), c.city.trim());
  }
  return { languages: [...languages].sort(), cities: [...cities.values()].sort((a, b) => a.localeCompare(b, 'fr')) };
}
