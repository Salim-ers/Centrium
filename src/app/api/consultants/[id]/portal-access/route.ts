import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { sendPortalInvite, buildRedirectTo } from '@/lib/auth/sendInvite';

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

  const admin = createAdminClient('cross-org-query');

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

  // 3 + 4) Invite via helper centralisé. Le helper détecte already_registered
  // (via inviteUserByEmail error). On garde la même politique que /create :
  // refuser si l'email existe déjà dans auth (potentiellement dans une autre org).
  // Le helper fournit aussi une invite_url de secours si le SMTP a planté,
  // que l'UI copiera dans le presse-papier.
  const redirectTo = buildRedirectTo(
    new URL(req.url),
    '/auth/first-password?welcome=portal',
  );
  const invite = await sendPortalInvite({
    email: parsed.data.email,
    redirectTo,
    data: {
      first_name: consultant.first_name,
      last_name: consultant.last_name,
      portal_consultant_id: consultant.id,
    },
    admin,
    reason: 'invitation',
  });

  if (invite.already_registered) {
    return NextResponse.json(
      {
        error: 'email_already_used',
        message:
          'Cet email a déjà un compte. Choisis un autre email pour cet accès portail.',
      },
      { status: 409 },
    );
  }

  if (!invite.user_id) {
    console.error('[consultants/portal-access] sendPortalInvite total failure', {
      email: parsed.data.email,
      code: invite.email_error_code,
      raw: invite.email_error_raw,
    });
    return NextResponse.json(
      {
        error: 'auth_invite_failed',
        email_error_code: invite.email_error_code ?? 'auth_failed',
      },
      { status: 500 },
    );
  }
  const userId = invite.user_id;

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

  // Garde-fou cross-org ATOMIQUE : UPDATE ne mute que si org_id NULL ou
  // == org courante. Si 0 row matché → rollback membership + user + 409.
  const { data: updatedRows, error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultant.id,
      organization_id: ctx.organizationId,
      first_name: consultant.first_name,
      last_name: consultant.last_name,
    })
    .eq('id', userId)
    .or(`organization_id.is.null,organization_id.eq.${ctx.organizationId}`)
    .select('id');

  async function rollbackPortal(deleteUser = true) {
    await admin
      .from('organization_members')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', ctx.organizationId);
    if (deleteUser) await admin.auth.admin.deleteUser(userId);
  }

  if (profileErr) {
    await rollbackPortal();
    return NextResponse.json(
      { error: 'profile_failed', message: profileErr.message },
      { status: 500 },
    );
  }
  if (!updatedRows || updatedRows.length === 0) {
    // Profile existe mais appartient à une autre org → on garde le user
    // auth (il est à eux !) mais on retire la membership qu'on a posée.
    await rollbackPortal(false);
    return NextResponse.json(
      {
        error: 'cross_org_profile_conflict',
        message:
          "Cet email a déjà un profil dans une autre organisation. Choisis un autre email.",
      },
      { status: 409 },
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
        invitation_sent: invite.email_sent,
        // Présent UNIQUEMENT si l'email n'a pas pu être envoyé — l'UI le
        // copie dans le presse-papier et affiche un toast warning.
        invite_url: invite.email_sent ? null : invite.invite_url,
        email_error_code: invite.email_error_code,
      },
    },
    { status: 201 },
  );
}
