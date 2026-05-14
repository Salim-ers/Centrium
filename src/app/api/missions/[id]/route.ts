import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// PATCH /api/missions/:id  — change le statut ou édite des champs
// DELETE /api/missions/:id — supprime la mission
// =========================================================================

export const runtime = 'nodejs';

const patchSchema = z.object({
  status: z.enum(['proposed', 'active', 'ended', 'suspended', 'rejected']).optional(),
  title: z.string().min(1).max(200).optional(),
  daily_rate_eur: z.coerce.number().min(0).max(5000).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  contract_number: z.string().optional().nullable(),
  archived: z.boolean().optional(),
  rejection_reason: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('missions')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const payload: Record<string, unknown> = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );
  // Stamp/unstamp archived_at automatiquement quand le flag bascule
  if (parsed.data.archived === true) {
    payload.archived_at = new Date().toISOString();
  } else if (parsed.data.archived === false) {
    payload.archived_at = null;
  }
  // Stamp rejected_at quand on bascule en rejected ; on l'efface si on
  // restaure la proposition (rejected → autre statut).
  if (parsed.data.status === 'rejected') {
    payload.rejected_at = new Date().toISOString();
  } else if (parsed.data.status) {
    payload.rejected_at = null;
    payload.rejection_reason = null;
  }

  const { data, error } = await admin
    .from('missions')
    .update(payload)
    .eq('id', params.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('missions')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('missions').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
