import type { StatusTone } from '@/components/ui/status-pill';

/** Statut d'approbation client d'un CRA, tel qu'affiché au client. */
export const CLIENT_APPROVAL: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'À approuver', tone: 'warning' },
  approved: { label: 'Approuvé', tone: 'success' },
  rejected: { label: 'Correction demandée', tone: 'danger' },
};
