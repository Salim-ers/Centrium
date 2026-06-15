import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ensureFileSafe } from '@/lib/security/virustotal';

export const runtime = 'nodejs';

/**
 * POST /api/admin/upload-asset
 *
 * Upload d'un asset (logo ou signature) AVANT que l'organisation
 * existe — pour le formulaire de provisioning super-admin.
 *
 * Le fichier est stocké dans le bucket `organization-assets` sous le
 * chemin `_pending/<uuid>/<kind>-<timestamp>.<ext>`. Le bucket est public
 * en lecture donc l'URL renvoyée fonctionne immédiatement.
 *
 * Une fois l'org créée, on garde cette URL telle quelle (pas de
 * déplacement nécessaire). Cleanup éventuel des assets `_pending`
 * orphelins peut être fait par un cron mensuel.
 *
 * Sécurité : réservé au super_admin (3 niveaux de check : middleware,
 * route handler, RLS storage du bucket).
 */
const KIND_SCHEMA = z.enum(['logo', 'signature']);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const BUCKET = 'organization-assets';

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'bin';
}

function randomId(): string {
  return globalThis.crypto.randomUUID();
}

async function requireSuperAdmin() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'super_admin') return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const kindRaw = form?.get('kind');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  const kindParse = KIND_SCHEMA.safeParse(kindRaw);
  if (!kindParse.success) {
    return NextResponse.json(
      { error: 'invalid_kind', message: 'kind doit être "logo" ou "signature"' },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'invalid_size', message: 'Fichier vide ou > 5 MB.' },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'invalid_type', message: 'PNG, JPG, WebP ou SVG uniquement.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');
  const ext = extFromMime(file.type);
  const pendingId = randomId();
  const path = `_pending/${pendingId}/${kindParse.data}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  // Scan antivirus VirusTotal sur l'asset uploadé (logo, signature)
  // Bloque l'upload si ≥ 2 moteurs détectent une menace.
  const scan = await ensureFileSafe({
    buf,
    fileName: `${kindParse.data}.${ext}`,
    userId: user.id,
    context: 'admin_asset_upload',
  });
  if (!scan.ok) {
    return NextResponse.json(
      {
        error: 'malicious_file',
        message: 'Fichier détecté comme malveillant — upload bloqué.',
      },
      { status: 422 },
    );
  }

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

  return NextResponse.json(
    {
      data: {
        url: pub.publicUrl,
        path,
        kind: kindParse.data,
      },
    },
    { status: 201 },
  );
}
