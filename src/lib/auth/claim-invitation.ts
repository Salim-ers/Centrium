import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// Rattachement AUTOMATIQUE d'un utilisateur authentifié à l'organisation
// qui l'a invité, par correspondance d'email.
// -------------------------------------------------------------------------
// Pourquoi : l'acceptation d'invitation ne se jouait QUE sur le clic exact
// du lien email (/invite/accept?token=…). Un invité qui entrait par
// n'importe quel autre chemin — « mot de passe oublié » (cas réel : lien
// d'invitation consommé par un scanner d'email), magic link, session déjà
// ouverte — restait orphelin : profil viewer sans organisation, invitation
// « En attente » pour toujours.
//
// Appelé à CHAQUE établissement de session (/auth/callback) et après la
// pose du mot de passe (/api/auth/update-password) : si une invitation
// pendante non expirée existe pour l'email du compte, elle est acceptée
// exactement comme le ferait /invite/accept.
//
// Garde-fous :
//   - ne touche JAMAIS un profil qui a déjà une organisation
//   - ne touche pas les consultants (leur canal d'activation est distinct)
//   - idempotent (conflit unique sur organization_members ignoré)
//   - best-effort : toute erreur → { claimed: false }, jamais de throw
// =========================================================================

export type ClaimResult = {
  claimed: boolean;
  organizationName: string | null;
};

const NO_CLAIM: ClaimResult = { claimed: false, organizationName: null };

export async function claimPendingInvitation(user: {
  id: string;
  email?: string | null;
}): Promise<ClaimResult> {
  try {
    const email = user.email?.trim().toLowerCase();
    if (!email) return NO_CLAIM;

    const admin = createAdminClient('invitation');

    // Jamais écraser une appartenance existante ; les consultants ont leur
    // propre parcours (portail) — on ne les reroute pas vers l'app admin.
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.organization_id) return NO_CLAIM;
    if (profile?.role === 'consultant') return NO_CLAIM;

    // Invitation pendante la plus récente pour cet email (insérées en
    // lowercase par POST /api/invitations — ilike = ceinture-bretelles).
    const { data: invite } = await admin
      .from('organization_invitations')
      .select('id, organization_id, role, expires_at, organizations(name, brand_name)')
      .ilike('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!invite) return NO_CLAIM;

    // Même séquence que /invite/accept : membership → invitation → profil.
    const { error: memberErr } = await admin.from('organization_members').insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      invited_by: null,
    });
    if (memberErr && memberErr.code !== '23505') return NO_CLAIM;

    await admin
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id);

    await admin
      .from('profiles')
      .update({ organization_id: invite.organization_id, role: invite.role })
      .eq('id', user.id);

    const orgRel = invite.organizations as unknown as
      | { name: string; brand_name: string | null }
      | { name: string; brand_name: string | null }[]
      | null;
    const org = Array.isArray(orgRel) ? orgRel[0] : orgRel;

    return { claimed: true, organizationName: org?.brand_name ?? org?.name ?? null };
  } catch {
    return NO_CLAIM;
  }
}
