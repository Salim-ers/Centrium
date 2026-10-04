import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { toCsv } from '@/lib/rgpd/org-export';
import { logAudit } from '@/lib/audit/log';
import { deliverWebhook } from '@/lib/integrations/webhook';
import { checkExportThrottle } from '@/lib/security/export-throttle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

/**
 * POST /api/finance/export — export CSV des préfactures VALIDÉES
 * sélectionnées, à importer dans l'outil comptable ou la plateforme agréée
 * de l'ESN. Centrium n'émet pas de facture électronique réglementaire :
 * l'export marque seulement les préfactures comme transmises à votre outil.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('finance.edit');
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });

  const throttle = await checkExportThrottle({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'prefactures',
    requestedRows: parsed.data.ids.length,
  });
  if (!throttle.allowed) return NextResponse.json({ error: 'throttled', message: throttle.reason }, { status: 429 });

  const admin = createAdminClient('cross-org-query');
  const { data: invoices, error } = await admin
    .from('invoices')
    .select('*, companies(name), consultants(first_name, last_name), missions(title, contract_number)')
    .eq('organization_id', auth.organizationId)
    .in('id', parsed.data.ids)
    .not('validated_at', 'is', null)
    .neq('status', 'cancelled')
    .order('issue_date');
  if (error) return NextResponse.json({ error: 'export_failed', message: error.message }, { status: 500 });
  if (!invoices?.length) {
    return NextResponse.json({ error: 'nothing_to_export', message: 'Aucune préfacture validée dans la sélection.' }, { status: 409 });
  }

  const rows = invoices.map((i) => {
    const company = i.companies as { name: string } | null;
    const consultant = i.consultants as { first_name: string; last_name: string } | null;
    const mission = i.missions as { title: string; contract_number: string | null } | null;
    return {
      numero: i.invoice_number,
      type: i.party === 'consultant' ? 'Achat (sous-traitance)' : 'Vente',
      tiers: i.party === 'consultant' ? (consultant ? `${consultant.first_name} ${consultant.last_name}` : '') : (company?.name ?? ''),
      mission: mission?.title ?? '',
      reference_contrat: mission?.contract_number ?? '',
      periode: i.period_label ?? '',
      quantite_jours: i.quantity ?? '',
      prix_unitaire_ht: i.unit_price ?? '',
      montant_ht: i.amount_ht,
      taux_tva: i.vat_rate ?? '',
      montant_tva: i.amount_vat,
      montant_ttc: i.amount_ttc,
      date: i.issue_date,
      echeance: i.due_date,
    };
  });

  const now = new Date().toISOString();
  await admin
    .from('invoices')
    .update({ export_status: 'exported', exported_at: now, external_provider: 'csv' })
    .in(
      'id',
      invoices.map((i) => i.id),
    );

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'prefactures',
    action: 'exported',
    details: { count: rows.length },
  });

  void deliverWebhook(auth.organizationId, 'prefactures.exported', { exported_at: now, count: rows.length, items: rows });

  const header = '# Préfactures Centrium — à importer dans votre outil comptable ou votre plateforme agréée (document non fiscal)\n';
  const body = '﻿' + header + toCsv(rows as unknown as Array<Record<string, unknown>>);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="prefactures-${now.slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
