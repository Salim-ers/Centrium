'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, FileUp, Plus, Search } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ClientDrawer, CLIENT_KIND_LABEL } from '@/components/clients/ClientDrawer';
import { ClientCsvImportDialog } from '@/components/clients/ClientCsvImportDialog';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadClients, type ClientRow } from '@/lib/pilotage/load-clients';
import { formatDate, formatEurCompact, formatPct } from '@/lib/format';

export default function ClientsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('clients.edit');
  const withFinance = can('finance.view') || can('analytics.view');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(params.get('new') === '1');
  const [importOpen, setImportOpen] = useState(params.get('import') === '1');

  const { data, loading, reload } = useCachedQuery<ClientRow[]>(
    `clients-overview:${activeOrgId ?? 'none'}:${withFinance ? 'f' : 'n'}`,
    () => loadClients(createClient(), activeOrgId!, withFinance),
    { enabled: !!activeOrgId && ready },
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        (kind === 'all' || c.kind === kind) &&
        (!q || `${c.name} ${c.city ?? ''} ${c.industry ?? ''}`.toLowerCase().includes(q)),
    );
  }, [data, query, kind]);

  const totals = useMemo(() => {
    const list = data ?? [];
    const revenue = list.reduce((s, c) => s + c.revenue12m, 0);
    const top = [...list].sort((a, b) => b.revenue12m - a.revenue12m)[0];
    return {
      active: list.filter((c) => c.activeMissions > 0).length,
      revenue,
      topShare: revenue > 0 && top ? (top.revenue12m / revenue) * 100 : null,
      topName: top?.name,
      pipeline: list.reduce((s, c) => s + c.pipeline, 0),
    };
  }, [data]);

  const columns: Column<ClientRow>[] = [
    {
      id: 'name',
      header: fr ? 'Client' : 'Client',
      mobile: 'title',
      sortValue: (c) => c.name,
      cell: (c) => <span className="font-medium text-foreground">{c.name}</span>,
    },
    {
      id: 'kind',
      header: fr ? 'Type' : 'Type',
      mobile: 'trailing',
      sortValue: (c) => c.kind,
      cell: (c) => (
        <Badge variant={c.kind === 'client' ? 'brand' : c.kind === 'prospect' ? 'neutral' : 'info'}>
          {CLIENT_KIND_LABEL[c.kind]?.[lang] ?? c.kind}
        </Badge>
      ),
    },
    {
      id: 'city',
      header: fr ? 'Ville' : 'City',
      mobile: 'subtitle',
      hideOnMobile: true,
      sortValue: (c) => c.city ?? '',
      cell: (c) => <span className="text-muted-foreground">{c.city ?? '—'}</span>,
    },
    {
      id: 'missions',
      header: fr ? 'Missions actives' : 'Active missions',
      align: 'right',
      mobile: 'meta',
      sortValue: (c) => c.activeMissions,
      cell: (c) => <span className="num">{c.activeMissions}</span>,
    },
    {
      id: 'opps',
      header: fr ? 'Opportunités' : 'Opportunities',
      align: 'right',
      mobile: 'meta',
      sortValue: (c) => c.openOpportunities,
      cell: (c) => <span className="num">{c.openOpportunities}</span>,
    },
    ...(withFinance
      ? ([
          {
            id: 'revenue',
            header: fr ? 'CA 12 mois' : 'Revenue 12m',
            align: 'right',
            mobile: 'meta',
            sortValue: (c) => c.revenue12m,
            cell: (c) => <span className="num">{c.revenue12m ? formatEurCompact(c.revenue12m, lang) : '—'}</span>,
          },
          {
            id: 'forecast',
            header: fr ? 'Prév. 3 mois' : 'Forecast 3m',
            align: 'right',
            hideOnMobile: true,
            sortValue: (c) => c.forecastNext3m,
            cell: (c) => <span className="num text-muted-foreground">{c.forecastNext3m ? formatEurCompact(c.forecastNext3m, lang) : '—'}</span>,
          },
        ] as Column<ClientRow>[])
      : []),
    {
      id: 'activity',
      header: fr ? 'Dernière activité' : 'Last activity',
      hideOnMobile: true,
      sortValue: (c) => c.lastActivity ?? '',
      cell: (c) => <span className="text-[13px] text-muted-foreground">{formatDate(c.lastActivity, lang, 'short')}</span>,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title={fr ? 'Clients' : 'Clients'}
        description={fr ? 'Comptes clients, prospects et ESN partenaires.' : 'Client accounts, prospects and partner firms.'}
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileUp />
                {fr ? 'Importer un CSV' : 'Import CSV'}
              </Button>
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus />
                {fr ? 'Nouveau client' : 'New client'}
              </Button>
            </>
          )
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label={fr ? 'Comptes' : 'Accounts'} value={data?.length} loading={loading && !data} />
        <KPICard label={fr ? 'Clients avec mission' : 'Clients with missions'} value={totals.active} loading={loading && !data} />
        {withFinance && (
          <>
            <KPICard
              label={fr ? 'CA 12 mois' : 'Revenue 12 months'}
              valueText={formatEurCompact(totals.revenue, lang)}
              hint={fr ? 'CRA validés' : 'Approved timesheets'}
              loading={loading && !data}
            />
            <KPICard
              label={fr ? 'Concentration' : 'Concentration'}
              valueText={formatPct(totals.topShare, lang, 0)}
              hint={totals.topName ? (fr ? `Part de ${totals.topName}` : `${totals.topName}'s share`) : undefined}
              tone={totals.topShare != null && totals.topShare > 40 ? 'amber' : 'neutral'}
              loading={loading && !data}
            />
          </>
        )}
      </section>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fr ? 'Nom, ville, secteur' : 'Name, city, industry'}
            className="pl-9"
            aria-label={fr ? 'Rechercher un client' : 'Search clients'}
          />
        </div>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="sm:w-48" aria-label={fr ? 'Type' : 'Type'}>
          <option value="all">{fr ? 'Tous les types' : 'All types'}</option>
          {Object.entries(CLIENT_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v[lang]}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        aria-label={fr ? 'Clients' : 'Clients'}
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        rowHref={(c) => `/clients/${c.id}`}
        loading={loading && !data}
        initialSort={withFinance ? { id: 'revenue', dir: 'desc' } : { id: 'name', dir: 'asc' }}
        empty={
          <EmptyState
            icon={Building2}
            title={(data ?? []).length === 0 ? (fr ? 'Aucun client' : 'No clients') : fr ? 'Aucun résultat' : 'No results'}
            description={
              (data ?? []).length === 0
                ? fr
                  ? 'Ajoutez vos clients pour suivre opportunités, missions et chiffre d’affaires par compte.'
                  : 'Add clients to track opportunities, missions and revenue per account.'
                : undefined
            }
            action={
              canEdit && (data ?? []).length === 0 ? (
                <Button onClick={() => setDrawerOpen(true)}>
                  <Plus />
                  {fr ? 'Nouveau client' : 'New client'}
                </Button>
              ) : undefined
            }
          />
        }
      />

      {activeOrgId && (
        <ClientDrawer open={drawerOpen} onOpenChange={setDrawerOpen} organizationId={activeOrgId} onSaved={() => void reload()} />
      )}
      <ClientCsvImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => void reload()} />
    </AppShell>
  );
}
