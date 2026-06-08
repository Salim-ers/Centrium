import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

// =========================================================================
// POST /api/admin/organizations — Provisionne un nouvel espace client.
//
// Workflow (super_admin only) :
//   1. Crée l'organisation avec son branding + ses mentions légales
//   2. Invite le premier admin par email (via auth admin invite)
//   3. Marque la demande de devis comme 'won' + lie l'org créée
// =========================================================================

export const runtime = 'nodejs';

async function requireSuperAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'super_admin') return null;
  return user;
}

const schema = z.object({
  // Identité
  name: z.string().min(1, 'Nom requis').max(200),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'kebab-case minuscules uniquement'),
  brand_name: z.string().max(80).optional().nullable(),

  // Branding visuel
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  signature_url: z.string().url().optional().nullable().or(z.literal('')),
  brand_primary_color: z.string().max(20).optional().nullable(),
  brand_accent_color: z.string().max(20).optional().nullable(),
  footer_tagline: z.string().max(200).optional().nullable(),

  // Coordonnées
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(60).optional().nullable(),

  // Mentions légales
  legal_form: z.string().max(40).optional().nullable(),
  siren: z.string().max(20).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  vat_number: z.string().max(30).optional().nullable(),
  rcs: z.string().max(100).optional().nullable(),
  capital_eur: z.coerce.number().min(0).optional().nullable(),

  // Signataire
  representative_name: z.string().max(120).optional().nullable(),
  representative_title: z.string().max(120).optional().nullable(),

  // Bancaire
  iban: z.string().max(40).optional().nullable(),
  bic: z.string().max(20).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),

  // Premier admin à inviter
  admin_email: z.string().email('Email invalide'),
  admin_first_name: z.string().max(80).optional().nullable(),
  admin_last_name: z.string().max(80).optional().nullable(),

  // Optionnel : lier au quote_request qu'on convertit
  quote_request_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');

  // Normalise '' → null pour les champs nullables.
  const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
  const data = parsed.data;
  const orgPayload = {
    name: data.name,
    slug: data.slug,
    brand_name: blank(data.brand_name) ?? data.name,
    logo_url: blank(data.logo_url),
    signature_url: blank(data.signature_url),
    brand_primary_color: blank(data.brand_primary_color),
    brand_accent_color: blank(data.brand_accent_color),
    footer_tagline: blank(data.footer_tagline),
    address: blank(data.address),
    city: blank(data.city),
    postal_code: blank(data.postal_code),
    country: blank(data.country),
    legal_form: blank(data.legal_form),
    siren: blank(data.siren),
    siret: blank(data.siret),
    vat_number: blank(data.vat_number),
    rcs: blank(data.rcs),
    capital_eur: data.capital_eur ?? null,
    representative_name: blank(data.representative_name),
    representative_title: blank(data.representative_title),
    iban: blank(data.iban),
    bic: blank(data.bic),
    bank_name: blank(data.bank_name),
  };

  // 1) Création de l'organisation
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert(orgPayload)
    .select('id, slug, name')
    .single();
  if (orgErr || !org) {
    return NextResponse.json(
      { error: 'org_create_failed', message: orgErr?.message ?? 'inconnu' },
      { status: 500 },
    );
  }

  // 2) Invitation du premier admin via auth.admin.inviteUserByEmail
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    data.admin_email,
    {
      data: {
        first_name: data.admin_first_name ?? null,
        last_name: data.admin_last_name ?? null,
        organization_id: org.id,
        role: 'admin',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/set-password`,
    },
  );
  if (inviteErr) {
    return NextResponse.json(
      {
        error: 'invite_failed',
        message: inviteErr.message,
        organization: org,
        note: "L'organisation a été créée mais l'invite a échoué. Renvoie une invitation manuellement.",
      },
      { status: 207 },
    );
  }

  // 3) Si le profile existe déjà (cas user déjà créé via une autre org), on
  //    le lie quand même à l'org courante en tant qu'admin.
  if (invite?.user?.id) {
    await admin
      .from('profiles')
      .update({
        organization_id: org.id,
        role: 'admin',
        first_name: data.admin_first_name ?? null,
        last_name: data.admin_last_name ?? null,
      })
      .eq('id', invite.user.id);
  }

  // 4) Marque le quote_request d'origine comme converti (si fourni)
  if (data.quote_request_id) {
    await admin
      .from('quote_requests')
      .update({
        status: 'won',
        converted_to_organization_id: org.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.quote_request_id);
  }

  return NextResponse.json(
    { data: { organization: org, invite_email: data.admin_email } },
    { status: 201 },
  );
}
