'use client';

import { useOrganizationSafe } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { DEFAULT_MARGIN_POLICY, resolveMarginPolicy, type MarginPolicy } from '@/lib/finance/margin-policy';

/** Politique de marge de l'organisation (valeurs par défaut tant qu'elle n'est pas chargée). */
export function useMarginPolicy(): { policy: MarginPolicy; ready: boolean; reload: () => Promise<void> } {
  const orgId = useOrganizationSafe()?.activeOrgId;
  const { data, reload } = useCachedQuery<MarginPolicy>(
    `margin-policy:${orgId ?? 'none'}`,
    async () => {
      const res = await fetch('/api/organizations/margin-policy', { cache: 'no-store' });
      if (!res.ok) return DEFAULT_MARGIN_POLICY;
      const body = (await res.json()) as { data?: unknown };
      return resolveMarginPolicy(body.data);
    },
    { enabled: !!orgId },
  );
  return { policy: data ?? DEFAULT_MARGIN_POLICY, ready: data != null, reload };
}
