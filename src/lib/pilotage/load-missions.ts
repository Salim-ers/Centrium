// =========================================================================
// Missions : liste enrichie (consultant, client, coût, CA réalisé et
// prévisionnel, marge, échéance). Calcul local, lecture sous RLS.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Mission } from '@/types';
import { businessDaysBetween } from '@/lib/utils/business-days';
import { daysUntil, endingBucket, iso } from './metrics';

export type MissionRow = Mission & {
  consultant_name: string;
  consultant_job: string | null;
  company_name: string | null;
  /** CJM connu (mission, sinon consultant). null si non visible ou non saisi. */
  daily_cost_eur: number | null;
  /** Jours validés (CRA validés). */
  validated_days: number;
  realized_revenue: number;
  /** Jours prévus : saisis, sinon jours ouvrés de la période (fin connue). */
  planned_days_effective: number | null;
  forecast_revenue: number | null;
  margin_pct: number | null;
  margin_eur: number | null;
  days_left: number | null;
  bucket: 15 | 30 | 60 | 90 | null;
};

export async function loadMissions(
  supabase: SupabaseClient,
  orgId: string,
  opts: { financials: boolean; includeArchived?: boolean },
  today = new Date(),
): Promise<MissionRow[]> {
  let q = supabase
    .from('missions')
    .select('*, consultants(first_name, last_name, job_title), companies(name)')
    .eq('organization_id', orgId)
    .order('start_date', { ascending: false })
    .limit(5000);
  if (!opts.includeArchived) q = q.eq('archived', false);

  const [{ data: missions }, ts, mf, cf] = await Promise.all([
    q,
    supabase
      .from('timesheets')
      .select('mission_id, days_validated, days_worked, status')
      .eq('organization_id', orgId)
      .eq('status', 'client_validated')
      .limit(20000),
    opts.financials ? supabase.from('mission_financials').select('mission_id, daily_cost_eur') : Promise.resolve({ data: [], error: null }),
    opts.financials ? supabase.from('consultant_financials').select('consultant_id, daily_cost_eur') : Promise.resolve({ data: [], error: null }),
  ]);

  const validated = new Map<string, number>();
  for (const t of (ts.data ?? []) as Array<{ mission_id: string; days_validated: number | null; days_worked: number | null }>) {
    validated.set(t.mission_id, (validated.get(t.mission_id) ?? 0) + Number(t.days_validated ?? t.days_worked ?? 0));
  }
  const mCost = new Map(
    ((mf.error ? [] : mf.data) ?? [])
      .filter((r: { daily_cost_eur: number | null }) => r.daily_cost_eur != null)
      .map((r: { mission_id: string; daily_cost_eur: number }) => [r.mission_id, Number(r.daily_cost_eur)]),
  );
  const cCost = new Map(
    ((cf.error ? [] : cf.data) ?? [])
      .filter((r: { daily_cost_eur: number | null }) => r.daily_cost_eur != null)
      .map((r: { consultant_id: string; daily_cost_eur: number }) => [r.consultant_id, Number(r.daily_cost_eur)]),
  );
  const todayIso = iso(today);

  return ((missions ?? []) as Array<Mission & {
    consultants: { first_name: string; last_name: string; job_title: string | null } | null;
    companies: { name: string } | null;
  }>).map((m) => {
    const rate = Number(m.daily_rate_eur) || 0;
    const cost = mCost.get(m.id) ?? cCost.get(m.consultant_id) ?? null;
    const vDays = validated.get(m.id) ?? 0;
    const planned =
      m.planned_days != null
        ? Number(m.planned_days)
        : m.end_date && m.end_date >= m.start_date
          ? businessDaysBetween(m.start_date, m.end_date)
          : null;
    const marginPct = cost != null && rate > 0 ? Math.round(((rate - cost) / rate) * 1000) / 10 : null;
    return {
      ...m,
      consultant_name: m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—',
      consultant_job: m.consultants?.job_title ?? null,
      company_name: m.companies?.name ?? null,
      daily_cost_eur: cost,
      validated_days: vDays,
      realized_revenue: Math.round(vDays * rate),
      planned_days_effective: planned,
      forecast_revenue: planned != null ? Math.round(planned * rate) : null,
      margin_pct: marginPct,
      margin_eur: cost != null && planned != null ? Math.round(planned * (rate - cost)) : null,
      days_left: m.end_date && m.status === 'active' ? daysUntil(m.end_date, today) : null,
      bucket: m.status === 'active' && m.end_date && m.end_date >= todayIso ? endingBucket(m.end_date, today) : null,
    };
  });
}
