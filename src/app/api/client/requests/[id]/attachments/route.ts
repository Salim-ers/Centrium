import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalClient } from '@/lib/portal/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { checkUpload, MAX_DOCUMENT_BYTES } from '@/lib/security/file-validation';
import { scanFileWithVirusTotal } from '@/lib/security/virustotal';
import { logAudit } from '@/lib/audit/log';
import { requestAttachmentPrefix } from '@/lib/portal/client-requests';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_ATTACHMENTS = 5;

/**
 * POST /api/client/requests/:id/attachments — pièce jointe d'une demande
 * client (fiche de poste, cahier des charges…). Mêmes contrôles que la
 * bibliothèque : type réel, taille, antivirus si configuré, stockage privé.
 * Le document est rattaché à la société du client (et à l'opportunité si
 * elle existe déjà) et visible dans son portail.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getPortalClient();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rl = await rateLimit(`client-attach:${me.userId}`, { limit: 20, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_DOCUMENT_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'too_large', message: 'Fichier trop volumineux (25 Mo maximum)' }, { status: 413 });
  }

  const admin = createAdminClient('client-portal');
  const { data: request } = await admin
    .from('client_requests')
    .select('id, organization_id, company_id, title, opportunity_id, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!request || request.organization_id !== me.organizationId || request.company_id !== me.companyId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const prefix = requestAttachmentPrefix(me.organizationId, request.id);
  const { count } = await admin.from('documents').select('id', { count: 'exact', head: true }).like('storage_path', `${prefix}%`);
  if ((count ?? 0) >= MAX_ATTACHMENTS) {
    return NextResponse.json({ error: 'too_many_files', message: `${MAX_ATTACHMENTS} pièces jointes maximum par demande.` }, { status: 409 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file_required' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(bytes, file.name, file.size);
  if (!check.ok) return NextResponse.json({ error: 'invalid_file', message: check.reason }, { status: 400 });
  const scan = await scanFileWithVirusTotal(bytes, check.safeName);
  if (scan.status === 'malicious') return NextResponse.json({ error: 'malicious_file', message: 'Fichier refusé par l’antivirus.' }, { status: 422 });

  const id = randomUUID();
  const path = `${prefix}${id}-${check.safeName}`;
  const up = await admin.storage.from('documents').upload(path, bytes, { contentType: check.mime, upsert: false });
  if (up.error) return NextResponse.json({ error: 'storage_failed' }, { status: 500 });

  const { error } = await admin.from('documents').insert({
    id,
    organization_id: me.organizationId,
    kind: 'client_document',
    title: check.safeName,
    description: `Pièce jointe de la demande « ${request.title} »`,
    company_id: me.companyId,
    opportunity_id: request.opportunity_id,
    visibility: 'client',
    storage_path: path,
    file_name: check.safeName,
    mime_type: check.mime,
    size_bytes: file.size,
    version: 1,
    created_by: me.userId,
  });
  if (error) {
    await admin.storage.from('documents').remove([path]);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
  await logAudit({ organizationId: me.organizationId, userId: me.userId, entityType: 'document', entityId: id, action: 'client_attachment', details: { client_request_id: request.id, scan: scan.status } });
  return NextResponse.json({ data: { id } }, { status: 201 });
}
