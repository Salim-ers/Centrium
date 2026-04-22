import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrg } from '@/lib/auth/guards';

// =========================================================================
// POST /api/missions — Affecte un consultant à une offre / mission
// -------------------------------------------------------------------------
// Body : { consultant_id, job_offer_id?, title, daily_rate_eur, start_date,
//          end_date?, company_id? }
// Crée une mission status='proposed'. Devient 'active' après validation
// admin (PATCH /api/missions/:id { status: 'active' }).
// =========================================================================

export const runtime = 'nodejs';

const createSchema = z.object({
  consultant_id: z.string().uuid(),
  job_offer_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  daily_rate_eur: z.coerce.number().min(0).max(5000),
  start_date: z.string().min(1, 'Date de début requise'),
  end_date: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (!['admin', 'business_manager', 'recruiter'].includes(ctx.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Vérifie que le consultant et l'offre appartiennent bien à cette org
  const { data: consultant } = await admin
    .from('consultants')
    .select('organization_id, first_name, last_name, daily_rate_eur')
    .eq('id', parsed.data.consultant_id)
    .maybeSingle();
  if (!consultant) return NextResponse.json({ error: 'consultant_not_found' }, { status: 404 });
  if (consultant.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (parsed.data.job_offer_id) {
    const { data: offer } = await admin
      .from('job_offers')
      .select('organization_id, company_id')
      .eq('id', parsed.data.job_offer_id)
      .maybeSingle();
    if (!offer || offer.organization_id !== ctx.organizationId) {
      return NextResponse.json({ error: 'offer_invalid' }, { status: 403 });
    }
    // Hérite du company_id si pas fourni
    if (!parsed.data.company_id && offer.company_id) {
      parsed.data.company_id = offer.company_id;
    }
  }

  const payload = {
    organization_id: ctx.organizationId,
    consultant_id: parsed.data.consultant_id,
    job_offer_id: parsed.data.job_offer_id ?? null,
    opportunity_id: parsed.data.opportunity_id ?? null,
    company_id: parsed.data.company_id ?? null,
    title: parsed.data.title,
    daily_rate_eur: parsed.data.daily_rate_eur,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date || null,
    status: 'proposed',
  };

  const { data, error } = await admin.from('missions').insert(payload).select().single();
  if (error) {
    return NextResponse.json(
      { error: 'create_failed', message: error.message, details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
