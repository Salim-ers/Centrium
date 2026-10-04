import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalClient } from '@/lib/portal/server';

export const runtime = 'nodejs';

/**
 * GET /api/client/documents — documents partagés avec la société du client
 * (visibilité « client », non archivés). Dernière version de chacun.
 */
export async function GET() {
  const me = await getPortalClient();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const admin = createAdminClient('client-portal');
  const { data, error } = await admin
    .from('documents')
    .select('id, root_id, version, kind, title, description, file_name, size_bytes, mission_id, created_at')
    .eq('organization_id', me.organizationId)
    .eq('company_id', me.companyId)
    .eq('visibility', 'client')
    .eq('archived', false)
    .order('version', { ascending: false });
  if (error) return NextResponse.json({ data: [] });
  const seen = new Set<string>();
  const latest = (data ?? []).filter((d) => {
    const key = d.root_id ?? d.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  latest.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return NextResponse.json({ data: latest });
}
