import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalConsultant } from '@/lib/portal/server';

export const runtime = 'nodejs';

/**
 * GET /api/portal/documents — documents de la bibliothèque partagés avec le
 * consultant connecté (visibilité « consultant », rattachés à sa fiche,
 * non archivés). Dernière version de chaque document uniquement.
 */
export async function GET() {
  const me = await getPortalConsultant();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const admin = createAdminClient('portal-access');
  const { data, error } = await admin
    .from('documents')
    .select('id, root_id, version, kind, title, description, file_name, size_bytes, mission_id, created_at')
    .eq('organization_id', me.organizationId)
    .eq('consultant_id', me.consultantId)
    .eq('visibility', 'consultant')
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
