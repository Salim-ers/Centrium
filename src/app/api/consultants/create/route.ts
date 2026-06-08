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

  // 3) Crée (ou réutilise) le user auth avec email déjà confirmé
  const listRes = await admin.auth.admin.listUsers();
  const existing = listRes.data.users.find(
    (u) => u.email?.toLowerCase() === portal_access.email.toLowerCase(),
  );

  let userId: string;
  if (existing) {
    // User déjà existant : on refuse pour éviter d'écraser un profile
    // appartenant potentiellement à une autre org.
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      {
        error: 'email_already_used',
        message: 'Cet email a déjà un compte. Choisis un autre email ou invite-le via /settings/team.',
      },
      { status: 409 },
    );
  }

  // Invite par email — le consultant choisit son propre mot de passe via
  // le lien Centrium. Pas de password généré côté admin.
  const reqUrl = new URL(req.url);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? `${reqUrl.protocol}//${reqUrl.host}`;
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/set-password?welcome=portal')}`;
  const { data: invited, error: authErr } = await admin.auth.admin.inviteUserByEmail(
    portal_access.email,
    {
      data: {
        first_name: consultantData.first_name,
        last_name: consultantData.last_name,
        portal_consultant_id: consultant.id,
      },
      redirectTo,
    },
  );
  if (authErr || !invited.user) {
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      { error: 'auth_invite_failed', message: authErr?.message ?? 'Auth error' },
      { status: 500 },
    );
  }
  userId = invited.user.id;

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

  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'consultant',
      consultant_id: consultant.id,
      organization_id: ctx.organizationId,
      first_name: consultantData.first_name,
      last_name: consultantData.last_name,
    })
    .eq('id', userId);
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from('consultants').delete().eq('id', consultant.id);
    return NextResponse.json(
      { error: 'profile_failed', message: profileErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: consultant,
      portal: {
        email: portal_access.email,
        user_id: userId,
        invitation_sent: true,
      },
    },
    { status: 201 },
  );
}
