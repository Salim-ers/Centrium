// =========================================================================
// Activité de l'organisation : une frise des faits métier récents (CRA
// validé, profil positionné, mission créée, devis envoyé, client ajouté…)
// reconstruite à partir des tables métier, sous la RLS de l'utilisateur.
// Seules les tables que son rôle peut lire sont interrogées.
// =========================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Permission } from '@/lib/auth/permissions';
import { periodLabel } from '@/lib/status';

export type ActivityGroup = 'commercial' | 'staffing' | 'cra';
export type ActivityKind =
  | 'opportunity_created'
  | 'opportunity_won'
  | 'opportunity_lost'
  | 'positioned'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'client_request'
  | 'client_added'
  | 'mission_created'
  | 'consultant_added'
  | 'timesheet_submitted'
  | 'timesheet_validated';

export type OrgActivity = { id: string; kind: ActivityKind; group: ActivityGroup; at: string; label: { fr: string; en: string }; detail: string | null; href: string };

type Person = { first_name: string; last_name: string } | null;
export type ActivityRows = {
  opportunities: Array<{ id: string; title: string; status: string; created_at: string; updated_at: string }>;
  positions: Array<{ opportunity_id: string; consultant_id: string; sent_at: string | null; consultants: Person; opportunities: { title: string } | null }>;
  missions: Array<{ id: string; title: string; created_at: string; consultants: Person }>;
  timesheets: Array<{ id: string; period_month: number; period_year: number; submitted_at: string | null; validated_at: string | null; consultant: Person }>;
  quotes: Array<{ id: string; number: string | null; title: string; status: string; sent_at: string | null; decided_at: string | null }>;
  requests: Array<{ id: string; title: string; created_at: string }>;
  consultants: Array<{ id: string; first_name: string; last_name: string; created_at: string }>;
  clients: Array<{ id: string; name: string; created_at: string }>;
};

export const ACTIVITY_GROUP: Record<ActivityKind, ActivityGroup> = {
  opportunity_created: 'commercial',
  opportunity_won: 'commercial',
  opportunity_lost: 'commercial',
  positioned: 'commercial',
  quote_sent: 'commercial',
  quote_accepted: 'commercial',
  quote_declined: 'commercial',
  client_request: 'commercial',
  client_added: 'commercial',
  mission_created: 'staffing',
  consultant_added: 'staffing',
  timesheet_submitted: 'cra',
  timesheet_validated: 'cra',
};

const LABEL: Record<ActivityKind, { fr: string; en: string }> = {
  opportunity_created: { fr: 'Opportunité créée', en: 'Opportunity created' },
  opportunity_won: { fr: 'Opportunité gagnée', en: 'Opportunity won' },
  opportunity_lost: { fr: 'Opportunité perdue', en: 'Opportunity lost' },
  positioned: { fr: 'Profil positionné', en: 'Profile positioned' },
  quote_sent: { fr: 'Devis envoyé', en: 'Quote sent' },
  quote_accepted: { fr: 'Devis accepté', en: 'Quote accepted' },
  quote_declined: { fr: 'Devis refusé', en: 'Quote declined' },
  client_request: { fr: 'Demande client reçue', en: 'Client request received' },
  client_added: { fr: 'Client ajouté', en: 'Client added' },
  mission_created: { fr: 'Mission créée', en: 'Mission created' },
  consultant_added: { fr: 'Consultant ajouté', en: 'Consultant added' },
  timesheet_submitted: { fr: 'CRA transmis', en: 'Timesheet submitted' },
  timesheet_validated: { fr: 'CRA validé', en: 'Timesheet approved' },
};

const name = (p: Person) => (p ? `${p.first_name} ${p.last_name}`.trim() : null);
const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' · ') || null;

