import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// PATCH /api/portal/profile
// -------------------------------------------------------------------------
// Le consultant connecté met à jour les champs personnels de sa fiche.
// Champs business (TJM, séniorité, statut, internal_notes) restent admin-only.
// =========================================================================

export const runtime = 'nodejs';

// Liste blanche stricte des champs modifiables par le consultant lui-même
const editableSchema = z.object({
  email: z.string().email('Email invalide').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  linkedin_url: z.string().url('URL invalide').optional().nullable().or(z.literal('')),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(3).optional().nullable(),
  mobility: z.string().max(200).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrg();
  if (ctx.role !== 'consultant') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Réservé aux consultants.' },
      { status: 403 },
    );
  }

  const parsed = editableSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');

  // Récupère le consultant_id lié au profile
  const { data: profile } = await admin
    .from('profiles')
    .select('consultant_id')
    .eq('id', ctx.user.id)
    .maybeSingle();

  if (!profile?.consultant_id) {
    return NextResponse.json(
      { error: 'no_consultant', message: 'Pas de fiche consultant liée.' },
      { status: 404 },
    );
  }

  // Normalise les "" en null
  const payload = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v]),
  );

  // Defense-in-depth : on borne aussi la mise à jour à l'org du caller,
  // au cas où profile.consultant_id pointerait par accident vers une fiche
  // d'une autre org (impossible aujourd'hui mais zéro coût).
  const { data, error } = await admin
    .from('consultants')
    .update(payload)
    .eq('id', profile.consultant_id)
    .eq('organization_id', ctx.organizationId)
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
