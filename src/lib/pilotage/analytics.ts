// =========================================================================
// Analytics — calculs purs (testés). Chaque indicateur est défini ici, avec
// sa règle de calcul, pour que l'affichage n'invente rien.
// =========================================================================

import type { MissionLite } from './metrics';

export type OppAnalyticsRow = {
  status: string;
  created_at: string;
  updated_at: string;
  source?: string | null;
  lost_reason?: string | null;
};

/**
 * Taux de transformation : opportunités gagnées / (gagnées + perdues),
 * parmi celles clôturées depuis `since` (date de dernière mise à jour).
 */
export function winRate(opps: OppAnalyticsRow[], since: Date): { won: number; lost: number; rate: number | null } {
  let won = 0;
  let lost = 0;
  for (const o of opps) {
    if (new Date(o.updated_at) < since) continue;
    if (o.status === 'won') won++;
    else if (o.status === 'lost') lost++;
  }
  return { won, lost, rate: won + lost > 0 ? (won / (won + lost)) * 100 : null };
}

/** Origine des opportunités créées depuis `since`. */
export function sourceBreakdown(opps: OppAnalyticsRow[], since: Date): Array<{ source: string; count: number }> {
  const counts = new Map<string, number>();
  for (const o of opps) {
    if (new Date(o.created_at) < since) continue;
    const k = o.source || 'manual';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
}

/** Motifs de perte les plus fréquents (libellés regroupés sans tenir compte de la casse). */
export function lostReasons(opps: OppAnalyticsRow[], since: Date, limit = 5): Array<{ reason: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  let unspecified = 0;
  for (const o of opps) {
    if (o.status !== 'lost' || new Date(o.updated_at) < since) continue;
    const label = (o.lost_reason ?? '').trim();
    if (!label) {
      unspecified++;
      continue;
    }
    const key = label.toLowerCase();
    const cur = counts.get(key);
    counts.set(key, { label: cur?.label ?? label, count: (cur?.count ?? 0) + 1 });
  }
  const out = [...counts.values()].map((v) => ({ reason: v.label, count: v.count })).sort((a, b) => b.count - a.count).slice(0, limit);
  if (unspecified) out.push({ reason: '', count: unspecified });
  return out;
}

export type QuoteAnalyticsRow = { status: string; total_ht: number; sent_at: string | null; decided_at: string | null };

/**
 * Devis envoyés depuis `since` : taux d'acceptation (acceptés / décidés)
 * et délai médian de réponse (jours entre envoi et décision).
 */
export function quoteStats(quotes: QuoteAnalyticsRow[], since: Date) {
  const sent = quotes.filter((q) => q.sent_at && new Date(q.sent_at) >= since);
  const accepted = sent.filter((q) => q.status === 'accepted');
  const declined = sent.filter((q) => q.status === 'declined');
  const decided = accepted.length + declined.length;
  const delays = sent
    .filter((q) => q.decided_at && (q.status === 'accepted' || q.status === 'declined'))
    .map((q) => (new Date(q.decided_at!).getTime() - new Date(q.sent_at!).getTime()) / 86_400_000)
    .sort((a, b) => a - b);
  const median = delays.length ? (delays.length % 2 ? delays[(delays.length - 1) / 2]! : (delays[delays.length / 2 - 1]! + delays[delays.length / 2]!) / 2) : null;
  return {
    sent: sent.length,
    accepted: accepted.length,
    declined: declined.length,
    pending: sent.filter((q) => q.status === 'sent').length,
    acceptanceRate: decided ? (accepted.length / decided) * 100 : null,
    acceptedAmount: accepted.reduce((s, q) => s + Number(q.total_ht), 0),
    medianDaysToDecision: median != null ? Math.round(median * 10) / 10 : null,
  };
}

export type TimesheetAnalyticsRow = { period_year: number; period_month: number; status: string; submitted_at: string | null };

/**
 * Ponctualité des CRA : part des CRA d'un mois soumis au plus tard le
 * `graceDay` du mois suivant. Les CRA jamais soumis comptent comme en retard
 * une fois l'échéance passée.
 */
export function timesheetPunctuality(
  timesheets: TimesheetAnalyticsRow[],
  today: Date,
  months = 6,
  graceDay = 5,
): Array<{ key: string; year: number; month: number; total: number; onTime: number; rate: number | null }> {
  const out: Array<{ key: string; year: number; month: number; total: number; onTime: number; rate: number | null }> = [];
  for (let i = months; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const deadline = new Date(year, month, graceDay, 23, 59, 59);
    if (deadline > today) continue;
    const rows = timesheets.filter((t) => t.period_year === year && t.period_month === month);
    const onTime = rows.filter((t) => t.submitted_at && new Date(t.submitted_at) <= deadline).length;
    out.push({ key: `${year}-${String(month).padStart(2, '0')}`, year, month, total: rows.length, onTime, rate: rows.length ? (onTime / rows.length) * 100 : null });
  }
  return out;
}

/** CA réalisé par consultant (CRA validés × TJM) depuis un mois donné. */
export function revenueByConsultant(
  timesheets: Array<{ mission_id: string; period_year: number; period_month: number; status: string; days_validated: number | null; days_worked: number | null }>,
  missions: MissionLite[],
  since: { year: number; month: number },
): Map<string, number> {
  const byId = new Map(missions.map((m) => [m.id, m]));
  const sinceKey = since.year * 100 + since.month;
  const out = new Map<string, number>();
  for (const t of timesheets) {
    if (t.status !== 'client_validated' || t.period_year * 100 + t.period_month < sinceKey) continue;
    const m = byId.get(t.mission_id);
    if (!m?.daily_rate_eur) continue;
    const v = Number(t.days_validated ?? t.days_worked ?? 0) * Number(m.daily_rate_eur);
    out.set(m.consultant_id, (out.get(m.consultant_id) ?? 0) + v);
  }
  return out;
}

// ── Analytics V2 : cycle de vente, staffing, performance ─────────────────────

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / DAY_MS);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

