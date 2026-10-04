import { NextResponse } from 'next/server';

import { apiPermission } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { getExecutiveDashboard } from '@/lib/services/dashboard.service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard — tableau de bord exécutif de l'organisation active.
 * L'organisation vient de la session (jamais du client) ; les lectures
 * passent par RLS et sont filtrées par permission.
 */
export async function GET() {
  const auth = await apiPermission('dashboard.view');
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await getExecutiveDashboard(createClient(), {
      organizationId: auth.organizationId,
      can: (p) => auth.permissions.has(p),
    });
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    logger.error('[dashboard] aggregation failed', (e as Error).message);
    return NextResponse.json({ error: 'dashboard_unavailable' }, { status: 500 });
  }
}
