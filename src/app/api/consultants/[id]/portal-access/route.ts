import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// POST /api/consultants/:id/portal-access
// -------------------------------------------------------------------------
// Crée un compte d'authentification + un profile lié au consultant et
// envoie au consultant un email d'invitation pour qu'il choisisse SON
// propre mot de passe. On ne génère plus de mot de passe côté admin —
// l'admin ne voit jamais le secret.
//
// Idempotent : si le consultant a déjà un profile portail, renvoie 409.
//
// Body : { email }
// Réservé aux admin / business_manager / recruiter.
// =========================================================================

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email('Email invalide'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 1) Vérifie que le consultant existe et appartient à l'org courante
  const { data: consultant } = await admin
    .from('consultants')
    .select('id, organization_id, first_name, last_name, is_prospect')
    .eq('id', params.id)
    .maybeSingle();
  if (!consultant) {
    return NextResponse.json({ error: 'consultant_not_found' }, { status: 404 });
  }
  if (consultant.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (consultant.is_prospect) {
    return NextResponse.json(
      {
        error: 'is_prospect',
        message:
          "Un prospect ne peut pas avoir d'accès portail. Promouvoir en consultant d'abord.",
      },
      { status: 400 },
    );
  }

  // 2) Existe-t-il déjà un profile portail pour ce consultant ?
  const { data: existing } = await admin
    .from('profiles')
    .select('id, role')
    .eq('consultant_id', consultant.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: 'already_has_portal',
        message: 'Ce consultant a déjà un accès portail.',
      },
      { status: 409 },
    );
  }

  // 3) Email déjà utilisé par un autre user ?
  const listRes = await admin.auth.admin.listUsers();
  const emailExists = listRes.data.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (emailExists) {
    return NextResponse.json(
      {
        error: 'email_already_used',
        message:
          'Cet email a déjà un compte. Choisis un autre email pour cet accès portail.',
      },
      { status: 409 },
    );
  }

  // 4) Invite le consultant : Supabase crée le user (email pas encore
  //    confirmé) et envoie le mail "invite" Centrium avec un lien qui le
  //    fait atterrir sur le set-password. Aucun mot de passe côté admin.
  const reqUrl = new URL(req.url);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  // /auth/callback gère l'échange du code PKCE puis redirige sur set-password
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/set-password?welcome=portal')}`;
  const { data: invited, error: authErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        first_name: consultant.first_name,
        last_name: consultant.last_name,
        portal_consultant_id: consultant.id,
      },
      redirectTo,
    },
  );
  if (authErr || !invited.user) {
    return NextResponse.json(
      { error: 'auth_invite_failed', message: authErr?.message ?? 'Auth error' },
      { status: 500 },
    );
  }
  const userId = invited.user.id;

  // 5) Membership organization_members + profile lié au consultant
  const { error: memberErr } = await admin.from('organization_members').upsert(
    { organization_id: ctx.organizationId, user_id: userId, role: 'consultant' },
    { onConflict: 'organization_id,user_id' },
  );
  if (memberErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'member_failed', message: memberErr.message },
      { status: 500 },
    );
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultant.id,
      organization_id: ctx.organizationId,
      first_name: consultant.first_name,
      last_name: consultant.last_name,
    })
    .eq('id', userId);
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'profile_failed', message: profileErr.message },
      { status: 500 },
    );
  }

  // Met aussi à jour l'email sur la fiche consultant si elle est vide
  await admin
    .from('consultants')
    .update({ email: parsed.data.email })
    .eq('id', consultant.id)
    .is('email', null);

  return NextResponse.json(
    {
      data: {
        user_id: userId,
        email: parsed.data.email,
        invitation_sent: true,
      },
    },
    { status: 201 },
  );
}
