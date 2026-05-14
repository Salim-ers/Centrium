import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { jobOfferSchema } from '@/lib/validators';

// =========================================================================
// PATCH /api/offers/:id  — Met à jour l'offre
// DELETE /api/offers/:id — Supprime l'offre
// =========================================================================

export const runtime = 'nodejs';

const updateSchema = jobOfferSchema.partial().extend({
  status: z.enum(['open', 'closed', 'won', 'lost']).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Vérifie que l'offre appartient bien à l'org courante
  const { data: existing } = await admin
    .from('job_offers')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const payload: Record<string, unknown> = normalizeEmpty(parsed.data);
  if (parsed.data.archived === true) {
    payload.archived_at = new Date().toISOString();
  } else if (parsed.data.archived === false) {
    payload.archived_at = null;
  }
  const { data, error } = await admin
    .from('job_offers')
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
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('job_offers')
    .select('organization_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('job_offers').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'delete_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

function normalizeEmpty<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]),
  ) as T;
}
