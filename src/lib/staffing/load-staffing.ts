// =========================================================================
// Données du planning de staffing : consultants de l'effectif, missions
// recouvrant la fenêtre, congés (jours de CRA non travaillés) et
// positionnements en cours sur des opportunités ouvertes.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpportunityStatus } from '@/types';

export type StaffingConsultant = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  status: string;
  city: string | null;
  mobility: string | null;
  owner_id: string | null;
  available_from: string | null;
  current_mission_end: string | null;
};

export type StaffingMission = {
  id: string;
  consultant_id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string | null;
  company_id: string | null;
  company_name: string | null;
};

export type StaffingProposal = {
  consultant_id: string;
  opportunity_id: string;
  title: string;
  status: OpportunityStatus;
  company_name: string | null;
};

export type StaffingData = {
  consultants: StaffingConsultant[];
  missions: StaffingMission[];
  leaves: Record<string, string[]>;
  proposals: StaffingProposal[];
};

const LEAVE_KINDS = ['paid_leave', 'sick_leave', 'unpaid_leave'];

export async function loadStaffing(
  supabase: SupabaseClient,
  orgId: string,
  range: { start: string; end: string },
  withLeaves: boolean,
  withProposals: boolean,
): Promise<StaffingData> {
  const [consultants, missions, leaves, proposals] = await Promise.all([
    supabase
      .from('consultants')
      .select('id, first_name, last_name, job_title, status, city, mobility, owner_id, available_from, current_mission_end')
      .eq('organization_id', orgId)
      .eq('archived', false)
      .eq('is_prospect', false)
      .order('last_name')
      .limit(2000),
    supabase
      .from('missions')
      .select('id, consultant_id, title, status, start_date, end_date, company_id, companies(name)')
      .eq('organization_id', orgId)
      .eq('archived', false)
      .in('status', ['active', 'proposed', 'ended', 'suspended'])
      .lte('start_date', range.end)
      .or(`end_date.is.null,end_date.gte.${range.start}`)
      .limit(5000),
    withLeaves
      ? supabase
          .from('timesheet_days')
          .select('day_date, kind, timesheets!inner(consultant_id, organization_id)')
          .in('kind', LEAVE_KINDS)
          .gte('day_date', range.start)
          .lte('day_date', range.end)
          .eq('timesheets.organization_id', orgId)
          .limit(20000)
      : Promise.resolve({ data: [], error: null }),
    withProposals
      ? supabase
          .from('opportunity_consultants')
          .select('consultant_id, opportunity_id, opportunities!inner(title, status, organization_id, companies(name))')
          .eq('opportunities.organization_id', orgId)
          .not('opportunities.status', 'in', '(won,lost,on_hold)')
          .limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const leaveMap: Record<string, string[]> = {};
  if (!leaves.error) {
    for (const row of (leaves.data ?? []) as Array<{ day_date: string; timesheets: { consultant_id: string } | null }>) {
      const cid = row.timesheets?.consultant_id;
      if (!cid) continue;
      (leaveMap[cid] ??= []).push(row.day_date);
    }
  }

  return {
    consultants: (consultants.data ?? []) as StaffingConsultant[],
    missions: ((missions.data ?? []) as unknown as Array<Omit<StaffingMission, 'company_name'> & { companies: { name: string } | null }>).map((m) => ({
      id: m.id,
      consultant_id: m.consultant_id,
      title: m.title,
      status: m.status,
      start_date: m.start_date,
      end_date: m.end_date,
      company_id: m.company_id,
      company_name: m.companies?.name ?? null,
    })),
    leaves: leaveMap,
    proposals: proposals.error
      ? []
      : ((proposals.data ?? []) as Array<{
          consultant_id: string;
          opportunity_id: string;
          opportunities: { title: string; status: OpportunityStatus; companies: { name: string } | null } | null;
        }>).map((p) => ({
          consultant_id: p.consultant_id,
          opportunity_id: p.opportunity_id,
          title: p.opportunities?.title ?? '',
          status: p.opportunities?.status ?? 'new',
          company_name: p.opportunities?.companies?.name ?? null,
        })),
  };
}
