// =========================================================================
// Fiche client 360° : toutes les données liées à une société, lues sous la
// session de l'utilisateur (RLS) et filtrées selon ses permissions.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Permission } from '@/lib/auth/permissions';
import type {
  ClientPortalUser,
  ClientRequest,
  Company,
  Contact,
  Invoice,
  LibraryDocument,
  Opportunity,
  Quote,
  Timesheet,
} from '@/types';
import {
  averageMarginPct,
  forecastRevenue,
  isOpenOpportunity,
  opportunityAmount,
  realizedRevenue,
  type MissionLite,
} from './metrics';

export type ClientMission = MissionLite & {
  title: string;
  consultants: { id: string; first_name: string; last_name: string; job_title: string | null } | null;
};

export type Client360 = {
  company: Company;
  contacts: Contact[];
  opportunities: Opportunity[];
  missions: ClientMission[];
  timesheets: Array<Pick<Timesheet, 'id' | 'mission_id' | 'consultant_id' | 'period_month' | 'period_year' | 'days_worked' | 'days_validated' | 'status'>>;
  quotes: Quote[];
  documents: LibraryDocument[];
  requests: ClientRequest[];
  portalUsers: ClientPortalUser[];
  invoices: Array<Pick<Invoice, 'id' | 'invoice_number' | 'issue_date' | 'due_date' | 'amount_ht' | 'status' | 'period_label'>>;
  metrics: {
    revenue12m: number | null;
    forecast3m: number | null;
    marginPct: number | null;
    activeMissions: number;
    placedConsultants: number;
    openOpportunities: number;
    weightedPipeline: number;
  };
  /** CA réalisé mensuel sur 12 mois (CRA validés). */
  monthly: Array<{ key: string; revenue: number }>;
};

type Can = (p: Permission) => boolean;

export async function loadClient360(
  supabase: SupabaseClient,
  companyId: string,
  can: Can,
  today = new Date(),
): Promise<Client360 | null> {
  const { data: company } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
  if (!company) return null;

  const tolerant = <T>(p: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    Promise.resolve(p).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback)));

  const finance = can('finance.view') || can('analytics.view');
  const [contacts, opportunities, missions, quotes, documents, requests, portalUsers, invoices] = await Promise.all([
    tolerant(supabase.from('contacts').select('*').eq('company_id', companyId).eq('archived', false).order('last_name'), [] as Contact[]),
    can('opportunities.view')
      ? tolerant(supabase.from('opportunities').select('*').eq('company_id', companyId).order('updated_at', { ascending: false }), [] as Opportunity[])
      : Promise.resolve([] as Opportunity[]),
    tolerant(
      supabase
        .from('missions')
        .select('id, title, status, start_date, end_date, daily_rate_eur, consultant_id, company_id, consultants(id, first_name, last_name, job_title)')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false }),
      [] as ClientMission[],
    ),
    can('documents.view')
      ? tolerant(supabase.from('quotes').select('*').eq('company_id', companyId).order('issue_date', { ascending: false }), [] as Quote[])
      : Promise.resolve([] as Quote[]),
    can('documents.view')
      ? tolerant(
          supabase.from('documents').select('*').eq('company_id', companyId).eq('archived', false).order('created_at', { ascending: false }),
          [] as LibraryDocument[],
        )
      : Promise.resolve([] as LibraryDocument[]),
    can('opportunities.view')
      ? tolerant(supabase.from('client_requests').select('*').eq('company_id', companyId).order('created_at', { ascending: false }), [] as ClientRequest[])
      : Promise.resolve([] as ClientRequest[]),
    can('portals.manage')
      ? tolerant(supabase.from('client_portal_users').select('*').eq('company_id', companyId), [] as ClientPortalUser[])
      : Promise.resolve([] as ClientPortalUser[]),
    finance
      ? tolerant(
          supabase
            .from('invoices')
            .select('id, invoice_number, issue_date, due_date, amount_ht, status, period_label')
            .eq('company_id', companyId)
            .eq('party', 'client')
            .eq('archived', false)
            .order('issue_date', { ascending: false })
            .limit(50),
          [] as Client360['invoices'],
        )
      : Promise.resolve([] as Client360['invoices']),
  ]);

  const missionIds = missions.map((m) => m.id);
  const [timesheets, missionFin, consultantFin] = await Promise.all([
    missionIds.length && (can('timesheets.view') || finance)
      ? tolerant(
          supabase
            .from('timesheets')
            .select('id, mission_id, consultant_id, period_month, period_year, days_worked, days_validated, status')
            .in('mission_id', missionIds)
            .eq('archived', false)
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false }),
          [] as Client360['timesheets'],
        )
      : Promise.resolve([] as Client360['timesheets']),
    missionIds.length && can('consultants.financials')
      ? tolerant(supabase.from('mission_financials').select('mission_id, daily_cost_eur').in('mission_id', missionIds), [] as Array<{ mission_id: string; daily_cost_eur: number | null }>)
      : Promise.resolve([] as Array<{ mission_id: string; daily_cost_eur: number | null }>),
    missionIds.length && can('consultants.financials')
      ? tolerant(
          supabase
            .from('consultant_financials')
            .select('consultant_id, daily_cost_eur')
            .in('consultant_id', [...new Set(missions.map((m) => m.consultant_id))]),
          [] as Array<{ consultant_id: string; daily_cost_eur: number | null }>,
        )
      : Promise.resolve([] as Array<{ consultant_id: string; daily_cost_eur: number | null }>),
  ]);

  const mCost = new Map(missionFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.mission_id, Number(f.daily_cost_eur)]));
  const cCost = new Map(consultantFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.consultant_id, Number(f.daily_cost_eur)]));
  const byId = new Map(missions.map((m) => [m.id, m]));

  const monthly: Client360['monthly'] = [];
  let revenue12m = 0;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const r = realizedRevenue(timesheets, byId, d.getFullYear(), d.getMonth() + 1);
    revenue12m += r;
    monthly.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, revenue: r });
  }
  let forecast3m = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    forecast3m += forecastRevenue(missions, d.getFullYear(), d.getMonth() + 1);
  }
  const margin = averageMarginPct(missions, (m) => mCost.get(m.id) ?? cCost.get(m.consultant_id) ?? null);
  const active = missions.filter((m) => m.status === 'active');
  const open = opportunities.filter(isOpenOpportunity);

  return {
    company: company as Company,
    contacts,
    opportunities,
    missions,
    timesheets,
    quotes,
    documents,
    requests,
    portalUsers,
    invoices,
    metrics: {
      revenue12m: finance ? revenue12m : null,
      forecast3m: finance ? forecast3m : null,
      marginPct: can('consultants.financials') ? margin.pct : null,
      activeMissions: active.length,
      placedConsultants: new Set(active.map((m) => m.consultant_id)).size,
      openOpportunities: open.length,
      weightedPipeline: Math.round(open.reduce((s, o) => s + opportunityAmount(o) * ((o.probability ?? 0) / 100), 0)),
    },
    monthly,
  };
}
