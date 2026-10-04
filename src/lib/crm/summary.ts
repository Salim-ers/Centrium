// =========================================================================
// CRM — résumé du pipeline en langage simple (en-tête) et état des
// relances (cartes, liste). Fonctions pures.
// =========================================================================

import { isOpenOpportunity, opportunityAmount, type OpportunityLite } from '@/lib/pilotage/metrics';
import { formatEurCompact } from '@/lib/format';

type SummaryInput = OpportunityLite & { archived?: boolean; next_follow_up?: string | null };

export type PipelineSummary = {
  /** Opportunités en cours (ni gagnées, ni perdues, ni en veille). */
  open: number;
  /** Montant total en jeu sur ces opportunités. */
  amount: number;
  /** Relances dont la date est passée. */
  overdue: number;
};

export function summarizePipeline(opps: SummaryInput[], today: string): PipelineSummary {
  const open = opps.filter(isOpenOpportunity);
  return {
    open: open.length,
    amount: open.reduce((s, o) => s + opportunityAmount(o), 0),
    overdue: open.filter((o) => followUpState(o.next_follow_up, today) === 'late').length,
  };
}

/** « 7 opportunités en cours · 678 k€ en jeu · 2 relances en retard » */
export function pipelineSentence(s: PipelineSummary, lang: 'fr' | 'en'): string {
  const fr = lang === 'fr';
  if (s.open === 0) return fr ? 'Aucune opportunité en cours.' : 'No open opportunity.';
  const parts = [
    fr ? `${s.open} opportunité${s.open > 1 ? 's' : ''} en cours` : `${s.open} open opportunit${s.open > 1 ? 'ies' : 'y'}`,
  ];
  if (s.amount > 0) parts.push(fr ? `${formatEurCompact(s.amount, lang)} en jeu` : `${formatEurCompact(s.amount, lang)} at stake`);
  if (s.overdue > 0) {
    parts.push(fr ? `${s.overdue} relance${s.overdue > 1 ? 's' : ''} en retard` : `${s.overdue} overdue follow-up${s.overdue > 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

/** Relance : en retard, aujourd'hui ou à venir (null si aucune date). */
export function followUpState(date: string | null | undefined, today: string): 'late' | 'today' | 'upcoming' | null {
  if (!date) return null;
  if (date < today) return 'late';
  if (date === today) return 'today';
  return 'upcoming';
}
