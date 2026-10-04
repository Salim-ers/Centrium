import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { membersWithPermission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/audit/log';
import { loadMatchingPool, topMatches } from '@/lib/matching/server-pool';

export type ClientRequestRow = {
  id: string;
  organization_id: string;
  company_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  skills: string[] | null;
  seniority: string | null;
  location: string | null;
  remote_policy: string | null;
  start_date: string | null;
  duration_months: number | null;
  budget_eur: number | null;
  daily_rate_eur: number | null;
  status: string;
  opportunity_id: string | null;
};

const SENIORITY_LABEL: Record<string, string> = { junior: 'Junior', confirmed: 'Confirmé', senior: 'Senior', expert: 'Expert' };

/**
 * Transforme une demande client en opportunité CRM (étape Prospect),
 * relie les deux, recherche les consultants compatibles (même moteur que
 * l'écran de matching) et notifie les membres habilités à suivre les
 * opportunités.
 * Idempotent : une demande déjà reliée renvoie son opportunité.
 */
export async function convertClientRequest(
  admin: SupabaseClient,
  request: ClientRequestRow,
  opts: { actorId: string | null; contactId?: string | null },
): Promise<{ opportunityId: string } | { error: string }> {
  if (request.opportunity_id) return { opportunityId: request.opportunity_id };

  const description = [
    request.description,
    request.seniority ? `Séniorité souhaitée : ${SENIORITY_LABEL[request.seniority] ?? request.seniority}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const { data: opp, error } = await admin
    .from('opportunities')
    .insert({
      organization_id: request.organization_id,
      company_id: request.company_id,
      contact_id: opts.contactId ?? null,
      title: request.title,
      description: description || null,
      status: 'new',
      priority: 'medium',
      required_skills: request.skills ?? [],
      location: request.location,
      remote_policy: request.remote_policy,
      start_date: request.start_date,
      duration_months: request.duration_months,
      budget_eur: request.budget_eur,
      daily_rate_eur: request.daily_rate_eur,
      source: 'client_portal',
      client_request_id: request.id,
    })
    .select('id')
    .single();
  if (error || !opp) return { error: error?.message ?? 'create_failed' };

  await admin.from('client_requests').update({ opportunity_id: opp.id, status: 'converted' }).eq('id', request.id);

  const { data: company } = await admin.from('companies').select('name').eq('id', request.company_id).maybeSingle();

  // Consultants compatibles (best effort : la conversion ne dépend pas du matching).
  let matchLine = '';
  try {
    const pool = await loadMatchingPool(admin, request.organization_id);
    const best = topMatches(
      {
        id: opp.id,
        organization_id: request.organization_id,
        title: request.title,
        company_id: request.company_id,
        contact_id: opts.contactId ?? null,
        owner_id: null,
        daily_rate_eur: request.daily_rate_eur,
        duration_months: request.duration_months,
        description: request.description,
        required_skills: request.skills ?? [],
        start_date: request.start_date,
        location: request.location,
      },
      pool,
      { limit: 3, minScore: 60 },
    );
    if (best.length) {
      matchLine = `Profils compatibles : ${best.map((b) => `${b.consultant.first_name} ${b.consultant.last_name.charAt(0)}. (${Math.round(b.breakdown.score)})`).join(', ')}`;
    }
  } catch {
    matchLine = '';
  }
  const recipients = await membersWithPermission(admin, request.organization_id, 'opportunities.edit');
  if (recipients.length) {
    await admin.from('notifications').insert(
      recipients.map((user_id) => ({
        organization_id: request.organization_id,
        user_id,
        kind: 'client_request',
        priority: 'high',
        title: `Nouvelle demande de ${company?.name ?? 'un client'}`,
        body: matchLine ? `${request.title} — ${matchLine}` : request.title,
        link: `/opportunities/${opp.id}`,
      })),
    );
  }
  await logAudit({
    organizationId: request.organization_id,
    userId: opts.actorId,
    entityType: 'opportunity',
    entityId: opp.id,
    action: 'created_from_client_request',
    details: { client_request_id: request.id },
  });
  return { opportunityId: opp.id };
}
