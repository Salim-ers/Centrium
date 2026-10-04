// =========================================================================
// Classement des consultants pour un besoin (opportunité ou fiche de poste).
// Délègue le calcul au moteur déterministe existant (computeMatchingV2) :
// score sur 100, composantes détaillées, garde-fous. Aucune compétence
// n'est déduite ou inventée — seules les compétences saisies comptent.
// =========================================================================

import { computeMatchingV2, type ScoreBreakdown } from '@/lib/ai/matching/score';
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
  breakdown: ScoreBreakdown;
};

/** Complète les champs non lus par le moteur pour satisfaire son type. */
function asConsultant(c: MatchingConsultant): Consultant {
  return {
    organization_id: '',
    owner_id: null,
    initials: null,
    email: null,
    phone: null,
    linkedin_url: null,
    sub_title: null,
    country: 'FR',
    current_client: null,
    summary: null,
    internal_notes: null,
    archived: false,
    cv_pushed: false,
    cv_pushed_at: null,
    cv_pushed_target: null,
    legal_status: null,
    company_name: null,
    siret: null,
    vat_number: null,
    address: null,
    postal_code: null,
    iban: null,
    bic: null,
    created_at: '',
    updated_at: '',
    ...c,
    languages: Array.isArray(c.languages) ? c.languages : [],
  } as Consultant;
}

export function rankConsultants(
  offer: JobOffer,
  consultants: MatchingConsultant[],
  skillsByConsultant: Map<string, ConsultantSkill[]>,
  options: { limit?: number; minScore?: number; excludeIds?: Set<string> } = {},
): RankedConsultant[] {
  const { limit = 20, minScore = 0, excludeIds } = options;
  const out: RankedConsultant[] = [];
  for (const c of consultants) {
    if (c.status === 'archived' || excludeIds?.has(c.id)) continue;
    const skills = skillsByConsultant.get(c.id) ?? [];
    const breakdown = computeMatchingV2(asConsultant(c), skills, offer);
    if (breakdown.score < minScore) continue;
    out.push({ consultant: c, breakdown });
  }
  out.sort((a, b) => b.breakdown.score - a.breakdown.score);
  return out.slice(0, limit);
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
