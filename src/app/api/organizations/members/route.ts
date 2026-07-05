import { NextRequest, NextResponse } from 'next/server';

import { requireOrg } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// GET    /api/organizations/members  — liste membres + invitations de l'org active
// DELETE /api/organizations/members?userId=…  — retire un membre interne
// -------------------------------------------------------------------------
// Pourquoi admin-backed plutôt que RLS direct depuis le client :
// la page /settings/team lisait `organization_members` via le client RLS.
// Selon le compte (fondateur multi-org, super_admin, résolution JWT de
// `organization_id()`), la jointure `profiles!inner` pouvait renvoyer 0
// alors que la bannière quota (API admin) comptait 8 → « compteur pas réel »
// + suppressions silencieusement sans effet (policy DELETE role_in='admin').
//
// Ici la SOURCE est unique et cohérente avec le compteur de quota
// (getQuotaUsage, lui aussi admin) : plus de divergence liste ↔ compteur,
// et la suppression persiste vraiment. Autorisation explicite via requireOrg
// (org active de l'appelant) + check de rôle pour la mutation.
// =========================================================================

export const runtime = 'nodejs';

type MemberRow = {
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_founder: boolean;
};

export async function GET() {
  // skipSubscriptionGate : /settings reste accessible même abonnement inactif.
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  const admin = createAdminClient('team-management');

  const [{ data: membersRaw }, { data: invitesRaw }] = await Promise.all([
    admin
      .from('organization_members')
      .select('user_id, role, joined_at, profiles(email, first_name, last_name, is_founder)')
      .eq('organization_id', ctx.organizationId)
      .neq('role', 'consultant')
      .order('joined_at', { ascending: true }),
    admin
      .from('organization_invitations')
      .select('id, email, role, token, expires_at, accepted_at, created_at')
      .eq('organization_id', ctx.organizationId)
      .neq('role', 'consultant')
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const members: MemberRow[] = (membersRaw ?? []).map((m) => {
    const p = m.profiles as unknown as {
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      is_founder: boolean | null;
    } | null;
    return {
      user_id: m.user_id as string,
      role: m.role as string,
      joined_at: m.joined_at as string,
      email: p?.email ?? null,
      first_name: p?.first_name ?? null,
      last_name: p?.last_name ?? null,
      is_founder: !!p?.is_founder,
    };
  });

  return NextResponse.json({ data: { members, invitations: invitesRaw ?? [] } });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireOrg({ skipSubscriptionGate: true });
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });
  }
  // On ne se retire pas soi-même (garde-fou anti-lock-out, miroir de l'ancienne
  // policy RLS members_delete `user_id <> auth.uid()`).
  if (userId === ctx.user.id) {
    return NextResponse.json(
      { error: 'cannot_remove_self', message: 'Tu ne peux pas te retirer toi-même.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient('team-management');

  // Cible : membre INTERNE de CETTE org (jamais un consultant — canal séparé).
  const { data: target } = await admin
    .from('organization_members')
    .select('user_id, role, profiles(is_founder)')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', userId)
    .neq('role', 'consultant')
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const targetFounder = !!(target.profiles as unknown as { is_founder: boolean | null } | null)
    ?.is_founder;
  if (targetFounder) {
    return NextResponse.json(
      { error: 'cannot_remove_founder', message: 'Un compte fondateur ne peut pas être retiré ici.' },
      { status: 400 },
    );
  }

  const { error: delErr } = await admin
    .from('organization_members')
    .delete()
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', userId);
  if (delErr) {
    return NextResponse.json({ error: 'delete_failed', message: delErr.message }, { status: 500 });
  }

  // Le profil ne pointe plus vers une org dont il n'est plus membre : sinon
  // « membre fantôme » (profil rattaché mais absent de la liste). On le
  // détache uniquement si son org courante était bien celle-ci.
  await admin
    .from('profiles')
    .update({ organization_id: null, role: 'viewer' })
    .eq('id', userId)
    .eq('organization_id', ctx.organizationId);

  return NextResponse.json({ data: { ok: true } });
}
