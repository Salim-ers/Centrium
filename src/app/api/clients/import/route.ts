import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit/log';
import { clientSchema } from '@/lib/validators/v2';

export const runtime = 'nodejs';

const bodySchema = z.object({ rows: z.array(z.unknown()).min(1).max(1000) });

/**
 * POST /api/clients/import — import de sociétés (clients, prospects,
 * partenaires). Chaque ligne est revalidée ; les sociétés déjà présentes
 * (même nom, sans tenir compte de la casse) ne sont pas dupliquées.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('clients.edit');
  if (auth instanceof NextResponse) return auth;
  const rl = await rateLimit(`clients-import:${auth.organizationId}`, { limit: 10, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const valid: Array<z.output<typeof clientSchema>> = [];
  let invalid = 0;
  for (const r of parsed.data.rows) {
    const v = clientSchema.safeParse(r);
    if (v.success) valid.push(v.data);
    else invalid++;
  }

  const admin = createAdminClient('cross-org-query');
  const { data: existing } = await admin.from('companies').select('name').eq('organization_id', auth.organizationId).limit(20000);
  const seen = new Set((existing ?? []).map((c) => String(c.name).trim().toLowerCase()));
  const fresh = valid.filter((v) => {
    const key = v.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let created = 0;
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200).map((v) => ({ ...v, organization_id: auth.organizationId }));
    const { error } = await admin.from('companies').insert(chunk);
    if (error) return NextResponse.json({ error: 'insert_failed', message: error.message, data: { created } }, { status: 500 });
    created += chunk.length;
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'company',
    action: 'csv_import',
    details: { created, duplicates: valid.length - fresh.length, invalid },
  });
  return NextResponse.json({ data: { created, duplicates: valid.length - fresh.length, invalid } }, { status: 201 });
}
