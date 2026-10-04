import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { deliverWebhook } from '@/lib/integrations/webhook';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['validate', 'unvalidate', 'mark_sent', 'mark_paid', 'cancel']),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * PATCH /api/finance/prefactures/:id — cycle de la préfacturation.
 *   validate   : la préfacture est contrôlée, prête à l'export
 *   unvalidate : retour en contrôle (impossible si déjà exportée)
 *   mark_sent  : facture émise dans l'outil comptable / la plateforme agréée
 *   mark_paid  : paiement constaté
 *   cancel     : préfacture abandonnée (avant émission uniquement)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiPermission('finance.edit');
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { action, payment_date } = parsed.data;

  const admin = createAdminClient('cross-org-query');
  const { data: inv } = await admin
    .from('invoices')
    .select('id, organization_id, status, invoice_number, amount_ht, amount_ttc, validated_at, export_status, company_id, mission_id, period_label, party')
    .eq('id', params.id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (inv.organization_id !== auth.organizationId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const conflict = (message: string) => NextResponse.json({ error: 'invalid_transition', message }, { status: 409 });
  let patch: Record<string, unknown>;
  switch (action) {
    case 'validate':
      if (inv.status !== 'draft') return conflict('Seule une préfacture peut être validée.');
      patch = { validated_at: new Date().toISOString(), validated_by: auth.user.id };
      break;
    case 'unvalidate':
      if (inv.export_status === 'exported') return conflict('Préfacture déjà exportée : annulez-la dans votre outil comptable.');
      patch = { validated_at: null, validated_by: null };
      break;
    case 'mark_sent':
      if (!['draft', 'overdue'].includes(inv.status)) return conflict('Statut incompatible.');
      if (!inv.validated_at) return conflict('Validez la préfacture avant de la déclarer émise.');
      patch = { status: 'sent' };
      break;
    case 'mark_paid':
      if (!['sent', 'overdue'].includes(inv.status)) return conflict('Seule une facture émise peut être marquée payée.');
      patch = { status: 'paid', payment_date: payment_date ?? new Date().toISOString().slice(0, 10) };
      break;
    case 'cancel':
      if (inv.status !== 'draft') return conflict('Seule une préfacture non émise peut être annulée.');
      patch = { status: 'cancelled' };
      break;
  }

  const { data, error } = await admin.from('invoices').update(patch).eq('id', inv.id).select().single();
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'invoice',
    entityId: inv.id,
    action: `prefacture_${action}`,
    details: { invoice_number: inv.invoice_number },
  });

  if (action === 'validate') {
    void deliverWebhook(auth.organizationId, 'prefacture.validated', {
      id: inv.id,
      number: inv.invoice_number,
      party: inv.party,
      amount_ht: inv.amount_ht,
      amount_ttc: inv.amount_ttc,
      company_id: inv.company_id,
      mission_id: inv.mission_id,
      period: inv.period_label,
    });
  }

  return NextResponse.json({ data });
}
