// =========================================================================
// Indicateurs de pilotage — calculs purs (testés), sans accès réseau.
// -------------------------------------------------------------------------
// Chaque indicateur affiché dans Centrium a une définition explicite ici.
// Les montants sont HT, en euros. Les jours sont des jours ouvrés français
// (week-ends et fériés exclus, congés non déduits sauf CRA validé).
// =========================================================================

import { businessDaysBetween, businessDaysOverlap } from '@/lib/utils/business-days';
import { PIPELINE_STAGES, stageOf } from '@/lib/crm/pipeline';
import type { OpportunityStatus } from '@/types';

export type MissionLite = {
  id: string;
  consultant_id: string;
  company_id: string | null;
  title?: string;
  status: string;
  start_date: string;
  end_date: string | null;
  daily_rate_eur: number | null;
};

export type TimesheetLite = {
  mission_id: string;
  period_year: number;
  period_month: number;
  days_validated: number | null;
  days_worked: number | null;
  status: string;
};

export type OpportunityLite = {
  id: string;
  status: OpportunityStatus;
  expected_revenue: number | null;
  probability: number | null;
  daily_rate_eur: number | null;
  duration_months: number | null;
  updated_at?: string;
  last_interaction?: string | null;
};

export type ConsultantLite = {
  id: string;
  status: string;
  archived?: boolean;
  is_prospect?: boolean;
  available_from?: string | null;
  current_mission_end?: string | null;
};

/** Coût journalier connu d'une mission : coût mission, sinon CJM du consultant. */
export type CostLookup = (mission: MissionLite) => number | null;

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isActive(m: MissionLite): boolean {
  return m.status === 'active';
}

/**
 * CA signé (carnet de commandes) : pour chaque mission active, TJM × jours
 * ouvrés restants d'aujourd'hui à la fin de mission. Une mission sans date
 * de fin est comptée jusqu'à la fin du mois courant (hypothèse prudente).
 */
export function bookedRevenue(missions: MissionLite[], today: Date): number {
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  let total = 0;
  for (const m of missions) {
    if (!isActive(m) || !m.daily_rate_eur) continue;
    const start = m.start_date > iso(today) ? m.start_date : iso(today);
    const end = m.end_date ?? iso(endOfMonth);
    if (end < start) continue;
    total += businessDaysBetween(start, end) * Number(m.daily_rate_eur);
  }
  return Math.round(total);
}

/** CA prévisionnel d'un mois : TJM × jours ouvrés des missions actives sur le mois. */
export function forecastRevenue(missions: MissionLite[], year: number, month: number): number {
  let total = 0;
  for (const m of missions) {
    if (!isActive(m) || !m.daily_rate_eur) continue;
    total += businessDaysOverlap(m.start_date, m.end_date, year, month) * Number(m.daily_rate_eur);
  }
  return Math.round(total);
}

/** Marge prévisionnelle d'un mois (missions dont le coût est connu). */
export function forecastMargin(
  missions: MissionLite[],
  year: number,
  month: number,
  cost: CostLookup,
): { revenue: number; margin: number; covered: number } {
  let revenue = 0;
  let margin = 0;
  let covered = 0;
  for (const m of missions) {
    if (!isActive(m) || !m.daily_rate_eur) continue;
    const c = cost(m);
    if (c == null) continue;
    const days = businessDaysOverlap(m.start_date, m.end_date, year, month);
    if (days === 0) continue;
    covered++;
    revenue += days * Number(m.daily_rate_eur);
    margin += days * (Number(m.daily_rate_eur) - c);
  }
  return { revenue: Math.round(revenue), margin: Math.round(margin), covered };
}

/**
 * Marge moyenne (%) des missions actives dont le coût est connu, pondérée
 * par le TJM. null si aucune mission n'a de coût renseigné.
 */
