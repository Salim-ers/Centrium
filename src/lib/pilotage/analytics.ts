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
