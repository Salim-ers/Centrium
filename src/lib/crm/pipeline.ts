// =========================================================================
// Pipeline commercial V2 — 7 étapes projetées sur l'enum historique
// opportunity_status (aucune migration de données, triggers inchangés).
// Voir docs/v2/AUDIT_ET_ARCHITECTURE.md §2.3.
// =========================================================================

import type { OpportunityStatus } from '@/types';
import type { StatusTone } from '@/components/ui/status-pill';

export type PipelineStageId =
  | 'prospect'
  | 'qualified'
  | 'meeting'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type PipelineStage = {
  id: PipelineStageId;
  label: { fr: string; en: string };
  /** Statuts historiques affichés dans cette colonne. */
  statuses: OpportunityStatus[];
  /** Statut écrit quand une carte est déposée dans la colonne. */
  canonical: OpportunityStatus;
  /** Probabilité proposée par défaut à l'entrée dans l'étape. */
  defaultProbability: number;
  tone: StatusTone;
  /** Ce que veut dire l'étape, en quelques mots (en tête de colonne). */
  hint: { fr: string; en: string };
};

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'prospect', label: { fr: 'Prospect', en: 'Prospect' }, statuses: ['new', 'contacted'], canonical: 'new', defaultProbability: 10, tone: 'neutral', hint: { fr: 'Premier contact', en: 'First contact' } },
  { id: 'qualified', label: { fr: 'Qualifié', en: 'Qualified' }, statuses: ['discussion'], canonical: 'discussion', defaultProbability: 25, tone: 'info', hint: { fr: 'Besoin confirmé', en: 'Need confirmed' } },
  { id: 'meeting', label: { fr: 'Rendez-vous', en: 'Meeting' }, statuses: ['client_interview'], canonical: 'client_interview', defaultProbability: 40, tone: 'info', hint: { fr: 'Entretien client', en: 'Client interview' } },
  { id: 'proposal', label: { fr: 'Proposition', en: 'Proposal' }, statuses: ['cv_sent'], canonical: 'cv_sent', defaultProbability: 55, tone: 'brand', hint: { fr: 'Profils envoyés', en: 'Profiles sent' } },
  { id: 'negotiation', label: { fr: 'Négociation', en: 'Negotiation' }, statuses: ['negotiation'], canonical: 'negotiation', defaultProbability: 75, tone: 'warning', hint: { fr: 'Conditions en discussion', en: 'Terms under discussion' } },
  { id: 'won', label: { fr: 'Gagné', en: 'Won' }, statuses: ['won'], canonical: 'won', defaultProbability: 100, tone: 'success', hint: { fr: 'Affaire signée', en: 'Deal signed' } },
  { id: 'lost', label: { fr: 'Perdu', en: 'Lost' }, statuses: ['lost'], canonical: 'lost', defaultProbability: 0, tone: 'danger', hint: { fr: 'Affaire perdue', en: 'Deal lost' } },
];

/** Étapes de travail, affichées en colonnes. Gagné et perdu sont des issues. */
export const OPEN_STAGES: PipelineStage[] = PIPELINE_STAGES.filter((s) => s.id !== 'won' && s.id !== 'lost');

export const STAGE_BY_ID = new Map(PIPELINE_STAGES.map((s) => [s.id, s]));

/** Étape V2 d'un statut historique. `on_hold` n'appartient à aucune colonne. */
export function stageOf(status: OpportunityStatus): PipelineStageId | null {
  for (const s of PIPELINE_STAGES) if (s.statuses.includes(status)) return s.id;
  return null;
}

export function stageLabel(status: OpportunityStatus, lang: 'fr' | 'en'): string {
  if (status === 'on_hold') return lang === 'fr' ? 'En veille' : 'On hold';
  const id = stageOf(status);
  return id ? STAGE_BY_ID.get(id)!.label[lang] : status;
}

export function stageTone(status: OpportunityStatus): StatusTone {
  if (status === 'on_hold') return 'neutral';
  const id = stageOf(status);
  return id ? STAGE_BY_ID.get(id)!.tone : 'neutral';
}

/** Étape suivante du parcours commercial (null après la négociation). */
export function nextStage(id: PipelineStageId | null): PipelineStage | null {
  const i = OPEN_STAGES.findIndex((s) => s.id === id);
  return i >= 0 && i < OPEN_STAGES.length - 1 ? (OPEN_STAGES[i + 1] ?? null) : null;
}

/**
 * Probabilité après un changement d'étape : on conserve la valeur saisie
 * si elle reste cohérente avec l'étape, sinon on applique le défaut.
 */
export function probabilityForMove(current: number | null, to: PipelineStageId): number {
  const stage = STAGE_BY_ID.get(to)!;
  if (to === 'won') return 100;
  if (to === 'lost') return 0;
  if (current == null || current <= 0 || current >= 100) return stage.defaultProbability;
  return current;
}
