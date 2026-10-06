import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { ALL_ASSIGNABLE_ROLES } from '@/lib/auth/permissions';
import { assignableRoles, ROLE_UNAVAILABLE } from '@/lib/auth/role-support';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bodySchema = z.object({ role: z.enum(ALL_ASSIGNABLE_ROLES) });

/**
 * PATCH /api/team/members/:userId — change le rôle d'un membre interne.
 * Garde-fous : le propriétaire reste administrateur ; l'organisation garde
 * au moins un administrateur.
 */
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await apiPermission('team.manage', { skipSubscriptionGate: true });
  if (auth instanceof NextResponse) return auth;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const role = parsed.data.role;
  if (!(await assignableRoles(createClient())).includes(role)) {
    return NextResponse.json(ROLE_UNAVAILABLE, { status: 409 });
  }

  const admin = createAdminClient('team-management');
  const { data: members, error } = await admin
    .from('organization_members')
    .select('user_id, role, is_owner')
    .eq('organization_id', auth.organizationId)
    .not('role', 'in', '(consultant,client)');
  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  const target = (members ?? []).find((m) => m.user_id === params.userId);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (target.role === role) return NextResponse.json({ data: { role } });

  if (target.is_owner && role !== 'admin') {
    return NextResponse.json(
      { error: 'owner_must_be_admin', message: 'Le propriétaire reste administrateur : transférez d’abord la propriété.' },
      { status: 409 },
    );
  }
  const admins = (members ?? []).filter((m) => m.role === 'admin');
  if (target.role === 'admin' && role !== 'admin' && admins.length <= 1) {
    return NextResponse.json({ error: 'last_admin', message: 'L’organisation doit garder au moins un administrateur.' }, { status: 409 });
  }

  const upd = await admin.from('organization_members').update({ role }).eq('organization_id', auth.organizationId).eq('user_id', target.user_id);
  if (upd.error) return NextResponse.json({ error: 'update_failed', message: upd.error.message }, { status: 500 });
  await admin.from('profiles').update({ role }).eq('id', target.user_id).eq('organization_id', auth.organizationId);

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'member',
    entityId: target.user_id,
    action: 'role_changed',
    details: { from: target.role, to: role },
  });
  return NextResponse.json({ data: { role } });
}