export function averageMarginPct(missions: MissionLite[], cost: CostLookup): { pct: number | null; covered: number; total: number } {
  let rate = 0;
  let marginSum = 0;
  let covered = 0;
  const active = missions.filter((m) => isActive(m) && m.daily_rate_eur);
  for (const m of active) {
    const c = cost(m);
    if (c == null) continue;
    covered++;
    rate += Number(m.daily_rate_eur);
    marginSum += Number(m.daily_rate_eur) - c;
  }
  return { pct: rate > 0 ? Math.round((marginSum / rate) * 1000) / 10 : null, covered, total: active.length };
}

/** Consultants comptés dans l'effectif : ni archivés, ni prospects du vivier. */
export function activeConsultants<T extends ConsultantLite>(consultants: T[]): T[] {
  return consultants.filter((c) => !c.archived && !c.is_prospect && c.status !== 'archived');
}

/**
 * Occupation à une date : consultants de l'effectif (hors indisponibles)
 * ayant une mission active couvrant la date / effectif disponible.
 */
export function occupancyAt(
  consultants: ConsultantLite[],
  missions: MissionLite[],
  date: Date,
): { rate: number | null; staffed: number; capacity: number; bench: number } {
  const d = iso(date);
  const pool = activeConsultants(consultants).filter((c) => c.status !== 'unavailable');
  const staffedIds = new Set(
    missions
      .filter((m) => (m.status === 'active' || m.status === 'ended') && m.start_date <= d && (!m.end_date || m.end_date >= d))
      .map((m) => m.consultant_id),
  );
  const staffed = pool.filter((c) => staffedIds.has(c.id)).length;
  const capacity = pool.length;
  return {
    rate: capacity > 0 ? Math.round((staffed / capacity) * 1000) / 10 : null,
    staffed,
    capacity,
    bench: capacity - staffed,
  };
}

/** Montant d'une opportunité : montant saisi, sinon TJM × durée × 20 j/mois. */
export function opportunityAmount(o: OpportunityLite): number {
  if (o.expected_revenue != null) return Number(o.expected_revenue);
  if (o.daily_rate_eur && o.duration_months) return Number(o.daily_rate_eur) * Number(o.duration_months) * 20;
  return 0;
}

export function isOpenOpportunity(o: { status: OpportunityStatus; archived?: boolean }): boolean {
  return !o.archived && o.status !== 'won' && o.status !== 'lost' && o.status !== 'on_hold';
}

/** Pipeline pondéré : Σ montant × probabilité des opportunités ouvertes. */
export function weightedPipeline(opps: OpportunityLite[]): number {
  return Math.round(
    opps.filter(isOpenOpportunity).reduce((s, o) => s + opportunityAmount(o) * ((o.probability ?? 0) / 100), 0),
  );
}

export type StageSummary = { stage: string; count: number; amount: number; weighted: number };

export function pipelineByStage(opps: OpportunityLite[]): StageSummary[] {
  return PIPELINE_STAGES.filter((s) => s.id !== 'won' && s.id !== 'lost').map((s) => {
    const rows = opps.filter((o) => stageOf(o.status) === s.id);
    return {
      stage: s.id,
      count: rows.length,
      amount: Math.round(rows.reduce((t, o) => t + opportunityAmount(o), 0)),
      weighted: Math.round(rows.reduce((t, o) => t + opportunityAmount(o) * ((o.probability ?? 0) / 100), 0)),
    };
  });
}

/**
 * CA réalisé d'un mois : jours validés des CRA × TJM de la mission.
 * Seuls les CRA validés (client_validated) comptent.
 */
export function realizedRevenue(
  timesheets: TimesheetLite[],
  missionsById: Map<string, MissionLite>,
  year: number,
  month: number,
): number {
  let total = 0;
  for (const t of timesheets) {
    if (t.status !== 'client_validated' || t.period_year !== year || t.period_month !== month) continue;
    const m = missionsById.get(t.mission_id);
    if (!m?.daily_rate_eur) continue;
    total += Number(t.days_validated ?? t.days_worked ?? 0) * Number(m.daily_rate_eur);
  }
  return Math.round(total);
}

