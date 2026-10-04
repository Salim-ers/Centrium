import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// Identité côté serveur des utilisateurs des portails. Toutes les lectures
// des portails faites avec le client admin DOIVENT être bornées par ces
// identifiants (organisation + consultant, ou organisation + société).
// =========================================================================

export type PortalConsultantIdentity = { userId: string; organizationId: string; consultantId: string };
export type PortalClientIdentity = {
  userId: string;
  email: string;
  organizationId: string;
  companyId: string;
  contactId: string | null;
};

/** Consultant connecté (rôle consultant + fiche liée), sinon null. */
export async function getPortalConsultant(): Promise<PortalConsultantIdentity | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role, organization_id, consultant_id').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'consultant' || !profile.consultant_id || !profile.organization_id) return null;
  return { userId: user.id, organizationId: profile.organization_id, consultantId: profile.consultant_id };
}

/**
 * Utilisateur du portail client : rôle `client` ET accès actif (non révoqué)
 * dans client_portal_users. La société et l'organisation viennent de cet
 * accès, jamais de la requête.
 */
export async function getPortalClient(): Promise<PortalClientIdentity | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'client') return null;
  const admin = createAdminClient('client-portal');
  const { data: access } = await admin
    .from('client_portal_users')
    .select('organization_id, company_id, contact_id, email, revoked_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!access || access.revoked_at) return null;
  return {
    userId: user.id,
    email: access.email,
    organizationId: access.organization_id,
    companyId: access.company_id,
    contactId: access.contact_id,
  };
}
