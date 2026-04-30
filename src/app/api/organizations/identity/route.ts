import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const SELECT_COLS =
  'id, name, slug, logo_url, brand_name, footer_tagline, address, city, postal_code, country, siren, siret, vat_number, rcs, capital_eur, legal_form, representative_name, representative_title, signature_url';

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
