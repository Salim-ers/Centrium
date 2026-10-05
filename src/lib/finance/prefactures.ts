// =========================================================================
// Préfacturation : CRA validé → jours × TJM → préfacture à contrôler →
// prête à exporter → exportée vers l'outil comptable (suivi : émise,
// payée). Centrium n'émet pas de facture réglementaire.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Invoice } from '@/types';

export type PrefactureRow = Invoice & {
  validated_at?: string | null;
  export_status?: string;
  exported_at?: string | null;
  companies: { name: string } | null;
  consultants: { first_name: string; last_name: string } | null;
  missions: { title: string } | null;
};

/** CRA validé qui n'a pas encore de préfacture client. */
export type ToPrepareRow = {
  id: string;
  consultant: string;
  mission: string;
  client: string | null;
  period_month: number;
  period_year: number;
  days: number;
  rate: number;
  amount: number;
};

export type PrefactureStage = 'prepare' | 'review' | 'ready' | 'done';

export type PrefacturationData = { invoices: PrefactureRow[]; toPrepare: ToPrepareRow[] };

/** Clé de cache partagée par la préfacturation et l'export. */
export const prefacturationKey = (orgId: string | null) => `prefacturation:${orgId ?? 'none'}`;

/** Fenêtre des CRA à préparer : les 6 derniers mois (au-delà, l'historique relève de l'outil comptable). */
export const PREPARE_WINDOW_MONTHS = 6;

export function stageOf(i: Pick<PrefactureRow, 'status' | 'validated_at' | 'export_status'>): Exclude<PrefactureStage, 'prepare'> {
  if (i.export_status === 'exported' || i.status === 'sent' || i.status === 'overdue' || i.status === 'paid' || i.status === 'cancelled') return 'done';
  return i.validated_at ? 'ready' : 'review';
}

export async function loadPrefacturation(supabase: SupabaseClient, orgId: string, today = new Date()): Promise<PrefacturationData> {
  const from = new Date(today.getFullYear(), today.getMonth() - PREPARE_WINDOW_MONTHS, 1);
  const [inv, linked, ts] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, companies(name), consultants(first_name, last_name), missions(title)')
      .eq('organization_id', orgId)
      .eq('archived', false)
      .order('issue_date', { ascending: false })
      .limit(3000),
    supabase.from('invoices').select('timesheet_id').eq('organization_id', orgId).eq('party', 'client').not('timesheet_id', 'is', null).limit(20000),
    supabase
      .from('timesheets')
      .select('id, period_month, period_year, days_validated, days_worked, consultant:consultants(first_name, last_name), mission:missions(title, daily_rate_eur, companies(name))')
      .eq('organization_id', orgId)
      .eq('status', 'client_validated')
      .eq('archived', false)
      .gte('period_year', from.getFullYear())
      .limit(5000),
  ]);
  const invoiced = new Set(((linked.data ?? []) as Array<{ timesheet_id: string | null }>).map((r) => r.timesheet_id));
  const fromKey = from.getFullYear() * 100 + from.getMonth() + 1;
  const toPrepare = (
    (ts.data ?? []) as unknown as Array<{
      id: string;
      period_month: number;
      period_year: number;
      days_validated: number | null;
      days_worked: number | null;
      consultant: { first_name: string; last_name: string } | null;
      mission: { title: string; daily_rate_eur: number | null; companies: { name: string } | null } | null;
    }>
  )
    .filter((t) => !invoiced.has(t.id) && t.period_year * 100 + t.period_month >= fromKey)
    .map((t) => {
      const days = Number(t.days_validated ?? t.days_worked ?? 0);
      const rate = Number(t.mission?.daily_rate_eur ?? 0);
      return {
        id: t.id,
        consultant: t.consultant ? `${t.consultant.first_name} ${t.consultant.last_name}` : '—',
        mission: t.mission?.title ?? '—',
        client: t.mission?.companies?.name ?? null,
        period_month: t.period_month,
        period_year: t.period_year,
        days,
        rate,
        amount: Math.round(days * rate * 100) / 100,
      };
    })
    .sort((a, b) => b.period_year * 100 + b.period_month - (a.period_year * 100 + a.period_month));
  return { invoices: (inv.data ?? []) as unknown as PrefactureRow[], toPrepare };
}
