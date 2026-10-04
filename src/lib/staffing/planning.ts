// =========================================================================
// Planning de staffing — calculs purs (fenêtre, segments, congés).
// Les dates sont des chaînes ISO locales (YYYY-MM-DD).
// =========================================================================

export type PlanningScale = 'weeks' | 'months';

export type PlanningWindow = {
  start: string;
  end: string;
  days: number;
  columns: Array<{ key: string; start: string; end: string; label: { fr: string; en: string }; sub?: string }>;
};

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** Numéro de semaine ISO 8601. */
export function isoWeek(iso: string): number {
  const d = parse(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Fenêtre : 12 semaines à partir du lundi courant, ou 6 mois à partir du mois courant. */
export function planningWindow(scale: PlanningScale, today: Date, offset = 0): PlanningWindow {
  if (scale === 'weeks') {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
    const start = toIso(monday);
    const columns = Array.from({ length: 12 }, (_, i) => {
      const s = addDays(start, i * 7);
      const d = parse(s);
      return {
        key: s,
        start: s,
        end: addDays(s, 6),
        label: { fr: `S${isoWeek(s)}`, en: `W${isoWeek(s)}` },
        sub: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', ''),
      };
    });
    return { start, end: addDays(start, 83), days: 84, columns };
  }
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const columns = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      key: toIso(d),
      start: toIso(d),
      end: toIso(last),
      label: {
        fr: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', ''),
        en: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      },
    };
  });
  const start = columns[0]!.start;
  const end = columns[columns.length - 1]!.end;
  return { start, end, days: diffDays(start, end) + 1, columns };
}

export type Segment = { left: number; width: number; clippedStart: boolean; clippedEnd: boolean };

/**
 * Position d'une période dans la fenêtre, en pourcentage. null si la période
 * est entièrement hors fenêtre. `end` null = période ouverte.
 */
export function segmentIn(win: PlanningWindow, start: string, end: string | null): Segment | null {
  const s = start > win.start ? start : win.start;
  const e = end === null || end > win.end ? win.end : end;
  if (e < s || start > win.end || (end !== null && end < win.start)) return null;
  const left = (diffDays(win.start, s) / win.days) * 100;
  const width = ((diffDays(s, e) + 1) / win.days) * 100;
  return { left, width, clippedStart: start < win.start, clippedEnd: end === null || end > win.end };
}

/** Regroupe des jours isolés (congés) en plages continues. */
export function mergeDays(days: string[]): Array<{ start: string; end: string }> {
  const sorted = [...new Set(days)].sort();
  const out: Array<{ start: string; end: string }> = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, d) <= 3 && diffDays(last.end, d) >= 1) {
      // Un week-end entre deux jours de congé ne casse pas la plage.
      last.end = d;
    } else {
      out.push({ start: d, end: d });
    }
  }
  return out;
}

/** Date de prochaine disponibilité d'un consultant, d'après ses missions. */
export function nextFreeDate(
  missions: Array<{ start_date: string; end_date: string | null; status: string }>,
  today: string,
): string | null {
  const active = missions
    .filter((m) => m.status === 'active' && m.start_date <= today && (!m.end_date || m.end_date >= today))
    .sort((a, b) => (b.end_date ?? '9999').localeCompare(a.end_date ?? '9999'));
  if (active.length === 0) return today;
  const end = active[0]!.end_date;
  return end ? addDays(end, 1) : null;
}
