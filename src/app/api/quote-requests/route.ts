import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';

// =========================================================================
// POST /api/quote-requests — Formulaire public "Demande de devis".
//
// Pas d'auth requise : un prospect remplit /devis et son message arrive
// ici. On insère via service_role pour bypasser RLS (la policy INSERT
// existe pour anon, mais on préfère stamper côté serveur pour avoir
// l'IP, user-agent, etc. plus tard si besoin).
// =========================================================================

export const runtime = 'nodejs';

const schema = z.object({
  company_name: z.string().min(1, 'Nom de société requis').max(200),
  industry: z.string().max(100).optional().nullable(),
  team_size: z.string().max(50).optional().nullable(),
  consultants_count: z.string().max(50).optional().nullable(),
  contact_name: z.string().min(1, 'Nom du contact requis').max(120),
  contact_email: z.string().email('Email invalide').max(200),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_role: z.string().max(120).optional().nullable(),
  message: z.string().max(5000).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('quote_requests')
    .insert({
      ...parsed.data,
      // Normalise '' → null pour les champs optionnels.
      industry: parsed.data.industry || null,
      team_size: parsed.data.team_size || null,
      consultants_count: parsed.data.consultants_count || null,
      contact_phone: parsed.data.contact_phone || null,
      contact_role: parsed.data.contact_role || null,
      message: parsed.data.message || null,
      source: parsed.data.source || null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'insert_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
