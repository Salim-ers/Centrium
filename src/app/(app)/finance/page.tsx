'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Banknote, CalendarRange, FileClock, Gauge, Info, PieChart, TrendingDown, UserMinus, Wallet } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip, type StatItem } from '@/components/app/StatStrip';
import { Segmented } from '@/components/app/Segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART } from '@/components/charts/theme';
import { PrefacturationPanel } from '@/components/finance/PrefacturationPanel';
import { ExportPanel } from '@/components/finance/ExportPanel';
import { SectionTabs } from '@/components/layout/SectionTabs';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadFinance, type FinanceSummary } from '@/lib/pilotage/load-finance';
import { formatEur, formatEurCompact, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

const RevenueMarginChart = dynamic(() => import('@/components/charts/RevenueMarginChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[200px] w-full" />,
});

type View = 'overview' | 'prefacturation' | 'export';
type Breakdown = 'clients' | 'consultants' | 'missions';

/**
 * Pilotage financier, un écran : quatre indicateurs, le grand graphique
 * CA / marge, les signaux à droite (concentration, intercontrat, marges
 * sous l'objectif, encours) et un tableau commutable clients / consultants
 * / missions. Préfacturation et export dans leurs vues. Centrium pilote ;
 * la comptabilité et l'émission des factures restent dans l'outil comptable.
 */
export default function FinancePage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const withCosts = can('consultants.financials');
  const viewParam = params.get('view') ?? params.get('tab');
  const [view, setView] = useState<View>(viewParam === 'prefacturation' ? 'prefacturation' : viewParam === 'export' || viewParam === 'integrations' ? 'export' : 'overview');
  const [breakdown, setBreakdown] = useState<Breakdown>('clients');
  useEffect(() => {
    if (viewParam === 'prefacturation') setView('prefacturation');
    else if (viewParam === 'export' || viewParam === 'integrations') setView('export');
  }, [viewParam]);

  const { data, loading } = useCachedQuery<FinanceSummary>(
    `finance:${activeOrgId ?? 'none'}:${withCosts ? 'c' : 'n'}`,
    () => loadFinance(createClient(), activeOrgId!, withCosts),
    { enabled: !!activeOrgId && ready },
  );
  const k = data?.kpis;
  const year = new Date().getFullYear();
  const dash = '…';

  const toTreat = k ? k.toReviewCount + k.toExportCount : 0;
  const kpis: StatItem[] = [
    {
      label: k ? (fr ? `CA réalisé · 12 mois · ${formatEurCompact(k.realizedYtd, lang)} en ${year}` : `actual revenue · 12 months · ${formatEurCompact(k.realizedYtd, lang)} in ${year}`) : fr ? 'CA réalisé · 12 mois' : 'actual revenue · 12 months',
      value: k ? formatEurCompact(k.realized12m, lang) : dash,
      tone: 'terra',
      icon: Banknote,
      title: fr ? 'Jours validés × TJM, montants HT' : 'Approved days × day rate, excl. VAT',
    },
    {
      label: fr ? 'CA prévisionnel · 3 prochains mois' : 'forecast · next 3 months',
      value: k ? formatEurCompact(k.forecast3m, lang) : dash,
      tone: 'peach',
      icon: CalendarRange,
      title: fr ? 'Missions actives × jours ouvrés × TJM' : 'Active missions × business days × rate',
    },
    withCosts
      ? {
          label: k?.margin12m != null ? (fr ? `marge brute · ${formatEurCompact(k.margin12m, lang)} sur 12 mois` : `gross margin · ${formatEurCompact(k.margin12m, lang)} over 12 months`) : fr ? 'marge brute · renseignez les CJM' : 'gross margin · add daily costs',
          value: k ? formatPct(k.marginPct12m, lang) : dash,
          tone: 'ivory',
          icon: Gauge,
          title: k ? (fr ? `${k.marginCoverage} % du CA est chiffré (CJM connus)` : `${k.marginCoverage}% of revenue is costed`) : undefined,
        }
      : {
          label: fr ? 'carnet signé · missions en cours' : 'booked · active missions',
          value: k ? formatEurCompact(k.booked, lang) : dash,
          tone: 'ivory',
          icon: Wallet,
        },
    {
      label: k ? (fr ? `préfacturation à traiter · ${formatEurCompact(k.toReviewAmount + k.toExportAmount, lang)}` : `pre-invoicing to handle · ${formatEurCompact(k.toReviewAmount + k.toExportAmount, lang)}`) : fr ? 'préfacturation à traiter' : 'pre-invoicing to handle',
      value: k ? toTreat : dash,
      tone: 'white',
      icon: FileClock,
      href: '/finance?view=prefacturation',
    },
  ];

  const rows = useMemo(() => (breakdown === 'clients' ? data?.byClient : breakdown === 'consultants' ? data?.byConsultant : data?.byMission) ?? [], [data, breakdown]);
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const hrefBase = breakdown === 'clients' ? '/clients' : breakdown === 'consultants' ? '/consultants' : '/missions';

  return (
    <AppShell fill>
      <PageHeader
        title={fr ? 'Pilotage financier' : 'Financial overview'}
        description={fr ? 'Centrium pilote, votre outil comptable facture.' : 'Centrium steers, your accounting tool invoices.'}
        tabs={<SectionTabs section="operations" />}
        actions={
          <Segmented<View>
            label={fr ? 'Vue' : 'View'}
            value={view}
            onChange={setView}
            options={[
              { value: 'overview', label: fr ? 'Vue d’ensemble' : 'Overview' },
              { value: 'prefacturation', label: fr ? 'Préfacturation' : 'Pre-invoicing', count: k ? toTreat : undefined },
              { value: 'export', label: 'Export' },
            ]}
          />
        }
      />

      <StatStrip className="mb-3" items={kpis} />

      {view === 'prefacturation' && <PrefacturationPanel lang={lang} canEdit={can('finance.edit')} />}
      {view === 'export' && <ExportPanel lang={lang} canEdit={can('finance.edit')} canManage={can('settings.manage')} />}

      {view === 'overview' && (
        <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex flex-col gap-3 lg:min-h-0">
            <section className="tile-surface flex min-h-[300px] flex-col p-4 lg:min-h-0 lg:flex-[3]">
              <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">{fr ? 'CA et marge mensuels' : 'Monthly revenue and margin'}</h2>
                  <p className="text-xs text-muted-foreground">{fr ? '12 mois réalisés (CRA validés) et 6 mois de prévision · HT' : '12 months actual (approved timesheets) and 6 months forecast · excl. VAT'}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
                  {[
                    { label: fr ? 'Réalisé' : 'Actual', color: CHART.primary },
                    { label: fr ? 'Prévisionnel' : 'Forecast', color: CHART.primarySoft },
                    ...(withCosts ? [{ label: fr ? 'Marge' : 'Margin', color: CHART.deep }] : []),
                  ].map((l) => (
                    <span key={l.label} className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1">{data ? <RevenueMarginChart data={data.series} lang={lang} showMargin={withCosts} height={200} fill /> : <Skeleton className="h-full min-h-[200px] w-full" />}</div>
            </section>

            <section className="tile-surface flex min-h-[260px] flex-col overflow-hidden lg:min-h-0 lg:flex-[2]">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <h2 className="font-display text-[15px] font-semibold">{fr ? 'Répartition · 12 mois' : 'Breakdown · 12 months'}</h2>
                <Segmented<Breakdown>
                  label={fr ? 'Répartition' : 'Breakdown'}
                  value={breakdown}
                  onChange={setBreakdown}
                  options={[
                    { value: 'clients', label: fr ? 'Clients' : 'Clients' },
                    { value: 'consultants', label: 'Consultants' },
                    { value: 'missions', label: 'Missions' },
                  ]}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && !data ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                    {fr ? 'Aucun CRA validé sur les 12 derniers mois.' : 'No approved timesheet over the last 12 months.'}
                  </p>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 z-[1] bg-card/95 backdrop-blur">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">{fr ? 'Nom' : 'Name'}</th>
                        <th className="px-2 py-2 text-right font-medium">{fr ? 'Jours' : 'Days'}</th>
                        <th className="px-2 py-2 text-right font-medium">{fr ? 'CA' : 'Revenue'}</th>
                        {withCosts && <th className="px-2 py-2 text-right font-medium">{fr ? 'Marge' : 'Margin'}</th>}
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">{fr ? 'Part du CA' : 'Share'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r) => {
                        const share = total ? (r.revenue / total) * 100 : 0;
                        return (
                          <tr key={r.id} className="hover:bg-app-peach-light/40">
                            <td className="max-w-0 px-4 py-2">
                              <Link href={`${hrefBase}/${r.id}`} className="block truncate font-medium hover:text-app-terra-dark">
                                {r.label}
                              </Link>
                              {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                            </td>
                            <td className="num px-2 py-2 text-right text-muted-foreground">{Math.round(r.days)}</td>
                            <td className="num px-2 py-2 text-right font-medium">{formatEurCompact(r.revenue, lang)}</td>
                            {withCosts && (
                              <td className={cn('num px-2 py-2 text-right', r.marginPct != null && r.marginPct < 15 ? 'text-warning' : '')}>
                                {r.marginPct != null ? formatPct(r.marginPct, lang) : <span className="text-muted-foreground">—</span>}
                              </td>
                            )}
                            <td className="hidden w-40 px-4 py-2 sm:table-cell">
                              <span className="flex items-center gap-2">
                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-sand">
                                  <span className="block h-full rounded-full bg-app-terra" style={{ width: `${Math.max(2, share)}%` }} />
                                </span>
                                <span className="num w-10 text-right text-xs text-muted-foreground">{formatPct(share, lang, 0)}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          <aside className="no-scrollbar flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
            <Signal icon={PieChart} title={fr ? 'Concentration du CA' : 'Revenue concentration'} tone={(data?.concentration.top1 ?? 0) > 40 ? 'warn' : 'calm'}>
              {data?.concentration.top1 != null ? (
                <>
                  <p className="text-[13px]">
                    {fr ? (
                      <>
                        <strong className="font-semibold">{data.concentration.top1Name}</strong> représente <strong className="num font-semibold">{formatPct(data.concentration.top1, lang)}</strong> du CA.
                      </>
                    ) : (
                      <>
                        <strong className="font-semibold">{data.concentration.top1Name}</strong> accounts for <strong className="num font-semibold">{formatPct(data.concentration.top1, lang)}</strong> of revenue.
                      </>
                    )}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-sand">
                    <span className="block h-full rounded-full bg-app-terra" style={{ width: `${data.concentration.top1}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {fr ? `3 premiers clients : ${formatPct(data.concentration.top3, lang)} · indicateur de pilotage` : `Top 3 clients: ${formatPct(data.concentration.top3, lang)} · steering indicator`}
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">{fr ? 'Pas encore de CA réalisé.' : 'No actual revenue yet.'}</p>
              )}
            </Signal>

            <Signal icon={UserMinus} title={fr ? 'Coût de l’intercontrat · ce mois' : 'Bench cost · this month'} tone={k && k.benchCount > 0 ? 'warn' : 'calm'} href="/staffing?view=bench" cta={fr ? 'Voir le staffing' : 'Open staffing'}>
              <p className="num text-[20px] font-semibold leading-tight">{k?.benchCostMonth != null ? formatEurCompact(k.benchCostMonth, lang) : '—'}</p>
              <p className="text-xs text-muted-foreground">
                {k
                  ? k.benchCostMonth != null
                    ? fr
                      ? `${k.benchCount} en intercontrat · estimation sur ${k.benchCovered} CJM connu${k.benchCovered > 1 ? 's' : ''}`
                      : `${k.benchCount} on bench · estimate from ${k.benchCovered} known cost(s)`
                    : fr
                      ? `${k.benchCount} en intercontrat · CJM requis pour estimer`
                      : `${k.benchCount} on bench · costs needed to estimate`
                  : dash}
              </p>
            </Signal>

            {withCosts && (
              <Signal icon={TrendingDown} title={fr ? 'Marges sous l’objectif' : 'Margins below target'} tone={(data?.lowMargin.length ?? 0) > 0 ? 'warn' : 'calm'}>
                {!data || data.lowMargin.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">{fr ? 'Toutes les missions chiffrées atteignent leur objectif.' : 'Every costed mission meets its target.'}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.lowMargin.slice(0, 4).map((m) => (
                      <li key={m.id}>
                        <Link href={`/missions/${m.id}`} className="group block">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-medium group-hover:text-app-terra-dark">{m.label}</span>
                            <span className="num shrink-0 text-[13px] font-semibold text-warning">{formatPct(m.marginPct, lang)}</span>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {fr ? `Marge sous votre objectif de ${formatPct(m.target, lang, 0)}` : `Margin below your ${formatPct(m.target, lang, 0)} target`}
                            {m.targetIsDefault ? (fr ? ' (par défaut)' : ' (default)') : ''}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {data.lowMargin.length > 4 && (
                      <li className="text-xs text-muted-foreground">{fr ? `et ${data.lowMargin.length - 4} autre(s)` : `and ${data.lowMargin.length - 4} more`}</li>
                    )}
                  </ul>
                )}
              </Signal>
            )}

            <Signal icon={Wallet} title={fr ? 'Encours client (suivi)' : 'Client receivables (tracking)'} tone={k && k.overdue > 0 ? 'warn' : 'calm'}>
              <p className="num text-[20px] font-semibold leading-tight">{k ? formatEurCompact(k.receivable, lang) : dash}</p>
              <p className="text-xs text-muted-foreground">
                {k && k.overdue > 0
                  ? fr
                    ? `dont ${formatEur(k.overdue, lang)} échus · d’après le suivi saisi`
                    : `incl. ${formatEur(k.overdue, lang)} overdue · from recorded tracking`
                  : fr
                    ? 'Préfactures marquées émises, non payées'
                    : 'Pre-invoices marked issued, unpaid'}
              </p>
            </Signal>

            {withCosts && k && k.marginCoverage < 100 && k.realized12m > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-app-sand/60 px-3.5 py-2.5 text-xs text-app-terra-dark">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fr ? `${k.marginCoverage} % du CA est chiffré : renseignez les CJM manquants pour une marge complète.` : `${k.marginCoverage}% of revenue is costed: add missing daily costs for a complete margin.`}
              </p>
            )}
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function Signal({
  icon: Icon,
  title,
  tone,
  href,
  cta,
  children,
}: {
  icon: typeof Info;
  title: string;
  tone: 'warn' | 'calm';
  href?: string;
  cta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('rounded-[20px] p-4', tone === 'warn' ? 'bg-app-peach-light' : 'tile-surface')}>
      <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-app-terra-deep">
        <Icon className="h-4 w-4 text-app-terra" />
        {title}
      </h3>
      {children}
      {href && cta && (
        <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-app-terra-dark hover:underline">
          {cta}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}
