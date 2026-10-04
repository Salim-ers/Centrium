import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { quoteSchema } from '@/lib/validators/v2';
import { assertQuoteLinks } from '@/lib/documents/quote-links';

export const runtime = 'nodejs';

const actionSchema = z.object({
  action: z.enum(['mark_sent', 'accept', 'decline', 'expire', 'reopen', 'new_version']),
});

async function owned(id: string, org: string) {
  const admin = createAdminClient('cross-org-query');
  const { data } = await admin.from('quotes').select('*').eq('id', id).maybeSingle();
  return { admin, quote: data && data.organization_id === org ? data : null };
}

/** PUT /api/quotes/:id — modification d'un devis en brouillon (lignes remplacées). */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('documents.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = quoteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { admin, quote } = await owned(params.id, auth.organizationId);
  if (!quote) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (quote.status !== 'draft') {
    return NextResponse.json({ error: 'not_editable', message: 'Un devis envoyé ne se modifie plus : créez une nouvelle version.' }, { status: 409 });
  }
  const { items, ...fields } = parsed.data;
  const bad = await assertQuoteLinks(admin, auth.organizationId, { ...fields, consultants: items.map((i) => i.consultant_id) });
  if (bad) return NextResponse.json({ error: 'invalid_link', details: { table: bad } }, { status: 403 });

  const upd = await admin.from('quotes').update(fields).eq('id', quote.id);
  if (upd.error) return NextResponse.json({ error: 'update_failed', message: upd.error.message }, { status: 500 });
  await admin.from('quote_items').delete().eq('quote_id', quote.id);
  const ins = await admin.from('quote_items').insert(items.map((it, position) => ({ ...it, quote_id: quote.id, position })));
  if (ins.error) return NextResponse.json({ error: 'update_failed', message: ins.error.message }, { status: 500 });

  const { data } = await admin.from('quotes').select('*').eq('id', quote.id).single();
  await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'quote', entityId: quote.id, action: 'updated' });
  return NextResponse.json({ data });
}

/** POST /api/quotes/:id — transitions de statut et nouvelle version. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('documents.edit');
  if (auth instanceof NextResponse) return auth;
  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { admin, quote } = await owned(params.id, auth.organizationId);
  if (!quote) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const now = new Date().toISOString();
  const conflict = (m: string) => NextResponse.json({ error: 'invalid_transition', message: m }, { status: 409 });

  if (parsed.data.action === 'new_version') {
    const rootId = quote.root_id ?? quote.id;
    const { data: versions } = await admin.from('quotes').select('version').or(`id.eq.${rootId},root_id.eq.${rootId}`);
    const version = Math.max(1, ...(versions ?? []).map((v) => Number(v.version))) + 1;
    const { data: items } = await admin.from('quote_items').select('position, description, consultant_id, quantity, unit, unit_price').eq('quote_id', quote.id);
    const { id: _id, number: _n, created_at: _c, updated_at: _u, sent_at: _s, decided_at: _d, total_ht: _ht, total_ttc: _ttc, ...rest } = quote;
    void _id; void _n; void _c; void _u; void _s; void _d; void _ht; void _ttc;
    const { data: created, error } = await admin
      .from('quotes')
      .insert({ ...rest, root_id: rootId, version, status: 'draft', created_by: auth.user.id, issue_date: now.slice(0, 10) })
      .select()
      .single();
    if (error) return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
    if (items?.length) await admin.from('quote_items').insert(items.map((i) => ({ ...i, quote_id: created.id })));
    await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'quote', entityId: created.id, action: 'version_added', details: { from: quote.id, version } });
    const { data } = await admin.from('quotes').select('*').eq('id', created.id).single();
    return NextResponse.json({ data }, { status: 201 });
  }

  let patch: Record<string, unknown>;
  switch (parsed.data.action) {
    case 'mark_sent':
      if (quote.status !== 'draft') return conflict('Seul un brouillon peut être envoyé.');
      patch = { status: 'sent', sent_at: now };
      break;
    case 'accept':
    case 'decline':
      if (quote.status !== 'sent') return conflict('Seul un devis envoyé peut être accepté ou refusé.');
      patch = { status: parsed.data.action === 'accept' ? 'accepted' : 'declined', decided_at: now };
      break;
    case 'expire':
      if (quote.status !== 'sent') return conflict('Seul un devis envoyé peut expirer.');
      patch = { status: 'expired' };
      break;
    case 'reopen':
      if (!['declined', 'expired'].includes(quote.status)) return conflict('Statut incompatible.');
      patch = { status: 'sent', decided_at: null };
      break;
  }
  const { data, error } = await admin.from('quotes').update(patch).eq('id', quote.id).select().single();
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'quote', entityId: quote.id, action: `quote_${parsed.data.action}` });
  return NextResponse.json({ data });
}
