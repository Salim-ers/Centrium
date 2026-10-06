// =========================================================================
// CRA côté agence : liste à valider, CRA manquants du mois écoulé et
// indicateurs (à valider, manquants, validés ce mois). Lecture sous RLS.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { fold } from '@/lib/utils/text';

export type TimesheetRow = {
  id: string;
  mission_id: string;
  consultant_id: string;
  period_month: number;
  period_year: number;
  days_worked: number;
  days_validated: number;
  status: string;
  submitted_at: string | null;
  validated_at: string | null;
  client_approval_status?: string;
  rejection_reason: string | null;
  consultant: { first_name: string; last_name: string } | null;
  mission: {
    title: string;
    company_id: string | null;
    /** Période de la mission, pour les contrôles du mois (jours attendus, hors mission). */
    start_date?: string | null;
    end_date?: string | null;
    companies: { name: string } | null;
  } | null;
};

export type MissingTimesheet = {
  mission_id: string;
  title: string;
  consultant: string;
  client: string | null;
  month: number;
  year: number;
};

export type TimesheetsData = { rows: TimesheetRow[]; missing: MissingTimesheet[] };

const pad = (n: number) => String(n).padStart(2, '0');

/** Mois écoulé (celui dont le CRA est attendu). */
export function previousPeriod(today: Date): { month: number; year: number } {
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { month: prev.getMonth() + 1, year: prev.getFullYear() };
}

export async function loadTimesheets(supabase: SupabaseClient, orgId: string, today = new Date()): Promise<TimesheetsData> {
  const { month: prevMonth, year: prevYear } = previousPeriod(today);
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const prevEndIso = `${prevEnd.getFullYear()}-${pad(prevEnd.getMonth() + 1)}-${pad(prevEnd.getDate())}`;
  const [ts, missions] = await Promise.all([
    supabase
      .from('timesheets')
      .select('*, consultant:consultants(first_name, last_name), mission:missions(title, company_id, start_date, end_date, companies(name))')
      .eq('organization_id', orgId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(3000),
    supabase
      .from('missions')
      .select('id, title, start_date, end_date, consultants(first_name, last_name), companies(name)')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .lte('start_date', prevEndIso),
  ]);
  const rows = (ts.data ?? []) as unknown as TimesheetRow[];
  const prevStart = `${prevYear}-${pad(prevMonth)}-01`;
  const missing: MissingTimesheet[] = ((missions.data ?? []) as unknown as Array<{
    id: string;
    title: string;
    end_date: string | null;
    consultants: { first_name: string; last_name: string } | null;
    companies: { name: string } | null;
  }>)
    .filter((m) => !m.end_date || m.end_date >= prevStart)
    .filter((m) => !rows.some((r) => r.mission_id === m.id && r.period_month === prevMonth && r.period_year === prevYear && r.status !== 'draft'))
    .map((m) => ({
      mission_id: m.id,
      title: m.title,
      consultant: m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—',
      client: m.companies?.name ?? null,
      month: prevMonth,
      year: prevYear,
    }));
  return { rows, missing };
}

/** Les trois indicateurs du CRA : à valider, manquants, validés ce mois. */
export function summarizeTimesheets(data: TimesheetsData, today = new Date()) {
  const monthPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const pending = data.rows.filter((r) => r.status === 'submitted');
  const validated = data.rows.filter((r) => r.status === 'client_validated' && (r.validated_at ?? '').startsWith(monthPrefix));
  return {
    pending: pending.length,
    pendingDays: pending.reduce((s, r) => s + Number(r.days_worked || 0), 0),
    missing: data.missing.length,
    validatedThisMonth: validated.length,
    validatedDaysThisMonth: validated.reduce((s, r) => s + Number(r.days_validated || r.days_worked || 0), 0),
  };
}

export const consultantName = (r: Pick<TimesheetRow, 'consultant'>) => (r.consultant ? `${r.consultant.first_name} ${r.consultant.last_name}` : '—');

/** « Data engineer · Nordal » — sans répéter le client déjà présent dans l'intitulé. */
export function missionLabel(title: string | null | undefined, client: string | null | undefined): string {
  const t = (title ?? '').trim();
  const c = (client ?? '').trim();
  if (!t) return c || '—';
  if (!c || fold(t).includes(fold(c))) return t;
  return `${t} · ${c}`;
}

const STATUS_FR: Record<string, string> = { draft: 'Brouillon', submitted: 'À valider', client_validated: 'Validé', rejected: 'Renvoyé', invoiced: 'Facturé' };

/** CRA à exporter (vue courante), une ligne par CRA, colonnes en clair. */
export function timesheetExportRows(rows: TimesheetRow[]): Array<Record<string, unknown>> {
  return rows.map((r) => ({
    consultant: consultantName(r),
    mission: r.mission?.title ?? '',
    client: r.mission?.companies?.name ?? '',
    periode: `${r.period_year}-${pad(r.period_month)}`,
    jours_declares: Number(r.days_worked || 0),
    jours_valides: r.status === 'client_validated' ? Number(r.days_validated || 0) : null,
    statut: STATUS_FR[r.status] ?? r.status,
    soumis_le: r.submitted_at?.slice(0, 10) ?? null,
    valide_le: r.validated_at?.slice(0, 10) ?? null,
    motif_renvoi: r.rejection_reason ?? null,
  }));
}

/** CRA manquants à exporter (relances). */
export function missingExportRows(missing: MissingTimesheet[]): Array<Record<string, unknown>> {
  return missing.map((m) => ({ consultant: m.consultant, mission: m.title, client: m.client ?? '', periode: `${m.year}-${pad(m.month)}` }));
}
