import 'server-only';

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { BRANDING_COLUMNS, buildBranding, type OrgBranding } from '@/lib/branding/org-branding';
import { getPortalClient, type PortalClientIdentity } from './server';

export type ClientPortalContext = {
  me: PortalClientIdentity;
  branding: OrgBranding | null;
  companyName: string;
};

/**
 * Contexte du portail client pour la requête en cours (dédupliqué par
 * React `cache`). Toutes les lectures des pages /client sont bornées par
 * `me.organizationId` ET `me.companyId`.
 */
export const getClientPortalContext = cache(async (): Promise<ClientPortalContext | null> => {
  const me = await getPortalClient();
  if (!me) return null;
  const admin = createAdminClient('client-portal');
  const [org, company] = await Promise.all([
    admin.from('organizations').select(BRANDING_COLUMNS).eq('id', me.organizationId).maybeSingle(),
    admin.from('companies').select('name').eq('id', me.companyId).maybeSingle(),
  ]);
  return {
    me,
    branding: buildBranding((org.data as Record<string, unknown> | null) ?? null, 0),
    companyName: (company.data?.name as string | undefined) ?? '',
  };
});

/** Missions de la société du client (identifiants), pour borner les lectures. */
export const getClientMissionIds = cache(async (organizationId: string, companyId: string): Promise<string[]> => {
  const admin = createAdminClient('client-portal');
  const { data } = await admin.from('missions').select('id').eq('organization_id', organizationId).eq('company_id', companyId);
  return (data ?? []).map((m) => m.id as string);
});
