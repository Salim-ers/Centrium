// =========================================================================
// Adaptateurs du moteur de matching (engine.ts) : fiche besoin (offre ou
// opportunité convertie) → MatchNeed, fiche consultant → MatchProfile.
// Seules les données saisies sont reprises ; rien n'est déduit.
// =========================================================================

import { detectLanguages, parseMinYears, remoteModeOf, seniorityFromTitle, type MatchNeed, type MatchProfile, type ProfileExperience, type ProfileMission } from './engine';
import type { Certification, ConsultantSkill, JobOffer } from '@/types';
import type { MatchingConsultant } from './rank';

/** Besoin à partir d'une fiche de poste (ou d'une opportunité via `opportunityToOffer`). */
export function needFromJobOffer(offer: JobOffer, companyName?: string | null): MatchNeed {
  const text = [offer.description ?? '', ...(offer.profile_requirements ?? []), ...(offer.working_conditions ?? [])].join(' \n ');
  return {
    title: offer.title,
    companyId: offer.company_id ?? null,
    companyName: companyName ?? null,
    mandatory: offer.required_skills ?? [],
    optional: offer.nice_to_have ?? [],
    // Séniorité de la fiche, sinon celle écrite dans l'intitulé (« … senior »).
    seniority: offer.seniority ?? seniorityFromTitle(offer.title),
    minYears: parseMinYears(offer.experience_label),
    startDate: offer.start_date ?? null,
    location: offer.location ?? null,
    remote: remoteModeOf(null, offer.work_mode, offer.remote_days),
    rateMax: offer.daily_rate_max ?? null,
    rateMin: offer.daily_rate_min ?? null,
    languages: detectLanguages(text),
  };
}

export type ProfileEvidence = {
  experiences?: ProfileExperience[] | null;
  missions?: ProfileMission[] | null;
  certifications?: Certification[] | null;
};

/** Profil à partir de la fiche consultant, de ses compétences et (option) de ses preuves. */
export function profileFromConsultant(c: MatchingConsultant & { certifications?: Certification[] | null }, skills: ConsultantSkill[], evidence?: ProfileEvidence | null): MatchProfile {
  return {
    id: c.id,
    job_title: c.job_title ?? null,
    seniority: c.seniority ?? null,
    years_experience: c.years_experience ?? null,
    status: c.status,
    available_from: c.available_from ?? null,
    current_mission_end: c.current_mission_end ?? null,
    daily_rate_eur: c.daily_rate_eur ?? null,
    city: c.city ?? null,
    mobility: c.mobility ?? null,
    languages: Array.isArray(c.languages) ? c.languages : [],
    skills: skills.map((s) => ({ name: s.name, level: s.level, years: s.years, is_highlighted: s.is_highlighted })),
    certifications: evidence?.certifications ?? (Array.isArray(c.certifications) ? c.certifications : null),
    experiences: evidence ? (evidence.experiences ?? []) : null,
    missions: evidence ? (evidence.missions ?? []) : null,
  };
}
