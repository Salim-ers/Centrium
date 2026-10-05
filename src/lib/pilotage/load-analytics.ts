import type { SupabaseClient } from '@supabase/supabase-js';

import {
  benchGaps,
  capacityForecast,
  futureAvailability,
  lostReasons,
  missionEndingsByMonth,
  positioningStats,
  quoteStats,
  renewalStats,
  revenueByConsultant,
  salesCycle,
  sourceBreakdown,
  staffingLeadTime,
  timesheetPunctuality,
  winRate,
  type ProposalAnalyticsRow,
} from './analytics';
import {
  isOpenOpportunity,
  occupancyAt,
  occupancySeries,
  opportunityAmount,
  pipelineByStage,
  type ConsultantLite,
  type MissionLite,
  type OpportunityLite,
  type StageSummary,
} from './metrics';

export type AnalyticsSummary = {
  period: { since: string };
  commercial: {
    win: ReturnType<typeof winRate>;
    sources: ReturnType<typeof sourceBreakdown>;
    lostReasons: ReturnType<typeof lostReasons>;
    created: number;
    cycle: ReturnType<typeof salesCycle>;
    pipeline: StageSummary[];
    openCount: number;
    openAmount: number;
  };
  quotes: ReturnType<typeof quoteStats> | null;
  occupancy: ReturnType<typeof occupancySeries>;
  punctuality: ReturnType<typeof timesheetPunctuality>;
  topConsultants: Array<{ id: string; name: string; revenue: number }>;
  staffing: {
    now: ReturnType<typeof occupancyAt>;
    availability: ReturnType<typeof futureAvailability>;
    capacity: ReturnType<typeof capacityForecast>;
    endings: ReturnType<typeof missionEndingsByMonth>;
    positioning: ReturnType<typeof positioningStats>;
  };
  performance: {
    leadTime: ReturnType<typeof staffingLeadTime>;
    bench: ReturnType<typeof benchGaps>;
    renewals: ReturnType<typeof renewalStats>;
  };
};

type OppRow = OpportunityLite & { created_at: string; updated_at: string; source?: string | null; lost_reason?: string | null; archived?: boolean };

/** Indicateurs sur 12 mois glissants. Lectures sous RLS de l'utilisateur. */
export async function loadAnalytics(supabase: SupabaseClient, orgId: string, today = new Date()): Promise<AnalyticsSummary> {
  const since = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const sinceIso = since.toISOString();
  const tolerant = <T,>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const sinceMonth = { year: since.getFullYear(), month: since.getMonth() + 1 };
  const [opps, quotes, timesheets, missions, consultants, proposals] = await Promise.all([
    tolerant<OppRow[]>(
      supabase
        .from('opportunities')
        .select('id, status, created_at, updated_at, source, lost_reason, expected_revenue, probability, daily_rate_eur, duration_months, archived')
        .eq('organization_id', orgId)
        .limit(5000),
      [],
    ),
    supabase.from('quotes').select('status, total_ht, sent_at, decided_at').eq('organization_id', orgId).gte('sent_at', sinceIso),
    tolerant<Array<{ mission_id: string; period_year: number; period_month: number; status: string; days_validated: number | null; days_worked: number | null; submitted_at: string | null }>>(
      supabase
        .from('timesheets')
        .select('mission_id, period_year, period_month, status, days_validated, days_worked, submitted_at')
        .eq('organization_id', orgId)
        .eq('archived', false)
        .gte('period_year', sinceMonth.year),
      [],
    ),
    tolerant<Array<MissionLite & { renewal_status?: string | null }>>(
      supabase.from('missions').select('id, consultant_id, company_id, status, start_date, end_date, daily_rate_eur, renewal_status').eq('organization_id', orgId).eq('archived', false),
      [],
    ),
    tolerant<Array<ConsultantLite & { first_name: string; last_name: string }>>(
      supabase.from('consultants').select('id, first_name, last_name, status, archived, is_prospect, available_from, current_mission_end').eq('organization_id', orgId),
      [],
    ),
    tolerant<Array<{ opportunity_id: string; sent_at: string | null; opportunities: { status: string; created_at: string } | null }>>(
      supabase
        .from('opportunity_consultants')
        .select('opportunity_id, sent_at, opportunities!inner(status, created_at, organization_id)')
        .eq('opportunities.organization_id', orgId)
        .limit(20000),
      [],
    ),
  ]);

  const names = new Map(consultants.map((c) => [c.id, `${c.first_name} ${c.last_name}`]));
  const byConsultant = revenueByConsultant(timesheets, missions, sinceMonth);
  const topConsultants = [...byConsultant.entries()]
    .map(([id, revenue]) => ({ id, name: names.get(id) ?? '—', revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const open = opps.filter((o) => isOpenOpportunity(o));
  const proposalRows: ProposalAnalyticsRow[] = proposals
    .filter((p) => p.opportunities?.created_at)
    .map((p) => ({ opportunity_id: p.opportunity_id, sent_at: p.sent_at, opportunity_status: p.opportunities!.status, opportunity_created_at: p.opportunities!.created_at }));
  const sinceDay = sinceIso.slice(0, 10);

  return {
    period: { since: sinceDay },
    commercial: {
      win: winRate(opps, since),
      sources: sourceBreakdown(opps, since),
      lostReasons: lostReasons(opps, since),
      created: opps.filter((o) => new Date(o.created_at) >= since).length,
      cycle: salesCycle(opps, since),
      pipeline: pipelineByStage(open),
      openCount: open.length,
      openAmount: Math.round(open.reduce((s, o) => s + opportunityAmount(o), 0)),
    },
    // null si la table des devis n'existe pas encore (migration 097).
    quotes: quotes.error ? null : quoteStats((quotes.data ?? []) as Array<{ status: string; total_ht: number; sent_at: string | null; decided_at: string | null }>, since),
    occupancy: occupancySeries(consultants, missions, today, 11),
    punctuality: timesheetPunctuality(timesheets, today, 6),
    topConsultants,
    staffing: {
      now: occupancyAt(consultants, missions, today),
      availability: futureAvailability(consultants, missions, today),
      capacity: capacityForecast(consultants, missions, today),
      endings: missionEndingsByMonth(missions, today, 6),
      positioning: positioningStats(proposalRows, since),
    },
    performance: {
      leadTime: staffingLeadTime(proposalRows, since),
      bench: benchGaps(missions, since),
      // Décisions récentes : missions encore en cours ou terminées depuis moins d'un an.
      renewals: renewalStats(missions.filter((m) => !m.end_date || m.end_date >= sinceDay)),
    },
  };
}
