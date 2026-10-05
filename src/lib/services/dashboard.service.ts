import 'server-only';

// =========================================================================
// DashboardService — tableau de bord exécutif, agrégé côté serveur.
// -------------------------------------------------------------------------
// Une vague de requêtes parallèles sous la session de l'utilisateur (RLS),
// filtrées par permission, puis des calculs purs (metrics.ts). Le
// navigateur fait UN appel (/api/dashboard). Aucune valeur inventée : une
// donnée absente reste vide (0, null ou liste vide).
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Permission } from '@/lib/auth/permissions';
import {
  fetchDashboardData,
  summarizeDashboard,
  tolerant,
  type DashboardRaw,
} from '@/lib/pilotage/load-dashboard';
import { activeConsultants, daysUntil, iso, isOpenOpportunity, monthlySeries, type MissionLite } from '@/lib/pilotage/metrics';
import { benchRows, summarizeBench, type BenchSummary } from '@/lib/pilotage/bench';
import { MATCHING_CONSULTANT_COLUMNS, groupSkills, rankConsultants, type MatchingConsultant } from '@/lib/matching/rank';
import { hasSkills, opportunityToOffer, type OppLike } from '@/lib/matching/opportunity-offer';
import type { ConsultantSkill, OpportunityStatus } from '@/types';
import { businessDaysBetween } from '@/lib/utils/business-days';
import type { ExecActivity, ExecClientRow, ExecMissionRow, ExecMonth, ExecStaffRow, ExecutiveDashboard } from '@/lib/dashboard/types';

type Can = (p: Permission) => boolean;
type L = { fr: string; en: string };

/**
 * Profils et opportunités compatibles de l'intercontrat : fiches des
 * consultants concernés (poste, critères de matching) et, si le pipeline
 * est visible, nombre d'opportunités ouvertes où chacun ressort (même
 * moteur et même seuil que les alertes « consultant disponible »).
 */
async function benchMatching(supabase: SupabaseClient, ids: string[], opps: Array<Record<string, unknown>>, withPipeline: boolean) {
  const titles = new Map<string, string | null>();
  const matches = new Map<string, number>();
  let compatible = 0;
  if (ids.length === 0) return { titles, matches, compatible };
  const batch = ids.slice(0, 200);
  const [consultants, skills] = await Promise.all([
    tolerant(supabase.from('consultants').select(MATCHING_CONSULTANT_COLUMNS).in('id', batch), [] as MatchingConsultant[]),
    withPipeline
      ? tolerant(supabase.from('consultant_skills').select('id, consultant_id, category, name, level, years, is_highlighted, created_at').in('consultant_id', batch), [] as ConsultantSkill[])
      : Promise.resolve([] as ConsultantSkill[]),
  ]);
  for (const c of consultants) titles.set(c.id, c.job_title ?? null);
  if (!withPipeline) return { titles, matches, compatible };
  const byConsultant = groupSkills(skills);
  for (const raw of opps) {
    const o = raw as unknown as OppLike & { status: OpportunityStatus; archived?: boolean };
    if (!isOpenOpportunity(o) || !hasSkills(o)) continue;
    const ranked = rankConsultants(opportunityToOffer(o), consultants, byConsultant, { limit: consultants.length, minScore: 60 });
    if (ranked.length > 0) compatible++;
    for (const r of ranked) matches.set(r.consultant.id, (matches.get(r.consultant.id) ?? 0) + 1);
  }
  return { titles, matches, compatible };
}

const WINDOW_DAYS = 84;
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function initials(first: string | null | undefined, last: string | null | undefined): string {
  return `${(first ?? '').trim().charAt(0)}${(last ?? '').trim().charAt(0)}`.toUpperCase() || '—';
}

function shortDate(dateIso: string, lang: 'fr' | 'en'): string {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dateIso;
  return lang === 'fr' ? `${d} ${MONTHS_FR[m - 1]}` : `${MONTHS_EN[m - 1]} ${d}`;
}

