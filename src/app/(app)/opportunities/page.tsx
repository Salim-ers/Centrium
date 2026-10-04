'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Target } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { CrmTabs } from '@/components/crm/CrmTabs';
import { CrmToolbar } from '@/components/crm/CrmToolbar';
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { OPEN_STAGES, PIPELINE_STAGES, stageLabel, stageOf, stageTone } from '@/lib/crm/pipeline';
import { followUpState, pipelineSentence, summarizePipeline } from '@/lib/crm/summary';
import { isOpenOpportunity, opportunityAmount } from '@/lib/pilotage/metrics';
import { formatDate, formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/types';

/**
 * CRM — liste des opportunités : même onglet que le tableau, triable, avec
 * un filtre d'étape qui inclut les issues (gagnées, perdues, en veille).
 */
export default function OpportunitiesPage() {
  const params = useSearchParams();
  const { activeOrgId, user } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('crm.edit') || can('opportunities.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: members, options: memberOptions } = useTeamMembers();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<string>(params.get('stage') ?? 'open');
  const [owner, setOwner] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(params.get('new') === '1');
  const today = new Date().toISOString().slice(0, 10);

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

  const byOwner = useMemo(
    () =>
      (data ?? []).filter((o) => {
        if (owner === 'mine') return o.owner_id === user?.id;
        return owner === 'all' || o.owner_id === owner;
      }),
    [data, owner, user?.id],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byOwner.filter((o) => {
      if (stage === 'open' && !isOpenOpportunity(o)) return false;
      if (stage === 'on_hold' && o.status !== 'on_hold') return false;
      if (stage !== 'open' && stage !== 'all' && stage !== 'on_hold' && stageOf(o.status) !== stage) return false;
      if (!q) return true;
      const client = o.company_id ? (companies.get(o.company_id)?.name ?? '') : '';
      return `${o.title} ${client} ${(o.required_skills ?? []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [byOwner, query, stage, companies]);

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
      id: 'next',
      header: fr ? 'Prochaine relance' : 'Next follow-up',
      mobile: 'meta',
      sortValue: (o) => o.next_follow_up ?? '9999',
      cell: (o) => {
        const state = followUpState(o.next_follow_up, today);
        if (!state) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn('text-[13px]', state === 'late' ? 'font-medium text-destructive' : state === 'today' ? 'font-medium text-warning' : 'text-muted-foreground')}>
            {state === 'late' ? (fr ? 'En retard' : 'Overdue') : state === 'today' ? (fr ? 'Aujourd’hui' : 'Today') : formatDate(o.next_follow_up, lang, 'short')}
            {o.next_action ? ` · ${o.next_action}` : ''}
          </span>
        );
      },
    },
    {
      id: 'owner',
      header: fr ? 'Responsable' : 'Owner',
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
    <AppShell wide>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title="CRM"
        description={pipelineSentence(summarizePipeline(byOwner, today), lang)}
        actions={
          canEdit && (
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus />
              {fr ? 'Nouvelle opportunité' : 'New opportunity'}
            </Button>
          )
        }
      >
        <CrmTabs />
      </PageHeader>

      <CrmToolbar lang={lang} view="list" query={query} onQuery={setQuery} owner={owner} onOwner={setOwner} members={memberOptions}>
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="sm:w-44" aria-label={fr ? 'Étape' : 'Stage'}>
          <option value="open">{fr ? 'En cours' : 'Open'}</option>
          {OPEN_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label[lang]}
            </option>
          ))}
          <option value="won">{fr ? 'Gagnées' : 'Won'}</option>
          <option value="lost">{fr ? 'Perdues' : 'Lost'}</option>
          <option value="on_hold">{fr ? 'En veille' : 'On hold'}</option>
          <option value="all">{fr ? 'Toutes' : 'All'}</option>
        </Select>
      </CrmToolbar>

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

      <div className="mt-8">
        <RelatedLinks
          links={[
            { href: '/offers', label: { fr: 'Fiches de poste', en: 'Job descriptions' }, permission: 'opportunities.view' },
            { href: '/responses', label: { fr: 'Réponses aux appels d’offres', en: 'Tender responses' }, permission: 'opportunities.view' },
          ]}
        />
      </div>

      {activeOrgId && (
        <OpportunityDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          organizationId={activeOrgId}
          defaults={{ owner_id: user?.id ?? null }}
          onSaved={(o) => setData((list) => [o, ...(list ?? [])])}
        />
      )}
    </AppShell>
  );
}