/** Durée du cycle de vente : jours entre création et gain, opportunités gagnées depuis `since` (médiane). */
export function salesCycle(opps: OppAnalyticsRow[], since: Date): { medianDays: number | null; count: number } {
  const days = opps
    .filter((o) => o.status === 'won' && new Date(o.updated_at) >= since)
    .map((o) => dayDiff(o.created_at, o.updated_at))
    .filter((d) => d >= 0);
  const m = median(days);
  return { medianDays: m != null ? Math.round(m) : null, count: days.length };
}

type MissionRow = { consultant_id: string; status: string; start_date: string; end_date: string | null };
type PoolRow = { id: string; status: string; archived?: boolean; is_prospect?: boolean };

/**
 * Disponibilités à venir de l'effectif (hors indisponibles) : en intercontrat
 * aujourd'hui, puis libérés sous 30, 31 à 60 et 61 à 90 jours.
 */
export function futureAvailability(consultants: PoolRow[], missions: MissionRow[], today: Date): { now: number; d30: number; d60: number; d90: number } {
  const t = isoDay(today);
  const out = { now: 0, d30: 0, d60: 0, d90: 0 };
  for (const c of consultants) {
    if (c.archived || c.is_prospect || c.status === 'unavailable') continue;
    const active = missions
      .filter((m) => m.consultant_id === c.id && m.status === 'active' && m.start_date <= t && (!m.end_date || m.end_date >= t))
      .sort((a, b) => (b.end_date ?? '9999').localeCompare(a.end_date ?? '9999'));
    if (active.length === 0) {
      out.now++;
      continue;
    }
    const end = active[0]!.end_date;
    if (!end) continue;
    const inDays = dayDiff(t, end) + 1;
    if (inDays <= 30) out.d30++;
    else if (inDays <= 60) out.d60++;
    else if (inDays <= 90) out.d90++;
  }
  return out;
}

