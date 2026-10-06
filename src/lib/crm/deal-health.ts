// =========================================================================
// CRM — santé d'une affaire : urgence de la prochaine action, état
// (suivie, sans prochaine action, inactive), tri et filtres rapides du
// tableau, dates proposées pour une relance. Fonctions pures.
// =========================================================================

import { isOpenOpportunity, opportunityAmount, type OpportunityLite } from '@/lib/pilotage/metrics';
import { isBusinessDay } from '@/lib/utils/business-days';
import { dayDiff } from '@/lib/utils/dates';
import type { AlertPriority } from '@/types';

export { dayDiff };

export type DealLite = OpportunityLite & {
  priority?: AlertPriority | null;
  next_follow_up?: string | null;
  next_action?: string | null;
  expected_close?: string | null;
  last_interaction?: string | null;
  updated_at?: string;
  archived?: boolean;
};

/** Au-delà de ce délai sans activité, une affaire ouverte est « inactive ». */
export const STALE_AFTER_DAYS = 14;
/** Une relance prévue dans ce délai est « bientôt ». */
export const SOON_WITHIN_DAYS = 3;

export type Urgency =
  | { level: 'late'; days: number }
  | { level: 'today'; days: 0 }
  | { level: 'soon'; days: number }
  | { level: 'later'; days: number }
  | { level: 'none'; days: null };

/** Urgence de la prochaine relance : en retard, aujourd'hui, bientôt, plus tard. */
export function dealUrgency(o: Pick<DealLite, 'next_follow_up'>, today: string): Urgency {
  if (!o.next_follow_up) return { level: 'none', days: null };
  const d = dayDiff(today, o.next_follow_up);
  if (d < 0) return { level: 'late', days: -d };
  if (d === 0) return { level: 'today', days: 0 };
  if (d <= SOON_WITHIN_DAYS) return { level: 'soon', days: d };
  return { level: 'later', days: d };
}

export type Health = {
  state: 'closed' | 'no_action' | 'stale' | 'on_track';
  /** Jours depuis la dernière activité (affaires ouvertes seulement). */
  idleDays: number | null;
};

/** Date de la dernière activité connue sur l'affaire. */
export function lastActivityDate(o: Pick<DealLite, 'last_interaction' | 'updated_at'>): string | null {
  return (o.last_interaction ?? o.updated_at ?? null)?.slice(0, 10) ?? null;
}

/**
 * État d'une affaire ouverte : sans prochaine action (ni action ni date),
 * inactive (aucune activité depuis plus de 14 jours) ou suivie.
 */
export function dealHealth(o: DealLite, today: string): Health {
  if (!isOpenOpportunity(o)) return { state: 'closed', idleDays: null };
  const last = lastActivityDate(o);
  const idleDays = last ? Math.max(0, dayDiff(last, today)) : null;
  if (!o.next_follow_up && !o.next_action?.trim()) return { state: 'no_action', idleDays };
  if (idleDays != null && idleDays > STALE_AFTER_DAYS) return { state: 'stale', idleDays };
  return { state: 'on_track', idleDays };
}

export function isHighPriority(o: Pick<DealLite, 'priority'>): boolean {
  return o.priority === 'high' || o.priority === 'critical';
}

/** Montant pondéré par les chances de gagner. */
export function weightedAmount(o: DealLite): number {
  return Math.round(opportunityAmount(o) * ((o.probability ?? 0) / 100));
}

/** Libellé court de l'urgence (null si aucune relance ou relance lointaine). */
export function urgencyLabel(u: Urgency, lang: 'fr' | 'en'): string | null {
  const fr = lang === 'fr';
  switch (u.level) {
    case 'late':
      return fr ? `En retard · ${u.days} j` : `Overdue · ${u.days} d`;
    case 'today':
      return fr ? 'Aujourd’hui' : 'Today';
    case 'soon':
      return u.days === 1 ? (fr ? 'Demain' : 'Tomorrow') : fr ? `Dans ${u.days} j` : `In ${u.days} d`;
    default:
      return null;
  }
}

/** Libellé de l'état (null pour une affaire close). */
export function healthLabel(h: Health, lang: 'fr' | 'en'): string | null {
  const fr = lang === 'fr';
  switch (h.state) {
    case 'no_action':
      return fr ? 'Sans prochaine action' : 'No next step';
    case 'stale':
      return fr ? `Inactive depuis ${h.idleDays} j` : `Idle for ${h.idleDays} d`;
    case 'on_track':
      return fr ? 'Suivie' : 'On track';
    default:
      return null;
  }
}

// ── Tri ────────────────────────────────────────────────────────────────

export type DealSort = 'urgency' | 'amount' | 'recent' | 'close';

