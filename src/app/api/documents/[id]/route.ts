import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

async function owned(id: string, org: string) {
  const admin = createAdminClient('cross-org-query');
  const { data } = await admin
    .from('documents')
    .select('id, organization_id, storage_path, file_name, title, company_id, consultant_id, root_id')
    .eq('id', id)
    .maybeSingle();
  if (!data || data.organization_id !== org) return { admin, doc: null };
  return { admin, doc: data };
}

/**
 * GET /api/documents/:id — téléchargement : redirection vers une URL signée
 * valable 60 secondes (le bucket est privé).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('documents.view');
  if (auth instanceof NextResponse) return auth;
  const { admin, doc } = await owned(params.id, auth.organizationId);
  if (!doc?.storage_path) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data, error } = await admin.storage.from('documents').createSignedUrl(doc.storage_path, 60, { download: doc.file_name ?? true });
  if (error || !data) return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(['internal', 'client', 'consultant']).optional(),
  archived: z.boolean().optional(),
});

/** PATCH /api/documents/:id — titre, visibilité (partage portail), archivage. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('documents.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { admin, doc } = await owned(params.id, auth.organizationId);
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (parsed.data.visibility === 'client' && !doc.company_id) {
    return NextResponse.json({ error: 'invalid_visibility', message: 'Rattachez d’abord le document à un client.' }, { status: 400 });
  }
  if (parsed.data.visibility === 'consultant' && !doc.consultant_id) {
    return NextResponse.json({ error: 'invalid_visibility', message: 'Rattachez d’abord le document à un consultant.' }, { status: 400 });
  }

  // Visibilité et archivage s'appliquent à toutes les versions du document ;
  // titre et description aussi (même document, fichiers successifs).
  const rootId = doc.root_id ?? doc.id;
  const { error } = await admin
    .from('documents')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('organization_id', auth.organizationId)
    .or(`id.eq.${rootId},root_id.eq.${rootId}`);
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  const { data } = await admin.from('documents').select('*').eq('id', doc.id).single();

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'document',
    entityId: doc.id,
    action: parsed.data.visibility ? `visibility_${parsed.data.visibility}` : parsed.data.archived ? 'archived' : 'updated',
  });
  return NextResponse.json({ data });
}
