import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperAdminContext } from '@/lib/auth/super-admin';

export const runtime = 'nodejs';

// Check centralisé (rôle super_admin + allowlist FOUNDER_EMAILS) —
// cf. lib/auth/super-admin.ts. Le wrapper local préserve les call-sites.
async function requireSuperAdmin() {
  const ctx = await getSuperAdminContext();
  return ctx?.user ?? null;
}

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'quoted', 'won', 'lost']).optional(),
  converted_to_organization_id: z.string().uuid().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('onboarding');
  const { data, error } = await admin
    .from('quote_requests')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createAdminClient('onboarding');
  const { error } = await admin
    .from('quote_requests')
    .delete()
    .eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
