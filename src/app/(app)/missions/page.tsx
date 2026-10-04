'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Plus, Search } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { MissionDrawer, type MissionDraft } from '@/components/missions/MissionDrawer';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadMissions, type MissionRow } from '@/lib/pilotage/load-missions';
import { forecastRevenue } from '@/lib/pilotage/metrics';
import { MISSION_STATUS, RENEWAL_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

const BUCKETS = [15, 30, 60, 90] as const;

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
  const { options: companyOptions } = useCompaniesLite();

  const endingParam = Number(params.get('ending'));
  const [status, setStatus] = useState<string>(endingParam ? 'active' : 'active');
  const [ending, setEnding] = useState<number | null>(BUCKETS.includes(endingParam as 15) ? endingParam : null);
  const [client, setClient] = useState('all');
  const [query, setQuery] = useState('');
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

  const { data, loading, reload } = useCachedQuery<MissionRow[]>(
    `missions-v2:${activeOrgId ?? 'none'}:${financials ? 'f' : 'n'}`,
    () => loadMissions(createClient(), activeOrgId!, { financials }),
    { enabled: !!activeOrgId && ready },
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (status !== 'all' && m.status !== status) return false;
      if (ending && (m.days_left == null || m.days_left < 0 || m.days_left > ending)) return false;
      if (client !== 'all' && m.company_id !== client) return false;
      return !q || `${m.title} ${m.consultant_name} ${m.company_name ?? ''}`.toLowerCase().includes(q);
    });
  }, [data, status, ending, client, query]);

  const kpis = useMemo(() => {
    const active = (data ?? []).filter((m) => m.status === 'active');
    const now = new Date();
    const withCost = active.filter((m) => m.margin_pct != null);
    const rateSum = withCost.reduce((s, m) => s + Number(m.daily_rate_eur), 0);
    const marginSum = withCost.reduce((s, m) => s + (Number(m.daily_rate_eur) - (m.daily_cost_eur ?? 0)), 0);
    return {
      active: active.length,
      monthRevenue: forecastRevenue(active, now.getFullYear(), now.getMonth() + 1),
      marginPct: rateSum > 0 ? (marginSum / rateSum) * 100 : null,
      ending30: active.filter((m) => m.days_left != null && m.days_left >= 0 && m.days_left <= 30).length,
      buckets: BUCKETS.map((b) => ({ b, n: active.filter((m) => m.bucket === b).length })),
    };
  }, [data]);

  const columns: Column<MissionRow>[] = [
    {
      id: 'title',
      header: 'Mission',
      mobile: 'title',
      sortValue: (m) => m.title,
      cell: (m) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{m.title}</div>
          <div className="truncate text-xs text-muted-foreground lg:hidden">{m.consultant_name}</div>
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
      header: fr ? 'Client' : 'Client',
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
      sortValue: (m) => m.renewal_status ?? '',
      cell: (m) => {
        if (m.status !== 'active') return <span className="text-muted-foreground">—</span>;
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

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Ressources' : 'Resources'}
        title="Missions"
        description={fr ? 'Affectations en cours, échéances et rentabilité.' : 'Assignments, end dates and profitability.'}
        actions={
          can('missions.edit') && (
            <Button onClick={() => setDrawer({ open: true })}>
              <Plus />
              {fr ? 'Nouvelle mission' : 'New mission'}
            </Button>
          )
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label={fr ? 'Missions en cours' : 'Active missions'} value={kpis.active} loading={loading && !data} />
        {showRates && (
          <KPICard
            label={fr ? 'CA prévisionnel du mois' : 'Forecast this month'}
            valueText={formatEurCompact(kpis.monthRevenue, lang)}
            loading={loading && !data}
          />
        )}
        {financials && (
          <KPICard label={fr ? 'Marge moyenne' : 'Average margin'} valueText={formatPct(kpis.marginPct, lang)} tone="emerald" loading={loading && !data} />
        )}
        <KPICard
          label={fr ? 'Fin ≤ 30 jours' : 'Ending ≤ 30 days'}
          value={kpis.ending30}
          tone={kpis.ending30 > 0 ? 'amber' : 'neutral'}
          loading={loading && !data}
        />
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={fr ? 'Échéances' : 'End dates'}>
        <span className="mr-1 text-xs text-muted-foreground">{fr ? 'Échéance :' : 'Ending:'}</span>
        <button
          type="button"
          onClick={() => {
            setEnding(null);
            router.replace('/missions');
          }}
          aria-pressed={ending === null}
          className={cn(
            'h-7 rounded-full border px-2.5 text-xs font-medium transition-colors',
            ending === null ? 'border-foreground/15 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {fr ? 'Toutes' : 'All'}
        </button>
        {kpis.buckets.map(({ b, n }) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              setEnding(b);
              setStatus('active');
            }}
            aria-pressed={ending === b}
            className={cn(
              'num h-7 rounded-full border px-2.5 text-xs font-medium transition-colors',
              ending === b ? 'border-foreground/15 bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            ≤ {b} {fr ? 'j' : 'd'} · {n}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Mission, consultant, client' : 'Mission, consultant, client'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label={fr ? 'Statut' : 'Status'}>
          <option value="all">{fr ? 'Tous statuts' : 'All statuses'}</option>
          {Object.entries(MISSION_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label[lang]}
            </option>
          ))}
        </Select>
        <Select value={client} onChange={(e) => setClient(e.target.value)} className="sm:w-56" aria-label={fr ? 'Client' : 'Client'}>
          <option value="all">{fr ? 'Tous les clients' : 'All clients'}</option>
          {companyOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        aria-label="Missions"
        rows={rows}
        columns={columns}
        getRowId={(m) => m.id}
        rowHref={(m) => `/missions/${m.id}`}
        rowActions={(m) => linkActions(`/missions/${m.id}`, fr)}
        tableId="missions"
        loading={loading && !data}
        initialSort={ending ? { id: 'end', dir: 'asc' } : { id: 'end', dir: 'asc' }}
        empty={
          <EmptyState
            icon={Briefcase}
            title={(data ?? []).length === 0 ? (fr ? 'Aucune mission' : 'No missions') : fr ? 'Aucun résultat' : 'No results'}
            description={
              (data ?? []).length === 0
                ? fr
                  ? 'Créez une mission ou transformez une opportunité gagnée : CRA, marge et préfacturation suivront.'
                  : 'Create a mission or convert a won opportunity: timesheets, margin and pre-invoicing will follow.'
                : undefined
            }
          />
        }
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
