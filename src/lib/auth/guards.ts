import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { evaluateSubscriptionAccess } from '@/lib/billing/access';
import type { UserRole } from '@/types';

export type AuthContext = {
  user: { id: string; email: string };
  organizationId: string;
  role: UserRole;
};

export type RequireOrgOptions = {
  /**
   * Désactive le gating d'abonnement pour cette route. À réserver aux
   * routes qui doivent rester accessibles même quand l'abonnement est
   * inactif — miroir de la whitelist middleware (/billing, /settings) :
   *   - routes /api/billing/* (souscrire, payer, portail Stripe)
   *   - routes RGPD (/api/me/export, /api/me/delete-request)
   *   - branding / identité (pages /settings accessibles en denied)
   * TOUTES les autres routes métier restent gated par défaut.
   */
  skipSubscriptionGate?: boolean;
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
 *
 * GATING ABONNEMENT (défense en profondeur) : le middleware bloque déjà les
 * PAGES quand l'abonnement est inactif, mais il exclut /api/* de son matcher.
 * Sans ce check, une org impayée/expirée pouvait continuer à muter ses
 * données en appelant les routes API directement. On applique donc ici la
 * MÊME matrice (lib/billing/access.ts) : deny → redirect /billing?error=…
 * (un fetch() client suit la redirection et échoue proprement).
 * Bypass : consultants (ne paient pas le plan) et orgs exemptes.
 */
export async function requireOrg(options?: RequireOrgOptions): Promise<AuthContext> {
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

  const role = profile.role as UserRole;

  if (!options?.skipSubscriptionGate && role !== 'consultant') {
    // RLS subs_select : tout membre de l'org peut lire sa souscription.
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end, is_exempt_from_billing')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    const access = evaluateSubscriptionAccess(sub ?? null);
    if (!access.allowed) {
      redirect(`/billing?error=${encodeURIComponent(access.reason)}`);
    }
  }

  return {
    user: { id: user.id, email: user.email ?? '' },
    organizationId: profile.organization_id,
    role,
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
