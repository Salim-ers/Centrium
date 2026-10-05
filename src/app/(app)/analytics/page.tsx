'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { ChartCard } from '@/components/charts/ChartCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadAnalytics, type AnalyticsSummary } from '@/lib/pilotage/load-analytics';
import { formatDate, formatEurCompact, formatPct } from '@/lib/format';
import { periodLabel } from '@/lib/status';
import { cn } from '@/lib/utils';

const chartFallback = <Skeleton className="h-[220px] w-full" />;
const OccupancyChart = dynamic(() => import('@/components/charts/OccupancyChart'), { ssr: false, loading: () => chartFallback });

const SOURCE_LABEL: Record<string, { fr: string; en: string }> = {
  manual: { fr: 'Saisie équipe', en: 'Team entry' },
  client_portal: { fr: 'Portail client', en: 'Client portal' },
  import: { fr: 'Import', en: 'Import' },
};

/** Barres horizontales simples (valeurs réelles, pas de graphique décoratif). */
function Bars({ rows, format }: { rows: Array<{ label: React.ReactNode; value: number; href?: string }>; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} className="text-[13px]">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            {r.href ? (
              <Link href={r.href} className="truncate hover:text-primary-deep">
                {r.label}
              </Link>
            ) : (
              <span className="truncate">{r.label}</span>
            )}
            <span className="num shrink-0 text-muted-foreground">{format(r.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary/80" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const allowed = can('analytics.view');

  const { data, loading } = useCachedQuery<AnalyticsSummary>(`analytics:${activeOrgId ?? 'none'}`, () => loadAnalytics(createClient(), activeOrgId!), {
    enabled: !!activeOrgId && ready && allowed,
  });
  const isLoading = loading && !data;

  if (ready && !allowed) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne donne pas accès aux analytics.' : 'Your role has no access to analytics.'} />
      </AppShell>
    );
  }

  const q = data?.quotes;
  const punctual = (data?.punctuality ?? []).filter((p) => p.rate != null);
  const lastPunctuality = punctual[punctual.length - 1];

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Analyse' : 'Analysis'}
        title="Analytics"
        description={
          data
            ? fr
              ? `12 mois glissants, depuis le ${formatDate(data.period.since, lang)}. Chaque indicateur est calculé à partir de vos données.`
              : `Rolling 12 months since ${formatDate(data.period.since, lang)}. Every metric is computed from your data.`
            : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard accent="terra"
          label={fr ? 'Taux de transformation' : 'Win rate'}
          valueText={data?.commercial.win.rate != null ? formatPct(data.commercial.win.rate, lang, 0) : '—'}
          hint={data ? (fr ? `${data.commercial.win.won} gagnées · ${data.commercial.win.lost} perdues` : `${data.commercial.win.won} won · ${data.commercial.win.lost} lost`) : undefined}
          loading={isLoading}
        />
        <KPICard label={fr ? 'Opportunités créées' : 'Opportunities created'} value={data?.commercial.created ?? 0} loading={isLoading} />
        <KPICard accent="soft"
          label={fr ? 'Acceptation des devis' : 'Quote acceptance'}
          valueText={q?.acceptanceRate != null ? formatPct(q.acceptanceRate, lang, 0) : '—'}
          hint={q ? (fr ? `${q.sent} envoyés · ${q.pending} en attente` : `${q.sent} sent · ${q.pending} pending`) : undefined}
          loading={isLoading}
        />
        <KPICard
          label={fr ? 'CRA à l’heure' : 'On-time timesheets'}
          valueText={lastPunctuality?.rate != null ? formatPct(lastPunctuality.rate, lang, 0) : '—'}
          hint={lastPunctuality ? (fr ? `${periodLabel(lastPunctuality.month, lastPunctuality.year, lang)} · soumis avant le 5` : `${periodLabel(lastPunctuality.month, lastPunctuality.year, lang)} · by the 5th`) : undefined}
          loading={isLoading}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <ChartCard className="lg:col-span-8" title={fr ? 'Occupation des consultants' : 'Consultant utilisation'} subtitle={fr ? 'Fin de mois, 12 mois · consultants en intercontrat' : 'Month end, 12 months · consultants on the bench'}>
          {data ? <OccupancyChart data={data.occupancy} lang={lang} /> : chartFallback}
        </ChartCard>

        <ChartCard className="lg:col-span-4" title={fr ? 'Origine des opportunités' : 'Opportunity sources'} subtitle={fr ? 'Créées sur 12 mois' : 'Created over 12 months'}>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !data?.commercial.sources.length ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune opportunité créée sur la période.' : 'No opportunity created in the period.'}</p>
          ) : (
            <Bars rows={data.commercial.sources.map((s) => ({ label: SOURCE_LABEL[s.source]?.[lang] ?? s.source, value: s.count }))} format={(n) => String(n)} />
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-6" title={fr ? 'Chiffre d’affaires par consultant' : 'Revenue by consultant'} subtitle={fr ? 'CRA validés × TJM, top 10' : 'Approved timesheets × day rate, top 10'}>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.topConsultants.length ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun CRA validé sur la période.' : 'No approved timesheet in the period.'}</p>
          ) : (
            <Bars rows={data.topConsultants.map((c) => ({ label: c.name, value: c.revenue, href: `/consultants/${c.id}` }))} format={(n) => formatEurCompact(n, lang)} />
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-6" title={fr ? 'Motifs de perte' : 'Loss reasons'} subtitle={fr ? 'Opportunités perdues sur 12 mois' : 'Lost opportunities, 12 months'}>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.commercial.lostReasons.length ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune opportunité perdue sur la période.' : 'No lost opportunity in the period.'}</p>
          ) : (
            <Bars rows={data.commercial.lostReasons.map((r) => ({ label: r.reason || (fr ? 'Motif non renseigné' : 'No reason given'), value: r.count }))} format={(n) => String(n)} />
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-7" title={fr ? 'Ponctualité des CRA' : 'Timesheet punctuality'} subtitle={fr ? 'Part des CRA soumis au plus tard le 5 du mois suivant' : 'Share submitted by the 5th of the following month'}>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !punctual.length ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Pas encore assez de CRA pour mesurer.' : 'Not enough timesheets yet.'}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {data!.punctuality.map((p) => (
                <div key={p.key} className="rounded-lg border border-border p-2.5 text-center">
                  <div className="text-[11px] capitalize text-muted-foreground">{periodLabel(p.month, p.year, lang)}</div>
                  <div className={cn('num mt-1 text-[17px] font-semibold', p.rate != null && p.rate < 70 ? 'text-warning' : '')}>{p.rate != null ? formatPct(p.rate, lang, 0) : '—'}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.onTime}/{p.total}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-5" title={fr ? 'Devis' : 'Quotes'} subtitle={fr ? 'Envoyés sur 12 mois' : 'Sent over 12 months'}>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !q ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Module devis indisponible.' : 'Quotes module unavailable.'}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-muted-foreground">{fr ? 'Acceptés' : 'Accepted'}</dt>
                <dd className="num text-[17px] font-semibold">
                  {q.accepted} <span className="text-[13px] font-normal text-muted-foreground">· {formatEurCompact(q.acceptedAmount, lang)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{fr ? 'Refusés' : 'Declined'}</dt>
                <dd className="num text-[17px] font-semibold">{q.declined}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{fr ? 'En attente' : 'Pending'}</dt>
                <dd className="num text-[17px] font-semibold">{q.pending}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{fr ? 'Délai médian de réponse' : 'Median response time'}</dt>
                <dd className="num text-[17px] font-semibold">{q.medianDaysToDecision != null ? `${q.medianDaysToDecision} ${fr ? 'j' : 'd'}` : '—'}</dd>
              </div>
            </dl>
          )}
        </ChartCard>
      </div>
    </AppShell>
  );
}
