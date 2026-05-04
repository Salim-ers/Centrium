import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const SELECT_COLS =
  'id, name, slug, logo_url, brand_name, footer_tagline, address, city, postal_code, country, siren, siret, vat_number, rcs, capital_eur, legal_form, representative_name, representative_title, signature_url, iban, bic, bank_name';

const patchSchema = z.object({
  address: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(3).nullable().optional(),
  siren: z.string().trim().max(20).nullable().optional(),
  siret: z.string().trim().max(20).nullable().optional(),
  vat_number: z.string().trim().max(40).nullable().optional(),
  rcs: z.string().trim().max(120).nullable().optional(),
  capital_eur: z.coerce.number().min(0).nullable().optional(),
  legal_form: z.string().trim().max(40).nullable().optional(),
  representative_name: z.string().trim().max(120).nullable().optional(),
  representative_title: z.string().trim().max(120).nullable().optional(),
  // Coordonnées bancaires (RIB / IBAN / BIC) imprimées sur les factures.
  iban: z.string().trim().max(40).nullable().optional(),
  bic: z.string().trim().max(20).nullable().optional(),
  bank_name: z.string().trim().max(120).nullable().optional(),
});

export async function GET() {
  const ctx = await requireOrg();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('organizations')
    .select(SELECT_COLS)
    .eq('id', ctx.organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrg();
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Normalise les "" → null pour conserver une valeur "non renseignée" propre.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .update(payload)
    .eq('id', ctx.organizationId)
    .select(SELECT_COLS)
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}
