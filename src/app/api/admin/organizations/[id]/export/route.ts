import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';
import { buildOrgExport } from '@/lib/rgpd/org-export';
import { reportError } from '@/lib/observability/report-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/organizations/:id/export
 * -------------------------------------------------------------------------
 * Export complet des données d'une organisation depuis la super-console.
 * Sert de sauvegarde préalable OBLIGATOIRE avant toute suppression définitive
 * (le DELETE refuse tant qu'aucun export n'a été effectué). Super_admin only.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const admin = createAdminClient('org-deletion');
    const bundle = await buildOrgExport(admin, params.id);
    if (!bundle.organization) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Marque cet export dans le journal d'audit : c'est la preuve exigée
    // par le DELETE (« une org ne se supprime jamais sans export préalable »).
    await admin.from('activities').insert({
      organization_id: params.id,
      user_id: ctx.user.id,
      entity_type: 'organization_data',
      entity_id: params.id,
      action: 'data.exported',
      details: { by: 'super_admin', counts: bundle.meta.counts },
    });

    const body = JSON.stringify(bundle, null, 2);
    const filename = `centrium-org-${params.id}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    await reportError(e, { route: '/api/admin/organizations/[id]/export' });
    return NextResponse.json(
      { error: 'export_failed', message: (e as Error).message },
      { status: 500 },
    );
  }
}
