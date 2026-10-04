import type { SupabaseClient } from '@supabase/supabase-js';

import { lostReasons, quoteStats, revenueByConsultant, sourceBreakdown, timesheetPunctuality, winRate } from './analytics';
import { occupancySeries, type ConsultantLite, type MissionLite } from './metrics';

export type AnalyticsSummary = {
  period: { since: string };
  commercial: {
    win: ReturnType<typeof winRate>;
    sources: ReturnType<typeof sourceBreakdown>;
    lostReasons: ReturnType<typeof lostReasons>;
    created: number;
  };
  quotes: ReturnType<typeof quoteStats> | null;
  occupancy: ReturnType<typeof occupancySeries>;
  punctuality: ReturnType<typeof timesheetPunctuality>;
  topConsultants: Array<{ id: string; name: string; revenue: number }>;
};

/** Indicateurs sur 12 mois glissants. Lectures sous RLS de l'utilisateur. */
export async function loadAnalytics(supabase: SupabaseClient, orgId: string, today = new Date()): Promise<AnalyticsSummary> {
  const since = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const sinceIso = since.toISOString();
  const tolerant = <T,>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const sinceMonth = { year: since.getFullYear(), month: since.getMonth() + 1 };
  const [opps, quotes, timesheets, missions, consultants] = await Promise.all([
    tolerant<Array<{ status: string; created_at: string; updated_at: string; source?: string | null; lost_reason?: string | null }>>(
      supabase.from('opportunities').select('status, created_at, updated_at, source, lost_reason').eq('organization_id', orgId).or(`created_at.gte.${sinceIso},updated_at.gte.${sinceIso}`),
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
    tolerant<MissionLite[]>(
      supabase.from('missions').select('id, consultant_id, company_id, status, start_date, end_date, daily_rate_eur').eq('organization_id', orgId).eq('archived', false),
      [],
    ),
    tolerant<Array<ConsultantLite & { first_name: string; last_name: string }>>(
      supabase.from('consultants').select('id, first_name, last_name, status, archived, is_prospect, available_from, current_mission_end').eq('organization_id', orgId),
      [],
    ),
  ]);

  const names = new Map(consultants.map((c) => [c.id, `${c.first_name} ${c.last_name}`]));
  const byConsultant = revenueByConsultant(timesheets, missions, sinceMonth);
  const topConsultants = [...byConsultant.entries()]
    .map(([id, revenue]) => ({ id, name: names.get(id) ?? '—', revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    period: { since: sinceIso.slice(0, 10) },
    commercial: {
      win: winRate(opps, since),
      sources: sourceBreakdown(opps, since),
      lostReasons: lostReasons(opps, since),
      created: opps.filter((o) => new Date(o.created_at) >= since).length,
    },
    // null si la table des devis n'existe pas encore (migration 097).
    quotes: quotes.error ? null : quoteStats((quotes.data ?? []) as Array<{ status: string; total_ht: number; sent_at: string | null; decided_at: string | null }>, since),
    occupancy: occupancySeries(consultants, missions, today, 11),
    punctuality: timesheetPunctuality(timesheets, today, 6),
    topConsultants,
  };
}