/** Lignes complémentaires : noms des clients, CRA validés et consultants récents. */
async function fetchExtras(supabase: SupabaseClient, orgId: string, can: Can, companyIds: string[]) {
  return Promise.all([
    companyIds.length && can('clients.view')
      ? tolerant(supabase.from('companies').select('id, name').in('id', companyIds.slice(0, 300)), [] as Array<{ id: string; name: string }>)
      : Promise.resolve([] as Array<{ id: string; name: string }>),
    can('timesheets.view')
      ? tolerant(
          supabase
            .from('timesheets')
            .select('id, mission_id, consultant_id, period_month, period_year, validated_at')
            .eq('organization_id', orgId)
            .not('validated_at', 'is', null)
            .order('validated_at', { ascending: false })
            .limit(6),
          [] as Array<{ id: string; mission_id: string; consultant_id: string; period_month: number; period_year: number; validated_at: string }>,
        )
      : Promise.resolve([]),
    can('consultants.view')
      ? tolerant(
          supabase
            .from('consultants')
            .select('id, first_name, last_name, created_at')
            .eq('organization_id', orgId)
            .eq('archived', false)
            .eq('is_prospect', false)
            .order('created_at', { ascending: false })
            .limit(5),
          [] as Array<{ id: string; first_name: string; last_name: string; created_at: string }>,
        )
      : Promise.resolve([]),
  ]);
}

function costLookup(raw: DashboardRaw) {
  const missionCost = new Map(raw.missionFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.mission_id, Number(f.daily_cost_eur)]));
  const consultantCost = new Map(raw.consultantFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.consultant_id, Number(f.daily_cost_eur)]));
  return (m: MissionLite) => missionCost.get(m.id) ?? consultantCost.get(m.consultant_id) ?? null;
}

