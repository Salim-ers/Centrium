'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useCachedQuery } from './useCachedQuery';
import { groupSkills, MATCHING_CONSULTANT_COLUMNS, type MatchingConsultant } from '@/lib/matching/rank';
import type { ConsultantSkill } from '@/types';

type Pool = { consultants: MatchingConsultant[]; skills: ConsultantSkill[] };

/**
 * Vivier de matching : consultants (champs utiles au score uniquement) et
 * leurs compétences. Chargé une fois par session et partagé entre le
 * staffing, les opportunités et le dashboard.
 */
export function useMatchingPool(enabled = true) {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<Pool>(
    `matching-pool:${orgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [consultants, skills] = await Promise.all([
        supabase
          .from('consultants')
          .select(MATCHING_CONSULTANT_COLUMNS)
          .eq('organization_id', orgId!)
          .eq('archived', false)
          .limit(3000),
        supabase
          .from('consultant_skills')
          .select('id, consultant_id, category, name, level, years, is_highlighted, created_at')
          .limit(50000),
      ]);
      return {
        consultants: (consultants.data ?? []) as MatchingConsultant[],
        skills: (skills.data ?? []) as ConsultantSkill[],
      };
    },
    { enabled: enabled && !!orgId },
  );
  const skillsByConsultant = useMemo(() => groupSkills(q.data?.skills ?? []), [q.data]);
  return {
    consultants: q.data?.consultants ?? [],
    skillsByConsultant,
    loading: q.loading,
    reload: q.reload,
  };
}
