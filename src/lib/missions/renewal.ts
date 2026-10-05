// =========================================================================
// Renouvellement de mission : à 30 jours de la fin, Centrium demande si la
// mission est renouvelée. Oui → prolongation à préparer ; Non → le
// consultant se libère ; À confirmer → rappel pour le responsable.
// Fonctions pures (dates ISO AAAA-MM-JJ, calculs en UTC).
// =========================================================================

import { businessDaysBetween } from '@/lib/utils/business-days';

export const RENEWAL_WINDOW_DAYS = 30;

export type RenewalStage = 'ask' | 'extend' | 'ending';

type RenewalInput = { status: string; end_date: string | null; renewal_status?: string | null };

const DAY = 86_400_000;
const toUtc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function isoAddDays(iso: string, n: number): string {
  return fromUtc(toUtc(iso) + n * DAY);
}

/** Nombre de jours de `from` à `to` (négatif si `to` est passé). */
export function isoDiffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY);
}

/**
 * Étape du renouvellement pour une mission active qui se termine dans les
 * 30 jours : `ask` (à statuer), `extend` (confirmé, prolongation à
 * préparer), `ending` (non renouvelée). null hors de la fenêtre.
 */
export function renewalStage(m: RenewalInput, today: string): RenewalStage | null {
  if (m.status !== 'active' || !m.end_date) return null;
  const left = isoDiffDays(today, m.end_date);
  if (left < 0 || left > RENEWAL_WINDOW_DAYS) return null;
  if (m.renewal_status === 'confirmed') return 'extend';
  if (m.renewal_status === 'not_renewed') return 'ending';
  return 'ask';
}

/** Fin proposée pour une prolongation : n mois plus tard, fin de mois conservée. */
export function proposedExtensionEnd(end: string, months = 3): string {
  const y = Number(end.slice(0, 4));
  const m = Number(end.slice(5, 7)) - 1;
  const d = Number(end.slice(8, 10));
  const target = m + months;
  const ty = y + Math.floor(target / 12);
  const tm = ((target % 12) + 12) % 12;
  const td = d === lastDay(y, m) ? lastDay(ty, tm) : Math.min(d, lastDay(ty, tm));
  return `${ty}-${pad(tm + 1)}-${pad(td)}`;
}

/** Jours prévus après prolongation, quand ils avaient été saisis. */
export function extendedPlannedDays(planned: number | null, oldEnd: string, newEnd: string): number | null {
  if (planned == null) return null;
  if (newEnd <= oldEnd) return planned;
  return planned + businessDaysBetween(isoAddDays(oldEnd, 1), newEnd);
}

/** Échéance du rappel « à confirmer » : sous 7 jours, au plus tard 5 jours avant la fin. */
export function reminderDueDate(today: string, end: string): string {
  const inAWeek = isoAddDays(today, 7);
  const beforeEnd = isoAddDays(end, -5);
  const due = inAWeek < beforeEnd ? inAWeek : beforeEnd;
  return due < today ? today : due;
}

/** Clé de dédoublonnage : un seul rappel ouvert par mission. */
export const renewalReminderKey = (missionId: string) => `renewal-check:${missionId}`;
