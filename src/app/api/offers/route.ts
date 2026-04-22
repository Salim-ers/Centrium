import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';
import { jobOfferSchema } from '@/lib/validators';

// =========================================================================
// POST /api/offers — Crée une offre / mission dans l'organisation courante.
//
// Utilise le service_role côté serveur pour éviter les soucis de RLS et
// permettre l'affichage d'erreurs détaillées côté UI.
// =========================================================================

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = jobOfferSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = normalizeEmpty({
    ...parsed.data,
    organization_id: ctx.organizationId,
    status: 'open',
  });

  const admin = createAdminClient();
  const { data, error } = await admin.from('job_offers').insert(payload).select().single();
  if (error) {
    return NextResponse.json(
      { error: 'create_failed', message: error.message, details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

function normalizeEmpty<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]),
  ) as T;
}
