'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Plus, Search, Target } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { PIPELINE_STAGES, stageLabel, stageOf, stageTone } from '@/lib/crm/pipeline';
import { isOpenOpportunity, opportunityAmount } from '@/lib/pilotage/metrics';
import { formatDate, formatEurCompact, relativeDays } from '@/lib/format';
import { cn } from '@/lib/utils';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import type { Opportunity } from '@/types';

export default function OpportunitiesPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('opportunities.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: members, options: memberOptions } = useTeamMembers();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<string>(params.get('stage') ?? 'open');
  const [owner, setOwner] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(params.get('new') === '1');

  const { data, loading, setData } = useCachedQuery<Opportunity[]>(
    `opps-list:${activeOrgId ?? 'none'}`,
    async () => {
      const { data: rows } = await createClient()
        .from('opportunities')
        .select('*')
        .eq('organization_id', activeOrgId!)
        .order('updated_at', { ascending: false })
        .limit(5000);
      return ((rows ?? []) as Opportunity[]).filter((o) => !o.archived);
    },
    { enabled: !!activeOrgId },
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (stage === 'open' && !isOpenOpportunity(o)) return false;
      if (stage === 'on_hold' && o.status !== 'on_hold') return false;
      if (stage !== 'open' && stage !== 'all' && stage !== 'on_hold' && stageOf(o.status) !== stage) return false;
      if (owner !== 'all' && o.owner_id !== owner) return false;
      if (!q) return true;
      const client = o.company_id ? (companies.get(o.company_id)?.name ?? '') : '';
      return `${o.title} ${client} ${(o.required_skills ?? []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [data, query, stage, owner, companies]);

  const today = new Date().toISOString().slice(0, 10);
  const columns: Column<Opportunity>[] = [
    {
      id: 'title',
      header: fr ? 'Opportunité' : 'Opportunity',
      mobile: 'title',
      sortValue: (o) => o.title,
      cell: (o) => <span className="font-medium text-foreground">{o.title}</span>,
    },
    {
      id: 'client',
      header: fr ? 'Client' : 'Client',
      mobile: 'subtitle',
      sortValue: (o) => (o.company_id ? (companies.get(o.company_id)?.name ?? '') : ''),
      cell: (o) => <span className="text-muted-foreground">{o.company_id ? (companies.get(o.company_id)?.name ?? '—') : '—'}</span>,
    },
    {
      id: 'stage',
      header: fr ? 'Étape' : 'Stage',
      mobile: 'trailing',
      sortValue: (o) => PIPELINE_STAGES.findIndex((s) => s.id === stageOf(o.status)),
      cell: (o) => <StatusPill tone={stageTone(o.status)}>{stageLabel(o.status, lang)}</StatusPill>,
    },
    {
      id: 'amount',
      header: fr ? 'Montant' : 'Amount',
      align: 'right',
      mobile: 'meta',
      sortValue: (o) => opportunityAmount(o),
      cell: (o) => <span className="num">{opportunityAmount(o) ? formatEurCompact(opportunityAmount(o), lang) : '—'}</span>,
    },
    {
      id: 'probability',
      header: fr ? 'Proba.' : 'Prob.',
      align: 'right',
      hideOnMobile: true,
      sortValue: (o) => o.probability ?? -1,
      cell: (o) => <span className="num text-muted-foreground">{o.probability != null ? `${o.probability} %` : '—'}</span>,
    },
    {
      id: 'weighted',
      header: fr ? 'Pondéré' : 'Weighted',
      align: 'right',
      hideOnMobile: true,
      sortValue: (o) => opportunityAmount(o) * ((o.probability ?? 0) / 100),
      cell: (o) => {
        const w = opportunityAmount(o) * ((o.probability ?? 0) / 100);
        return <span className="num">{w ? formatEurCompact(w, lang) : '—'}</span>;
      },
    },
    {
      id: 'next',
      header: fr ? 'Prochaine action' : 'Next action',
      mobile: 'meta',
      sortValue: (o) => o.next_follow_up ?? '9999',
      cell: (o) =>
        o.next_follow_up ? (
          <span className={cn('text-[13px]', o.next_follow_up < today ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {o.next_follow_up < today ? relativeDays(o.next_follow_up, lang) : formatDate(o.next_follow_up, lang, 'short')}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'owner',
      header: 'BM',
      hideOnMobile: true,
      sortValue: (o) => (o.owner_id ? (members.get(o.owner_id)?.name ?? '') : ''),
      cell: (o) => {
        const m = o.owner_id ? members.get(o.owner_id) : null;
        return m ? (
          <span className="inline-flex items-center gap-2">
            <Avatar name={m.name} size="xs" />
            <span className="truncate text-[13px] text-muted-foreground">{m.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'updated',
      header: fr ? 'Mise à jour' : 'Updated',
      hideOnMobile: true,
      sortValue: (o) => o.updated_at,
      cell: (o) => <span className="text-[13px] text-muted-foreground">{formatDate(o.updated_at, lang, 'short')}</span>,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title={fr ? 'Opportunités' : 'Opportunities'}
        description={
          fr
            ? 'Toutes les affaires en cours, du premier contact à la signature.'
            : 'Every deal, from first contact to signature.'
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/offers">
                <FileText />
                {fr ? 'Fiches de poste' : 'Job descriptions'}
              </Link>
            </Button>
            {canEdit && (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus />
                {fr ? 'Nouvelle opportunité' : 'New opportunity'}
              </Button>
            )}
          </>
        }
      />
      <RelatedLinks
        links={[
          { href: '/responses', label: { fr: 'Réponses aux appels d’offres', en: 'Tender responses' }, permission: 'opportunities.view' },
        ]}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fr ? 'Intitulé, client, compétence' : 'Title, client, skill'}
            className="pl-9"
            aria-label={fr ? 'Rechercher' : 'Search'}
          />
        </div>
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="sm:w-48" aria-label={fr ? 'Étape' : 'Stage'}>
          <option value="open">{fr ? 'Ouvertes' : 'Open'}</option>
          <option value="all">{fr ? 'Toutes' : 'All'}</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label[lang]}
            </option>
          ))}
          <option value="on_hold">{fr ? 'En veille' : 'On hold'}</option>
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="sm:w-56" aria-label="Business Manager">
          <option value="all">{fr ? 'Tous les BM' : 'All BMs'}</option>
          {memberOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <span className="num text-xs text-muted-foreground sm:ml-auto">
          {rows.length} {fr ? 'résultat(s)' : 'result(s)'}
        </span>
      </div>

      <DataTable
        aria-label={fr ? 'Opportunités' : 'Opportunities'}
        rows={rows}
        columns={columns}
        getRowId={(o) => o.id}
        rowHref={(o) => `/opportunities/${o.id}`}
        rowActions={(o) => linkActions(`/opportunities/${o.id}`, fr)}
        tableId="opportunities"
        loading={loading && !data}
        initialSort={{ id: 'updated', dir: 'desc' }}
        empty={
          <EmptyState
            icon={Target}
            title={(data ?? []).length === 0 ? (fr ? 'Aucune opportunité' : 'No opportunities') : fr ? 'Aucun résultat' : 'No results'}
            description={
              (data ?? []).length === 0
                ? fr
                  ? 'Les besoins clients deviennent ici des opportunités suivies jusqu’à la mission.'
                  : 'Client needs become opportunities tracked until the mission starts.'
                : fr
                  ? 'Modifiez les filtres pour élargir la recherche.'
                  : 'Change the filters to broaden the search.'
            }
          />
        }
      />

      {activeOrgId && (
        <OpportunityDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          organizationId={activeOrgId}
          onSaved={(o) => setData((list) => [o, ...(list ?? [])])}
        />
      )}
    </AppShell>
  );
}

