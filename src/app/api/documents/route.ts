import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { checkUpload, MAX_DOCUMENT_BYTES } from '@/lib/security/file-validation';
import { scanFileWithVirusTotal } from '@/lib/security/virustotal';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const maxDuration = 60;

const KINDS = ['quote', 'proposal', 'purchase_order', 'contract', 'mission_document', 'skills_dossier', 'client_document', 'consultant_document', 'other'] as const;

const metaSchema = z.object({
  kind: z.enum(KINDS),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  consultant_id: z.string().uuid().optional().nullable(),
  mission_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  visibility: z.enum(['internal', 'client', 'consultant']).default('internal'),
  /** Nouvelle version d'un document existant. */
  root_id: z.string().uuid().optional().nullable(),
});

const nullable = (v: FormDataEntryValue | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * POST /api/documents — dépôt d'un document dans la bibliothèque.
 * Multipart : file + métadonnées. Contrôles : permission documents.edit,
 * appartenance de toutes les entités liées à l'organisation, type réel du
 * fichier (signature), taille, antivirus (si configuré). Stockage privé ;
 * accès uniquement par URL signée de courte durée.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('documents.edit');
  if (auth instanceof NextResponse) return auth;

  const rl = await rateLimit(`doc-upload:${auth.user.id}`, { limit: 30, windowSec: 600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_DOCUMENT_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'too_large', message: 'Fichier trop volumineux (25 Mo maximum)' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file_required' }, { status: 400 });

  const parsed = metaSchema.safeParse({
    kind: form.get('kind'),
    title: form.get('title') || file.name,
    description: nullable(form.get('description')),
    company_id: nullable(form.get('company_id')),
    consultant_id: nullable(form.get('consultant_id')),
    mission_id: nullable(form.get('mission_id')),
    opportunity_id: nullable(form.get('opportunity_id')),
    visibility: form.get('visibility') || 'internal',
    root_id: nullable(form.get('root_id')),
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const meta = parsed.data;
  if (meta.visibility === 'client' && !meta.company_id) {
    return NextResponse.json({ error: 'invalid_visibility', message: 'Un document partagé au client doit être rattaché à un client.' }, { status: 400 });
  }
  if (meta.visibility === 'consultant' && !meta.consultant_id) {
    return NextResponse.json({ error: 'invalid_visibility', message: 'Un document partagé au consultant doit être rattaché à un consultant.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(bytes, file.name, file.size);
  if (!check.ok) return NextResponse.json({ error: 'invalid_file', message: check.reason }, { status: 400 });

  const admin = createAdminClient('cross-org-query');
  const org = auth.organizationId;

  // Toutes les entités liées doivent appartenir à l'organisation.
  const links: Array<[string, string | null | undefined]> = [
    ['companies', meta.company_id],
    ['consultants', meta.consultant_id],
    ['missions', meta.mission_id],
    ['opportunities', meta.opportunity_id],
  ];
  for (const [table, id] of links) {
    if (!id) continue;
    const { data } = await admin.from(table).select('organization_id').eq('id', id).maybeSingle();
    if (!data || data.organization_id !== org) return NextResponse.json({ error: 'invalid_link', details: { table } }, { status: 403 });
  }

  let rootId: string | null = null;
  let version = 1;
  if (meta.root_id) {
    const { data: root } = await admin.from('documents').select('id, organization_id, root_id').eq('id', meta.root_id).maybeSingle();
    if (!root || root.organization_id !== org) return NextResponse.json({ error: 'invalid_root' }, { status: 403 });
    rootId = root.root_id ?? root.id;
    const { data: versions } = await admin.from('documents').select('version').or(`id.eq.${rootId},root_id.eq.${rootId}`);
    version = Math.max(1, ...(versions ?? []).map((v) => Number(v.version))) + 1;
  }

  const scan = await scanFileWithVirusTotal(bytes, check.safeName);
  if (scan.status === 'malicious') {
    await logAudit({ organizationId: org, userId: auth.user.id, entityType: 'document', action: 'upload_blocked', details: { reason: 'malicious', name: check.safeName } });
    return NextResponse.json({ error: 'malicious_file', message: 'Fichier refusé par l’antivirus.' }, { status: 422 });
  }

  const id = randomUUID();
  const path = `${org}/${rootId ?? id}/v${version}-${check.safeName}`;
  const upload = await admin.storage.from('documents').upload(path, bytes, { contentType: check.mime, upsert: false });
  if (upload.error) return NextResponse.json({ error: 'storage_failed', message: upload.error.message }, { status: 500 });

  const { data, error } = await admin
    .from('documents')
    .insert({
      id,
      organization_id: org,
      kind: meta.kind,
      title: meta.title,
      description: meta.description ?? null,
      company_id: meta.company_id ?? null,
      consultant_id: meta.consultant_id ?? null,
      mission_id: meta.mission_id ?? null,
      opportunity_id: meta.opportunity_id ?? null,
      visibility: meta.visibility,
      storage_path: path,
      file_name: check.safeName,
      mime_type: check.mime,
      size_bytes: file.size,
      root_id: rootId,
      version,
      created_by: auth.user.id,
    })
    .select()
    .single();
  if (error) {
    await admin.storage.from('documents').remove([path]);
    return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
  }

  await logAudit({
    organizationId: org,
    userId: auth.user.id,
    entityType: 'document',
    entityId: id,
    action: version > 1 ? 'version_added' : 'created',
    details: { kind: meta.kind, version, scan: scan.status },
  });

  return NextResponse.json({ data }, { status: 201 });
}
