import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { buildOrgExport } from '@/lib/rgpd/org-export';
import { logAudit } from '@/lib/audit/log';
import { reportError } from '@/lib/observability/report-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/organizations/export
 * -------------------------------------------------------------------------
 * Export complet des données de l'organisation courante (portabilité RGPD
 * art. 20). Réservé aux ADMINS de l'org. Le client peut ainsi récupérer
 * l'intégralité de ses données (consultants, contrats, factures, CRA…)
 * avant de quitter Centrium.
 *
 * On utilise le service_role (scopé explicitement à l'org de l'appelant)
 * pour garantir un export complet malgré les fences RLS (ex. données que le
 * rôle de l'admin ne verrait pas toutes en lecture directe).
 */
export async function POST() {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const admin = createAdminClient('rgpd-export');
    const bundle = await buildOrgExport(admin, ctx.organizationId);

    await logAudit({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      entityType: 'organization_data',
      entityId: ctx.organizationId,
      action: 'data.exported',
      details: { format: 'json', counts: bundle.meta.counts },
    });

    const body = JSON.stringify(bundle, null, 2);
    const filename = `centrium-org-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    await reportError(e, { route: '/api/organizations/export' });
    return NextResponse.json(
      { error: 'export_failed', message: (e as Error).message },
      { status: 500 },
    );
  }
}
