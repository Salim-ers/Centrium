// =========================================================================
// Finance — pilotage (pas de comptabilité) : CA signé / réalisé /
// prévisionnel, marges par consultant, mission et client, concentration,
// préfacturation, encaissements connus, coût estimé de l'intercontrat.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { businessDaysInMonth } from '@/lib/utils/business-days';
import { DEFAULT_MARGIN_POLICY } from '@/lib/finance/margin-policy';
import {
  bookedRevenue,
  forecastRevenue,
  monthlySeries,
  occupancyAt,
  type MissionLite,
  type MonthPoint,
  type TimesheetLite,
} from './metrics';

type Breakdown = { id: string; label: string; sub?: string | null; revenue: number; margin: number | null; marginPct: number | null; days: number };

/** Objectif de marge par défaut (organisation sans réglage, consultant sans objectif propre). */
export const DEFAULT_TARGET_MARGIN_PCT = DEFAULT_MARGIN_POLICY.target;

export type LowMarginMission = { id: string; label: string; sub: string | null; marginPct: number; target: number; targetIsDefault: boolean };

export type FinanceSummary = {
  kpis: {
    booked: number;
    realizedYtd: number;
    realized12m: number;
    forecast3m: number;
    margin12m: number | null;
    marginPct12m: number | null;
    marginCoverage: number;
    draftCount: number;
    draftAmount: number;
    /** Préfactures à contrôler (brouillons non validés). */
    toReviewCount: number;
    toReviewAmount: number;
    toExportCount: number;
    toExportAmount: number;
    receivable: number;
    overdue: number;
    paid12m: number;
    benchCostMonth: number | null;
    benchCount: number;
    benchCovered: number;
  };
  series: MonthPoint[];
  byConsultant: Breakdown[];
  byMission: Breakdown[];
  byClient: Breakdown[];
  concentration: { top1: number | null; top3: number | null; top1Name: string | null };
  /** Missions actives dont la marge (TJM − CJM) est sous l'objectif. */
  lowMargin: LowMarginMission[];
};

