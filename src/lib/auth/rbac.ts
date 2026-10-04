import 'server-only';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrg, type AuthContext, type RequireOrgOptions } from './guards';
import {
  effectiveRole,
  resolvePermissions,
  type EffectiveRole,
  type Permission,
  type PermissionOverride,
} from './permissions';

export type Authorization = AuthContext & {
  effectiveRole: EffectiveRole;
  isOwner: boolean;
  permissions: Set<Permission>;
};

/**
 * Charge le drapeau propriétaire et les surcharges de permissions de
 * l'organisation. Tolérant : si la migration V2 n'est pas encore appliquée
 * (colonne / table absente), on retombe sur la matrice par défaut.
 */
async function loadRbacData(
  organizationId: string,
  userId: string,
): Promise<{ isOwner: boolean; overrides: PermissionOverride[] }> {
  const supabase = createClient();
  const [memberRes, overridesRes] = await Promise.all([
    supabase
      .from('organization_members')
      .select('is_owner')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('role_permissions')
      .select('role, permission, allowed')
      .eq('organization_id', organizationId),
  ]);
  const isOwner = !memberRes.error && !!(memberRes.data as { is_owner?: boolean } | null)?.is_owner;
  const overrides = overridesRes.error ? [] : ((overridesRes.data ?? []) as PermissionOverride[]);
  return { isOwner, overrides };
}

export async function getAuthorization(options?: RequireOrgOptions): Promise<Authorization> {
  const ctx = await requireOrg(options);
  const { isOwner, overrides } = await loadRbacData(ctx.organizationId, ctx.user.id);
  const role = effectiveRole(ctx.role, isOwner) ?? ctx.role;
  return {
    ...ctx,
    effectiveRole: role as EffectiveRole,
    isOwner,
    permissions: resolvePermissions(role as EffectiveRole, overrides),
  };
}

/** Pages serveur : redirige vers /unauthorized si la permission manque. */
export async function requirePermission(
  permission: Permission,
  options?: RequireOrgOptions,
): Promise<Authorization> {
  const auth = await getAuthorization(options);
  if (!auth.permissions.has(permission)) redirect('/unauthorized');
  return auth;
}

/**
 * Route handlers : renvoie soit l'autorisation, soit une réponse 403 prête
 * à être retournée.
 *
 *   const auth = await apiPermission('finance.edit');
 *   if (auth instanceof NextResponse) return auth;
 */
export async function apiPermission(
  permission: Permission,
  options?: RequireOrgOptions,
): Promise<Authorization | NextResponse> {
  const auth = await getAuthorization(options);
  if (!auth.permissions.has(permission)) {
    return NextResponse.json({ error: 'Forbidden', details: { permission } }, { status: 403 });
  }
  return auth;
}
