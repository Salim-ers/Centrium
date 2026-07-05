import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { contractBaseSchema } from '@/lib/validators/contract';

// =========================================================================
// PATCH /api/contracts/:id  — update champs + status + archived
// DELETE /api/contracts/:id — suppression définitive
// =========================================================================

export const runtime = 'nodejs';

function computeEndDate(startDate: string, durationMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

// PATCH partiel : pas de refine party (un patch statut seul n'embarque pas
// la contrepartie) — la cohérence party/contrepartie est validée à la création.
const updateSchema = contractBaseSchema.partial().extend({
  status: z
    .enum(['draft', 'sent', 'signed', 'active', 'expired', 'terminated', 'canceled'])
    .optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');
  const { data: existing } = await admin
    .from('contracts')
    .select('organization_id, start_date, duration_months')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const patch: Record<string, unknown> = { ...parsed.data };

  // Recalcule end_date si start_date ou duration ont changé
  const nextStart = (patch.start_date as string | undefined) ?? existing.start_date;
  const nextDuration = (patch.duration_months as number | undefined) ?? existing.duration_months;
  if (patch.start_date || patch.duration_months) {
    patch.end_date = computeEndDate(nextStart, nextDuration);
  }

  // signed_at auto
  if (patch.status === 'signed') patch.signed_at = new Date().toISOString();

  const normalized = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [k, v === '' ? null : v]),
  );

  const { data, error } = await admin
    .from('contracts')
    .update(normalized)
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

  const admin = createAdminClient('cross-org-query');
  const { data: existing } = await admin
    .from('contracts')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('contracts').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