export type MonthPoint = {
  key: string;
  year: number;
  month: number;
  /** CA réalisé (CRA validés) — mois passés et courant. */
  realized: number | null;
  /** CA prévisionnel (missions actives) — mois courant et futurs. */
  forecast: number | null;
  /** Marge (réalisée si CRA validés et coûts connus, sinon prévisionnelle). */
  margin: number | null;
};

/** Série mensuelle : `back` mois passés + mois courant + `ahead` mois futurs. */
export function monthlySeries(
  missions: MissionLite[],
  timesheets: TimesheetLite[],
  cost: CostLookup,
  today: Date,
  back = 5,
  ahead = 3,
): MonthPoint[] {
  const byId = new Map(missions.map((m) => [m.id, m]));
  const out: MonthPoint[] = [];
  for (let i = -back; i <= ahead; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const isPast = i < 0;
    const isFuture = i > 0;
    const realized = isFuture ? null : realizedRevenue(timesheets, byId, year, month);
    const forecast = isPast ? null : forecastRevenue(missions, year, month);

    let margin: number | null = null;
    if (!isFuture) {
      let m = 0;
      let any = false;
      for (const t of timesheets) {
        if (t.status !== 'client_validated' || t.period_year !== year || t.period_month !== month) continue;
        const mission = byId.get(t.mission_id);
        if (!mission?.daily_rate_eur) continue;
        const c = cost(mission);
        if (c == null) continue;
        any = true;
        m += Number(t.days_validated ?? t.days_worked ?? 0) * (Number(mission.daily_rate_eur) - c);
      }
      margin = any ? Math.round(m) : null;
    }
    if (margin == null && !isPast) {
      const f = forecastMargin(missions, year, month, cost);
      margin = f.covered > 0 ? f.margin : null;
    }
    out.push({ key: `${year}-${String(month).padStart(2, '0')}`, year, month, realized, forecast, margin });
  }
  return out;
}

/** Occupation fin de mois sur les `back` derniers mois + mois courant. */
export function occupancySeries(
  consultants: ConsultantLite[],
  missions: MissionLite[],
  today: Date,
  back = 5,
): Array<{ key: string; rate: number | null; bench: number }> {
  const out: Array<{ key: string; rate: number | null; bench: number }> = [];
  for (let i = -back; i <= 0; i++) {
    const ref = i === 0 ? today : new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
    const o = occupancyAt(consultants, missions, ref);
    out.push({
      key: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
      rate: o.rate,
      bench: o.bench,
    });
  }
  return out;
}

/** CA réalisé par client sur une période (CRA validés). */
export function revenueByClient(
  timesheets: TimesheetLite[],
  missions: MissionLite[],
  since: { year: number; month: number },
): Map<string, number> {
  const byId = new Map(missions.map((m) => [m.id, m]));
  const out = new Map<string, number>();
  const sinceKey = since.year * 100 + since.month;
  for (const t of timesheets) {
    if (t.status !== 'client_validated') continue;
    if (t.period_year * 100 + t.period_month < sinceKey) continue;
    const m = byId.get(t.mission_id);
    if (!m?.daily_rate_eur || !m.company_id) continue;
    const v = Number(t.days_validated ?? t.days_worked ?? 0) * Number(m.daily_rate_eur);
    out.set(m.company_id, (out.get(m.company_id) ?? 0) + v);
  }
  return out;
}

/** Jours avant une date (négatif si passée). */
export function daysUntil(dateIso: string, today: Date): number {
  const d = new Date(dateIso + 'T00:00:00');
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** Tranche d'échéance d'une mission : 15, 30, 60, 90 jours ou null. */
export function endingBucket(endDate: string | null, today: Date): 15 | 30 | 60 | 90 | null {
  if (!endDate) return null;
  const d = daysUntil(endDate, today);
  if (d < 0) return null;
  if (d <= 15) return 15;
  if (d <= 30) return 30;
  if (d <= 60) return 60;
  if (d <= 90) return 90;
  return null;
}
