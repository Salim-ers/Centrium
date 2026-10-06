// =========================================================================
// Santé d'une mission en cours : les signaux qui demandent une action —
// CRA du mois écoulé manquant ou à valider, renouvellement à statuer, fin
// proche, marge sous l'objectif, contrat ou CJM manquants. Fonctions pures.
// =========================================================================

import { periodLabelShort as periodLabel } from '@/lib/status';
import { isoDiffDays, renewalStage } from './renewal';

type T = { fr: string; en: string };

export type HealthSignalId = 'cra_missing' | 'cra_pending' | 'ending' | 'renewal' | 'margin' | 'contract' | 'cost';

export type HealthSignal = { id: HealthSignalId; tone: 'danger' | 'warning' | 'info'; label: T; href?: string };

export type MissionHealth = { level: 'ok' | 'watch' | 'critical'; signals: HealthSignal[] };

export type MissionHealthInput = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  renewal_status?: string | null;
  margin_pct: number | null;
  daily_cost_eur: number | null;
  /** CRA récents de la mission (année, mois, statut). */
  sheets: Array<{ year: number; month: number; status: string }>;
  /** Contrat rattaché ; null : inconnu (pas d'accès aux documents). */
  has_contract: boolean | null;
};

const TONE_ORDER = { danger: 0, warning: 1, info: 2 } as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** Mois écoulé (année, mois 1-12) par rapport à aujourd'hui. */
function previousMonth(today: string): { year: number; month: number } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
}

/**
 * Signaux d'une mission active, du plus urgent au moins urgent. Hors
 * mission active : aucun signal. `financials` : marge et CJM visibles.
 */
export function missionHealth(m: MissionHealthInput, today: string, opts: { financials: boolean; marginTarget: number }): MissionHealth {
  if (m.status !== 'active') return { level: 'ok', signals: [] };
  const signals: HealthSignal[] = [];

  // CRA du mois écoulé : attendu si la mission a couvert ce mois.
  const prev = previousMonth(today);
  const covered = m.start_date <= `${prev.year}-${pad(prev.month)}-28` && (!m.end_date || m.end_date >= `${prev.year}-${pad(prev.month)}-01`);
  const prevSheet = m.sheets.find((s) => s.year === prev.year && s.month === prev.month);
  if (covered && (!prevSheet || prevSheet.status === 'draft')) {
    signals.push({
      id: 'cra_missing',
      tone: 'danger',
      label: { fr: `CRA de ${periodLabel(prev.month, prev.year, 'fr').toLowerCase()} manquant`, en: `${periodLabel(prev.month, prev.year, 'en')} timesheet missing` },
      href: '/timesheets?view=missing',
    });
  }
  const pending = m.sheets.filter((s) => s.status === 'submitted');
  if (pending.length) {
    const p = pending.sort((a, b) => a.year - b.year || a.month - b.month)[0]!;
    signals.push({
      id: 'cra_pending',
      tone: 'warning',
      label: pending.length > 1 ? { fr: `${pending.length} CRA à valider`, en: `${pending.length} timesheets to approve` } : { fr: `CRA de ${periodLabel(p.month, p.year, 'fr').toLowerCase()} à valider`, en: `${periodLabel(p.month, p.year, 'en')} timesheet to approve` },
      href: '/timesheets?view=pending',
    });
  }

  // Échéance et renouvellement.
  const stage = renewalStage(m, today);
  const left = m.end_date ? isoDiffDays(today, m.end_date) : null;
  if (left != null && left >= 0 && left <= 15 && stage !== 'extend') {
    signals.push({
      id: 'ending',
      tone: stage === 'ending' ? 'warning' : 'danger',
      label:
        stage === 'ending'
          ? { fr: `Fin dans ${left} j, non renouvelée : préparer la relève`, en: `Ends in ${left} d, not renewed: plan the handover` }
          : { fr: `Fin dans ${left} j sans décision`, en: `Ends in ${left} d, no decision` },
      href: `/missions/${m.id}`,
    });
  } else if (stage === 'ask') {
    signals.push({ id: 'renewal', tone: 'warning', label: { fr: 'Renouvellement à statuer', en: 'Renewal to decide' }, href: `/missions/${m.id}` });
  }

  if (opts.financials) {
    if (m.daily_cost_eur == null) {
      signals.push({ id: 'cost', tone: 'info', label: { fr: 'CJM non renseigné', en: 'Daily cost missing' }, href: `/missions/${m.id}?edit=1` });
    } else if (m.margin_pct != null && m.margin_pct < opts.marginTarget) {
      signals.push({
        id: 'margin',
        tone: 'warning',
        label: { fr: `Marge ${Math.round(m.margin_pct)} % sous l’objectif de ${Math.round(opts.marginTarget)} %`, en: `Margin ${Math.round(m.margin_pct)}% below the ${Math.round(opts.marginTarget)}% target` },
        href: `/missions/${m.id}`,
      });
    }
  }
  if (m.has_contract === false) {
    signals.push({ id: 'contract', tone: 'warning', label: { fr: 'Aucun contrat rattaché', en: 'No contract linked' }, href: `/missions/${m.id}?tab=documents` });
  }

  signals.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  const level = signals.some((s) => s.tone === 'danger') ? 'critical' : signals.length ? 'watch' : 'ok';
  return { level, signals };
}
