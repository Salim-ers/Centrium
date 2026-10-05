'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, Info } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartCard } from '@/components/charts/ChartCard';
import { CHART } from '@/components/charts/theme';
import { PrefacturationPanel } from '@/components/finance/PrefacturationPanel';
import { IntegrationsPanel } from '@/components/finance/IntegrationsPanel';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadFinance, type FinanceSummary } from '@/lib/pilotage/load-finance';
import { formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import { cn } from '@/lib/utils';

const RevenueMarginChart = dynamic(() => import('@/components/charts/RevenueMarginChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full" />,
});

type BreakdownRow = FinanceSummary['byClient'][number];

function BreakdownTable({
  title,
  rows,
  hrefBase,
  lang,
  showMargin,
}: {
  title: string;
  rows: BreakdownRow[];
  hrefBase: string;
  lang: 'fr' | 'en';
  showMargin: boolean;
}) {
  const fr = lang === 'fr';
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <ChartCard title={title} subtitle={fr ? '12 derniers mois · CRA validés' : 'Last 12 months · approved timesheets'}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune donnée sur la période.' : 'No data for the period.'}</p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">{fr ? 'Nom' : 'Name'}</th>
              <th className="pb-2 text-right font-medium">{fr ? 'CA' : 'Revenue'}</th>
              {showMargin && <th className="pb-2 text-right font-medium">{fr ? 'Marge' : 'Margin'}</th>}
              <th className="hidden pb-2 text-right font-medium sm:table-cell">{fr ? 'Part' : 'Share'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td className="max-w-0 py-2 pr-2">
                  <Link href={`${hrefBase}/${r.id}`} className="block truncate font-medium hover:text-primary-deep">
                    {r.label}
                  </Link>
                  {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                </td>
                <td className="num py-2 text-right">{formatEurCompact(r.revenue, lang)}</td>
                {showMargin && (
                  <td className={cn('num py-2 text-right', r.marginPct != null && r.marginPct < 15 ? 'text-warning' : '')}>
                    {r.marginPct != null ? formatPct(r.marginPct, lang) : <span className="text-muted-foreground">—</span>}
                  </td>
                )}
                <td className="num hidden py-2 text-right text-muted-foreground sm:table-cell">{total ? formatPct((r.revenue / total) * 100, lang, 0) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ChartCard>
  );
}

export default function FinancePage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const withCosts = can('consultants.financials');
  const [tab, setTab] = useState(params.get('tab') ?? 'overview');

  const { data, loading } = useCachedQuery<FinanceSummary>(
    `finance:${activeOrgId ?? 'none'}:${withCosts ? 'c' : 'n'}`,
    () => loadFinance(createClient(), activeOrgId!, withCosts),
    { enabled: !!activeOrgId && ready },
  );
  const k = data?.kpis;
  const isLoading = loading && !data;
  const year = new Date().getFullYear();

  const forecastNext = useMemo(() => (data?.series ?? []).filter((p) => p.realized === null && p.forecast !== null), [data]);

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Opérations' : 'Operations'}
        title={fr ? 'Finance & préfacturation' : 'Finance & pre-invoicing'}
        description={
          fr
            ? 'Pilotage du chiffre d’affaires et des marges, préparation des éléments facturables. Votre comptabilité reste dans votre outil comptable.'
            : 'Revenue and margin monitoring, billable items preparation. Your accounting stays in your accounting tool.'
        }
        actions={
          can('finance.view') && (
            <Button asChild variant="secondary">
              <a href={`/api/accounting/export?year=${year}&party=client`}>
                <Download />
                {fr ? `Journal des ventes ${year}` : `${year} sales journal`}
              </a>
            </Button>
          )
        }
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="underline">
            <TabsTrigger value="overview">{fr ? 'Pilotage' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="prefacturation">
              {fr ? 'Préfacturation' : 'Pre-invoicing'}
              {k && k.draftCount > 0 && <span className="num rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{k.draftCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="integrations">{fr ? 'Intégrations' : 'Integrations'}</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>
      <RelatedLinks
        links={[
          { href: '/invoices', label: { fr: 'Factures', en: 'Invoices' }, permission: 'finance.view' },
          { href: '/accounting', label: { fr: 'Journal comptable', en: 'Accounting journal' }, permission: 'finance.view' },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="overview" className="mt-0 space-y-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard accent="terra" label={fr ? 'CA signé' : 'Booked revenue'} valueText={k ? formatEurCompact(k.booked, lang) : undefined} hint={fr ? 'Carnet des missions en cours' : 'Active missions backlog'} loading={isLoading} />
            <KPICard label={fr ? `CA réalisé ${year}` : `Actual revenue ${year}`} valueText={k ? formatEurCompact(k.realizedYtd, lang) : undefined} hint={k ? `${fr ? '12 mois' : '12 months'} : ${formatEurCompact(k.realized12m, lang)}` : undefined} loading={isLoading} />
            <KPICard label={fr ? 'CA prévisionnel · 3 mois' : 'Forecast · 3 months'} valueText={k ? formatEurCompact(k.forecast3m, lang) : undefined} hint={fr ? 'Missions actives, jours ouvrés' : 'Active missions, business days'} loading={isLoading} />
            {withCosts ? (
              <KPICard
                label={fr ? 'Marge brute · 12 mois' : 'Gross margin · 12 months'}
                valueText={k?.margin12m != null ? formatEurCompact(k.margin12m, lang) : '—'}
                hint={
                  k
                    ? k.margin12m != null
                      ? `${formatPct(k.marginPct12m, lang)} · ${fr ? `${k.marginCoverage} % du CA chiffré` : `${k.marginCoverage}% of revenue costed`}`
                      : fr ? 'Renseignez les CJM' : 'Add daily costs'
                    : undefined
                }
                tone="emerald"
                loading={isLoading}
              />
            ) : (
              <KPICard label={fr ? 'Encaissé · 12 mois' : 'Collected · 12 months'} valueText={k ? formatEurCompact(k.paid12m, lang) : undefined} loading={isLoading} />
            )}
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard accent="peach" label={fr ? 'Préfactures à contrôler' : 'Pre-invoices to review'} valueText={k ? formatEurCompact(k.draftAmount, lang) : undefined} hint={k ? `${k.draftCount} ${fr ? 'préfacture(s)' : 'pre-invoice(s)'}` : undefined} href="/finance?tab=prefacturation" tone={k && k.draftCount > 0 ? 'amber' : 'neutral'} loading={isLoading} />
            <KPICard label={fr ? 'À exporter' : 'To export'} valueText={k ? formatEurCompact(k.toExportAmount, lang) : undefined} hint={k ? `${k.toExportCount} ${fr ? 'validée(s)' : 'approved'}` : undefined} loading={isLoading} />
            <KPICard accent="soft" label={fr ? 'À encaisser' : 'Receivables'} valueText={k ? formatEurCompact(k.receivable, lang) : undefined} hint={k && k.overdue > 0 ? `${formatEurCompact(k.overdue, lang)} ${fr ? 'en retard' : 'overdue'}` : fr ? 'Factures émises' : 'Issued invoices'} tone={k && k.overdue > 0 ? 'rose' : 'neutral'} loading={isLoading} />
            <KPICard
              label={fr ? 'Coût de l’intercontrat · mois' : 'Bench cost · month'}
              valueText={k?.benchCostMonth != null ? formatEurCompact(k.benchCostMonth, lang) : '—'}
              hint={
                k
                  ? k.benchCostMonth != null
                    ? fr
                      ? `Estimation : ${k.benchCovered}/${k.benchCount} consultant(s) avec CJM`
                      : `Estimate: ${k.benchCovered}/${k.benchCount} consultant(s) with cost`
                    : fr
                      ? `${k.benchCount} en intercontrat · CJM requis`
                      : `${k.benchCount} on bench · cost required`
                  : undefined
              }
              loading={isLoading}
            />
          </section>

          <ChartCard
            title={fr ? 'CA et marge mensuels' : 'Monthly revenue and margin'}
            subtitle={fr ? '12 derniers mois réalisés et 6 mois de prévision' : 'Last 12 months actual and 6 months forecast'}
            legend={[
              { label: fr ? 'Réalisé' : 'Actual', color: CHART.primary },
              { label: fr ? 'Prévisionnel' : 'Forecast', color: CHART.primarySoft },
              ...(withCosts ? [{ label: fr ? 'Marge' : 'Margin', color: CHART.deep }] : []),
            ]}
            footer={
              forecastNext.length > 0 ? (
                <span>
                  {fr ? 'Prévision des prochains mois' : 'Next months forecast'} :{' '}
                  {forecastNext.slice(0, 3).map((p, i) => (
                    <span key={p.key} className="num">
                      {i > 0 && ' · '}
                      {new Date(p.year, p.month - 1, 1).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { month: 'short' })} {formatEurCompact(p.forecast, lang)}
                    </span>
                  ))}
                </span>
              ) : undefined
            }
          >
            {data ? <RevenueMarginChart data={data.series} lang={lang} showMargin={withCosts} height={280} /> : <Skeleton className="h-[280px] w-full" />}
          </ChartCard>

          {data && (
            <div className="tile-surface p-4 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="font-medium">{fr ? 'Concentration du CA' : 'Revenue concentration'}</span>
                <span>
                  {fr ? 'Premier client' : 'Top client'}
                  {data.concentration.top1Name ? ` (${data.concentration.top1Name})` : ''} :{' '}
                  <span className={cn('num font-semibold', (data.concentration.top1 ?? 0) > 40 && 'text-warning')}>{formatPct(data.concentration.top1, lang)}</span>
                </span>
                <span>
                  {fr ? '3 premiers clients' : 'Top 3 clients'} : <span className="num font-semibold">{formatPct(data.concentration.top3, lang)}</span>
                </span>
                {(data.concentration.top1 ?? 0) > 40 && (
                  <span className="inline-flex items-center gap-1 text-xs text-warning">
                    <Info className="h-3.5 w-3.5" />
                    {fr ? 'Dépendance élevée à un client' : 'High dependency on one client'}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownTable title={fr ? 'Par client' : 'By client'} rows={data?.byClient ?? []} hrefBase="/clients" lang={lang} showMargin={withCosts} />
            <BreakdownTable title={fr ? 'Par consultant' : 'By consultant'} rows={data?.byConsultant ?? []} hrefBase="/consultants" lang={lang} showMargin={withCosts} />
            <BreakdownTable title={fr ? 'Par mission' : 'By mission'} rows={data?.byMission ?? []} hrefBase="/missions" lang={lang} showMargin={withCosts} />
          </div>
          {!withCosts && (
            <p className="text-xs text-muted-foreground">
              {fr ? 'Les marges ne sont visibles qu’avec la permission « Voir TJM, CJM et marges ».' : 'Margins require the “View rates, costs and margins” permission.'}
            </p>
          )}
          {k && (
            <p className="text-xs text-muted-foreground">
              {fr
                ? `Montants HT. CA réalisé = jours validés × TJM. ${formatEur(k.paid12m, lang)} encaissés sur 12 mois d’après les statuts saisis.`
                : `Amounts excl. VAT. Actual revenue = approved days × day rate. ${formatEur(k.paid12m, lang)} collected over 12 months based on recorded statuses.`}
            </p>
          )}
        </TabsContent>

        <TabsContent value="prefacturation" className="mt-0">
          <PrefacturationPanel lang={lang} canEdit={can('finance.edit')} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-0">
          <IntegrationsPanel lang={lang} canManage={can('settings.manage')} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
