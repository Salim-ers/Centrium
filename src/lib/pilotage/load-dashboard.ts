// =========================================================================
// Chargement du Command Center : requêtes parallèles sous la session de
// l'utilisateur (RLS), puis agrégation locale via metrics.ts. Seul le
// résumé (léger) est mis en cache, jamais les lignes brutes.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Permission } from '@/lib/auth/permissions';
import type { OpportunityStatus } from '@/types';
import {
  activeConsultants,
  averageMarginPct,
  bookedRevenue,
  daysUntil,
  forecastRevenue,
  iso,
  isOpenOpportunity,
  endingBucket,
  monthlySeries,
  occupancyAt,
  occupancySeries,
  pipelineByStage,
  revenueByClient,
  weightedPipeline,
  type MissionLite,
  type MonthPoint,
  type StageSummary,
  type TimesheetLite,
} from './metrics';

export type ActionTone = 'brand' | 'warning' | 'danger' | 'info' | 'success';
export type ActionKind =
  | 'timesheets_pending'
  | 'missions_ending'
  | 'consultants_soon'
  | 'opportunity_stale'
  | 'quote_expiring'
  | 'client_request'
  | 'prefacture_pending'
  | 'consultant_match';

export type TodayAction = {
  id: string;
  kind: ActionKind;
  tone: ActionTone;
  count?: number;
  title: { fr: string; en: string };
  detail?: { fr: string; en: string };
  href: string;
};

export type DashboardSummary = {
  generatedAt: string;
  kpis: {
    bookedRevenue: number;
    forecastMonth: number;
    forecastNextMonth: number;
    marginPct: number | null;
    marginCovered: number;
    marginTotal: number;
    activeConsultants: number;
    occupancyRate: number | null;
    staffed: number;
    capacity: number;
    bench: number;
    openOpportunities: number;
    weightedPipeline: number;
    pendingTimesheets: number;
    missionsEnding30: number;
  };
  series: MonthPoint[];
  occupancy: Array<{ key: string; rate: number | null; bench: number }>;
  /** Missions actives par tranche d'échéance (jours). */
  endingBuckets: Record<15 | 30 | 60 | 90, number>;
  stages: StageSummary[];
  topClients: Array<{ id: string; name: string; revenue: number }>;
  actions: TodayAction[];
  financialsVisible: boolean;
};

type Can = (p: Permission) => boolean;

const STALE_DAYS = 14;

function plural(n: number, fr: [string, string], en: [string, string]) {
  return { fr: n > 1 ? fr[1] : fr[0], en: n > 1 ? en[1] : en[0] };
}

