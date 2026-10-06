import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthorization } from '@/lib/auth/rbac';
import { consultantSchema } from '@/lib/validators';

export const runtime = 'nodejs';

const bodySchema = consultantSchema.partial();

// PATCH /api/consultants/:id — met à jour un consultant (edit dialog).
// Passe par le service_role pour éviter les aller-retours RLS côté client
// et les éventuels hangs de refresh token qu'on a vus en prod.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getAuthorization();
  if (!ctx.permissions.has('consultants.edit')) {
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

  const { data: existing, error: existingErr } = await admin
    .from('consultants')
    .select('id, organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const normalized = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  const { data, error } = await admin
    .from('consultants')
    .update(normalized)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) {
    if (
      error.code === '23505' ||
      /consultants_org_email_active_unique/i.test(error.message)
    ) {
      return NextResponse.json(
        {
          error: 'duplicate_email',
          message:
            "Un autre consultant utilise déjà cet email dans cette organisation.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 200 });
}
