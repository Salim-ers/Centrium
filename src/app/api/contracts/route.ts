import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthorization } from '@/lib/auth/rbac';
import { contractBaseSchema, refineContractParty } from '@/lib/validators/contract';

// =========================================================================
// POST /api/contracts — Crée un contrat (service_role, bypass RLS)
// + génération auto du numéro + end_date + log d'activité.
// Réservé à admin / business_manager.
// =========================================================================

export const runtime = 'nodejs';

function computeEndDate(startDate: string, durationMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

async function nextContractNumber(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await admin
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .like('contract_number', `CT-${year}-%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `CT-${year}-${seq}`;
}

// Version permissive du schéma : contract_number peut être absent (autogénéré)
const bodySchema = contractBaseSchema
  .partial({ contract_number: true })
  .superRefine(refineContractParty);

export async function POST(req: NextRequest) {
  const ctx = await getAuthorization();
  if (!ctx.permissions.has('documents.edit')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient('cross-org-query');
  const input = parsed.data;
  const contract_number = input.contract_number ?? (await nextContractNumber(admin, ctx.organizationId));
  const end_date = input.end_date || computeEndDate(input.start_date, input.duration_months ?? 3);

  const payload = normalizeEmpty({
    ...input,
    contract_number,
    end_date,
    organization_id: ctx.organizationId,
    created_by: ctx.user.id,
    status: 'draft',
  });

  const { data, error } = await admin.from('contracts').insert(payload).select().single();
  if (error) {
    return NextResponse.json(
      { error: 'create_failed', message: error.message, details: error },
      { status: 500 },
    );
  }

  // Activity log (best-effort — on ne bloque pas la création si ça échoue)
  await admin.from('activities').insert({
    organization_id: ctx.organizationId,
    entity_type: 'contract',
    entity_id: data.id,
    action: 'created',
    metadata: { number: contract_number },
  });

  return NextResponse.json({ data }, { status: 201 });
}

function normalizeEmpty<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v]),
  ) as T;
}
