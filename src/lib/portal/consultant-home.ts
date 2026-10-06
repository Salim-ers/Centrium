// =========================================================================
// Accueil du portail consultant : CRA attendus et disponibilité, calculés
// uniquement à partir des données que le consultant voit déjà (ses
// missions via portal_my_missions(), ses CRA, sa fiche portal_my_profile()).
// =========================================================================

import type { PortalMission, Timesheet } from '@/types';

type MissionDates = Pick<PortalMission, 'id' | 'status' | 'start_date' | 'end_date'>;
type SheetLite = Pick<Timesheet, 'id' | 'mission_id' | 'period_month' | 'period_year' | 'status'>;

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** La mission couvre-t-elle au moins un jour du mois (month : 1–12) ? */
export function runsInMonth(m: Pick<MissionDates, 'start_date' | 'end_date'>, year: number, month: number): boolean {
  const first = `${year}-${pad(month)}-01`;
  const last = isoDay(new Date(year, month, 0));
  return m.start_date <= last && (!m.end_date || m.end_date >= first);
}

/**
 * CRA attendus : ceux du mois en cours (missions actives qui couvrent le
 * mois) et ceux du mois précédent pas encore transmis (absents ou en
 * brouillon). Les CRA refusés sont rendus à part : ils sont à corriger
 * en premier.
 */
export function craOverview<M extends MissionDates, S extends SheetLite>(missions: M[], sheets: S[], today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const sheetOf = (missionId: string, y: number, mo: number): S | null =>
    sheets.find((s) => s.mission_id === missionId && s.period_year === y && s.period_month === mo) ?? null;

  const current = missions
    .filter((m) => m.status === 'active' && runsInMonth(m, year, month))
    .map((mission) => ({ mission, sheet: sheetOf(mission.id, year, month) }));
  const previousDue = missions
    .filter((m) => (m.status === 'active' || m.status === 'ended') && runsInMonth(m, prev.year, prev.month))
    .map((mission) => ({ mission, sheet: sheetOf(mission.id, prev.year, prev.month) }))
    .filter(({ sheet }) => !sheet || sheet.status === 'draft');
  const rejected = sheets.filter((s) => s.status === 'rejected');

  return { year, month, prev, current, previousDue, rejected };
}

export type Availability =
  /** En mission ; `until` = fin la plus tardive, null si sans date de fin. */
  | { kind: 'on_mission'; until: string | null }
  /** Mission active qui n'a pas encore démarré. */
  | { kind: 'upcoming'; start: string }
  | { kind: 'available_from'; date: string }
  | { kind: 'available' }
  /** Indisponible ; `date` = retour prévu si l'ESN l'a renseigné. */
  | { kind: 'unavailable'; date: string | null };

type ProfileAvailability = { status: string | null; available_from: string | null };

/**
 * Disponibilité telle que l'ESN la connaît. Les missions priment : le statut
 * « en mission » de la fiche suit toute mission active, même pas encore
 * démarrée (trigger de la migration 044), il ne dit donc pas si le
 * consultant est en mission aujourd'hui. Sans mission, la fiche fait foi
 * (indisponibilité, date de disponibilité).
 */
export function availabilityOf<M extends MissionDates>(profile: ProfileAvailability | null, missions: M[], today: Date): { availability: Availability; next: M | null } {
  const t = isoDay(today);
  const running = missions.filter((m) => m.status === 'active' && m.start_date <= t && (!m.end_date || m.end_date >= t));
  const next = missions.filter((m) => m.status === 'active' && m.start_date > t).sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;
  const from = profile?.available_from && profile.available_from > t ? profile.available_from : null;

  if (running.length > 0) {
    const until = running.some((m) => !m.end_date) ? null : running.map((m) => m.end_date!).sort().at(-1)!;
    return { availability: { kind: 'on_mission', until }, next };
  }
  if (next) return { availability: { kind: 'upcoming', start: next.start_date }, next };
  if (profile?.status === 'unavailable') return { availability: { kind: 'unavailable', date: from }, next };
  if (from) return { availability: { kind: 'available_from', date: from }, next };
  return { availability: { kind: 'available' }, next };
}

export type MissionPhase =
  /** Mission active pas encore démarrée. */
  | { kind: 'upcoming'; inDays: number }
  /** En cours ; `daysLeft` null si la mission n'a pas de date de fin. */
  | { kind: 'running'; daysLeft: number | null }
  | { kind: 'ended'; on: string | null }
  /** Proposée, suspendue ou refusée : le statut de l'ESN fait foi. */
  | { kind: 'other' };

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / 86_400_000);
}

/**
 * Où en est la mission, vue du consultant. Le statut « active » couvre
 * aussi une mission signée qui n'a pas démarré : seules les dates disent
 * si elle est à venir, en cours ou déjà finie.
 */
export function missionPhase(m: Pick<MissionDates, 'status' | 'start_date' | 'end_date'>, today: Date): MissionPhase {
  const t = isoDay(today);
  if (m.status === 'ended') return { kind: 'ended', on: m.end_date };
  if (m.status !== 'active') return { kind: 'other' };
  if (m.start_date > t) return { kind: 'upcoming', inDays: daysBetween(t, m.start_date) };
  if (m.end_date && m.end_date < t) return { kind: 'ended', on: m.end_date };
  return { kind: 'running', daysLeft: m.end_date ? daysBetween(t, m.end_date) : null };
}
