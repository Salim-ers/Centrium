// =========================================================================
// Vivier de matching côté serveur (moteur d'alertes, demandes client) :
// consultants actifs d'une organisation, leurs compétences saisies et les
// preuves du matching (expériences, missions, certifications).
// Même moteur de scoring que l'interface (rank.ts → engine.ts).
//
// Le client peut être le client de service (RLS contournée) : chaque
// requête est donc explicitement limitée à l'organisation.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Certification, ConsultantSkill } from '@/types';
import { MATCHING_CONSULTANT_COLUMNS, groupSkills, rankConsultants, type MatchingConsultant, type RankedConsultant } from './rank';
import { hasSkills, opportunityToOffer } from './opportunity-offer';
import type { ProfileEvidence } from './needs';
import type { ProfileExperience, ProfileMission } from './engine';

export type MatchingPool = {
  consultants: Array<MatchingConsultant & { owner_id?: string | null }>;
  skillsByConsultant: Map<string, ConsultantSkill[]>;
  /** Absent si le chargement des preuves a échoué : le bonus est alors « non évalué ». */
  evidence?: Map<string, ProfileEvidence>;
};

const BATCH = 200;

export async function loadMatchingPool(client: SupabaseClient, organizationId: string): Promise<MatchingPool> {
  const { data: consultants } = await client
    .from('consultants')
    .select(`${MATCHING_CONSULTANT_COLUMNS}, owner_id`)
    .eq('organization_id', organizationId)
    .eq('archived', false)
    .eq('is_prospect', false)
    .limit(3000);
  const list = (consultants ?? []) as unknown as MatchingPool['consultants'];
  const ids = list.map((c) => c.id);
  const skills: ConsultantSkill[] = [];
  // consultant_skills n'a pas de colonne organisation : filtre par lots d'identifiants.
  for (let i = 0; i < ids.length; i += BATCH) {
    const { data } = await client
      .from('consultant_skills')
      .select('id, consultant_id, category, name, level, years, is_highlighted, created_at')
      .in('consultant_id', ids.slice(i, i + BATCH));
    skills.push(...((data ?? []) as ConsultantSkill[]));
  }
  return { consultants: list, skillsByConsultant: groupSkills(skills), evidence: await loadEvidence(client, organizationId, ids) };
}

/** Preuves par consultant ; undefined si une requête échoue (rien n'est supposé). */
async function loadEvidence(client: SupabaseClient, organizationId: string, ids: string[]): Promise<Map<string, ProfileEvidence> | undefined> {
  try {
    const evidence = new Map<string, ProfileEvidence>(ids.map((id) => [id, { experiences: [], missions: [], certifications: null }]));
    for (let i = 0; i < ids.length; i += BATCH) {
      const { data, error } = await client
        .from('consultant_experiences')
        .select('consultant_id, client_name, role, start_date, end_date, environment')
        .in('consultant_id', ids.slice(i, i + BATCH));
      if (error) return undefined;
      for (const e of (data ?? []) as Array<ProfileExperience & { consultant_id: string }>) evidence.get(e.consultant_id)?.experiences?.push(e);
    }
    const missions = await client.from('missions').select('consultant_id, company_id, title, start_date, end_date, status').eq('organization_id', organizationId).limit(10000);
    if (missions.error) return undefined;
    for (const m of (missions.data ?? []) as Array<ProfileMission & { consultant_id: string }>) evidence.get(m.consultant_id)?.missions?.push(m);
    // Certifications : colonne récente, facultative pour le matching.
    const certs = await client.from('consultants').select('id, certifications').eq('organization_id', organizationId).eq('archived', false).limit(3000);
    if (!certs.error) {
      for (const c of (certs.data ?? []) as Array<{ id: string; certifications: Certification[] | null }>) {
        const e = evidence.get(c.id);
        if (e && Array.isArray(c.certifications) && c.certifications.length) e.certifications = c.certifications;
      }
    }
    return evidence;
  } catch {
    return undefined;
  }
}

export type OpportunityForMatching = Parameters<typeof opportunityToOffer>[0];

/** Meilleurs profils pour une opportunité (aucun si elle n'a pas de compétences). */
export function topMatches(opp: OpportunityForMatching, pool: MatchingPool, opts: { limit?: number; minScore?: number } = {}): RankedConsultant[] {
  if (!hasSkills(opp)) return [];
  return rankConsultants(opportunityToOffer(opp), pool.consultants, pool.skillsByConsultant, { limit: opts.limit ?? 3, minScore: opts.minScore ?? 60, evidence: pool.evidence });
}
