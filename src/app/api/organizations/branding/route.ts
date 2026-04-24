import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'must be #RGB or #RRGGBB')
  .transform((v) => v.toLowerCase());

const putSchema = z.object({
  brand_name: z.string().trim().min(1).max(120).nullable().optional(),
  footer_tagline: z.string().trim().max(160).nullable().optional(),
  brand_primary_color: hexColor.nullable().optional(),
  brand_accent_color: hexColor.nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
});

export async function GET() {
  const ctx = await requireOrg();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('organizations')
    .select(
      'id, name, logo_url, brand_name, footer_tagline, brand_primary_color, brand_accent_color',
    )
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

export async function PUT(req: NextRequest) {
  const ctx = await requireOrg();
  if (ctx.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .update(parsed.data)
    .eq('id', ctx.organizationId)
    .select(
      'id, name, logo_url, brand_name, footer_tagline, brand_primary_color, brand_accent_color',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
