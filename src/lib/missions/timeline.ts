// =========================================================================
// Frise d'une mission : un mois par case, de son début à sa fin (ou à M+2
// sans date de fin), avec l'état du CRA de chaque mois.
// =========================================================================

export type MonthState = 'validated' | 'submitted' | 'draft' | 'rejected' | 'missing' | 'current' | 'future';

export type TimelineMonth = {
  year: number;
  month: number; // 1-12
  state: MonthState;
  days: number | null;
  timesheetId: string | null;
  isCurrent: boolean;
};

type Sheet = { id: string; period_year: number; period_month: number; status: string; days_worked: number | null; days_validated: number | null };

const MAX_MONTHS = 24;
const key = (y: number, m: number) => y * 12 + (m - 1);
const fromKey = (k: number) => ({ year: Math.floor(k / 12), month: (k % 12) + 1 });

export function missionTimeline(start: string, end: string | null, sheets: Sheet[], today: string): TimelineMonth[] {
  const first = key(Number(start.slice(0, 4)), Number(start.slice(5, 7)));
  const now = key(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  let last = end ? key(Number(end.slice(0, 4)), Number(end.slice(5, 7))) : Math.max(now + 2, first);
  if (last < first) last = first;
  // Mission longue : 24 mois au plus, centrés sur aujourd'hui.
  let from = first;
  if (last - first + 1 > MAX_MONTHS) {
    from = Math.min(Math.max(first, now - 17), last - MAX_MONTHS + 1);
    last = from + MAX_MONTHS - 1;
  }
  const byMonth = new Map(sheets.map((s) => [key(s.period_year, s.period_month), s]));
  const out: TimelineMonth[] = [];
  for (let k = from; k <= last; k++) {
    const { year, month } = fromKey(k);
    const s = byMonth.get(k);
    let state: MonthState;
    if (s && s.status === 'client_validated') state = 'validated';
    else if (s && s.status === 'submitted') state = 'submitted';
    else if (s && s.status === 'rejected') state = 'rejected';
    else if (k > now) state = 'future';
    else if (k === now) state = 'current';
    else state = s ? 'draft' : 'missing';
    const days = s ? Number((s.status === 'client_validated' ? s.days_validated : s.days_worked) ?? 0) : null;
    out.push({ year, month, state, days, timesheetId: s?.id ?? null, isCurrent: k === now });
  }
  return out;
}
