// =========================================================================
// Libellés et tons des statuts métier (FR / EN) — une seule source pour
// toutes les listes, fiches et portails.
// =========================================================================

import type { StatusTone } from '@/components/ui/status-pill';

type L = { fr: string; en: string };
type StatusDef = { label: L; tone: StatusTone };

export const MISSION_STATUS: Record<string, StatusDef> = {
  proposed: { label: { fr: 'Proposée', en: 'Proposed' }, tone: 'info' },
  active: { label: { fr: 'En cours', en: 'Active' }, tone: 'success' },
  ended: { label: { fr: 'Terminée', en: 'Ended' }, tone: 'neutral' },
  suspended: { label: { fr: 'Suspendue', en: 'Suspended' }, tone: 'warning' },
  rejected: { label: { fr: 'Refusée', en: 'Rejected' }, tone: 'danger' },
};

/** Statut contractuel d'un consultant. */
export const CONTRACT_TYPE_LABEL: Record<string, L> = {
  freelance: { fr: 'Freelance', en: 'Freelance' },
  cdi: { fr: 'CDI', en: 'Permanent' },
  cdd: { fr: 'CDD', en: 'Fixed-term' },
  portage: { fr: 'Portage', en: 'Umbrella' },
  partner_esn: { fr: 'ESN partenaire', en: 'Partner firm' },
};

export const RENEWAL_STATUS: Record<string, StatusDef> = {
  unknown: { label: { fr: 'À qualifier', en: 'To qualify' }, tone: 'neutral' },
  likely: { label: { fr: 'Renouvellement probable', en: 'Renewal likely' }, tone: 'info' },
  confirmed: { label: { fr: 'Renouvellement confirmé', en: 'Renewal confirmed' }, tone: 'success' },
  not_renewed: { label: { fr: 'Non renouvelée', en: 'Not renewed' }, tone: 'warning' },
};

export const TIMESHEET_STATUS: Record<string, StatusDef> = {
  draft: { label: { fr: 'Brouillon', en: 'Draft' }, tone: 'neutral' },
  submitted: { label: { fr: 'À valider', en: 'To approve' }, tone: 'warning' },
  client_validated: { label: { fr: 'Validé', en: 'Approved' }, tone: 'success' },
  rejected: { label: { fr: 'Renvoyé', en: 'Sent back' }, tone: 'danger' },
};

/** CRA vus par le consultant : le statut dit ce qu'il lui reste à faire. */
export const CONSULTANT_TIMESHEET_STATUS: Record<string, StatusDef> = {
  draft: { label: { fr: 'Brouillon', en: 'Draft' }, tone: 'neutral' },
  submitted: { label: { fr: 'Envoyé', en: 'Sent' }, tone: 'info' },
  client_validated: { label: { fr: 'Validé', en: 'Approved' }, tone: 'success' },
  rejected: { label: { fr: 'À corriger', en: 'To fix' }, tone: 'danger' },
};

/**
 * Préfacturation : Centrium prépare les éléments facturables ; l'émission
 * réglementaire se fait dans l'outil comptable ou la plateforme agréée.
 */
export const INVOICE_STATUS: Record<string, StatusDef> = {
  draft: { label: { fr: 'Préfacture', en: 'Pre-invoice' }, tone: 'neutral' },
  sent: { label: { fr: 'Émise', en: 'Issued' }, tone: 'info' },
  paid: { label: { fr: 'Payée', en: 'Paid' }, tone: 'success' },
  overdue: { label: { fr: 'En retard', en: 'Overdue' }, tone: 'danger' },
  cancelled: { label: { fr: 'Annulée', en: 'Cancelled' }, tone: 'neutral' },
};

export const EXPORT_STATUS: Record<string, StatusDef> = {
  not_exported: { label: { fr: 'Non exportée', en: 'Not exported' }, tone: 'neutral' },
  exported: { label: { fr: 'Exportée', en: 'Exported' }, tone: 'success' },
  failed: { label: { fr: 'Échec d’export', en: 'Export failed' }, tone: 'danger' },
};

export const QUOTE_STATUS: Record<string, StatusDef> = {
  draft: { label: { fr: 'Brouillon', en: 'Draft' }, tone: 'neutral' },
  sent: { label: { fr: 'Envoyé', en: 'Sent' }, tone: 'info' },
  accepted: { label: { fr: 'Accepté', en: 'Accepted' }, tone: 'success' },
  declined: { label: { fr: 'Refusé', en: 'Declined' }, tone: 'danger' },
  expired: { label: { fr: 'Expiré', en: 'Expired' }, tone: 'warning' },
};

export const CLIENT_REQUEST_STATUS: Record<string, StatusDef> = {
  new: { label: { fr: 'Nouvelle', en: 'New' }, tone: 'brand' },
  in_review: { label: { fr: 'En étude', en: 'In review' }, tone: 'info' },
  converted: { label: { fr: 'Convertie en opportunité', en: 'Converted' }, tone: 'success' },
  declined: { label: { fr: 'Déclinée', en: 'Declined' }, tone: 'neutral' },
};

export const CONSULTANT_STATUS: Record<string, StatusDef> = {
  available: { label: { fr: 'Disponible', en: 'Available' }, tone: 'success' },
  on_mission: { label: { fr: 'En mission', en: 'On mission' }, tone: 'brand' },
  soon_available: { label: { fr: 'Bientôt disponible', en: 'Available soon' }, tone: 'info' },
  unavailable: { label: { fr: 'Indisponible', en: 'Unavailable' }, tone: 'neutral' },
  archived: { label: { fr: 'Archivé', en: 'Archived' }, tone: 'neutral' },
};

/** Libellés vus par le client dans son portail (sans vocabulaire interne). */
export const CLIENT_REQUEST_STATUS_PUBLIC: Record<string, StatusDef> = {
  new: { label: { fr: 'Envoyée', en: 'Sent' }, tone: 'neutral' },
  in_review: { label: { fr: 'En étude', en: 'In review' }, tone: 'info' },
  converted: { label: { fr: 'Prise en charge', en: 'Being handled' }, tone: 'success' },
  declined: { label: { fr: 'Non retenue', en: 'Not pursued' }, tone: 'neutral' },
};

export const DOCUMENT_KIND: Record<string, L> = {
  quote: { fr: 'Devis', en: 'Quote' },
  proposal: { fr: 'Proposition commerciale', en: 'Proposal' },
  purchase_order: { fr: 'Bon de commande', en: 'Purchase order' },
  contract: { fr: 'Contrat', en: 'Contract' },
  mission_document: { fr: 'Document de mission', en: 'Mission document' },
  skills_dossier: { fr: 'Dossier de compétences', en: 'Skills dossier' },
  client_document: { fr: 'Document client', en: 'Client document' },
  consultant_document: { fr: 'Document consultant', en: 'Consultant document' },
  other: { fr: 'Autre', en: 'Other' },
};

export function statusOf(map: Record<string, StatusDef>, key: string | null | undefined, lang: 'fr' | 'en') {
  const def = key ? map[key] : undefined;
  return { label: def?.label[lang] ?? key ?? '—', tone: def?.tone ?? ('neutral' as StatusTone) };
}

/** Période courte pour les tableaux : « sept. 2026 ». */
export function periodLabelShort(month: number, year: number, lang: 'fr' | 'en'): string {
  return new Date(year, month - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', year: 'numeric' });
}

export function periodLabel(month: number, year: number, lang: 'fr' | 'en'): string {
  const s = new Date(year, month - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
