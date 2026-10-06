// =========================================================================
// Le mois d'un CRA : jours attendus sur la mission, totaux, contrôles avant
// envoi et correction du pré-remplissage automatique. À la création d'un
// CRA, le trigger de la migration 026 marque TOUS les jours ouvrés du mois
// « travaillé », jours fériés et jours hors mission compris : une mission
// qui démarre le 27 partirait sinon avec un mois complet. Logique pure,
// partagée par le portail consultant et l'espace agence.
// =========================================================================

import { frenchHolidays } from '@/lib/utils/business-days';

export type DayKind = 'worked' | 'paid_leave' | 'sick_leave' | 'unpaid_leave' | 'holiday';

export type MonthDay = {
  day_date: string;
  kind: DayKind;
  duration: number | string | null;
  is_remote?: boolean | null;
};

/** Période de la mission ; null quand elle est inconnue (aucun contrôle de bornes). */
export type MissionSpan = { start_date: string | null; end_date: string | null } | null;

const pad = (n: number) => String(n).padStart(2, '0');

function monthDates(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
}

function weekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!).getDay();
}

const isWeekend = (iso: string) => {
  const dow = weekday(iso);
  return dow === 0 || dow === 6;
};

export function isHoliday(iso: string): boolean {
  return frenchHolidays(Number(iso.slice(0, 4))).has(iso.slice(0, 10));
}

/** Le jour tombe-t-il dans la période de la mission ? */
export function inSpan(iso: string, span: MissionSpan): boolean {
  if (!span) return true;
  const day = iso.slice(0, 10);
  if (span.start_date && day < span.start_date.slice(0, 10)) return false;
  if (span.end_date && day > span.end_date.slice(0, 10)) return false;
  return true;
}

/** Jours attendus : ouvrés (hors week-ends et jours fériés) et couverts par la mission. */
export function expectedDays(year: number, month: number, span: MissionSpan): string[] {
  return monthDates(year, month).filter((d) => !isWeekend(d) && !isHoliday(d) && inSpan(d, span));
}

export type MonthTotals = {
  /** Jours travaillés (demi-journées comprises). */
  worked: number;
  /** Dont télétravail. */
  remote: number;
  paid_leave: number;
  sick_leave: number;
  unpaid_leave: number;
  holiday: number;
  /** Congés, maladie et sans solde. */
  absences: number;
};

export function monthTotals(days: MonthDay[]): MonthTotals {
  const t: MonthTotals = { worked: 0, remote: 0, paid_leave: 0, sick_leave: 0, unpaid_leave: 0, holiday: 0, absences: 0 };
  for (const d of days) {
    if (d.kind === 'worked') {
      const v = Number(d.duration ?? 1) || 0;
      t.worked += v;
      if (d.is_remote) t.remote += v;
    } else {
      t[d.kind] += 1;
      if (d.kind !== 'holiday') t.absences += 1;
    }
  }
  return t;
}

export type CraCheck =
  /** Jours ouvrés de la mission sans aucune saisie. */
  | { id: 'unfilled'; days: string[] }
  /** Saisies en dehors de la période de la mission. */
  | { id: 'outside'; days: string[] }
  /** Jours fériés déclarés travaillés : possible, à confirmer. */
  | { id: 'holiday_worked'; days: string[] };

/** Contrôles avant envoi, du plus bloquant au plus anodin. Rien à signaler : liste vide. */
export function monthChecks(year: number, month: number, span: MissionSpan, days: MonthDay[]): CraCheck[] {
  const prefix = `${year}-${pad(month)}-`;
  const byDate = new Map(days.filter((d) => d.day_date.startsWith(prefix)).map((d) => [d.day_date.slice(0, 10), d]));
  const checks: CraCheck[] = [];
  const unfilled = expectedDays(year, month, span).filter((d) => !byDate.has(d));
  if (unfilled.length) checks.push({ id: 'unfilled', days: unfilled });
  const outside = [...byDate.keys()].filter((d) => !inSpan(d, span)).sort();
  if (outside.length) checks.push({ id: 'outside', days: outside });
  const holidayWorked = [...byDate.entries()]
    .filter(([d, day]) => day.kind === 'worked' && inSpan(d, span) && isHoliday(d))
    .map(([d]) => d)
    .sort();
  if (holidayWorked.length) checks.push({ id: 'holiday_worked', days: holidayWorked });
  return checks;
}

/**
 * Corrections du pré-remplissage automatique : les jours hors mission sont
 * retirés, les jours fériés passent en « férié ». À n'appliquer qu'à un CRA
 * qui vient d'être créé ; ensuite, la saisie du consultant fait foi.
 */
export function prefillCorrections(span: MissionSpan, days: MonthDay[]): { clear: string[]; holidays: string[] } {
  const clear: string[] = [];
  const holidays: string[] = [];
  for (const d of days) {
    const iso = d.day_date.slice(0, 10);
    if (!inSpan(iso, span)) clear.push(iso);
    else if (d.kind === 'worked' && isHoliday(iso)) holidays.push(iso);
  }
  return { clear: clear.sort(), holidays: holidays.sort() };
}

/**
 * Jours d'un même mois en clair : « lun. 14 sept. », « 1er, 2 et 5 oct. »,
 * ou « du 1er au 26 oct. » au-delà de quatre jours.
 */
export function daysLabel(days: string[], lang: 'fr' | 'en'): string {
  const sorted = [...days].sort();
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return '';
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const date = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
  const num = (iso: string) => {
    const n = Number(iso.slice(8, 10));
    return lang === 'fr' && n === 1 ? '1er' : String(n);
  };
  const month = date(first).toLocaleDateString(locale, { month: 'short' });
  if (sorted.length === 1) {
    const dow = date(first).toLocaleDateString(locale, { weekday: 'short' });
    return `${dow} ${num(first)} ${month}`;
  }
  if (sorted.length > 4) return lang === 'fr' ? `du ${num(first)} au ${num(last)} ${month}` : `${num(first)}–${num(last)} ${month}`;
  const nums = sorted.map(num);
  return `${nums.slice(0, -1).join(', ')} ${lang === 'fr' ? 'et' : 'and'} ${nums.at(-1)} ${month}`;
}