export async function getExecutiveDashboard(
  supabase: SupabaseClient,
  ctx: { organizationId: string; can: Can },
  today: Date = new Date(),
): Promise<ExecutiveDashboard> {
  const { organizationId: orgId, can } = ctx;
  const visibility = {
    revenue: can('finance.view') || can('analytics.view'),
    margin: can('consultants.financials'),
    pipeline: can('opportunities.view'),
    staffing: can('staffing.view'),
    missions: can('missions.view'),
    clients: can('clients.view') && (can('finance.view') || can('analytics.view')),
  };

  const raw = await fetchDashboardData(supabase, orgId, can, today);
  const companyIds = [...new Set(raw.missions.map((m) => m.company_id).filter((id): id is string => !!id))];
  const [summary, [companies, validated, newConsultants]] = await Promise.all([
    summarizeDashboard(supabase, can, raw, today),
    fetchExtras(supabase, orgId, can, companyIds),
  ]);

  const todayIso = iso(today);
  const windowEnd = addDays(today, WINDOW_DAYS);
  const windowEndIso = iso(windowEnd);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const consultantById = new Map(raw.consultants.map((c) => [c.id, c]));
  const consultantName = (id: string) => {
    const c = consultantById.get(id);
    return c ? `${c.first_name} ${c.last_name.charAt(0)}.`.trim() : '—';
  };
  const cost = costLookup(raw);
  const marginOf = (m: MissionLite): number | null => {
    if (!visibility.margin || !m.daily_rate_eur) return null;
    const c = cost(m);
    if (c == null) return null;
    return Math.round(((Number(m.daily_rate_eur) - c) / Number(m.daily_rate_eur)) * 1000) / 10;
  };

  // ── Série 12 mois (+ 3 de prévision) ──────────────────────────────────
  const series: ExecMonth[] = visibility.revenue
    ? monthlySeries(raw.missions, raw.timesheets, visibility.margin ? cost : () => null, today, 11, 3).map((p) => ({
        key: p.key,
        realized: p.realized,
        forecast: p.forecast,
        margin: p.margin,
      }))
    : [];

  // ── Staffing : frise de 12 semaines ───────────────────────────────────
  const frac = (dateIso: string) => {
    const d = Math.max(0, Math.min(WINDOW_DAYS, daysUntil(dateIso, today)));
    return d / WINDOW_DAYS;
  };
  const staffing: ExecStaffRow[] = [];
  if (visibility.staffing) {
    for (const c of activeConsultants(raw.consultants)) {
      const mine = raw.missions.filter(
        (m) => m.consultant_id === c.id && (m.status === 'active' || m.status === 'proposed') && m.start_date <= windowEndIso && (!m.end_date || m.end_date >= todayIso),
      );
      const current = mine.find((m) => m.status === 'active' && m.start_date <= todayIso);
      const segments = mine.map((m) => ({
        from: frac(m.start_date > todayIso ? m.start_date : todayIso),
        to: m.end_date ? frac(m.end_date) : 1,
        kind: (m.status === 'proposed' ? 'proposed' : 'mission') as 'mission' | 'proposed',
      }));
      let status: ExecStaffRow['status'];
      let detail: L;
      let days: number | null = null;
      if (c.status === 'unavailable') {
        status = 'leave';
        detail = { fr: 'Indisponible', en: 'Unavailable' };
      } else if (current) {
        const client = (current.company_id && companyName.get(current.company_id)) || current.title || '—';
        days = current.end_date ? daysUntil(current.end_date, today) : null;
        status = days != null && days <= 30 ? 'soon' : 'mission';
        detail = current.end_date
          ? { fr: `${client} · fin le ${shortDate(current.end_date, 'fr')}`, en: `${client} · ends ${shortDate(current.end_date, 'en')}` }
          : { fr: client, en: client };
      } else {
        status = 'available';
        const from = c.available_from && c.available_from > todayIso ? c.available_from : null;
        detail = from ? { fr: `Disponible le ${shortDate(from, 'fr')}`, en: `Available ${shortDate(from, 'en')}` } : { fr: 'Disponible', en: 'Available' };
        if (from) days = daysUntil(from, today);
      }
      staffing.push({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), initials: initials(c.first_name, c.last_name), status, detail, days, segments });
    }
    const rank: Record<ExecStaffRow['status'], number> = { soon: 0, available: 1, mission: 2, leave: 3 };
    staffing.sort((a, b) => rank[a.status] - rank[b.status] || (a.days ?? 9999) - (b.days ?? 9999) || a.name.localeCompare(b.name));
  }

  // ── Missions actives, les plus proches de leur échéance d'abord ───────
  const missions: ExecMissionRow[] = visibility.missions
    ? raw.missions
        .filter((m) => m.status === 'active')
        .sort((a, b) => (a.end_date ?? '9999').localeCompare(b.end_date ?? '9999'))
        .slice(0, 8)
        .map((m) => {
          let progress: number | null = null;
          if (m.end_date && m.end_date >= m.start_date) {
            const total = businessDaysBetween(m.start_date, m.end_date);
            const done = m.start_date > todayIso ? 0 : businessDaysBetween(m.start_date, todayIso > m.end_date ? m.end_date : todayIso);
            progress = total > 0 ? Math.round((done / total) * 100) : null;
          }
          return {
            id: m.id,
            title: m.title ?? null,
            client: (m.company_id && companyName.get(m.company_id)) || m.title || '—',
            consultant: consultantName(m.consultant_id),
            progress,
            end: m.end_date,
            daysLeft: m.end_date ? daysUntil(m.end_date, today) : null,
            marginPct: marginOf(m),
          };
        })
    : [];

  // ── Clients : CA validé sur 12 mois, part, marge, consultants ─────────
  const clients: ExecClientRow[] = [];
  if (visibility.clients) {
    const since = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const sinceKey = since.getFullYear() * 100 + since.getMonth() + 1;
    const byId = new Map(raw.missions.map((m) => [m.id, m]));
    const acc = new Map<string, { revenue: number; margin: number; costed: number }>();
    for (const t of raw.timesheets) {
      if (t.status !== 'client_validated' || t.period_year * 100 + t.period_month < sinceKey) continue;
      const m = byId.get(t.mission_id);
      if (!m?.daily_rate_eur || !m.company_id) continue;
      const days = Number(t.days_validated ?? t.days_worked ?? 0);
      const cur = acc.get(m.company_id) ?? { revenue: 0, margin: 0, costed: 0 };
      cur.revenue += days * Number(m.daily_rate_eur);
      const c = visibility.margin ? cost(m) : null;
      if (c != null) {
        cur.margin += days * (Number(m.daily_rate_eur) - c);
        cur.costed += days * Number(m.daily_rate_eur);
      }
      acc.set(m.company_id, cur);
    }
    const total = [...acc.values()].reduce((s, v) => s + v.revenue, 0);
    for (const [id, v] of acc) {
      const consultants = new Set(raw.missions.filter((m) => m.company_id === id && m.status === 'active').map((m) => m.consultant_id)).size;
      clients.push({
        id,
        name: companyName.get(id) ?? '—',
        revenue: Math.round(v.revenue),
        share: total > 0 ? Math.round((v.revenue / total) * 1000) / 10 : 0,
        marginPct: v.costed > 0 ? Math.round((v.margin / v.costed) * 1000) / 10 : null,
        consultants,
      });
    }
    clients.sort((a, b) => b.revenue - a.revenue);
    clients.splice(5);
  }

  // ── Activité récente : événements métier, jamais le journal de sécurité ─
  const activity: ExecActivity[] = [];
  const recent = (at: string | null | undefined, days: number) => !!at && daysUntil(at.slice(0, 10), today) >= -days;
  for (const o of raw.opps) {
    const at = (o.updated_at as string | undefined) ?? null;
    const created = (o.created_at as string | undefined) ?? null;
    if (o.status === 'won' && recent(at, 30)) {
      activity.push({ id: `opp-won-${o.id}`, kind: 'opportunity_won', label: { fr: 'Opportunité gagnée', en: 'Opportunity won' }, detail: (o.title as string) ?? null, at: at!, href: `/opportunities/${o.id}` });
    } else if (recent(created, 14)) {
      activity.push({ id: `opp-new-${o.id}`, kind: 'opportunity_created', label: { fr: 'Nouvelle opportunité', en: 'New opportunity' }, detail: (o.title as string) ?? null, at: created!, href: `/opportunities/${o.id}` });
    }
  }
  if (visibility.missions) {
    for (const m of raw.missions) {
      if (!recent(m.created_at, 30)) continue;
      const client = (m.company_id && companyName.get(m.company_id)) || null;
      activity.push({
        id: `mission-${m.id}`,
        kind: 'mission_created',
        label: { fr: 'Mission créée', en: 'Mission created' },
        detail: [m.title, client, consultantName(m.consultant_id)].filter(Boolean).join(' · ') || null,
        at: m.created_at!,
        href: `/missions/${m.id}`,
      });
    }
  }
  for (const t of validated) {
    activity.push({
      id: `ts-${t.id}`,
      kind: 'timesheet_validated',
      label: { fr: 'CRA validé', en: 'Timesheet approved' },
      detail: `${consultantName(t.consultant_id)} · ${MONTHS_FR[t.period_month - 1] ?? ''} ${t.period_year}`,
      at: t.validated_at,
      href: `/timesheets/${t.id}`,
    });
  }
  for (const r of raw.requests) {
    activity.push({ id: `req-${r.id}`, kind: 'client_request', label: { fr: 'Demande client', en: 'Client request' }, detail: r.title, at: r.created_at, href: '/portals?tab=requests' });
  }
  for (const c of newConsultants) {
    if (!recent(c.created_at, 30)) continue;
    activity.push({ id: `cons-${c.id}`, kind: 'consultant_created', label: { fr: 'Consultant ajouté', en: 'Consultant added' }, detail: `${c.first_name} ${c.last_name}`.trim(), at: c.created_at, href: `/consultants/${c.id}` });
  }
  activity.sort((a, b) => b.at.localeCompare(a.at));
  activity.splice(8);

  // ── Intercontrat détaillé ─────────────────────────────────────────────
  let bench: BenchSummary | null = null;
  if (visibility.staffing) {
    const rows = benchRows(raw.consultants, raw.missions, today);
    const { titles, matches, compatible } = await benchMatching(
      supabase,
      rows.map((r) => r.consultant.id),
      raw.opps,
      visibility.pipeline,
    );
    const consultantCost = new Map(raw.consultantFin.filter((f) => f.daily_cost_eur != null).map((f) => [f.consultant_id, Number(f.daily_cost_eur)]));
    bench = summarizeBench(
      rows.map((r) => ({ ...r, consultant: { ...r.consultant, job_title: titles.get(r.consultant.id) ?? null } })),
      {
        today,
        // Coûts uniquement avec les droits financiers (sinon la table n'est pas lue).
        costOf: visibility.margin ? (id) => consultantCost.get(id) ?? null : undefined,
        matches,
        compatibleOpportunities: compatible,
      },
    );
  }

  // ── Ce que le rôle ne doit pas voir n'est pas renvoyé ─────────────────
  const kpis = visibility.revenue
    ? summary.kpis
    : { ...summary.kpis, bookedRevenue: 0, forecastMonth: 0, forecastNextMonth: 0 };

  return {
    summary: { ...summary, kpis, series: visibility.revenue ? summary.series : [], topClients: visibility.clients ? summary.topClients : [] },
    series,
    occupancy: summary.occupancy,
    staffing: staffing.slice(0, 8),
    missions,
    clients,
    activity,
    bench,
    visibility,
  };
}
