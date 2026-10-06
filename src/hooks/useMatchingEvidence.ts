'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useCachedQuery } from './useCachedQuery';
import type { ProfileEvidence } from '@/lib/matching/needs';
import type { ProfileExperience, ProfileMission } from '@/lib/matching/engine';
import type { Certification } from '@/types';

type Rows = {
  experiences: Array<ProfileExperience & { consultant_id: string }>;
  missions: Array<ProfileMission & { consultant_id: string }>;
  certifications: Array<{ id: string; certifications: Certification[] | null }>;
};

/** Requête tolérante : une table ou colonne absente ne bloque pas le matching. */
async function tolerant<R>(query: PromiseLike<{ data: R[] | null; error: unknown }>): Promise<R[]> {
  try {
    const { data, error } = await query;
    return error ? [] : (data ?? []);
  } catch {
    return [];
  }
}

/**
 * Preuves du matching, par consultant : expériences (environnement
 * technique, rôles), missions (clients déjà servis) et certifications.
 * Chargées à part du vivier : sans elles, le bonus « mission similaire »
 * est simplement « non évalué ».
 */
export function useMatchingEvidence(enabled = true) {
  const org = useOrganizationSafe();
  const orgId = org?.activeOrgId;
  const q = useCachedQuery<Rows>(
    `matching-evidence:${orgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const [experiences, missions, certifications] = await Promise.all([
        tolerant<Rows['experiences'][number]>(supabase.from('consultant_experiences').select('consultant_id, client_name, role, start_date, end_date, environment').limit(20000)),
        tolerant<Rows['missions'][number]>(supabase.from('missions').select('consultant_id, company_id, title, start_date, end_date, status').eq('organization_id', orgId!).limit(10000)),
        tolerant<Rows['certifications'][number]>(supabase.from('consultants').select('id, certifications').eq('organization_id', orgId!).eq('archived', false).limit(3000)),
      ]);
      return { experiences, missions, certifications };
    },
    { enabled: enabled && !!orgId },
  );

  const evidence = useMemo(() => {
    if (!q.data) return undefined;
    const m = new Map<string, ProfileEvidence>();
    const entry = (id: string) => {
      let e = m.get(id);
      if (!e) {
        e = { experiences: [], missions: [], certifications: null };
        m.set(id, e);
      }
      return e;
    };
    for (const x of q.data.experiences) entry(x.consultant_id).experiences!.push(x);
    for (const x of q.data.missions) entry(x.consultant_id).missions!.push(x);
    for (const x of q.data.certifications) if (Array.isArray(x.certifications) && x.certifications.length) entry(x.id).certifications = x.certifications;
    return m;
  }, [q.data]);

  return { evidence, loading: q.loading };
}
