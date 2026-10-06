import { NextResponse } from 'next/server';

import { apiPermission } from '@/lib/auth/rbac';
import { assignableRoles } from '@/lib/auth/role-support';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/team/roles — rôles internes que l'organisation peut attribuer,
 * selon l'état de la base (Commercial et Opérations après les migrations
 * 105-106). Sert aux invitations, aux changements de rôle et à la matrice.
 */
export async function GET() {
  const auth = await apiPermission('team.manage', { skipSubscriptionGate: true });
  if (auth instanceof NextResponse) return auth;
  const roles = await assignableRoles(createClient());
  return NextResponse.json({ data: { roles } }, { headers: { 'Cache-Control': 'private, no-store' } });
}
