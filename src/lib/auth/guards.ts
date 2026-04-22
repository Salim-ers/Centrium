import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

export type AuthContext = {
  user: { id: string; email: string };
  organizationId: string;
  role: UserRole;
};

/**
 * Exige un user connecté. Sinon → /login.
 */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Exige un user connecté AVEC une organisation active (membership réelle).
 * Sinon → /onboarding (pour créer/rejoindre une org) ou /login.
 */
export async function requireOrg(): Promise<AuthContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.organization_id) redirect('/onboarding');

  return {
    user: { id: user.id, email: user.email ?? '' },
    organizationId: profile.organization_id,
    role: profile.role as UserRole,
  };
}

/**
 * Exige un rôle spécifique dans l'organisation active.
 * Sinon → /unauthorized.
 */
export async function requireRole(allowed: UserRole[]): Promise<AuthContext> {
  const ctx = await requireOrg();
  if (!allowed.includes(ctx.role)) redirect('/unauthorized');
  return ctx;
}
