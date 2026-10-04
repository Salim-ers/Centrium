// =========================================================================
// Vue d'ensemble des clients : agrégats par société (missions, opportunités,
// CA réalisé 12 mois, CA prévisionnel du mois suivant). Calcul local sur
// les données lues sous RLS.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Company, OpportunityStatus } from '@/types';
import {
  forecastRevenue,
  isOpenOpportunity,
  opportunityAmount,
  revenueByClient,
  type MissionLite,
  type TimesheetLite,
} from './metrics';

export type ClientRow = Company & {
  activeMissions: number;
  openOpportunities: number;
  pipeline: number;
  revenue12m: number;
  forecastNext3m: number;
  lastActivity: string | null;
};

export async function loadClients(
  supabase: SupabaseClient,
  orgId: string,
  withFinance: boolean,
  today = new Date(),
): Promise<ClientRow[]> {
  const since = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const [companies, missions, opps, timesheets] = await Promise.all([
    supabase.from('companies').select('*').eq('organization_id', orgId).eq('archived', false).order('name').limit(5000),
    supabase
      .from('missions')
      .select('id, consultant_id, company_id, status, start_date, end_date, daily_rate_eur, updated_at')
      .eq('organization_id', orgId)
      .limit(5000),
    supabase
      .from('opportunities')
      .select('id, company_id, status, expected_revenue, probability, daily_rate_eur, duration_months, updated_at')
      .eq('organization_id', orgId)
      .limit(5000),
    withFinance
      ? supabase
          .from('timesheets')
          .select('mission_id, period_year, period_month, days_validated, days_worked, status')
          .eq('organization_id', orgId)
          .eq('status', 'client_validated')
          .gte('period_year', since.getFullYear())
          .limit(10000)
      : Promise.resolve({ data: [] as TimesheetLite[] }),
  ]);

  const missionRows = (missions.data ?? []) as Array<MissionLite & { updated_at: string }>;
  const oppRows = (opps.data ?? []) as Array<{
    id: string;
    company_id: string | null;
    status: OpportunityStatus;
    expected_revenue: number | null;
    probability: number | null;
    daily_rate_eur: number | null;
    duration_months: number | null;
    updated_at: string;
  }>;
  const revenue = withFinance
    ? revenueByClient((timesheets.data ?? []) as TimesheetLite[], missionRows, {
        year: since.getFullYear(),
        month: since.getMonth() + 1,
      })
    : new Map<string, number>();

  const nextMonths = [1, 2, 3].map((i) => new Date(today.getFullYear(), today.getMonth() + i, 1));

  return ((companies.data ?? []) as Company[]).map((c) => {
    const ms = missionRows.filter((m) => m.company_id === c.id);
    const os = oppRows.filter((o) => o.company_id === c.id);
    const open = os.filter(isOpenOpportunity);
    const dates = [c.updated_at, ...ms.map((m) => m.updated_at), ...os.map((o) => o.updated_at)].filter(Boolean).sort();
    return {
      ...c,
      activeMissions: ms.filter((m) => m.status === 'active').length,
      openOpportunities: open.length,
      pipeline: Math.round(open.reduce((s, o) => s + opportunityAmount(o) * ((o.probability ?? 0) / 100), 0)),
      revenue12m: Math.round(revenue.get(c.id) ?? 0),
      forecastNext3m: withFinance
        ? nextMonths.reduce((s, d) => s + forecastRevenue(ms, d.getFullYear(), d.getMonth() + 1), 0)
        : 0,
      lastActivity: dates[dates.length - 1] ?? null,
    };
  });
}
