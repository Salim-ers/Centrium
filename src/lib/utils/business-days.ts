// =========================================================================
// Jours ouvrés (France métropolitaine)
// -------------------------------------------------------------------------
// Utilisé pour les prévisions de CA, l'occupation et le pré-remplissage
// des CRA. Jours fériés légaux : 1er janvier, lundi de Pâques, 1er mai,
// 8 mai, Ascension, lundi de Pentecôte, 14 juillet, 15 août, 1er novembre,
// 11 novembre, 25 décembre. Toutes les dates manipulées sont « locales »
// (aucune conversion de fuseau).
// =========================================================================

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map<number, Set<string>>();

export function frenchHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const plus = (days: number) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + days);
  const set = new Set<string>([
    `${year}-01-01`,
    ymd(plus(1)), // lundi de Pâques
    `${year}-05-01`,
    `${year}-05-08`,
    ymd(plus(39)), // Ascension
    ymd(plus(50)), // lundi de Pentecôte
    `${year}-07-14`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ]);
  holidayCache.set(year, set);
  return set;
}

export function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !frenchHolidays(d.getFullYear()).has(ymd(d));
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Nombre de jours ouvrés entre deux dates incluses (ISO YYYY-MM-DD ou Date). */
export function businessDaysBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? parseLocal(start) : new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = typeof end === 'string' ? parseLocal(end) : new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (e < s) return 0;
  let count = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    if (isBusinessDay(d)) count++;
  }
  return count;
}

/** Jours ouvrés d'un mois (month : 1-12). */
export function businessDaysInMonth(year: number, month: number): number {
  return businessDaysBetween(new Date(year, month - 1, 1), new Date(year, month, 0));
}

/**
 * Jours ouvrés d'une période [start, end] qui tombent dans le mois donné.
 * `end` null = mission sans date de fin (court jusqu'à la fin du mois).
 */
export function businessDaysOverlap(
  start: string,
  end: string | null,
  year: number,
  month: number,
): number {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const s = parseLocal(start);
  const e = end ? parseLocal(end) : monthEnd;
  const from = s > monthStart ? s : monthStart;
  const to = e < monthEnd ? e : monthEnd;
  return businessDaysBetween(from, to);
}
