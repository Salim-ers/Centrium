import { NextRequest, NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { invitationSchema } from '@/lib/validators';
import {
  enforceMemberLimit,
  PlanLimitError,
  planLimitResponse,
} from '@/lib/billing/enforce';

// =========================================================================
// POST /api/invitations — Crée une invitation pour l'organisation active
// -------------------------------------------------------------------------
// Seul un admin de l'org peut inviter.
// 1. Crée la ligne dans `organization_invitations` (token unique)
// 2. Tente d'envoyer l'email Centrium via Supabase Auth (template "invite"
//    déjà brandé via Management API). Si l'email est déjà connu, fallback
//    sur magic link. Si tout échoue, on garde l'URL pour copie manuelle.
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { organizationId, role, user } = await requireOrg();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Quota plan : invitations = futurs utilisateurs internes. Le schéma
  // n'autorise pas le rôle 'consultant' ici (les consultants sont créés
  // via /api/consultants/create avec leur propre quota).
  try {
    await enforceMemberLimit(organizationId);
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json(planLimitResponse(e), { status: 402 });
    }
    throw e;
  }

  const supabase = createClient();

  // 1. Récupère le nom de l'org (pour le metadata du mail)
  const { data: org } = await supabase
    .from('organizations')
    .select('name, brand_name')
    .eq('id', organizationId)
    .maybeSingle();
  const orgDisplayName = org?.brand_name ?? org?.name ?? 'votre organisation';

  // 2. Crée l'invitation en DB
  const { data: invite, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invited_by: user.id,
    })
    .select('token')
    .single();

  if (error) {
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  }

  // 3. Construit l'URL de redirection après vérification email Supabase.
  // On passe par /auth/callback qui échange le code Supabase en cookies
  // sur NOTRE domaine (PKCE flow), puis redirige vers /invite/accept.
  // Sans ça, certaines configs laissent les cookies sur le domaine
  // Supabase et l'utilisateur arrive non-authentifié sur l'app.
  const reqUrl = new URL(req.url);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  const acceptPath = `/invite/accept?token=${invite.token}`;
  const callbackUrl = `${appUrl}/auth/callback?next=${encodeURIComponent(acceptPath)}`;
  // URL "directe" pour le fallback manuel (toast lien copié)
  const acceptUrl = `${appUrl}${acceptPath}`;

  // 4. Envoie l'email d'invitation via Supabase Auth (template "invite"
  //    déjà brandé Centrium). Fallback magic-link si le compte existe déjà.
  const admin = createAdminClient('invitation');
  const inviteData = {
    invitation_token: invite.token,
    organization_name: orgDisplayName,
    role: parsed.data.role,
  };

  let emailSent = false;
  let emailError: string | null = null;

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email.toLowerCase(),
    {
      redirectTo: callbackUrl,
      data: inviteData,
    },
  );
  if (!inviteErr) {
    emailSent = true;
  } else if (
    /already (been )?registered|already exists|user already/i.test(inviteErr.message)
  ) {
    // Compte déjà existant → on envoie un magic link à la place
    const { error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: parsed.data.email.toLowerCase(),
      options: { redirectTo: callbackUrl, data: inviteData },
    });
    if (!linkErr) {
      emailSent = true;
    } else {
      emailError = linkErr.message;
    }
  } else {
    emailError = inviteErr.message;
  }

  return NextResponse.json(
    {
      url: acceptUrl,
      email: parsed.data.email,
      email_sent: emailSent,
      email_error: emailError,
    },
    { status: 201 },
  );
}
