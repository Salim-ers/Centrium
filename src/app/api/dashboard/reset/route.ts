import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// POST /api/dashboard/reset — Réinitialise les données transactionnelles
// de l'organisation pour repartir d'un dashboard cohérent.
//
// Le caller choisit les catégories à effacer. Tout est scopé à l'org
// courante via le service_role. Les données "référentielles" (consultants,
// offres ouvertes, contacts, organisation) ne sont JAMAIS touchées —
// pour ça il faut passer par les pages dédiées.
// =========================================================================

export const runtime = 'nodejs';

const bodySchema = z.object({
  scopes: z
    .array(z.enum(['missions', 'timesheets', 'invoices', 'alerts']))
    .min(1, 'Sélectionne au moins une catégorie à réinitialiser'),
  confirm: z.literal('RESET'),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  // Seul un admin peut wipe les données transactionnelles
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const scopes = new Set(parsed.data.scopes);
  const counts: Record<string, number> = {};

  // Ordre de suppression : du plus dépendant au moins dépendant
  // pour éviter les violations FK. Les timesheet_days cascadent avec
  // leur CRA. Les invoice_items cascadent avec leur facture.

  // 1. Invoices (peut avoir une FK vers timesheet et vers mission)
  if (scopes.has('invoices')) {
    const { data: del, error } = await admin
      .from('invoices')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: 'delete_failed', scope: 'invoices', message: error.message },
        { status: 500 },
      );
    }
    counts.invoices = del?.length ?? 0;
  }

  // 2. Timesheets (FK invoices.timesheet_id : on a déjà supprimé les
  // factures si scope invoices, sinon le delete échouera si une facture
  // existe — on renvoie un message clair).
  if (scopes.has('timesheets')) {
    const { data: blocking } = await admin
      .from('invoices')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .not('timesheet_id', 'is', null)
      .limit(1);
    if (blocking && blocking.length > 0 && !scopes.has('invoices')) {
      return NextResponse.json(
        {
          error: 'has_invoices',
          message:
            'Des factures référencent des CRA. Coche "Factures" pour les supprimer en même temps, ou supprime-les manuellement.',
        },
        { status: 409 },
      );
    }
    const { data: del, error } = await admin
      .from('timesheets')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: 'delete_failed', scope: 'timesheets', message: error.message },
        { status: 500 },
      );
    }
    counts.timesheets = del?.length ?? 0;
  }

  // 3. Missions (FK timesheets.mission_id, FK invoices.mission_id — déjà
  // vidées si scopes correspondants ; sinon on bloque proprement).
  if (scopes.has('missions')) {
    const { data: tsBlock } = await admin
      .from('timesheets')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .limit(1);
    if (tsBlock && tsBlock.length > 0 && !scopes.has('timesheets')) {
      return NextResponse.json(
        {
          error: 'has_timesheets',
          message:
            'Des CRA référencent des missions. Coche "CRAs" pour les supprimer en même temps.',
        },
        { status: 409 },
      );
    }
    const { data: invBlock } = await admin
      .from('invoices')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .not('mission_id', 'is', null)
      .limit(1);
    if (invBlock && invBlock.length > 0 && !scopes.has('invoices')) {
      return NextResponse.json(
        {
          error: 'has_invoices',
          message:
            'Des factures référencent des missions. Coche "Factures" pour les supprimer en même temps.',
        },
        { status: 409 },
      );
    }
    const { data: del, error } = await admin
      .from('missions')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: 'delete_failed', scope: 'missions', message: error.message },
        { status: 500 },
      );
    }
    counts.missions = del?.length ?? 0;
  }

  // 4. Alertes manuelles (les alertes calculées sont reconstruites par RPC,
  // on ne touche que la table `alerts` qui stocke l'état dismissed/résolu).
  if (scopes.has('alerts')) {
    const { data: del, error } = await admin
      .from('alerts')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: 'delete_failed', scope: 'alerts', message: error.message },
        { status: 500 },
      );
    }
    counts.alerts = del?.length ?? 0;
  }

  return NextResponse.json({ ok: true, counts }, { status: 200 });
}
