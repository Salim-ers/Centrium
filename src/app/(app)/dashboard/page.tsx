'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Gauge,
  Layers,
  PiggyBank,
  RefreshCw,
  Target,
  TrendingUp,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { ChartCard } from '@/components/charts/ChartCard';
import { CHART } from '@/components/charts/theme';
import { TodayActions } from '@/components/dashboard/TodayActions';
import { SetupChecklist } from '@/components/dashboard/SetupChecklist';
import { EmptyState } from '@/components/app/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { loadDashboard, type DashboardSummary } from '@/lib/pilotage/load-dashboard';
import { formatDate, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

const chartFallback = <Skeleton className="h-[240px] w-full" />;
const RevenueMarginChart = dynamic(() => import('@/components/charts/RevenueMarginChart'), {
  ssr: false,
  loading: () => chartFallback,
});
const OccupancyChart = dynamic(() => import('@/components/charts/OccupancyChart'), {
  ssr: false,
  loading: () => chartFallback,
});
const ClientShareChart = dynamic(() => import('@/components/charts/ClientShareChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});
const PipelineStagesChart = dynamic(() => import('@/components/charts/PipelineStagesChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

export default function DashboardPage() {
  const { activeOrgId, user, branding, memberships } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const supabase = useMemo(() => createClient(), []);

  const { data, loading, refreshing, reload } = useCachedQuery<DashboardSummary>(
    `dashboard-v2:${activeOrgId ?? 'none'}`,
    () => loadDashboard(supabase, activeOrgId!, can),
    { enabled: !!activeOrgId && ready },
  );

  useRealtimeReload(['missions', 'timesheets', 'opportunities', 'consultants', 'invoices'], () => void reload(), {
    debounceMs: 1500,
    enabled: !!activeOrgId,
  });

  const showRevenue = can('finance.view') || can('analytics.view');
  const showMargin = can('consultants.financials');
  const k = data?.kpis;
  const isLoading = loading && !data;
  const orgName = branding?.brandName ?? memberships.find((m) => m.id === activeOrgId)?.name ?? '';
  const today = new Date();
  const hour = today.getHours();
  const greeting = fr ? (hour < 18 ? 'Bonjour' : 'Bonsoir') : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const nothingYet =
    !!k && k.activeConsultants === 0 && k.openOpportunities === 0 && (data?.series ?? []).every((p) => !p.forecast && !p.realized);

  return (
    <AppShell wide>
      <div className="mx-auto w-full max-w-[1440px]">
        <PageHeader
          title={`${greeting}${user?.firstName ? `, ${user.firstName}` : ''}`}
          description={`${orgName ? `${orgName} · ` : ''}${formatDate(today.toISOString().slice(0, 10), lang, 'long')}`}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void reload()}
              disabled={refreshing}
              aria-label={fr ? 'Actualiser les indicateurs' : 'Refresh metrics'}
            >
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">{fr ? 'Actualiser' : 'Refresh'}</span>
            </Button>
          }
        />

        <SetupChecklist />

        {/* Indicateurs clés : lecture en quelques secondes */}
        <section aria-label={fr ? 'Indicateurs clés' : 'Key metrics'} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {showRevenue && (
            <>
              <KPICard
                label={fr ? 'CA signé' : 'Booked revenue'}
                valueText={k ? formatEurCompact(k.bookedRevenue, lang) : undefined}
                icon={Wallet}
                tone="brand"
                hint={fr ? 'Carnet des missions en cours' : 'Backlog of active missions'}
                href="/finance"
                loading={isLoading}
              />
              <KPICard
                label={fr ? 'CA prévisionnel du mois' : 'Forecast this month'}
                valueText={k ? formatEurCompact(k.forecastMonth, lang) : undefined}
                icon={TrendingUp}
                tone="brand"
                hint={k ? `${fr ? 'Mois prochain' : 'Next month'} : ${formatEurCompact(k.forecastNextMonth, lang)}` : undefined}
                trend={data?.series.map((p) => p.realized ?? p.forecast ?? 0)}
                href="/finance"
                loading={isLoading}
              />
            </>
          )}
          {showMargin && (
            <KPICard
              label={fr ? 'Marge moyenne' : 'Average margin'}
              valueText={k ? formatPct(k.marginPct, lang) : undefined}
              icon={PiggyBank}
              tone="emerald"
              hint={
                k
                  ? k.marginCovered === 0
                    ? fr
                      ? 'Renseignez les CJM pour la calculer'
                      : 'Add daily costs to compute it'
                    : fr
                      ? `Sur ${k.marginCovered}/${k.marginTotal} missions chiffrées`
                      : `On ${k.marginCovered}/${k.marginTotal} costed missions`
                  : undefined
              }
              href="/analytics"
              loading={isLoading}
            />
          )}
          <KPICard
            label={fr ? "Taux d'occupation" : 'Utilisation'}
            valueText={k ? formatPct(k.occupancyRate, lang) : undefined}
            icon={Gauge}
            tone="neutral"
            hint={k ? (fr ? `${k.staffed} en mission sur ${k.capacity}` : `${k.staffed} staffed of ${k.capacity}`) : undefined}
            href="/staffing"
            loading={isLoading}
          />
          {can('opportunities.view') && (
            <KPICard
              label={fr ? 'Pipeline pondéré' : 'Weighted pipeline'}
              valueText={k ? formatEurCompact(k.weightedPipeline, lang) : undefined}
              icon={Layers}
              tone="neutral"
              hint={k ? (fr ? `${k.openOpportunities} opportunités ouvertes` : `${k.openOpportunities} open opportunities`) : undefined}
              href="/crm"
              loading={isLoading}
            />
          )}
          <KPICard
            label={fr ? 'Consultants actifs' : 'Active consultants'}
            value={k?.activeConsultants}
            icon={Users}
            tone="neutral"
            href="/consultants"
            loading={isLoading}
          />
          <KPICard
            label={fr ? 'Intercontrats' : 'On bench'}
            value={k?.bench}
            icon={UserMinus}
            tone={k && k.bench > 0 ? 'amber' : 'neutral'}
            hint={fr ? 'Disponibles sans mission' : 'Available, no mission'}
            href="/staffing?view=bench"
            loading={isLoading}
          />
          {can('opportunities.view') && (
            <KPICard
              label={fr ? 'Opportunités ouvertes' : 'Open opportunities'}
              value={k?.openOpportunities}
              icon={Target}
              tone="neutral"
              href="/opportunities"
              loading={isLoading}
            />
          )}
          {can('timesheets.view') && (
            <KPICard
              label={fr ? 'CRA en attente' : 'Pending timesheets'}
              value={k?.pendingTimesheets}
              icon={ClipboardCheck}
              tone={k && k.pendingTimesheets > 0 ? 'amber' : 'neutral'}
              hint={fr ? 'Soumis, à valider' : 'Submitted, to approve'}
              href="/timesheets?status=submitted"
              loading={isLoading}
            />
          )}
          <KPICard
            label={fr ? 'Missions à échéance' : 'Missions ending'}
            value={k?.missionsEnding30}
            icon={CalendarClock}
            tone={k && k.missionsEnding30 > 0 ? 'amber' : 'neutral'}
            hint={fr ? 'Dans les 30 jours' : 'Within 30 days'}
            href="/missions?ending=30"
            loading={isLoading}
          />
        </section>

        {nothingYet ? (
          <EmptyState
            className="mt-6"
            icon={Briefcase}
            title={fr ? 'Votre cockpit se remplira avec vos données' : 'Your cockpit fills up with your data'}
            description={
              fr
                ? 'Ajoutez vos consultants, vos clients et une première mission : CA, marge et occupation se calculent automatiquement.'
                : 'Add consultants, clients and a first mission: revenue, margin and utilisation are computed automatically.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/consultants?new=1">{fr ? 'Ajouter un consultant' : 'Add a consultant'}</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/clients?new=1">{fr ? 'Créer un client' : 'Create a client'}</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <TodayActions actions={data?.actions ?? []} lang={lang} loading={isLoading} />
              </div>
              <div className="lg:col-span-5">
                {showRevenue ? (
                  <ChartCard
                    title={fr ? 'Répartition du CA par client' : 'Revenue by client'}
                    subtitle={fr ? 'CRA validés, 12 derniers mois' : 'Approved timesheets, last 12 months'}
                    className="h-full"
                    footer={
                      data && data.topClients.length > 0 ? (
                        <>
                          {fr ? 'Premier client' : 'Top client'} :{' '}
                          <span className="num font-medium text-foreground">
                            {formatPct(
                              (data.topClients[0]!.revenue / data.topClients.reduce((s, c) => s + c.revenue, 0)) * 100,
                              lang,
                              0,
                            )}
                          </span>{' '}
                          {fr ? 'du CA' : 'of revenue'}
                        </>
                      ) : undefined
                    }
                  >
                    {isLoading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : data && data.topClients.length > 0 ? (
                      <ClientShareChart clients={data.topClients} lang={lang} />
                    ) : (
                      <EmptyState
                        size="compact"
                        title={fr ? 'Pas encore de CA réalisé' : 'No actual revenue yet'}
                        description={
                          fr
                            ? 'La répartition apparaît dès la validation des premiers CRA.'
                            : 'The breakdown appears once timesheets are approved.'
                        }
                      />
                    )}
                  </ChartCard>
                ) : (
                  <MissionsEndingCard data={data} lang={lang} loading={isLoading} />
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              {showRevenue && (
                <ChartCard
                  className="lg:col-span-8"
                  title={fr ? 'CA et marge mensuels' : 'Monthly revenue and margin'}
                  subtitle={
                    fr
                      ? 'Réalisé = CRA validés · Prévisionnel = missions actives (jours ouvrés)'
                      : 'Actual = approved timesheets · Forecast = active missions (business days)'
                  }
                  legend={[
                    { label: fr ? 'Réalisé' : 'Actual', color: CHART.primary },
                    { label: fr ? 'Prévisionnel' : 'Forecast', color: CHART.primarySoft },
                    ...(showMargin ? [{ label: fr ? 'Marge' : 'Margin', color: CHART.deep }] : []),
                  ]}
                >
                  {data ? <RevenueMarginChart data={data.series} lang={lang} showMargin={showMargin} /> : chartFallback}
                </ChartCard>
              )}
              {can('opportunities.view') && (
                <ChartCard
                  className={showRevenue ? 'lg:col-span-4' : 'lg:col-span-6'}
                  title={fr ? 'Pipeline commercial' : 'Sales pipeline'}
                  subtitle={fr ? 'Montant · pondéré par la probabilité' : 'Amount · weighted by probability'}
                >
                  {data ? <PipelineStagesChart stages={data.stages} lang={lang} /> : <Skeleton className="h-48 w-full" />}
                </ChartCard>
              )}
              <ChartCard
                className="lg:col-span-6"
                title={fr ? 'Occupation et intercontrat' : 'Utilisation and bench'}
                subtitle={fr ? 'Fin de mois, 6 derniers mois' : 'Month end, last 6 months'}
                legend={[
                  { label: fr ? "Taux d'occupation" : 'Utilisation', color: CHART.primary },
                  { label: fr ? 'Consultants en intercontrat' : 'Consultants on bench', color: CHART.sand },
                ]}
              >
                {data ? <OccupancyChart data={data.occupancy} lang={lang} /> : chartFallback}
              </ChartCard>
              {showRevenue && (
                <div className="lg:col-span-6">
                  <MissionsEndingCard data={data} lang={lang} loading={isLoading} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/** Missions actives par échéance : 15, 30, 60, 90 jours. */
function MissionsEndingCard({
  data,
  lang,
  loading,
}: {
  data: DashboardSummary | null;
  lang: 'fr' | 'en';
  loading: boolean;
}) {
  const fr = lang === 'fr';
  const b = data?.endingBuckets;
  const buckets: Array<{ days: 15 | 30 | 60 | 90; tone: string }> = [
    { days: 15, tone: 'text-destructive' },
    { days: 30, tone: 'text-warning' },
    { days: 60, tone: 'text-foreground' },
    { days: 90, tone: 'text-foreground' },
  ];
  return (
    <ChartCard
      className="h-full"
      title={fr ? 'Renouvellements à anticiper' : 'Renewals to plan'}
      subtitle={fr ? 'Missions actives par date de fin' : 'Active missions by end date'}
      actions={
        <Link href="/missions" className="text-xs font-medium text-primary hover:text-primary-deep">
          {fr ? 'Voir les missions' : 'View missions'}
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {buckets.map((x) => (
          <Link
            key={x.days}
            href={`/missions?ending=${x.days}`}
            className="rounded-lg border border-border p-3 transition-colors hover:border-sand-300 hover:bg-muted/40"
          >
            <div className="text-xs text-muted-foreground">
              {fr ? `≤ ${x.days} jours` : `≤ ${x.days} days`}
            </div>
            <div className={cn('num mt-1 font-display text-2xl font-semibold', x.tone)}>
              {loading || !b ? <span className="skeleton inline-block h-7 w-8" /> : b[x.days]}
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {fr
          ? 'Chaque tranche est exclusive : une mission à 10 jours n’apparaît que dans « ≤ 15 jours ».'
          : 'Buckets are exclusive: a mission ending in 10 days only counts in “≤ 15 days”.'}
      </p>
    </ChartCard>
  );
}