/** Fins de mission prévues par mois, du mois courant aux `months` suivants. */
export function missionEndingsByMonth(missions: MissionRow[], today: Date, months = 6): Array<{ key: string; year: number; month: number; count: number }> {
  const t = isoDay(today);
  const out: Array<{ key: string; year: number; month: number; count: number }> = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = missions.filter((m) => m.status === 'active' && m.end_date && m.end_date >= t && m.end_date.startsWith(key)).length;
    out.push({ key, year: d.getFullYear(), month: d.getMonth() + 1, count });
  }
  return out;
}

export type ProposalAnalyticsRow = { opportunity_id: string; sent_at: string | null; opportunity_status: string; opportunity_created_at: string };

/** Positionnements envoyés depuis `since`, et part de ceux dont l'opportunité est gagnée. */
export function positioningStats(proposals: ProposalAnalyticsRow[], since: Date): { total: number; won: number; rate: number | null } {
  const rows = proposals.filter((p) => p.sent_at && new Date(p.sent_at) >= since);
  const decided = rows.filter((p) => p.opportunity_status === 'won' || p.opportunity_status === 'lost');
  const won = decided.filter((p) => p.opportunity_status === 'won').length;
  return { total: rows.length, won, rate: decided.length ? (won / decided.length) * 100 : null };
}

/** Délai de staffing : jours entre la création d'une opportunité et son premier positionnement (médiane). */
export function staffingLeadTime(proposals: ProposalAnalyticsRow[], since: Date): { medianDays: number | null; count: number } {
  const first = new Map<string, ProposalAnalyticsRow>();
  for (const p of proposals) {
    if (!p.sent_at) continue;
    const cur = first.get(p.opportunity_id);
    if (!cur || p.sent_at < cur.sent_at!) first.set(p.opportunity_id, p);
  }
  const days = [...first.values()]
    .filter((p) => new Date(p.sent_at!) >= since)
    .map((p) => dayDiff(p.opportunity_created_at, p.sent_at!))
    .filter((d) => d >= 0);
  const m = median(days);
  return { medianDays: m != null ? Math.round(m) : null, count: days.length };
}

/**
 * Durée d'intercontrat : écart entre la fin d'une mission et le début de la
 * suivante pour un même consultant, reprises depuis `since` (moyenne en jours).
 */
export function benchGaps(missions: MissionRow[], since: Date): { averageDays: number | null; count: number } {
  const s = isoDay(since);
  const byConsultant = new Map<string, MissionRow[]>();
  for (const m of missions) {
    if (m.status !== 'active' && m.status !== 'ended') continue;
    (byConsultant.get(m.consultant_id) ?? byConsultant.set(m.consultant_id, []).get(m.consultant_id)!).push(m);
  }
  const gaps: number[] = [];
  for (const list of byConsultant.values()) {
    const sorted = [...list].sort((a, b) => a.start_date.localeCompare(b.start_date));
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1]!.end_date;
      const next = sorted[i]!;
      if (!prevEnd || next.start_date < s) continue;
      const gap = dayDiff(prevEnd, next.start_date) - 1;
      if (gap > 0) gaps.push(gap);
    }
  }
  return { averageDays: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null, count: gaps.length };
}

/** Renouvellements décidés : confirmés contre non renouvelés. */
export function renewalStats(missions: Array<{ renewal_status?: string | null }>): { confirmed: number; notRenewed: number; rate: number | null } {
  const confirmed = missions.filter((m) => m.renewal_status === 'confirmed').length;
  const notRenewed = missions.filter((m) => m.renewal_status === 'not_renewed').length;
  return { confirmed, notRenewed, rate: confirmed + notRenewed ? (confirmed / (confirmed + notRenewed)) * 100 : null };
}
