// =========================================================================
// Types du tableau de bord exécutif — partagés navigateur / serveur.
// Produits par lib/services/dashboard.service.ts (/api/dashboard).
// =========================================================================

import type { DashboardSummary } from '@/lib/pilotage/load-dashboard';

type L = { fr: string; en: string };

export type ExecMonth = { key: string; realized: number | null; forecast: number | null; margin: number | null };
export type ExecStaffRow = {
  id: string;
  name: string;
  initials: string;
  status: 'mission' | 'available' | 'soon' | 'leave';
  detail: L;
  days: number | null;
  /** Frise sur 12 semaines à partir d'aujourd'hui, en fractions 0–1. */
  segments: Array<{ from: number; to: number; kind: 'mission' | 'proposed' | 'leave' }>;
};
export type ExecMissionRow = {
  id: string;
  title: string | null;
  client: string;
  consultant: string;
  progress: number | null;
  end: string | null;
  daysLeft: number | null;
  marginPct: number | null;
};
export type ExecClientRow = { id: string; name: string; revenue: number; share: number; marginPct: number | null; consultants: number };
export type ExecActivity = {
  id: string;
  kind: 'opportunity_won' | 'opportunity_created' | 'mission_created' | 'timesheet_validated' | 'client_request' | 'consultant_created';
  label: L;
  detail: string | null;
  at: string;
  href: string;
};

export type ExecutiveDashboard = {
  summary: DashboardSummary;
  /** 11 mois passés + mois courant + 3 mois de prévision. Vide sans accès au CA. */
  series: ExecMonth[];
  occupancy: Array<{ key: string; rate: number | null; bench: number }>;
  staffing: ExecStaffRow[];
  missions: ExecMissionRow[];
  clients: ExecClientRow[];
  activity: ExecActivity[];
  visibility: { revenue: boolean; margin: boolean; pipeline: boolean; staffing: boolean; missions: boolean; clients: boolean };
};