export async function loadDashboard(
  supabase: SupabaseClient,
  orgId: string,
  can: Can,
  today: Date = new Date(),
): Promise<DashboardSummary> {
  const todayIso = iso(today);
  const since = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const in30 = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
  const in7 = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7));
  const financialsVisible = can('consultants.financials');

  // Une table absente (migration non appliquée) ou une erreur réseau ne doit
  // jamais casser le dashboard : on retombe sur une valeur vide.
  const tolerant = <T>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const [missions, consultants, timesheets, opps, missionFin, consultantFin, quotes, requests, drafts] =
    await Promise.all([
      tolerant(
        supabase
          .from('missions')
          .select('id, consultant_id, company_id, title, status, start_date, end_date, daily_rate_eur')
          .eq('organization_id', orgId)
          .in('status', ['active', 'ended', 'proposed'])
          .or(`end_date.is.null,end_date.gte.${iso(since)}`)
          .limit(3000),
        [] as MissionLite[],
      ),
      tolerant(
        supabase
          .from('consultants')
          .select('id, first_name, last_name, status, archived, is_prospect, available_from, current_mission_end')
          .eq('organization_id', orgId)
          .eq('archived', false)
          .limit(3000),
        [] as Array<{
          id: string;
          first_name: string;
          last_name: string;
          status: string;
          archived: boolean;
          is_prospect: boolean;
          available_from: string | null;
          current_mission_end: string | null;
        }>,
      ),
      can('timesheets.view') || can('finance.view') || can('analytics.view')
        ? tolerant(
            supabase
              .from('timesheets')
              .select('mission_id, period_year, period_month, days_validated, days_worked, status')
              .eq('organization_id', orgId)
              .eq('archived', false)
              .gte('period_year', since.getFullYear())
              .limit(8000),
            [] as TimesheetLite[],
          )
        : Promise.resolve([] as TimesheetLite[]),
      can('opportunities.view')
        ? tolerant(
            supabase
              .from('opportunities')
              .select('*')
              .eq('organization_id', orgId)
              .order('updated_at', { ascending: false })
              .limit(2000),
            [] as Array<Record<string, unknown>>,
          )
        : Promise.resolve([] as Array<Record<string, unknown>>),
      financialsVisible
        ? tolerant(supabase.from('mission_financials').select('mission_id, daily_cost_eur'), [] as Array<{ mission_id: string; daily_cost_eur: number | null }>)
        : Promise.resolve([]),
      financialsVisible
        ? tolerant(supabase.from('consultant_financials').select('consultant_id, daily_cost_eur'), [] as Array<{ consultant_id: string; daily_cost_eur: number | null }>)
        : Promise.resolve([]),
      can('documents.view')
        ? tolerant(
            supabase
              .from('quotes')
              .select('id, number, title, valid_until')
              .eq('organization_id', orgId)
              .eq('status', 'sent')
              .gte('valid_until', todayIso)
              .lte('valid_until', in7)
              .order('valid_until'),
            [] as Array<{ id: string; number: string | null; title: string; valid_until: string }>,
          )
        : Promise.resolve([]),
      can('opportunities.view')
        ? tolerant(
            supabase
              .from('client_requests')
              .select('id, title, created_at')
              .eq('organization_id', orgId)
              .eq('status', 'new')
              .order('created_at', { ascending: false }),
            [] as Array<{ id: string; title: string; created_at: string }>,
          )
        : Promise.resolve([]),
      can('finance.edit')
        ? Promise.resolve(
            supabase
              .from('invoices')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', orgId)
              .eq('status', 'draft')
              .eq('archived', false),
          ).then((r) => (r.error ? 0 : (r.count ?? 0)))
        : Promise.resolve(0),
    ]);

  const missionCost = new Map(missionFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.mission_id, Number(f.daily_cost_eur)]));
  const consultantCost = new Map(
    consultantFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.consultant_id, Number(f.daily_cost_eur)]),
  );
  const cost = (m: MissionLite) => missionCost.get(m.id) ?? consultantCost.get(m.consultant_id) ?? null;

  const oppRows = opps.map((o) => ({
    id: o.id as string,
    title: o.title as string,
    status: o.status as OpportunityStatus,
    expected_revenue: (o.expected_revenue as number | null) ?? null,
    probability: (o.probability as number | null) ?? null,
    daily_rate_eur: (o.daily_rate_eur as number | null) ?? null,
    duration_months: (o.duration_months as number | null) ?? null,
    updated_at: o.updated_at as string,
    last_interaction: (o.last_interaction as string | null) ?? null,
    archived: (o.archived as boolean | undefined) ?? false,
  }));
  const openOpps = oppRows.filter(isOpenOpportunity);

  const pool = activeConsultants(consultants);
  const occ = occupancyAt(pool, missions, today);
  const margin = averageMarginPct(missions, cost);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const activeMissions = missions.filter((m) => m.status === 'active');
  const ending30 = activeMissions.filter((m) => m.end_date && m.end_date >= todayIso && m.end_date <= in30);
  const pendingTimesheets = timesheets.filter((t) => t.status === 'submitted').length;

  // CA par client (12 derniers mois, CRA validés).
  const byClient = revenueByClient(timesheets, missions, { year: since.getFullYear(), month: since.getMonth() + 1 });
  let topClients: DashboardSummary['topClients'] = [];
  if (byClient.size > 0 && can('clients.view')) {
    const ids = [...byClient.keys()];
    const names = await tolerant(
      supabase.from('companies').select('id, name').in('id', ids.slice(0, 200)),
      [] as Array<{ id: string; name: string }>,
    );
    const nameOf = new Map(names.map((c) => [c.id, c.name]));
    topClients = [...byClient.entries()]
      .map(([id, revenue]) => ({ id, name: nameOf.get(id) ?? '—', revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ── À traiter aujourd'hui ──────────────────────────────────────────────
  const actions: TodayAction[] = [];
  if (pendingTimesheets > 0 && can('timesheets.validate')) {
    const p = plural(pendingTimesheets, ['attend', 'attendent'], ['is', 'are']);
    actions.push({
      id: 'timesheets',
      kind: 'timesheets_pending',
      tone: 'warning',
      count: pendingTimesheets,
      title: {
        fr: `${pendingTimesheets} CRA ${p.fr} votre validation`,
        en: `${pendingTimesheets} timesheet${pendingTimesheets > 1 ? 's' : ''} ${p.en} waiting for approval`,
      },
      href: '/timesheets?status=submitted',
    });
  }
  if (drafts > 0) {
    actions.push({
      id: 'prefactures',
      kind: 'prefacture_pending',
      tone: 'info',
      count: drafts,
      title: {
        fr: `${drafts} préfacture${drafts > 1 ? 's' : ''} à valider`,
        en: `${drafts} pre-invoice${drafts > 1 ? 's' : ''} to approve`,
      },
      detail: { fr: 'Issues des CRA validés', en: 'Generated from approved timesheets' },
      href: '/finance?tab=prefacturation',
    });
  }
  if (ending30.length > 0 && can('missions.view')) {
    actions.push({
      id: 'missions-ending',
      kind: 'missions_ending',
      tone: 'warning',
      count: ending30.length,
      title: {
        fr: `${ending30.length} mission${ending30.length > 1 ? 's se terminent' : ' se termine'} dans moins de 30 jours`,
        en: `${ending30.length} mission${ending30.length > 1 ? 's end' : ' ends'} within 30 days`,
      },
      detail: {
        fr: 'Anticipez le renouvellement ou le repositionnement',
        en: 'Plan the renewal or the next assignment',
      },
      href: '/missions?ending=30',
    });
  }
  const soon = pool.filter((c) => {
    const d = c.available_from ?? c.current_mission_end;
    return c.status !== 'available' && !!d && d >= todayIso && d <= in30;
  });
  if (soon.length > 0 && can('staffing.view')) {
    actions.push({
      id: 'consultants-soon',
      kind: 'consultants_soon',
      tone: 'info',
      count: soon.length,
      title: {
        fr: `${soon.length} consultant${soon.length > 1 ? 's seront bientôt disponibles' : ' sera bientôt disponible'}`,
        en: `${soon.length} consultant${soon.length > 1 ? 's' : ''} available soon`,
      },
      detail: { fr: 'Dans les 30 prochains jours', en: 'Within the next 30 days' },
      href: '/staffing?view=soon',
    });
  }
  const stale = openOpps
    .filter((o) => daysUntil((o.last_interaction ?? o.updated_at).slice(0, 10), today) <= -STALE_DAYS)
    .slice(0, 3);
  for (const o of stale) {
    const days = -daysUntil((o.last_interaction ?? o.updated_at).slice(0, 10), today);
    actions.push({
      id: `stale-${o.id}`,
      kind: 'opportunity_stale',
      tone: 'brand',
      title: {
        fr: `« ${o.title} » n'a eu aucune activité depuis ${days} jours`,
        en: `“${o.title}” has had no activity for ${days} days`,
      },
      detail: { fr: 'Planifiez une relance', en: 'Schedule a follow-up' },
      href: `/opportunities/${o.id}`,
    });
  }
  for (const q of quotes.slice(0, 3)) {
    const d = daysUntil(q.valid_until, today);
    actions.push({
      id: `quote-${q.id}`,
      kind: 'quote_expiring',
      tone: 'warning',
      title: {
        fr: `Le devis ${q.number ?? q.title} expire ${d === 0 ? "aujourd'hui" : `dans ${d} jour${d > 1 ? 's' : ''}`}`,
        en: `Quote ${q.number ?? q.title} expires ${d === 0 ? 'today' : `in ${d} day${d > 1 ? 's' : ''}`}`,
      },
      href: `/documents/quotes/${q.id}`,
    });
  }
  if (requests.length > 0) {
    actions.push({
      id: 'client-requests',
      kind: 'client_request',
      tone: 'brand',
      count: requests.length,
      title: {
        fr: `${requests.length} nouvelle${requests.length > 1 ? 's' : ''} demande${requests.length > 1 ? 's' : ''} client`,
        en: `${requests.length} new client request${requests.length > 1 ? 's' : ''}`,
      },
      detail: { fr: requests[0]!.title, en: requests[0]!.title },
      href: '/portals?tab=requests',
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      bookedRevenue: bookedRevenue(missions, today),
      forecastMonth: forecastRevenue(missions, today.getFullYear(), today.getMonth() + 1),
      forecastNextMonth: forecastRevenue(missions, nextMonth.getFullYear(), nextMonth.getMonth() + 1),
      marginPct: financialsVisible ? margin.pct : null,
      marginCovered: margin.covered,
      marginTotal: margin.total,
      activeConsultants: pool.length,
      occupancyRate: occ.rate,
      staffed: occ.staffed,
      capacity: occ.capacity,
      bench: occ.bench,
      openOpportunities: openOpps.length,
      weightedPipeline: weightedPipeline(oppRows),
      pendingTimesheets,
      missionsEnding30: ending30.length,
    },
    series: monthlySeries(missions, timesheets, financialsVisible ? cost : () => null, today),
    occupancy: occupancySeries(pool, missions, today),
    endingBuckets: activeMissions.reduce(
      (acc, m) => {
        const b = endingBucket(m.end_date, today);
        if (b) acc[b]++;
        return acc;
      },
      { 15: 0, 30: 0, 60: 0, 90: 0 } as Record<15 | 30 | 60 | 90, number>,
    ),
    stages: pipelineByStage(oppRows),
    topClients,
    actions,
    financialsVisible,
  };
}
