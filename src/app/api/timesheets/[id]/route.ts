import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// DELETE /api/timesheets/:id — Supprime un CRA (hard delete).
//
// Refus si une facture référence ce CRA (FK invoices.timesheet_id). Le
// caller doit d'abord détacher / supprimer la facture liée. Les
// timesheet_days cascadent automatiquement (ON DELETE CASCADE).
// =========================================================================

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient('cross-org-query');
  const { data: existing } = await admin
    .from('timesheets')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Vérifie qu'aucune facture ne référence ce CRA (FK RESTRICT par défaut).
  const { data: invoiceLink } = await admin
    .from('invoices')
    .select('id, invoice_number')
    .eq('timesheet_id', params.id)
    .limit(1)
    .maybeSingle();
  if (invoiceLink) {
    return NextResponse.json(
      {
        error: 'has_invoice',
        message: `Impossible : la facture ${invoiceLink.invoice_number} est liée à ce CRA. Supprime ou détache d'abord la facture.`,
      },
      { status: 409 },
    );
  }

  const { error } = await admin.from('timesheets').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
