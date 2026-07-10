import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { toCsv } from '@/lib/rgpd/org-export';
import { logAudit } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =========================================================================
// GET /api/accounting/export?year=2026&party=client|consultant
// -------------------------------------------------------------------------
// Journal des ventes (party=client) ou des achats (party=consultant) au
// format CSV, transmissible au comptable. Colonnes : n° de facture, dates,
// client/consultant, période, HT, TVA, TTC, statut, date de paiement.
// Réservé aux rôles admin / finance.
//
// NB : ce n'est PAS un fichier FEC certifié (format légal spécifique à
// implémenter avec un expert-comptable) — c'est un journal exploitable
// immédiatement en attendant. Le libellé de l'entête le précise.
// =========================================================================

export async function GET(req: NextRequest) {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin' && ctx.role !== 'finance') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year')) || new Date().getUTCFullYear();
  const party = url.searchParams.get('party') === 'consultant' ? 'consultant' : 'client';

  const admin = createAdminClient('cross-org-query');
  const { data, error } = await admin
    .from('invoices')
    .select(
      'invoice_number, party, status, issue_date, due_date, payment_date, period_label, amount_ht, amount_vat, amount_ttc, vat_rate, consultant_id, company_id, mission_id',
    )
    .eq('organization_id', ctx.organizationId)
    .eq('party', party)
    .gte('issue_date', `${year}-01-01`)
    .lte('issue_date', `${year}-12-31`)
    .order('issue_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'export_failed', message: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((i) => ({
    numero: i.invoice_number,
    type: party === 'client' ? 'Vente' : 'Achat',
    statut: i.status,
    date_emission: i.issue_date,
    date_echeance: i.due_date,
    date_paiement: i.payment_date ?? '',
    periode: i.period_label ?? '',
    montant_ht: i.amount_ht,
    taux_tva: i.vat_rate ?? '',
    montant_tva: i.amount_vat,
    montant_ttc: i.amount_ttc,
  }));

  const total = rows.reduce(
    (acc, r) => ({
      ht: acc.ht + Number(r.montant_ht ?? 0),
      tva: acc.tva + Number(r.montant_tva ?? 0),
      ttc: acc.ttc + Number(r.montant_ttc ?? 0),
    }),
    { ht: 0, tva: 0, ttc: 0 },
  );

  const header = `# Journal des ${party === 'client' ? 'ventes' : 'achats'} ${year} — Centrium (non FEC certifié)\n`;
  const csv = toCsv(rows as unknown as Array<Record<string, unknown>>);
  const footer = `\nTOTAL;;;;;;${total.ht.toFixed(2)};;${total.tva.toFixed(2)};${total.ttc.toFixed(2)}\n`;
  const body = header + csv + footer;

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    entityType: 'accounting_export',
    entityId: null,
    action: 'exported',
    details: { year, party, rows: rows.length },
  });

  const filename = `journal-${party === 'client' ? 'ventes' : 'achats'}-${year}.csv`;
  return new NextResponse('﻿' + body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
