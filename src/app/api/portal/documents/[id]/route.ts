import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalConsultant } from '@/lib/portal/server';
import { rateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/** GET /api/portal/documents/:id — téléchargement (URL signée 60 s) d'un document partagé. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getPortalConsultant();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rl = await rateLimit(`portal-doc:${me.userId}`, { limit: 60, windowSec: 600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const admin = createAdminClient('portal-access');
  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, file_name, organization_id, consultant_id, visibility, archived')
    .eq('id', params.id)
    .maybeSingle();
  if (
    !doc?.storage_path ||
    doc.organization_id !== me.organizationId ||
    doc.consultant_id !== me.consultantId ||
    doc.visibility !== 'consultant' ||
    doc.archived
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { data, error } = await admin.storage.from('documents').createSignedUrl(doc.storage_path, 60, { download: doc.file_name ?? true });
  if (error || !data) return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
