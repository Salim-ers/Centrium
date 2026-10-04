import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalClient } from '@/lib/portal/server';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';

const bodySchema = z.object({ action: z.enum(['accept', 'decline']) });

/** POST /api/client/quotes/:id — le client accepte ou refuse un devis envoyé. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getPortalClient();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const admin = createAdminClient('client-portal');
  const { data: quote } = await admin
    .from('quotes')
    .select('id, organization_id, company_id, status, number, title, created_by')
    .eq('id', params.id)
    .maybeSingle();
  if (!quote || quote.organization_id !== me.organizationId || quote.company_id !== me.companyId || quote.status === 'draft') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (quote.status !== 'sent') {
    return NextResponse.json({ error: 'invalid_transition', message: 'Ce devis a déjà reçu une réponse.' }, { status: 409 });
  }
  const accepted = parsed.data.action === 'accept';
  const { error } = await admin
    .from('quotes')
    .update({ status: accepted ? 'accepted' : 'declined', decided_at: new Date().toISOString() })
    .eq('id', quote.id)
    .eq('status', 'sent');
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

  if (quote.created_by) {
    await admin.from('notifications').insert({
      organization_id: quote.organization_id,
      user_id: quote.created_by,
      kind: 'quote_decision',
      priority: accepted ? 'high' : 'medium',
      title: `Devis ${quote.number ?? ''} ${accepted ? 'accepté' : 'refusé'} par le client`,
      body: quote.title,
      link: `/documents/quotes/${quote.id}`,
    });
  }
  await logAudit({
    organizationId: me.organizationId,
    userId: me.userId,
    entityType: 'quote',
    entityId: quote.id,
    action: accepted ? 'quote_accept' : 'quote_decline',
    details: { via: 'client_portal' },
  });
  return NextResponse.json({ data: { status: accepted ? 'accepted' : 'declined' } });
}
