import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPortalInvite, buildRedirectTo } from '@/lib/auth/sendInvite';
import { rateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit/log';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/** GET /api/portals/clients — accès au portail client de l'organisation. */
export async function GET() {
  const auth = await apiPermission('portals.manage');
  if (auth instanceof NextResponse) return auth;
  const admin = createAdminClient('portal-access');
  const { data, error } = await admin
    .from('client_portal_users')
    .select('user_id, company_id, contact_id, email, created_at, last_seen_at, revoked_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ data: [] });
  return NextResponse.json({ data });
}

const inviteSchema = z.object({
  company_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  email: z.string().trim().toLowerCase().email('Email invalide').max(254),
});

/**
 * POST /api/portals/clients — ouvre un accès au portail client : compte
 * d'authentification (invitation par email, le client choisit son mot de
 * passe), rôle `client` sans organisation, rattachement à UNE société.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('portals.manage');
  if (auth instanceof NextResponse) return auth;
  const rl = await rateLimit(`portal-invite:${auth.organizationId}`, { limit: 30, windowSec: 3600 });
  if (!rl.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });

  const parsed = inviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const { company_id, contact_id, email } = parsed.data;
  const admin = createAdminClient('portal-access');

  const { data: company } = await admin.from('companies').select('id, organization_id, name').eq('id', company_id).maybeSingle();
  if (!company || company.organization_id !== auth.organizationId) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let contactName: { first_name: string; last_name: string } | null = null;
  if (contact_id) {
    const { data: contact } = await admin.from('contacts').select('organization_id, first_name, last_name').eq('id', contact_id).maybeSingle();
    if (!contact || contact.organization_id !== auth.organizationId) return NextResponse.json({ error: 'invalid_contact' }, { status: 403 });
    contactName = { first_name: contact.first_name, last_name: contact.last_name };
  }

  const invite = await sendPortalInvite({
    email,
    redirectTo: buildRedirectTo(new URL(req.url), '/auth/first-password?welcome=client'),
    data: { first_name: contactName?.first_name ?? '', last_name: contactName?.last_name ?? '', portal_client_company_id: company.id },
    admin,
    reason: 'invitation',
  });
  if (invite.already_registered) {
    return NextResponse.json(
      { error: 'email_already_used', message: 'Cet email a déjà un compte Centrium. Utilisez une autre adresse pour l’accès client.' },
      { status: 409 },
    );
  }
  if (!invite.user_id) {
    logger.error('[portals/clients] invite failed', { code: invite.email_error_code });
    return NextResponse.json({ error: 'auth_invite_failed', email_error_code: invite.email_error_code ?? 'auth_failed' }, { status: 500 });
  }
  const userId = invite.user_id;

  // Profil : rôle client, AUCUNE organisation (les policies internes le
  // refusent par défaut). Garde-fou : uniquement un profil vierge.
  const { data: updated, error: profileErr } = await admin
    .from('profiles')
    .update({
      role: 'client',
      organization_id: null,
      consultant_id: null,
      first_name: contactName?.first_name ?? '',
      last_name: contactName?.last_name ?? '',
    })
    .eq('id', userId)
    .is('organization_id', null)
    .select('id');
  if (profileErr || !updated?.length) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'profile_failed', message: profileErr?.message ?? 'conflict' }, { status: 500 });
  }
  const { error: accessErr } = await admin.from('client_portal_users').insert({
    user_id: userId,
    organization_id: auth.organizationId,
    company_id: company.id,
    contact_id: contact_id ?? null,
    email,
    invited_by: auth.user.id,
  });
  if (accessErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'access_failed', message: accessErr.message }, { status: 500 });
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'client_portal_user',
    entityId: userId,
    action: 'invited',
    details: { company_id: company.id, email_domain: email.split('@')[1] ?? null },
  });
  return NextResponse.json(
    { data: { user_id: userId, email_sent: invite.email_sent, invite_url: invite.email_sent ? null : invite.invite_url } },
    { status: 201 },
  );
}
