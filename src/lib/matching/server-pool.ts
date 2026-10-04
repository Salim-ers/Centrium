// =========================================================================
// Vivier de matching côté serveur (moteur d'alertes, demandes client) :
// consultants actifs d'une organisation et leurs compétences saisies.
// Même moteur de scoring que l'interface (rank.ts → computeMatchingV2).
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsultantSkill } from '@/types';
import { MATCHING_CONSULTANT_COLUMNS, groupSkills, rankConsultants, type MatchingConsultant, type RankedConsultant } from './rank';
import { hasSkills, opportunityToOffer } from './opportunity-offer';

export type MatchingPool = { consultants: Array<MatchingConsultant & { owner_id?: string | null }>; skillsByConsultant: Map<string, ConsultantSkill[]> };

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
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await client
      .from('consultant_skills')
      .select('id, consultant_id, category, name, level, years, is_highlighted, created_at')
      .in('consultant_id', ids.slice(i, i + 200));
    skills.push(...((data ?? []) as ConsultantSkill[]));
  }
  return { consultants: list, skillsByConsultant: groupSkills(skills) };
}

export type OpportunityForMatching = Parameters<typeof opportunityToOffer>[0];

/** Meilleurs profils pour une opportunité (aucun si elle n'a pas de compétences). */
export function topMatches(opp: OpportunityForMatching, pool: MatchingPool, opts: { limit?: number; minScore?: number } = {}): RankedConsultant[] {
  if (!hasSkills(opp)) return [];
  return rankConsultants(opportunityToOffer(opp), pool.consultants, pool.skillsByConsultant, { limit: opts.limit ?? 3, minScore: opts.minScore ?? 60 });
}
