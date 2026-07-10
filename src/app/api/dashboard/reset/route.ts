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

// Les missions ne sont JAMAIS supprimées par un reset : ce sont des
// éléments du pipeline commercial (CV poussés + En Mission) qui
// doivent survivre à un wipe des données comptables.
const bodySchema = z.object({
  scopes: z
    .array(z.enum(['timesheets', 'invoices', 'alerts']))
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

  const admin = createAdminClient('cross-org-query');
  const scopes = new Set(parsed.data.scopes);
  const counts: Record<string, number> = {};

  // Ordre de suppression : du plus dépendant au moins dépendant
  // pour éviter les violations FK. Les timesheet_days cascadent avec
  // leur CRA. Les invoice_items cascadent avec leur facture.

  // 1. Invoices — UNIQUEMENT les brouillons et annulées. Une facture ÉMISE
  // (sent/paid/overdue) est un document comptable à valeur légale : elle ne
  // doit JAMAIS être supprimée (inaltérabilité art. L123-22 + conservation
  // 10 ans). Le reset ne nettoie donc que le travail non émis.
  if (scopes.has('invoices')) {
    const { data: del, error } = await admin
      .from('invoices')
      .delete()
      .eq('organization_id', ctx.organizationId)
      .in('status', ['draft', 'cancelled'])
      .select('id');
    if (error) {
      return NextResponse.json(
        { error: 'delete_failed', scope: 'invoices', message: error.message },
        { status: 500 },
      );
    }
    counts.invoices = del?.length ?? 0;
    // Combien de factures émises ont été CONSERVÉES (information au caller).
    const { count: kept } = await admin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId);
    counts.invoices_kept = kept ?? 0;
  }

  // 2. Timesheets — bloqués si une facture (forcément émise, car les
  // brouillons viennent d'être purgés) référence encore un CRA : on ne peut
  // pas casser le lien d'une facture légale.
  if (scopes.has('timesheets')) {
    const { data: blocking } = await admin
      .from('invoices')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .not('timesheet_id', 'is', null)
      .limit(1);
    if (blocking && blocking.length > 0) {
      return NextResponse.json(
        {
          error: 'has_invoices',
          message:
            'Des factures émises (non supprimables car documents légaux) référencent des CRA. Ces CRA ne peuvent pas être réinitialisés.',
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

  // Les missions ne sont jamais supprimées par cette route — elles
  // représentent le pipeline commercial vivant (CV poussés + En Mission)
  // qui doit survivre à un reset comptable.

  // 3. Alertes manuelles (les alertes calculées sont reconstruites par RPC,
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
