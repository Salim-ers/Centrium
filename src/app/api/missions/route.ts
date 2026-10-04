import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { apiPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/log';
import { REMOTE_POLICIES } from '@/lib/validators/v2';

export const runtime = 'nodejs';

const createSchema = z
  .object({
    consultant_id: z.string().uuid(),
    job_offer_id: z.string().uuid().optional().nullable(),
    opportunity_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    owner_id: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(1).max(200),
    daily_rate_eur: z.coerce.number().min(0).max(5000),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de début requise'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
    // Le matching crée des propositions ; la création manuelle peut créer
    // directement une mission active.
    status: z.enum(['proposed', 'active']).default('proposed'),
    planned_days: z.coerce.number().min(0).max(2000).optional().nullable(),
    renewal_status: z.enum(['unknown', 'likely', 'confirmed', 'not_renewed']).optional(),
    location: z.string().trim().max(200).optional().nullable(),
    remote_policy: z.enum(REMOTE_POLICIES).optional().nullable(),
    contract_number: z.string().trim().max(80).optional().nullable(),
    /** CJM : stocké dans mission_financials (accès restreint). */
    daily_cost_eur: z.coerce.number().min(0).max(5000).optional().nullable(),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: 'La date de fin doit suivre la date de début',
    path: ['end_date'],
  });

/**
 * POST /api/missions — création d'une mission (ou d'une proposition issue
 * du matching). Vérifie que consultant, client, opportunité et fiche de
 * poste appartiennent à l'organisation de l'appelant.
 */
export async function POST(req: NextRequest) {
  const auth = await apiPermission('missions.edit');
  if (auth instanceof NextResponse) {
    // Les recruteurs positionnent des consultants depuis le matching.
    const staffing = await apiPermission('staffing.edit');
    if (staffing instanceof NextResponse) return auth;
    return create(req, staffing);
  }
  return create(req, auth);
}

async function create(req: NextRequest, auth: Exclude<Awaited<ReturnType<typeof apiPermission>>, NextResponse>) {
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  // Sans missions.edit (recruteur), seule une proposition est possible.
  if (input.status === 'active' && !auth.permissions.has('missions.edit')) {
    return NextResponse.json({ error: 'forbidden', details: { permission: 'missions.edit' } }, { status: 403 });
  }

  const admin = createAdminClient('cross-org-query');
  const org = auth.organizationId;

  const { data: consultant } = await admin
    .from('consultants')
    .select('organization_id')
    .eq('id', input.consultant_id)
    .maybeSingle();
  if (!consultant) return NextResponse.json({ error: 'consultant_not_found' }, { status: 404 });
  if (consultant.organization_id !== org) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let companyId = input.company_id ?? null;
  if (input.job_offer_id) {
    const { data: offer } = await admin.from('job_offers').select('organization_id, company_id').eq('id', input.job_offer_id).maybeSingle();
    if (!offer || offer.organization_id !== org) return NextResponse.json({ error: 'offer_invalid' }, { status: 403 });
    companyId = companyId ?? offer.company_id ?? null;
  }
  if (input.opportunity_id) {
    const { data: opp } = await admin.from('opportunities').select('organization_id, company_id').eq('id', input.opportunity_id).maybeSingle();
    if (!opp || opp.organization_id !== org) return NextResponse.json({ error: 'opportunity_invalid' }, { status: 403 });
    companyId = companyId ?? opp.company_id ?? null;
  }
  if (companyId) {
    const { data: company } = await admin.from('companies').select('organization_id').eq('id', companyId).maybeSingle();
    if (!company || company.organization_id !== org) return NextResponse.json({ error: 'company_invalid' }, { status: 403 });
  }
  if (input.owner_id) {
    const { data: member } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', org)
      .eq('user_id', input.owner_id)
      .maybeSingle();
    if (!member) return NextResponse.json({ error: 'owner_invalid' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    organization_id: org,
    consultant_id: input.consultant_id,
    job_offer_id: input.job_offer_id ?? null,
    opportunity_id: input.opportunity_id ?? null,
    company_id: companyId,
    title: input.title,
    daily_rate_eur: input.daily_rate_eur,
    start_date: input.start_date,
    end_date: input.end_date || null,
    status: input.status,
  };
  // Champs V2 : uniquement s'ils sont fournis (compatibilité avant migration 097).
  for (const k of ['owner_id', 'planned_days', 'renewal_status', 'location', 'remote_policy', 'contract_number'] as const) {
    if (input[k] !== undefined) payload[k] = input[k] === '' ? null : input[k];
  }

  const { data, error } = await admin.from('missions').insert(payload).select().single();
  if (error) {
    if (error.code === '23505' || /missions_consultant_offer_live_unique/i.test(error.message)) {
      return NextResponse.json(
        {
          error: 'duplicate_mission',
          message:
            "Ce consultant est déjà positionné sur cette offre (CV poussé ou mission en cours). Refuse l'ancienne proposition avant d'en créer une nouvelle.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
  }

  if (input.daily_cost_eur != null && auth.permissions.has('consultants.financials')) {
    await admin
      .from('mission_financials')
      .upsert({ mission_id: data.id, organization_id: org, daily_cost_eur: input.daily_cost_eur, updated_by: auth.user.id });
  }

  await logAudit({
    organizationId: org,
    userId: auth.user.id,
    entityType: 'mission',
    entityId: data.id,
    action: 'created',
    details: { status: input.status, opportunity_id: input.opportunity_id ?? null },
  });

  return NextResponse.json({ data }, { status: 201 });
}
