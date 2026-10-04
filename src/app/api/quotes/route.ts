import { NextRequest, NextResponse } from 'next/server';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { quoteSchema } from '@/lib/validators/v2';
import { assertQuoteLinks } from '@/lib/documents/quote-links';

export const runtime = 'nodejs';

/** POST /api/quotes — création d'un devis et de ses lignes. */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('documents.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = quoteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { items, ...quote } = parsed.data;
  const admin = createAdminClient('cross-org-query');

  const bad = await assertQuoteLinks(admin, auth.organizationId, { ...quote, consultants: items.map((i) => i.consultant_id) });
  if (bad) return NextResponse.json({ error: 'invalid_link', details: { table: bad } }, { status: 403 });

  const { data: created, error } = await admin
    .from('quotes')
    .insert({ ...quote, organization_id: auth.organizationId, created_by: auth.user.id, status: 'draft' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });

  const lines = items.map((it, position) => ({ ...it, quote_id: created.id, position }));
  const { error: itemsError } = await admin.from('quote_items').insert(lines);
  if (itemsError) {
    await admin.from('quotes').delete().eq('id', created.id);
    return NextResponse.json({ error: 'create_failed', message: itemsError.message }, { status: 500 });
  }
  const { data } = await admin.from('quotes').select('*').eq('id', created.id).single();

  await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'quote', entityId: created.id, action: 'created', details: { number: data?.number } });
  return NextResponse.json({ data }, { status: 201 });
}
