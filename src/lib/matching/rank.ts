// =========================================================================
// Classement des consultants pour un besoin (opportunité ou fiche de poste)
// et, dans l'autre sens, des besoins pour un consultant. Délègue le calcul
// au moteur déterministe (engine.ts) : score sur 100 en six critères,
// forces, écarts, plafonds. Aucune compétence n'est déduite ou inventée —
// seules les données saisies comptent.
// =========================================================================

import { scoreMatch, type MatchNeed, type MatchResult } from './engine';
import { needFromJobOffer, profileFromConsultant, type ProfileEvidence } from './needs';
import type { Consultant, ConsultantSkill, JobOffer } from '@/types';

/** Champs du consultant nécessaires au scoring (pas de données personnelles). */
export type MatchingConsultant = Pick<
  Consultant,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'job_title'
  | 'seniority'
  | 'years_experience'
  | 'status'
  | 'available_from'
  | 'current_mission_end'
  | 'daily_rate_eur'
  | 'city'
  | 'mobility'
  | 'languages'
  | 'is_prospect'
  | 'contract_type'
>;

export const MATCHING_CONSULTANT_COLUMNS =
  'id, first_name, last_name, job_title, seniority, years_experience, status, available_from, current_mission_end, daily_rate_eur, city, mobility, languages, is_prospect, contract_type';

export type RankedConsultant = {
  consultant: MatchingConsultant;
  breakdown: MatchResult;
};

type RankOptions = {
  limit?: number;
  minScore?: number;
  excludeIds?: Set<string>;
  /** Expériences, missions et certifications par consultant (bonus, preuves). */
  evidence?: Map<string, ProfileEvidence>;
  companyName?: string | null;
  today?: string;
};

/** Consultants classés pour un besoin (meilleur score d'abord). */
export function rankForNeed(need: MatchNeed, consultants: MatchingConsultant[], skillsByConsultant: Map<string, ConsultantSkill[]>, options: RankOptions = {}): RankedConsultant[] {
  const { limit = 20, minScore = 0, excludeIds, evidence, today } = options;
  const out: RankedConsultant[] = [];
  for (const c of consultants) {
    if (c.status === 'archived' || excludeIds?.has(c.id)) continue;
    const profile = profileFromConsultant(c, skillsByConsultant.get(c.id) ?? [], evidence ? (evidence.get(c.id) ?? { experiences: [], missions: [] }) : null);
    const breakdown = scoreMatch(need, profile, { today });
    if (breakdown.score < minScore) continue;
    out.push({ consultant: c, breakdown });
  }
  // À score égal : la disponibilité, puis les compétences clés départagent.
  out.sort(
    (a, b) =>
      b.breakdown.score - a.breakdown.score ||
      (b.breakdown.criteria[2]?.points ?? 0) - (a.breakdown.criteria[2]?.points ?? 0) ||
      (b.breakdown.criteria[0]?.points ?? 0) - (a.breakdown.criteria[0]?.points ?? 0),
  );
  return out.slice(0, limit);
}

export function rankConsultants(offer: JobOffer, consultants: MatchingConsultant[], skillsByConsultant: Map<string, ConsultantSkill[]>, options: RankOptions = {}): RankedConsultant[] {
  return rankForNeed(needFromJobOffer(offer, options.companyName), consultants, skillsByConsultant, options);
}

export function groupSkills(rows: ConsultantSkill[]): Map<string, ConsultantSkill[]> {
  const m = new Map<string, ConsultantSkill[]>();
  for (const s of rows) {
    const list = m.get(s.consultant_id);
    if (list) list.push(s);
    else m.set(s.consultant_id, [s]);
  }
  return m;
}
