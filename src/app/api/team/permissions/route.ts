import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { assignableRoles, ROLE_UNAVAILABLE } from '@/lib/auth/role-support';
import { createClient } from '@/lib/supabase/server';
import { LOCKED_PERMISSIONS, PERMISSIONS, defaultPermissions, type Permission } from '@/lib/auth/permissions';

export const runtime = 'nodejs';

const OVERRIDABLE_ROLES = ['admin', 'direction', 'business_manager', 'commercial', 'recruiter', 'operations', 'finance', 'viewer'] as const;

/** GET /api/team/permissions — surcharges de l'organisation. */
export async function GET() {
  const auth = await apiPermission('team.manage', { skipSubscriptionGate: true });
  if (auth instanceof NextResponse) return auth;
  const admin = createAdminClient('team-management');
  const { data, error } = await admin.from('role_permissions').select('role, permission, allowed').eq('organization_id', auth.organizationId);
  if (error) return NextResponse.json({ data: [], unavailable: true });
  return NextResponse.json({ data });
}

const putSchema = z.object({
  role: z.enum(OVERRIDABLE_ROLES),
  permission: z.enum(PERMISSIONS as unknown as [Permission, ...Permission[]]),
  /** true / false : surcharge ; null : retour à la valeur par défaut. */
  allowed: z.boolean().nullable(),
});

/**
 * PUT /api/team/permissions — accorde, retire ou réinitialise une
 * permission pour un rôle. Les permissions verrouillées (suppression de
 * l'organisation, facturation, gestion de l'équipe) ne se surchargent pas.
 */
export async function PUT(req: NextRequest) {
  const auth = await apiPermission('team.manage', { skipSubscriptionGate: true });
  if (auth instanceof NextResponse) return auth;
  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { role, permission, allowed } = parsed.data;
  // Rôles étendus : la contrainte de role_permissions ne les accepte qu'après la migration 106.
  if (!(await assignableRoles(createClient())).includes(role)) {
    return NextResponse.json(ROLE_UNAVAILABLE, { status: 409 });
  }
  if (LOCKED_PERMISSIONS.includes(permission)) {
    return NextResponse.json({ error: 'locked', message: 'Permission réservée au propriétaire et aux administrateurs.' }, { status: 409 });
  }

  const admin = createAdminClient('team-management');
  const isDefault = defaultPermissions(role).includes(permission);
  // Une surcharge identique à la valeur par défaut est simplement supprimée.
  if (allowed === null || allowed === isDefault) {
    const { error } = await admin.from('role_permissions').delete().eq('organization_id', auth.organizationId).eq('role', role).eq('permission', permission);
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from('role_permissions')
      .upsert({ organization_id: auth.organizationId, role, permission, allowed, updated_by: auth.user.id }, { onConflict: 'organization_id,role,permission' });
    if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'permission',
    action: 'permission_changed',
    details: { role, permission, allowed: allowed === null ? 'default' : allowed },
  });
  return NextResponse.json({ data: { role, permission, allowed: allowed === null ? isDefault : allowed } });
}
