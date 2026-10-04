// =========================================================================
// Adaptateur opportunité → fiche besoin pour le moteur de scoring
// (lib/ai/matching/score.ts). Si l'opportunité est liée à une fiche de
// poste, ses exigences priment ; sinon on part des champs V2 de
// l'opportunité. Aucune compétence n'est inventée : seules les compétences
// renseignées sur le besoin et sur la fiche consultant sont comparées.
// =========================================================================

import type { JobOffer, Opportunity, SeniorityLevel } from '@/types';

export type OppLike = Pick<
  Opportunity,
  'id' | 'organization_id' | 'title' | 'company_id' | 'contact_id' | 'owner_id' | 'daily_rate_eur' | 'duration_months'
> & {
  description?: string | null;
  required_skills?: string[] | null;
  start_date?: string | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function opportunityToOffer(opp: OppLike, linked?: Partial<JobOffer> | null): JobOffer {
  const now = new Date().toISOString();
  const required = (linked?.required_skills?.length ? linked.required_skills : opp.required_skills) ?? [];
  return {
    id: linked?.id ?? opp.id,
    organization_id: opp.organization_id,
    company_id: opp.company_id,
    contact_id: opp.contact_id,
    owner_id: opp.owner_id,
    title: linked?.title ?? opp.title,
    description: linked?.description ?? opp.description ?? null,
    required_skills: required,
    nice_to_have: linked?.nice_to_have ?? [],
    seniority: (linked?.seniority as SeniorityLevel | null | undefined) ?? null,
    daily_rate_min: linked?.daily_rate_min ?? null,
    daily_rate_max: linked?.daily_rate_max ?? opp.daily_rate_eur ?? null,
    location: linked?.location ?? opp.location ?? null,
    remote_days: linked?.remote_days ?? null,
    start_date: linked?.start_date ?? opp.start_date ?? null,
    duration_months: linked?.duration_months ?? opp.duration_months ?? null,
    deadline: linked?.deadline ?? null,
    status: 'open',
    source_kind: linked?.source_kind ?? null,
    source: linked?.source ?? null,
    context: linked?.context ?? null,
    mission_purpose: linked?.mission_purpose ?? null,
    tasks: linked?.tasks ?? [],
    tech_stack: linked?.tech_stack ?? [],
    profile_requirements: linked?.profile_requirements ?? [],
    working_conditions: linked?.working_conditions ?? [],
    contract_kind: linked?.contract_kind ?? null,
    show_rate: null,
    work_mode: null,
    work_mode_detail: null,
    start_type: null,
    start_label: null,
    experience_label: linked?.experience_label ?? null,
    created_at: opp.created_at ?? now,
    updated_at: opp.updated_at ?? now,
  };
}

/** Une opportunité est « matchable » si au moins une compétence est connue. */
export function hasSkills(opp: OppLike, linked?: Partial<JobOffer> | null): boolean {
  return ((linked?.required_skills?.length ?? 0) > 0) || ((opp.required_skills?.length ?? 0) > 0);
}
