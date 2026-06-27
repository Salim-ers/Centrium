'use client';

import { useAppT } from './LocaleProvider';

/**
 * Hooks de traduction des badges status — utilisés dans les pages /crm,
 * /invoices, /consultants, /timesheets, /contracts pour afficher les
 * statuts métier dans la langue de l'utilisateur.
 *
 * Les constants `OPPORTUNITY_STATUS_LABEL` / `INVOICE_STATUS_LABEL` /
 * etc. du fichier `src/constants/index.ts` restent en place (utilisées
 * dans les contextes non-interactifs comme les exports). Ces hooks
 * fournissent la version réactive.
 *
 * Usage :
 *   const oppLabels = useOpportunityStatusLabels();
 *   <Badge>{oppLabels[opp.status]}</Badge>
 */

export function useOpportunityStatusLabels() {
  const t = useAppT();
  return t.badges.opportunity_status;
}

export function useInvoiceStatusLabels() {
  const t = useAppT();
  return t.badges.invoice_status;
}

export function useTimesheetStatusLabels() {
  const t = useAppT();
  return t.badges.timesheet_status;
}

export function useMissionStatusLabels() {
  const t = useAppT();
  return t.badges.mission_status;
}

export function useContractStatusLabels() {
  const t = useAppT();
  return t.badges.contract_status;
}

export function useConsultantStatusLabels() {
  const t = useAppT();
  return t.consultant_status;
}

export function useSeniorityLabels() {
  const t = useAppT();
  return t.seniority;
}
