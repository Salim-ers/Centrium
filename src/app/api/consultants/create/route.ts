import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { consultantSchema } from '@/lib/validators';
import {
  enforceConsultantLimit,
  PlanLimitError,
  planLimitResponse,
} from '@/lib/billing/enforce';
import { sendPortalInvite, buildRedirectTo } from '@/lib/auth/sendInvite';

// =========================================================================
// POST /api/consultants/create
// -------------------------------------------------------------------------
// Crée un consultant dans l'organisation courante. Si portal_access est
// fourni (email + password), crée aussi un compte auth + lie le profile
// pour que le consultant puisse se connecter à /portal/*.
//
// Body :
//   {
//     ...champs consultantSchema,
//     portal_access?: { email: string, password: string }
//   }
//
// Réservé aux admin / business_manager / recruiter.
// =========================================================================

export const runtime = 'nodejs';

const portalAccessSchema = z.object({
  email: z.string().email('Email invalide'),
});

const bodySchema = consultantSchema.extend({
  portal_access: portalAccessSchema.optional(),
  is_prospect: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
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

  const { portal_access, is_prospect, ...consultantData } = parsed.data;

  // Quota plan : 1 consultant de plus (prospects et actifs comptent pareil
  // pour éviter le contournement "tout en prospect"). Le rôle "consultant"
  // du membership n'est PAS compté dans max_users (quota séparé).
  try {
    await enforceConsultantLimit(ctx.organizationId);
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json(planLimitResponse(e), { status: 402 });
    }
    throw e;
  }
  const admin = createAdminClient('cross-org-query');

  // Normalise les champs vides → null
  const normalized = Object.fromEntries(
    Object.entries(consultantData).map(([k, v]) => [k, v === '' ? null : v]),
  );

  // Si accès portail demandé, on veut l'email sur la fiche aussi
  const emailForConsultant = portal_access?.email ?? normalized.email ?? null;

  // Un prospect ne peut pas avoir un accès portail à la création :
  // il n'est pas encore dans l'effectif.
  if (is_prospect && portal_access) {
    return NextResponse.json(
      {
        error: 'prospect_portal_conflict',
        message: 'Un prospect ne peut pas avoir d\'accès portail. Promouvoir en consultant d\'abord.',
      },
      { status: 400 },
    );
  }

  // 1) Crée le consultant
  const { data: consultant, error: consultantErr } = await admin
    .from('consultants')
    .insert({
      ...normalized,
      email: emailForConsultant,
      organization_id: ctx.organizationId,
      is_prospect: is_prospect ?? false,
    })
    .select('*')
    .single();
  if (consultantErr) {
    // Conflit unique sur (organization_id, email) — cf. migration 046.
    if (
      consultantErr.code === '23505' ||
      /consultants_org_email_active_unique/i.test(consultantErr.message)
    ) {
      return NextResponse.json(
        {
          error: 'duplicate_email',
          message: `Un consultant avec l'email ${emailForConsultant} existe déjà dans cette organisation. Édite la fiche existante au lieu d'en créer une nouvelle.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'consultant_create_failed', message: consultantErr.message },
      { status: 500 },
    );
  }

  // 2) Pas d'accès portail → on s'arrête là
  if (!portal_access) {
    return NextResponse.json({ data: consultant }, { status: 201 });
  }

  // 3) Crée (ou réutilise) le user auth via le helper centralisé. Le helper
  // cascade : inviteUserByEmail → magiclink si déjà registered → generateLink
  // invite si SMTP en rade. On ne refuse PLUS catégoriquement si l'email
  // existe déjà : on le détecte (already_registered) et l'admin décide. Le
  // helper renvoie une invite_url copiable si l'email n'a pas pu partir.
  const redirectTo = buildRedirectTo(
    new URL(req.url),
    '/auth/set-password?welcome=portal',
  );
  const invite = await sendPortalInvite({
    email: portal_access.email,
    redirectTo,
    data: {
      first_name: consultantData.first_name,
      last_name: consultantData.last_name,
      portal_consultant_id: consultant.id,
    },
    admin,
    reason: 'invitation',
  });

  // Politique de sécurité : on refuse explicitement d'attacher un user
  // qui existe déjà dans Supabase Auth (potentiellement dans une autre org).
  // L'admin doit choisir un autre email ou utiliser /settings/team.
  if (invite.already_registered) {
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      {
        error: 'email_already_used',
        message:
          "Cet email a déjà un compte. Choisis un autre email ou invite-le via /settings/team.",
      },
      { status: 409 },
    );
  }

  if (!invite.user_id) {
    // Échec total — ni invite, ni link de secours. On rollback.
    // Log le message brut côté serveur, ne le renvoie PAS à l'UI.
    console.error('[consultants/create] sendPortalInvite total failure', {
      email: portal_access.email,
      code: invite.email_error_code,
      raw: invite.email_error_raw,
    });
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      {
        error: 'auth_invite_failed',
        email_error_code: invite.email_error_code ?? 'auth_failed',
      },
      { status: 500 },
    );
  }
  const userId: string = invite.user_id;

  // 4) Membership + profile consultant
  const { error: memberErr } = await admin.from('organization_members').upsert(
    { organization_id: ctx.organizationId, user_id: userId, role: 'consultant' },
    { onConflict: 'organization_id,user_id' },
  );
  if (memberErr) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      { error: 'member_failed', message: memberErr.message },
      { status: 500 },
    );
  }

  // Garde-fou cross-org ATOMIQUE : l'UPDATE ne mute le row QUE si org_id
  // est NULL ou == org courante. On vérifie via RETURNING : si 0 row touché,
  // c'est qu'un autre org owns déjà ce profile → on rollback (member + user
  // + consultant). Cette form atomique évite la TOCTOU window d'un SELECT
  // suivi d'un UPDATE.
  const { data: updatedRows, error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultant.id,
      organization_id: ctx.organizationId,
      first_name: consultantData.first_name,
      last_name: consultantData.last_name,
    })
    .eq('id', userId)
    .or(`organization_id.is.null,organization_id.eq.${ctx.organizationId}`)
    .select('id');

  async function rollbackAll(deleteUser = true) {
    await admin
      .from('organization_members')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', ctx.organizationId);
    if (deleteUser) await admin.auth.admin.deleteUser(userId);
    await admin.from('consultants').delete().eq('id', consultant.id);
  }

  if (profileErr) {
    await rollbackAll();
    return NextResponse.json(
      { error: 'profile_failed', message: profileErr.message },
      { status: 500 },
    );
  }
  if (!updatedRows || updatedRows.length === 0) {
    // Aucun row matché → le profile existe mais appartient à une autre org.
    // On ne supprime PAS le user auth (il appartient à l'autre org !)
    await rollbackAll(false);
    return NextResponse.json(
      {
        error: 'cross_org_profile_conflict',
        message:
          "Cet email a déjà un profil dans une autre organisation. Choisis un autre email.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      data: consultant,
      portal: {
        email: portal_access.email,
        user_id: userId,
        invitation_sent: invite.email_sent,
        // Présent UNIQUEMENT si email n'a pas pu être envoyé — l'UI le
        // copie dans le presse-papier et affiche un toast warning.
        invite_url: invite.email_sent ? null : invite.invite_url,
        // Code coarse (rate_limited/smtp_failed/...) — JAMAIS le message
        // brut Supabase qui leak des détails infra à l'UI.
        email_error_code: invite.email_error_code,
      },
    },
    { status: 201 },
  );
}