const URGENCY_BUCKET: Record<Urgency['level'], number> = { late: 0, today: 1, soon: 2, none: 3, later: 4 };
const PRIORITY_RANK: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Comparateur du tableau. « Urgence » : en retard (le plus ancien d'abord),
 * aujourd'hui, bientôt, sans date, plus tard ; puis priorité et montant.
 */
export function compareDeals(sort: DealSort, today: string): (a: DealLite, b: DealLite) => number {
  const byAmount = (a: DealLite, b: DealLite) => opportunityAmount(b) - opportunityAmount(a);
  const byRecent = (a: DealLite, b: DealLite) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  if (sort === 'amount') return (a, b) => byAmount(a, b) || byRecent(a, b);
  if (sort === 'recent') return byRecent;
  if (sort === 'close') {
    return (a, b) => {
      if (a.expected_close && b.expected_close) return a.expected_close.localeCompare(b.expected_close) || byAmount(a, b);
      if (a.expected_close) return -1;
      if (b.expected_close) return 1;
      return byAmount(a, b);
    };
  }
  return (a, b) => {
    const ua = dealUrgency(a, today);
    const ub = dealUrgency(b, today);
    const bucket = URGENCY_BUCKET[ua.level] - URGENCY_BUCKET[ub.level];
    if (bucket) return bucket;
    if (ua.level === 'late' && ub.level === 'late') {
      if (ub.days !== ua.days) return ub.days - ua.days;
    } else if (ua.days != null && ub.days != null && ua.days !== ub.days) {
      return ua.days - ub.days;
    }
    const prio = PRIORITY_RANK[a.priority ?? 'medium'] - PRIORITY_RANK[b.priority ?? 'medium'];
    return prio || byAmount(a, b);
  };
}

// ── Filtres rapides ────────────────────────────────────────────────────

export type DealFocus = 'all' | 'follow_up' | 'no_action' | 'priority' | 'stale';

export const DEAL_FOCUSES: DealFocus[] = ['all', 'follow_up', 'no_action', 'priority', 'stale'];

export function isDealFocus(v: string | null | undefined): v is DealFocus {
  return !!v && (DEAL_FOCUSES as string[]).includes(v);
}

/** L'affaire correspond-elle au filtre rapide ? (`all` : toujours.) */
export function matchesFocus(o: DealLite, focus: DealFocus, today: string): boolean {
  if (focus === 'all') return true;
  if (!isOpenOpportunity(o)) return false;
  switch (focus) {
    case 'follow_up': {
      const level = dealUrgency(o, today).level;
      return level === 'late' || level === 'today';
    }
    case 'no_action':
      return dealHealth(o, today).state === 'no_action';
    case 'priority':
      return isHighPriority(o);
    case 'stale': {
      const idle = dealHealth(o, today).idleDays;
      return idle != null && idle > STALE_AFTER_DAYS;
    }
  }
}

export function focusCounts(opps: DealLite[], today: string): Record<DealFocus, number> {
  const counts: Record<DealFocus, number> = { all: 0, follow_up: 0, no_action: 0, priority: 0, stale: 0 };
  for (const o of opps) {
    if (!isOpenOpportunity(o)) continue;
    for (const f of DEAL_FOCUSES) if (matchesFocus(o, f, today)) counts[f] += 1;
  }
  return counts;
}

export const FOCUS_LABEL: Record<DealFocus, { fr: string; en: string }> = {
  all: { fr: 'Toutes', en: 'All' },
  follow_up: { fr: 'À relancer', en: 'To follow up' },
  no_action: { fr: 'Sans prochaine action', en: 'No next step' },
  priority: { fr: 'Prioritaires', en: 'High priority' },
  stale: { fr: 'Inactives', en: 'Idle' },
};

// ── Relance : dates proposées ──────────────────────────────────────────

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftToBusinessDay(d: Date): Date {
  const out = new Date(d);
  while (!isBusinessDay(out)) out.setDate(out.getDate() + 1);
  return out;
}

export type FollowUpPreset = { id: 'today' | 'next' | 'in3' | 'week' | 'fortnight'; date: string; label: { fr: string; en: string } };

/**
 * Dates proposées pour planifier une relance : aujourd'hui, prochain jour
 * ouvré (« Demain » ou « Lundi »), puis +3 jours, +1 et +2 semaines, chaque
 * fois décalées au jour ouvré suivant (week-ends et fériés français).
 */
export function followUpPresets(today: string): FollowUpPreset[] {
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
  const plus = (n: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return shiftToBusinessDay(d);
  };
  const next = plus(1);
  const nextIsTomorrow = dayDiff(today, isoLocal(next)) === 1;
  const weekday = next.toLocaleDateString('fr-FR', { weekday: 'long' });
  const weekdayEn = next.toLocaleDateString('en-GB', { weekday: 'long' });
  const presets: FollowUpPreset[] = [
    { id: 'today', date: today, label: { fr: 'Aujourd’hui', en: 'Today' } },
    {
      id: 'next',
      date: isoLocal(next),
      label: nextIsTomorrow ? { fr: 'Demain', en: 'Tomorrow' } : { fr: weekday.charAt(0).toUpperCase() + weekday.slice(1), en: weekdayEn },
    },
    { id: 'in3', date: isoLocal(plus(3)), label: { fr: 'Dans 3 jours', en: 'In 3 days' } },
    { id: 'week', date: isoLocal(plus(7)), label: { fr: 'Dans 1 semaine', en: 'In 1 week' } },
    { id: 'fortnight', date: isoLocal(plus(14)), label: { fr: 'Dans 2 semaines', en: 'In 2 weeks' } },
  ];
  // Une même date n'est proposée qu'une fois (ex. week-end prolongé).
  const seen = new Set<string>();
  return presets.filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
}

// ── Affaire perdue : raisons fréquentes ────────────────────────────────

export const LOST_REASONS: Array<{ id: string; label: { fr: string; en: string } }> = [
  { id: 'price', label: { fr: 'Prix ou TJM trop élevé', en: 'Price or day rate too high' } },
  { id: 'profile', label: { fr: 'Profil non retenu', en: 'Profile not selected' } },
  { id: 'competitor', label: { fr: 'Concurrent retenu', en: 'Competitor selected' } },
  { id: 'cancelled', label: { fr: 'Projet annulé ou reporté', en: 'Project cancelled or postponed' } },
  { id: 'no_answer', label: { fr: 'Pas de réponse du client', en: 'No answer from the client' } },
  { id: 'internal', label: { fr: 'Pourvu en interne', en: 'Filled internally' } },
];
