import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { apiPermission, getAuthorization } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/log';
import { REMOTE_POLICIES } from '@/lib/validators/v2';

export const runtime = 'nodejs';

const patchSchema = z.object({
  status: z.enum(['proposed', 'active', 'ended', 'suspended', 'rejected']).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  daily_rate_eur: z.coerce.number().min(0).max(5000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  contract_number: z.string().trim().max(80).optional().nullable(),
  archived: z.boolean().optional(),
  rejection_reason: z.string().max(2000).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  planned_days: z.coerce.number().min(0).max(2000).optional().nullable(),
  renewal_status: z.enum(['unknown', 'likely', 'confirmed', 'not_renewed']).optional(),
  location: z.string().trim().max(200).optional().nullable(),
  remote_policy: z.enum(REMOTE_POLICIES).optional().nullable(),
  /** CJM — mission_financials. */
  daily_cost_eur: z.coerce.number().min(0).max(5000).optional().nullable(),
});

async function loadOwned(id: string, org: string) {
  const admin = createAdminClient('cross-org-query');
  const { data } = await admin.from('missions').select('organization_id, start_date, end_date').eq('id', id).maybeSingle();
  if (!data) return { admin, error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  if (data.organization_id !== org) return { admin, error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { admin, existing: data };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // Refuser/accepter une proposition relève du staffing ; le reste de
  // l'édition de mission demande missions.edit.
  const onlyProposalDecision =
    Object.keys(input).every((k) => k === 'status' || k === 'rejection_reason') &&
    (input.status === 'rejected' || input.status === 'proposed');
  const auth = await apiPermission(onlyProposalDecision ? 'staffing.edit' : 'missions.edit');
  if (auth instanceof NextResponse) return auth;

  const { admin, existing, error } = await loadOwned(params.id, auth.organizationId);
  if (error) return error;

  const nextStart = input.start_date ?? existing!.start_date;
  const nextEnd = input.end_date === undefined ? existing!.end_date : input.end_date || null;
  if (nextEnd && nextStart && nextEnd < nextStart) {
    return NextResponse.json({ error: 'invalid_input', message: 'La date de fin doit suivre la date de début' }, { status: 400 });
  }
  if (input.company_id) {
    const { data: company } = await admin.from('companies').select('organization_id').eq('id', input.company_id).maybeSingle();
    if (!company || company.organization_id !== auth.organizationId) return NextResponse.json({ error: 'company_invalid' }, { status: 403 });
  }

  const { daily_cost_eur, ...missionFields } = input;
  const payload: Record<string, unknown> = Object.fromEntries(
    Object.entries(missionFields).map(([k, v]) => [k, v === '' ? null : v]),
  );
  if (input.archived === true) payload.archived_at = new Date().toISOString();
  else if (input.archived === false) payload.archived_at = null;
  if (input.status === 'rejected') payload.rejected_at = new Date().toISOString();
  else if (input.status) {
    payload.rejected_at = null;
    payload.rejection_reason = null;
  }

  let data: Record<string, unknown> | null = null;
  if (Object.keys(payload).length > 0) {
    const res = await admin.from('missions').update(payload).eq('id', params.id).select().single();
    if (res.error) return NextResponse.json({ error: 'update_failed', message: res.error.message }, { status: 500 });
    data = res.data;
  }

  if (daily_cost_eur !== undefined) {
    if (!auth.permissions.has('consultants.financials')) {
      return NextResponse.json({ error: 'forbidden', details: { permission: 'consultants.financials' } }, { status: 403 });
    }
    const res = await admin.from('mission_financials').upsert({
      mission_id: params.id,
      organization_id: auth.organizationId,
      daily_cost_eur,
      updated_by: auth.user.id,
    });
    if (res.error) return NextResponse.json({ error: 'update_failed', message: res.error.message }, { status: 500 });
  }

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.user.id,
    entityType: 'mission',
    entityId: params.id,
    action: input.status ? `status_${input.status}` : 'updated',
    details: { fields: Object.keys(input) },
  });

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthorization();
  // Suppression définitive : réservée aux rôles qui pilotent les missions
  // ET peuvent paramétrer l'organisation ou valider la finance.
  if (!auth.permissions.has('missions.edit') || !(auth.permissions.has('settings.manage') || auth.permissions.has('finance.edit') || auth.role === 'business_manager')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { admin, error } = await loadOwned(params.id, auth.organizationId);
  if (error) return error;

  const res = await admin.from('missions').delete().eq('id', params.id);
  if (res.error) return NextResponse.json({ error: 'delete_failed', message: res.error.message }, { status: 500 });
  await logAudit({ organizationId: auth.organizationId, userId: auth.user.id, entityType: 'mission', entityId: params.id, action: 'deleted' });
  return new NextResponse(null, { status: 204 });
}
