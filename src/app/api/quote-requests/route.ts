import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, clientIp } from '@/lib/ratelimit/in-memory';

// =========================================================================
// POST /api/quote-requests — Formulaire public "Demande de devis".
//
// Insert dans quote_requests (DB) via service_role. La notification
// email part DIRECTEMENT DU NAVIGATEUR vers Formspree (cf. devis/page.tsx)
// — Formspree refuse souvent les submissions server-to-server sans
// referer browser.
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
  wanted_help: z.array(z.string().max(60)).max(10).optional().nullable(),
  /** URL publique du logo uploadé en amont vers le bucket quote-attachments. */
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  // Anti-spam : 5 requêtes par IP par minute. La route est exposée au
  // formulaire public /devis donc on protège contre les bots.
  const rl = rateLimit({
    key: `quote-requests:${clientIp(req)}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: 'too_many_requests',
        message: 'Trop de demandes envoyées. Réessayez dans une minute.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      },
    );
  }

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
      industry: parsed.data.industry || null,
      team_size: parsed.data.team_size || null,
      consultants_count: parsed.data.consultants_count || null,
      contact_phone: parsed.data.contact_phone || null,
      contact_role: parsed.data.contact_role || null,
      message: parsed.data.message || null,
      source: parsed.data.source || null,
      wanted_help:
        parsed.data.wanted_help && parsed.data.wanted_help.length > 0
          ? parsed.data.wanted_help
          : null,
      logo_url: parsed.data.logo_url || null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'insert_failed', message: error.message, details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
