import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const BUCKET = 'organization-assets';
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB — une signature PNG reste légère
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  const admin = createAdminClient('cross-org-query');
  const ext = extFromMime(file.type);
  const path = `${ctx.organizationId}/signature-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) {
    return NextResponse.json(
      { error: 'upload_failed', message: upErr.message },
      { status: 500 },
    );
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const signatureUrl = pub.publicUrl;

  const { data: orgRow } = await admin
    .from('organizations')
    .select('signature_url')
    .eq('id', ctx.organizationId)
    .maybeSingle();

  const { error: updErr } = await admin
    .from('organizations')
    .update({ signature_url: signatureUrl })
    .eq('id', ctx.organizationId);
  if (updErr) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: 'persist_failed', message: updErr.message },
      { status: 500 },
    );
  }

  const prev = orgRow?.signature_url;
  if (prev && prev !== signatureUrl) {
    const marker = `/${BUCKET}/`;
    const idx = prev.indexOf(marker);
    if (idx >= 0) {
      const prevPath = prev.slice(idx + marker.length);
      if (prevPath.startsWith(`${ctx.organizationId}/`)) {
        await admin.storage.from(BUCKET).remove([prevPath]);
      }
    }
  }

  return NextResponse.json({ data: { signature_url: signatureUrl } }, { status: 201 });
}

export async function DELETE() {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('cross-org-query');
  const { data: orgRow } = await admin
    .from('organizations')
    .select('signature_url')
    .eq('id', ctx.organizationId)
    .maybeSingle();

  await admin
    .from('organizations')
    .update({ signature_url: null })
    .eq('id', ctx.organizationId);

  const prev = orgRow?.signature_url;
  if (prev) {
    const marker = `/${BUCKET}/`;
    const idx = prev.indexOf(marker);
    if (idx >= 0) {
      const prevPath = prev.slice(idx + marker.length);
      if (prevPath.startsWith(`${ctx.organizationId}/`)) {
        await admin.storage.from(BUCKET).remove([prevPath]);
      }
    }
  }

  return NextResponse.json({ data: { signature_url: null } }, { status: 200 });
}