/** `defaultTarget` : objectif de marge de l'organisation, appliqué aux consultants sans objectif propre. */
export async function loadFinance(supabase: SupabaseClient, orgId: string, withCosts: boolean, today = new Date(), defaultTarget = DEFAULT_TARGET_MARGIN_PCT): Promise<FinanceSummary> {
  const since = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const sinceKey = since.getFullYear() * 100 + since.getMonth() + 1;
  const tolerant = <T>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const [missions, timesheets, invoices, consultants, mf, cf] = await Promise.all([
    tolerant(
      supabase
        .from('missions')
        .select('id, consultant_id, company_id, title, status, start_date, end_date, daily_rate_eur, consultants(first_name, last_name), companies(name)')
        .eq('organization_id', orgId)
        .eq('archived', false)
        .limit(5000),
      [] as Array<MissionLite & { title: string; consultants: { first_name: string; last_name: string } | null; companies: { name: string } | null }>,
    ),
    tolerant(
      supabase
        .from('timesheets')
        .select('mission_id, period_year, period_month, days_validated, days_worked, status')
        .eq('organization_id', orgId)
        .eq('status', 'client_validated')
        .gte('period_year', since.getFullYear() - 1)
        .limit(20000),
      [] as TimesheetLite[],
    ),
    tolerant(
      supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', orgId)
        .eq('party', 'client')
        .eq('archived', false)
        .gte('issue_date', `${since.getFullYear() - 1}-01-01`)
        .limit(10000),
      [] as Array<{
        status: string;
        amount_ht: number;
        due_date: string;
        issue_date: string;
        payment_date: string | null;
        validated_at?: string | null;
        export_status?: string;
      }>,
    ),
    tolerant(
      supabase.from('consultants').select('id, status, archived, is_prospect').eq('organization_id', orgId).eq('archived', false).limit(3000),
      [] as Array<{ id: string; status: string; archived: boolean; is_prospect: boolean }>,
    ),
    withCosts ? tolerant(supabase.from('mission_financials').select('mission_id, daily_cost_eur'), [] as Array<{ mission_id: string; daily_cost_eur: number | null }>) : [],
    withCosts
      ? tolerant(supabase.from('consultant_financials').select('consultant_id, daily_cost_eur, target_margin_pct'), [] as Array<{ consultant_id: string; daily_cost_eur: number | null; target_margin_pct?: number | null }>)
      : [],
  ]);

  const mCost = new Map(mf.filter((r) => r.daily_cost_eur != null).map((r) => [r.mission_id, Number(r.daily_cost_eur)]));
  const cCost = new Map(cf.filter((r) => r.daily_cost_eur != null).map((r) => [r.consultant_id, Number(r.daily_cost_eur)]));
  const cost = (m: MissionLite) => mCost.get(m.id) ?? cCost.get(m.consultant_id) ?? null;
  const cTarget = new Map(cf.filter((r) => r.target_margin_pct != null).map((r) => [r.consultant_id, Number(r.target_margin_pct)]));
  const byId = new Map(missions.map((m) => [m.id, m]));

  // Agrégats sur 12 mois glissants (CRA validés).
  const cons = new Map<string, Breakdown>();
  const miss = new Map<string, Breakdown>();
  const clients = new Map<string, Breakdown>();
  let realized12m = 0;
  let realizedYtd = 0;
  let margin12m = 0;
  let revenueWithCost = 0;
  const bump = (map: Map<string, Breakdown>, key: string, init: () => Breakdown, revenue: number, margin: number | null, days: number) => {
    const row = map.get(key) ?? init();
    row.revenue += revenue;
    row.days += days;
    if (margin !== null) row.margin = (row.margin ?? 0) + margin;
    map.set(key, row);
  };

  for (const t of timesheets) {
    const key = t.period_year * 100 + t.period_month;
    const m = byId.get(t.mission_id);
    if (!m?.daily_rate_eur) continue;
    const days = Number(t.days_validated ?? t.days_worked ?? 0);
    const revenue = days * Number(m.daily_rate_eur);
    if (t.period_year === today.getFullYear()) realizedYtd += revenue;
    if (key < sinceKey) continue;
    realized12m += revenue;
    const c = cost(m);
    const margin = c != null ? days * (Number(m.daily_rate_eur) - c) : null;
    if (margin !== null) {
      margin12m += margin;
      revenueWithCost += revenue;
    }
    const consultantName = m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—';
    bump(cons, m.consultant_id, () => ({ id: m.consultant_id, label: consultantName, revenue: 0, margin: null, marginPct: null, days: 0 }), revenue, margin, days);
    bump(miss, m.id, () => ({ id: m.id, label: m.title, sub: `${consultantName}${m.companies?.name ? ` · ${m.companies.name}` : ''}`, revenue: 0, margin: null, marginPct: null, days: 0 }), revenue, margin, days);
    if (m.company_id) bump(clients, m.company_id, () => ({ id: m.company_id!, label: m.companies?.name ?? '—', revenue: 0, margin: null, marginPct: null, days: 0 }), revenue, margin, days);
  }
  const finalize = (map: Map<string, Breakdown>) =>
    [...map.values()]
      .map((r) => ({
        ...r,
        revenue: Math.round(r.revenue),
        margin: r.margin !== null ? Math.round(r.margin) : null,
        marginPct: r.margin !== null && r.revenue > 0 ? Math.round((r.margin / r.revenue) * 1000) / 10 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

  const byClient = finalize(clients);
  const totalClients = byClient.reduce((s, c) => s + c.revenue, 0);

  // Préfacturation et encaissements (factures de vente).
  const drafts = invoices.filter((i) => i.status === 'draft');
  const toReview = drafts.filter((i) => !i.validated_at);
  const toExport = invoices.filter((i) => i.status !== 'cancelled' && !!i.validated_at && (i.export_status ?? 'not_exported') !== 'exported');
  const todayIso = today.toISOString().slice(0, 10);
  const sinceIso = since.toISOString().slice(0, 10);

  // Coût estimé de l'intercontrat : consultants sans mission × CJM × jours ouvrés du mois.
  const pool = consultants.filter((c) => !c.is_prospect && c.status !== 'unavailable');
  const occ = occupancyAt(pool, missions, today);
  const staffed = new Set(
    missions
      .filter((m) => m.status === 'active' && m.start_date <= todayIso && (!m.end_date || m.end_date >= todayIso))
      .map((m) => m.consultant_id),
  );
  const bench = pool.filter((c) => !staffed.has(c.id));
  const benchCovered = bench.filter((c) => cCost.has(c.id)).length;
  const monthDays = businessDaysInMonth(today.getFullYear(), today.getMonth() + 1);
  const benchCost = withCosts && benchCovered > 0 ? bench.reduce((s, c) => s + (cCost.get(c.id) ?? 0) * monthDays, 0) : null;

  let forecast3m = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    forecast3m += forecastRevenue(missions, d.getFullYear(), d.getMonth() + 1);
  }

  return {
    kpis: {
      booked: bookedRevenue(missions, today),
      realizedYtd: Math.round(realizedYtd),
      realized12m: Math.round(realized12m),
      forecast3m,
      margin12m: withCosts && revenueWithCost > 0 ? Math.round(margin12m) : null,
      marginPct12m: withCosts && revenueWithCost > 0 ? Math.round((margin12m / revenueWithCost) * 1000) / 10 : null,
      marginCoverage: realized12m > 0 ? Math.round((revenueWithCost / realized12m) * 100) : 0,
      draftCount: drafts.length,
      draftAmount: Math.round(drafts.reduce((s, i) => s + Number(i.amount_ht), 0)),
      toReviewCount: toReview.length,
      toReviewAmount: Math.round(toReview.reduce((s, i) => s + Number(i.amount_ht), 0)),
      toExportCount: toExport.length,
      toExportAmount: Math.round(toExport.reduce((s, i) => s + Number(i.amount_ht), 0)),
      receivable: Math.round(invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + Number(i.amount_ht), 0)),
      overdue: Math.round(
        invoices
          .filter((i) => i.status === 'overdue' || (i.status === 'sent' && i.due_date < todayIso))
          .reduce((s, i) => s + Number(i.amount_ht), 0),
      ),
      paid12m: Math.round(invoices.filter((i) => i.status === 'paid' && (i.payment_date ?? i.issue_date) >= sinceIso).reduce((s, i) => s + Number(i.amount_ht), 0)),
      benchCostMonth: benchCost !== null ? Math.round(benchCost) : null,
      benchCount: occ.bench,
      benchCovered,
    },
    series: monthlySeries(missions, timesheets, withCosts ? cost : () => null, today, 11, 6),
    byConsultant: finalize(cons),
    byMission: finalize(miss),
    byClient,
    concentration: {
      top1: totalClients > 0 && byClient[0] ? Math.round((byClient[0].revenue / totalClients) * 1000) / 10 : null,
      top3: totalClients > 0 ? Math.round((byClient.slice(0, 3).reduce((s, c) => s + c.revenue, 0) / totalClients) * 1000) / 10 : null,
      top1Name: byClient[0]?.label ?? null,
    },
    lowMargin: withCosts
      ? missions
          .filter((m) => m.status === 'active' && Number(m.daily_rate_eur) > 0 && cost(m) != null)
          .map((m) => {
            const rate = Number(m.daily_rate_eur);
            const marginPct = Math.round(((rate - cost(m)!) / rate) * 1000) / 10;
            const own = cTarget.get(m.consultant_id);
            const consultantName = m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : null;
            return {
              id: m.id,
              label: m.title,
              sub: [consultantName, m.companies?.name].filter(Boolean).join(' · ') || null,
              marginPct,
              target: own ?? defaultTarget,
              targetIsDefault: own == null,
            };
          })
          .filter((r) => r.marginPct < r.target)
          .sort((a, b) => a.marginPct - b.marginPct)
      : [],
  };
}