/** Faits entre `since` et `until` (ISO, défaut : maintenant), du plus récent au plus ancien. */
export function buildActivity(rows: ActivityRows, since: string, until: string = new Date().toISOString()): OrgActivity[] {
  const out: OrgActivity[] = [];
  const push = (id: string, kind: ActivityKind, at: string | null | undefined, detail: string | null, href: string) => {
    if (!at || at < since || at > until) return;
    out.push({ id, kind, group: ACTIVITY_GROUP[kind], at, label: LABEL[kind], detail, href });
  };
  for (const o of rows.opportunities) {
    push(`opp-new-${o.id}`, 'opportunity_created', o.created_at, o.title, `/opportunities/${o.id}`);
    if (o.status === 'won') push(`opp-won-${o.id}`, 'opportunity_won', o.updated_at, o.title, `/opportunities/${o.id}`);
    if (o.status === 'lost') push(`opp-lost-${o.id}`, 'opportunity_lost', o.updated_at, o.title, `/opportunities/${o.id}`);
  }
  for (const p of rows.positions) {
    push(`pos-${p.opportunity_id}-${p.consultant_id}`, 'positioned', p.sent_at, join(name(p.consultants), p.opportunities?.title), `/opportunities/${p.opportunity_id}?tab=matching`);
  }
  for (const m of rows.missions) push(`mis-${m.id}`, 'mission_created', m.created_at, join(m.title, name(m.consultants)), `/missions/${m.id}`);
  for (const t of rows.timesheets) {
    const period = periodLabel(t.period_month, t.period_year, 'fr');
    push(`ts-sub-${t.id}`, 'timesheet_submitted', t.submitted_at, join(name(t.consultant), period), `/timesheets/${t.id}`);
    push(`ts-val-${t.id}`, 'timesheet_validated', t.validated_at, join(name(t.consultant), period), `/timesheets/${t.id}`);
  }
  for (const q of rows.quotes) {
    const label = join(q.number, q.title);
    push(`q-sent-${q.id}`, 'quote_sent', q.sent_at, label, `/documents/quotes/${q.id}`);
    if (q.status === 'accepted') push(`q-acc-${q.id}`, 'quote_accepted', q.decided_at, label, `/documents/quotes/${q.id}`);
    if (q.status === 'declined') push(`q-dec-${q.id}`, 'quote_declined', q.decided_at, label, `/documents/quotes/${q.id}`);
  }
  for (const r of rows.requests) push(`req-${r.id}`, 'client_request', r.created_at, r.title, '/portals?tab=requests');
  for (const c of rows.consultants) push(`cons-${c.id}`, 'consultant_added', c.created_at, `${c.first_name} ${c.last_name}`.trim(), `/consultants/${c.id}`);
  for (const c of rows.clients) push(`cli-${c.id}`, 'client_added', c.created_at, c.name, `/clients/${c.id}`);
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

const EMPTY: ActivityRows = { opportunities: [], positions: [], missions: [], timesheets: [], quotes: [], requests: [], consultants: [], clients: [] };

/** Lectures sous RLS, limitées aux tables autorisées par le rôle. */
export async function loadOrgActivity(supabase: SupabaseClient, orgId: string, can: (p: Permission) => boolean, days = 30, today = new Date()): Promise<OrgActivity[]> {
  const since = new Date(today.getTime() - days * 86_400_000).toISOString();
  const tolerant = <T,>(enabled: boolean, p: () => PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> =>
    enabled ? Promise.resolve(p()).then((r) => (r.error ? fallback : ((r.data as T | null) ?? fallback))) : Promise.resolve(fallback);
  const sales = can('opportunities.view');
  const [opportunities, positions, missions, timesheets, quotes, requests, consultants, clients] = await Promise.all([
    tolerant(sales, () => supabase.from('opportunities').select('id, title, status, created_at, updated_at').eq('organization_id', orgId).gte('updated_at', since).limit(500), EMPTY.opportunities),
    tolerant(
      sales,
      () =>
        supabase
          .from('opportunity_consultants')
          .select('opportunity_id, consultant_id, sent_at, consultants(first_name, last_name), opportunities!inner(title, organization_id)')
          .eq('opportunities.organization_id', orgId)
          .gte('sent_at', since)
          .limit(500),
      EMPTY.positions,
    ),
    tolerant(can('missions.view'), () => supabase.from('missions').select('id, title, created_at, consultants(first_name, last_name)').eq('organization_id', orgId).gte('created_at', since).limit(500), EMPTY.missions),
    tolerant(
      can('timesheets.view'),
      () =>
        supabase
          .from('timesheets')
          .select('id, period_month, period_year, submitted_at, validated_at, consultant:consultants(first_name, last_name)')
          .eq('organization_id', orgId)
          .or(`submitted_at.gte.${since},validated_at.gte.${since}`)
          .limit(1000),
      EMPTY.timesheets,
    ),
    tolerant(
      can('documents.view'),
      () => supabase.from('quotes').select('id, number, title, status, sent_at, decided_at').eq('organization_id', orgId).or(`sent_at.gte.${since},decided_at.gte.${since}`).limit(500),
      EMPTY.quotes,
    ),
    tolerant(sales, () => supabase.from('client_requests').select('id, title, created_at').eq('organization_id', orgId).gte('created_at', since).limit(200), EMPTY.requests),
    tolerant(
      can('consultants.view'),
      () => supabase.from('consultants').select('id, first_name, last_name, created_at').eq('organization_id', orgId).eq('archived', false).gte('created_at', since).limit(200),
      EMPTY.consultants,
    ),
    tolerant(can('clients.view'), () => supabase.from('companies').select('id, name, created_at').eq('organization_id', orgId).gte('created_at', since).limit(200), EMPTY.clients),
  ]);
  return buildActivity({ opportunities, positions, missions, timesheets, quotes, requests, consultants, clients } as unknown as ActivityRows, since, today.toISOString());
}
