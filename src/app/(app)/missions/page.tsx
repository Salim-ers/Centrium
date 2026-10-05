'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, CalendarClock, CalendarPlus, ClipboardCheck, Eye, FileText, Gauge, Plus, Search, TrendingUp } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip } from '@/components/app/StatStrip';
import { Segmented } from '@/components/app/Segmented';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { MissionDrawer, type MissionDraft } from '@/components/missions/MissionDrawer';
import { MissionQuickView } from '@/components/missions/MissionQuickView';
import { WonOpportunityPicker } from '@/components/missions/WonOpportunityPicker';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadMissions, type MissionRow } from '@/lib/pilotage/load-missions';
import { forecastRevenue } from '@/lib/pilotage/metrics';
import { renewalStage } from '@/lib/missions/renewal';
import { MISSION_STATUS, RENEWAL_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

const BUCKETS = [15, 30, 60, 90] as const;
type Scope = 'active' | 'proposed' | 'ended' | 'all';
type Ending = 'all' | '15' | '30' | '60' | '90';

/** Prépare le formulaire de mission à partir d'une opportunité gagnée. */
async function draftFromOpportunity(oppId: string): Promise<MissionDraft | null> {
  const supabase = createClient();
  const [{ data: opp }, { data: proposals }] = await Promise.all([
    supabase.from('opportunities').select('*').eq('id', oppId).maybeSingle(),
    supabase.from('opportunity_consultants').select('consultant_id, sent_at').eq('opportunity_id', oppId).order('sent_at', { ascending: false }),
  ]);
  if (!opp) return null;
  const start = (opp.start_date as string | null) ?? new Date().toISOString().slice(0, 10);
  let end: string | null = null;
  if (opp.duration_months) {
    const d = new Date(start + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(opp.duration_months));
    d.setDate(d.getDate() - 1);
    end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return {
    title: opp.title as string,
    opportunity_id: opp.id as string,
    company_id: (opp.company_id as string | null) ?? null,
    owner_id: (opp.owner_id as string | null) ?? null,
    consultant_id: (proposals?.[0]?.consultant_id as string | undefined) ?? '',
    daily_rate_eur: Number(opp.daily_rate_eur ?? 0),
    start_date: start,
    end_date: end,
    location: (opp.location as string | null) ?? '',
    remote_policy: (opp.remote_policy as MissionDraft['remote_policy']) ?? null,
    status: 'active',
  };
}

/**
 * Missions : une liste compacte sur un écran. Trois ou quatre indicateurs,
 * périmètre et échéance en contrôles segmentés, aperçu en tiroir avec la
 * question du renouvellement ; le cockpit reste à un clic.
 */
export default function MissionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const financials = can('consultants.financials');
  const showRates = financials || can('finance.view');
  const canEdit = can('missions.edit');
  const { options: companyOptions } = useCompaniesLite();
  const { byId: members } = useTeamMembers();
  const today = new Date().toISOString().slice(0, 10);

  const endingParam = params.get('ending') ?? params.get('endingWithin');
  const [scope, setScope] = useState<Scope>('active');
  const [ending, setEnding] = useState<Ending>(BUCKETS.some((b) => String(b) === endingParam) ? (endingParam as Ending) : 'all');
  const [client, setClient] = useState('all');
  const [query, setQuery] = useState('');
  const [quickId, setQuickId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; draft?: MissionDraft }>({ open: false });

  useEffect(() => {
    if (params.get('new') !== '1') return;
    const opp = params.get('opportunity');
    const consultant = params.get('consultant');
    if (!opp) {
      setDrawer({ open: true, draft: consultant ? { consultant_id: consultant } : undefined });
      return;
    }
    void draftFromOpportunity(opp).then((draft) => setDrawer({ open: true, draft: draft ?? undefined }));
  }, [params]);

  function fromOpportunity(oppId: string) {
    void draftFromOpportunity(oppId).then((draft) => setDrawer({ open: true, draft: draft ?? undefined }));
  }

  const { data, loading, reload } = useCachedQuery<MissionRow[]>(
    `missions-v2:${activeOrgId ?? 'none'}:${financials ? 'f' : 'n'}`,
    () => loadMissions(createClient(), activeOrgId!, { financials }),
    { enabled: !!activeOrgId && ready },
  );
  const all = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      active: all.filter((m) => m.status === 'active').length,
      proposed: all.filter((m) => m.status === 'proposed').length,
      ended: all.filter((m) => m.status === 'ended').length,
      all: all.length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const limit = ending === 'all' ? null : Number(ending);
    return all.filter((m) => {
      if (scope !== 'all' && m.status !== scope) return false;
      if (scope === 'active' && limit != null && (m.days_left == null || m.days_left < 0 || m.days_left > limit)) return false;
      if (client !== 'all' && m.company_id !== client) return false;
      return !q || `${m.title} ${m.consultant_name} ${m.company_name ?? ''}`.toLowerCase().includes(q);
    });
  }, [all, scope, ending, client, query]);

  const kpis = useMemo(() => {
    const active = all.filter((m) => m.status === 'active');
    const now = new Date();
    const withCost = active.filter((m) => m.margin_pct != null);
    const rateSum = withCost.reduce((s, m) => s + Number(m.daily_rate_eur), 0);
    const marginSum = withCost.reduce((s, m) => s + (Number(m.daily_rate_eur) - (m.daily_cost_eur ?? 0)), 0);
    return {
      monthRevenue: forecastRevenue(active, now.getFullYear(), now.getMonth() + 1),
      marginPct: rateSum > 0 ? (marginSum / rateSum) * 100 : null,
      ending30: active.filter((m) => m.days_left != null && m.days_left >= 0 && m.days_left <= 30).length,
      toDecide: active.filter((m) => renewalStage(m, today) === 'ask').length,
      buckets: BUCKETS.map((b) => ({ b, n: active.filter((m) => m.days_left != null && m.days_left >= 0 && m.days_left <= b).length })),
    };
  }, [all, today]);

  const columns: Column<MissionRow>[] = [
    {
      id: 'title',
      header: 'Mission',
      mobile: 'title',
      sortValue: (m) => m.title,
      cell: (m) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{m.title}</div>
          <div className="hidden truncate text-xs text-muted-foreground md:block lg:hidden">{m.consultant_name}</div>
        </div>
      ),
    },
    {
      id: 'consultant',
      header: 'Consultant',
      hideOnMobile: true,
      mobile: 'subtitle',
      sortValue: (m) => m.consultant_name,
      cell: (m) => <span className="text-muted-foreground">{m.consultant_name}</span>,
    },
    {
      id: 'client',
      header: 'Client',
      mobile: 'meta',
      sortValue: (m) => m.company_name ?? '',
      cell: (m) => <span className="text-muted-foreground">{m.company_name ?? '—'}</span>,
    },
    {
      id: 'end',
      header: fr ? 'Fin' : 'End',
      mobile: 'meta',
      sortValue: (m) => m.end_date ?? '9999',
      cell: (m) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]">
          {m.end_date ? formatDate(m.end_date, lang, 'short') : <span className="text-muted-foreground">{fr ? 'Sans fin' : 'Open'}</span>}
          {m.days_left != null && m.days_left >= 0 && m.days_left <= 90 && (
            <span
              className={cn(
                'num rounded px-1 py-px text-[11px] font-medium',
                m.days_left <= 15 ? 'bg-danger-soft text-destructive' : m.days_left <= 30 ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground',
              )}
            >
              J-{m.days_left}
            </span>
          )}
        </span>
      ),
    },
    ...(showRates
      ? ([
          {
            id: 'rate',
            header: 'TJM',
            align: 'right',
            hideOnMobile: true,
            sortValue: (m) => Number(m.daily_rate_eur),
            cell: (m) => <span className="num">{formatEur(Number(m.daily_rate_eur), lang)}</span>,
          },
        ] as Column<MissionRow>[])
      : []),
    ...(financials
      ? ([
          {
            id: 'margin',
            header: fr ? 'Marge' : 'Margin',
            align: 'right',
            mobile: 'meta',
            sortValue: (m) => m.margin_pct ?? -999,
            cell: (m) =>
              m.margin_pct != null ? (
                <span className={cn('num', m.margin_pct < 15 ? 'text-warning' : 'text-foreground')}>{formatPct(m.margin_pct, lang)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{fr ? 'CJM ?' : 'Cost?'}</span>
              ),
          },
        ] as Column<MissionRow>[])
      : []),
    {
      id: 'renewal',
      header: fr ? 'Renouvellement' : 'Renewal',
      hideOnMobile: true,
      sortValue: (m) => (renewalStage(m, today) === 'ask' ? '0' : (m.renewal_status ?? 'unknown')),
      cell: (m) => {
        if (m.status !== 'active') return <span className="text-muted-foreground">—</span>;
        if (renewalStage(m, today) === 'ask')
          return <span className="rounded-md bg-app-peach-light px-1.5 py-0.5 text-[12px] font-semibold text-app-terra-dark">{fr ? 'À statuer' : 'To decide'}</span>;
        const s = statusOf(RENEWAL_STATUS, m.renewal_status ?? 'unknown', lang);
        return <span className="text-[13px] text-muted-foreground">{s.label}</span>;
      },
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      mobile: 'trailing',
      sortValue: (m) => m.status,
      cell: (m) => {
        const s = statusOf(MISSION_STATUS, m.status, lang);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
  ];

  const filtered = query.trim() !== '' || client !== 'all' || (scope === 'active' && ending !== 'all');
  const createActions = canEdit ? (
    <div className="flex flex-wrap justify-center gap-2">
      <Button onClick={() => setDrawer({ open: true })}>
        <Plus />
        {fr ? 'Créer une mission' : 'Create a mission'}
      </Button>
      <WonOpportunityPicker lang={lang} onPick={fromOpportunity} />
    </div>
  ) : undefined;

  const quick = quickId ? (all.find((m) => m.id === quickId) ?? null) : null;

  return (
    <AppShell fill>
      <PageHeader
        title="Missions"
        description={
          loading && !data
            ? fr ? 'Chargement…' : 'Loading…'
            : `${rows.length} mission${rows.length > 1 ? 's' : ''}`
        }
        tabs={
          <Segmented<Scope>
            label={fr ? 'Périmètre' : 'Scope'}
            value={scope}
            onChange={(v) => {
              setScope(v);
              if (v !== 'active') setEnding('all');
            }}
            options={[
              { value: 'active', label: fr ? 'En cours' : 'Active', count: counts.active },
              { value: 'proposed', label: fr ? 'Proposées' : 'Proposed', count: counts.proposed },
              { value: 'ended', label: fr ? 'Terminées' : 'Ended', count: counts.ended },
              { value: 'all', label: fr ? 'Toutes' : 'All', count: counts.all },
            ]}
          />
        }
        actions={
          canEdit && (
            <>
              <span className="hidden lg:inline-flex">
                <WonOpportunityPicker lang={lang} onPick={fromOpportunity} label={fr ? 'Opportunité gagnée' : 'Won opportunity'} />
              </span>
              <Button onClick={() => setDrawer({ open: true })}>
                <Plus />
                {fr ? 'Nouvelle mission' : 'New mission'}
              </Button>
            </>
          )
        }
      />

      <StatStrip
        className="mb-3"
        items={[
          { label: fr ? 'missions en cours' : 'active missions', value: loading && !data ? '…' : counts.active, tone: 'terra', icon: Briefcase },
          {
            label: fr ? `fin sous 30 j · ${kpis.toDecide} à statuer` : `ending within 30 d · ${kpis.toDecide} to decide`,
            value: loading && !data ? '…' : kpis.ending30,
            tone: kpis.ending30 > 0 ? 'peach' : 'ivory',
            icon: CalendarClock,
          },
          ...(showRates
            ? [{ label: fr ? 'CA prévisionnel du mois' : 'forecast this month', value: loading && !data ? '…' : formatEurCompact(kpis.monthRevenue, lang), tone: 'ivory' as const, icon: TrendingUp }]
            : []),
          ...(financials
            ? [{ label: fr ? 'marge moyenne (TJM − CJM)' : 'average margin (rate − cost)', value: loading && !data ? '…' : formatPct(kpis.marginPct, lang), tone: 'white' as const, icon: Gauge }]
            : []),
        ]}
      />

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Mission, consultant, client' : 'Mission, consultant, client'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        <Select value={client} onChange={(e) => setClient(e.target.value)} className="sm:w-52" aria-label="Client">
          <option value="all">{fr ? 'Tous les clients' : 'All clients'}</option>
          {companyOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        {scope === 'active' && (
          <Segmented<Ending>
            label={fr ? 'Échéance' : 'End date'}
            value={ending}
            onChange={(v) => {
              setEnding(v);
              if (params.get('ending') || params.get('endingWithin')) router.replace('/missions');
            }}
            options={[
              { value: 'all', label: fr ? 'Toutes échéances' : 'Any end date' },
              ...kpis.buckets.map(({ b, n }) => ({ value: String(b) as Ending, label: `≤ ${b} ${fr ? 'j' : 'd'}`, count: n })),
            ]}
          />
        )}
      </div>

      <DataTable
        fill
        aria-label="Missions"
        rows={rows}
        columns={columns}
        getRowId={(m) => m.id}
        rowHref={(m) => `/missions/${m.id}`}
        onRowClick={(m) => setQuickId(m.id)}
        rowActions={(m) => [
          { label: fr ? 'Aperçu' : 'Quick view', icon: Eye, onSelect: () => setQuickId(m.id) },
          { label: 'CRA', icon: ClipboardCheck, href: `/missions/${m.id}?tab=cra` },
          ...(canEdit && m.status === 'active' ? [{ label: fr ? 'Prolonger' : 'Extend', icon: CalendarPlus, href: `/missions/${m.id}?edit=1` }] : []),
          { label: 'Documents', icon: FileText, href: `/missions/${m.id}?tab=documents` },
          ...linkActions(`/missions/${m.id}`, fr).map((a, i) => (i === 0 ? { ...a, label: fr ? 'Ouvrir le cockpit' : 'Open the cockpit', separatorBefore: true } : a)),
        ]}
        tableId="missions"
        loading={loading && !data}
        initialSort={{ id: 'end', dir: 'asc' }}
        empty={
          all.length === 0 || (!filtered && rows.length === 0 && scope === 'active') ? (
            <EmptyState
              icon={Briefcase}
              title={all.length === 0 ? (fr ? 'Aucune mission' : 'No missions') : fr ? 'Aucune mission active' : 'No active mission'}
              description={
                fr
                  ? 'Créez une mission ou transformez une opportunité gagnée : CRA, marge et préfacturation suivront.'
                  : 'Create a mission or convert a won opportunity: timesheets, margin and pre-invoicing will follow.'
              }
              action={createActions}
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title={fr ? 'Aucun résultat' : 'No results'}
              description={filtered ? (fr ? 'Aucune mission ne correspond à ces filtres.' : 'No mission matches these filters.') : undefined}
              action={
                filtered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setClient('all');
                      setEnding('all');
                    }}
                  >
                    {fr ? 'Réinitialiser les filtres' : 'Reset filters'}
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      <MissionQuickView
        mission={quick}
        open={!!quick}
        onOpenChange={(v) => !v && setQuickId(null)}
        lang={lang}
        today={today}
        showRates={showRates}
        financials={financials}
        canEdit={canEdit}
        ownerName={quick?.owner_id ? (members.get(quick.owner_id)?.name ?? null) : null}
        onChanged={() => void reload()}
      />

      <MissionDrawer
        open={drawer.open}
        onOpenChange={(v) => {
          setDrawer((d) => ({ ...d, open: v }));
          if (!v && params.get('new')) router.replace('/missions');
        }}
        draft={drawer.draft}
        onSaved={(m) => {
          void reload();
          if (m?.id) router.push(`/missions/${m.id}`);
        }}
      />
    </AppShell>
  );
}
