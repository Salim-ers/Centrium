'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CalendarRange,
  Clock,
  FileCheck2,
  Gauge,
  Hourglass,
  Lock,
  PieChart,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip } from '@/components/app/StatStrip';
import { Segmented } from '@/components/app/Segmented';
import { EmptyState } from '@/components/app/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadAnalytics, type AnalyticsSummary } from '@/lib/pilotage/load-analytics';
import { loadFinance, type FinanceSummary } from '@/lib/pilotage/load-finance';
import { STAGE_BY_ID } from '@/lib/crm/pipeline';
import { formatDate, formatEurCompact, formatPct } from '@/lib/format';
import { periodLabel, periodLabelShort } from '@/lib/status';
import { cn } from '@/lib/utils';

const chartFallback = <Skeleton className="h-full min-h-[200px] w-full" />;
const OccupancyChart = dynamic(() => import('@/components/charts/OccupancyChart'), { ssr: false, loading: () => chartFallback });
const RevenueMarginChart = dynamic(() => import('@/components/charts/RevenueMarginChart'), { ssr: false, loading: () => chartFallback });

type View = 'business' | 'staffing' | 'finance' | 'performance';
type L = 'fr' | 'en';

const SOURCE_LABEL: Record<string, { fr: string; en: string }> = {
  manual: { fr: 'Saisie équipe', en: 'Team entry' },
  client_portal: { fr: 'Portail client', en: 'Client portal' },
  import: { fr: 'Import', en: 'Import' },
};

/**
 * Analytics : quatre vues (business, staffing, finance, performance), chacune
 * sur un écran. Chaque indicateur est calculé sur vos données (règle de calcul
 * en infobulle), sur 12 mois glissants.
 */
export default function AnalyticsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang: L = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const allowed = can('analytics.view');
  const canFinance = can('finance.view') || can('consultants.financials');
  const withCosts = can('consultants.financials');
  const initial = params.get('view');
  const [view, setView] = useState<View>(initial === 'staffing' || initial === 'finance' || initial === 'performance' ? initial : 'business');

  const { data, loading } = useCachedQuery<AnalyticsSummary>(`analytics:${activeOrgId ?? 'none'}`, () => loadAnalytics(createClient(), activeOrgId!), {
    enabled: !!activeOrgId && ready && allowed,
  });
  const finance = useCachedQuery<FinanceSummary>(`finance:${activeOrgId ?? 'none'}:${withCosts ? 'c' : 'n'}`, () => loadFinance(createClient(), activeOrgId!, withCosts), {
    enabled: !!activeOrgId && ready && allowed && canFinance && view === 'finance',
  });
  const busy = loading && !data;

  if (ready && !allowed) {
    return (
      <AppShell>
        <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'Votre rôle ne donne pas accès aux analytics.' : 'Your role has no access to analytics.'} />
      </AppShell>
    );
  }

  return (
    <AppShell fill>
      <PageHeader
        title="Analytics"
        description={
          data
            ? fr
              ? `12 mois glissants depuis le ${formatDate(data.period.since, lang)} · calculés sur vos données.`
              : `Rolling 12 months since ${formatDate(data.period.since, lang)} · computed from your data.`
            : fr
              ? '12 mois glissants · calculés sur vos données.'
              : 'Rolling 12 months · computed from your data.'
        }
        tabs={
          <Segmented<View>
            label={fr ? 'Vue' : 'View'}
            value={view}
            onChange={setView}
            options={[
              { value: 'business', label: 'Business' },
              { value: 'staffing', label: 'Staffing' },
              { value: 'finance', label: 'Finance' },
              { value: 'performance', label: 'Performance' },
            ]}
          />
        }
      />
      {view === 'business' && <BusinessView data={data} busy={busy} lang={lang} />}
      {view === 'staffing' && <StaffingView data={data} busy={busy} lang={lang} />}
      {view === 'finance' &&
        (canFinance ? (
          <FinanceView data={finance.data} busy={finance.loading && !finance.data} lang={lang} withCosts={withCosts} />
        ) : (
          <EmptyState icon={Lock} title={fr ? 'Accès restreint' : 'Restricted access'} description={fr ? 'La vue finance demande l’accès au pilotage financier.' : 'The finance view requires financial access.'} />
        ))}
      {view === 'performance' && <PerformanceView data={data} busy={busy} lang={lang} />}
    </AppShell>
  );
}

// ── Briques ────────────────────────────────────────────────────────────────

function Panel({ title, subtitle, className, children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('tile-surface flex min-h-[220px] flex-col p-4 lg:min-h-0', className)}>
      <header className="mb-3 shrink-0">
        <h2 className="font-display text-[15px] font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function Bars({ rows, format, emptyText }: { rows: Array<{ label: React.ReactNode; value: number; href?: string; hint?: string }>; format: (n: number) => string; emptyText: string }) {
  if (!rows.length) return <p className="text-[13px] text-muted-foreground">{emptyText}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} className="text-[13px]">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            {r.href ? (
              <Link href={r.href} className="truncate hover:text-app-terra-dark">
                {r.label}
              </Link>
            ) : (
              <span className="truncate">{r.label}</span>
            )}
            <span className="num shrink-0 text-muted-foreground">
              {format(r.value)}
              {r.hint ? ` · ${r.hint}` : ''}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-app-sand">
            <div className="h-1.5 rounded-full bg-app-terra" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const GRID = 'grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-2';
const dash = '…';
const pct = (v: number | null | undefined, lang: L) => (v != null ? formatPct(v, lang, 0) : '—');
const days = (v: number | null | undefined, fr: boolean) => (v != null ? `${v} ${fr ? 'j' : 'd'}` : '—');

// ── Business ───────────────────────────────────────────────────────────────

function BusinessView({ data, busy, lang }: { data: AnalyticsSummary | null; busy: boolean; lang: L }) {
  const fr = lang === 'fr';
  const c = data?.commercial;
  const maxStage = Math.max(1, ...(c?.pipeline ?? []).map((s) => s.amount));
  return (
    <>
      <StatStrip
        className="mb-3"
        items={[
          { label: c ? (fr ? `taux de transformation · ${c.win.won} gagnées, ${c.win.lost} perdues` : `win rate · ${c.win.won} won, ${c.win.lost} lost`) : fr ? 'taux de transformation' : 'win rate', value: busy ? dash : pct(c?.win.rate, lang), tone: 'terra', icon: Target, title: fr ? 'Gagnées / (gagnées + perdues), clôturées sur 12 mois' : 'Won / (won + lost), closed over 12 months' },
          { label: c ? (fr ? `pipeline ouvert · ${c.openCount} opportunités` : `open pipeline · ${c.openCount} opportunities`) : fr ? 'pipeline ouvert' : 'open pipeline', value: busy ? dash : formatEurCompact(c?.openAmount ?? 0, lang), tone: 'peach', icon: TrendingUp, title: fr ? 'Montant saisi, sinon TJM × durée × 20 j' : 'Entered amount, else rate × duration × 20 d' },
          { label: fr ? 'opportunités créées · 12 mois' : 'opportunities created · 12 months', value: busy ? dash : (c?.created ?? 0), tone: 'ivory', icon: Sparkles },
          { label: c ? (fr ? `cycle de vente médian · ${c.cycle.count} affaire(s)` : `median sales cycle · ${c.cycle.count} deal(s)`) : fr ? 'cycle de vente médian' : 'median sales cycle', value: busy ? dash : days(c?.cycle.medianDays, fr), tone: 'white', icon: Clock, title: fr ? 'Jours entre création et gain' : 'Days from creation to win' },
        ]}
      />
      <div className={GRID}>
        <Panel title={fr ? 'Pipeline par étape' : 'Pipeline by stage'} subtitle={fr ? 'Opportunités ouvertes : nombre, montant et montant pondéré' : 'Open opportunities: count, amount and weighted amount'} className="lg:col-span-7 lg:row-span-2">
          {busy ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ul className="space-y-4">
              {(c?.pipeline ?? []).map((s) => (
                <li key={s.stage}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-semibold">{STAGE_BY_ID.get(s.stage as never)?.label[lang] ?? s.stage}</span>
                    <span className="num text-muted-foreground">
                      {s.count} · {formatEurCompact(s.amount, lang)} · {fr ? 'pondéré' : 'weighted'} {formatEurCompact(s.weighted, lang)}
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-app-sand">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-app-peach" style={{ width: `${(s.amount / maxStage) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-app-terra" style={{ width: `${(s.weighted / maxStage) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={fr ? 'Origine des opportunités' : 'Opportunity sources'} subtitle={fr ? 'Créées sur 12 mois' : 'Created over 12 months'} className="lg:col-span-5">
          {busy ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Bars rows={(c?.sources ?? []).map((s) => ({ label: SOURCE_LABEL[s.source]?.[lang] ?? s.source, value: s.count }))} format={(n) => String(n)} emptyText={fr ? 'Aucune opportunité créée sur la période.' : 'No opportunity created in the period.'} />
          )}
        </Panel>
        <Panel title={fr ? 'Gagnées et perdues' : 'Won and lost'} subtitle={fr ? 'Motifs de perte sur 12 mois' : 'Loss reasons over 12 months'} className="lg:col-span-5">
          {busy ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {c && c.win.won + c.win.lost > 0 && (
                <div>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    <div className="bg-[#5a9a6f]" style={{ width: `${(c.win.won / (c.win.won + c.win.lost)) * 100}%` }} />
                    <div className="flex-1 bg-app-sand" />
                  </div>
                  <p className="num mt-1.5 text-xs text-muted-foreground">
                    {c.win.won} {fr ? 'gagnées' : 'won'} · {c.win.lost} {fr ? 'perdues' : 'lost'}
                  </p>
                </div>
              )}
              <Bars rows={(c?.lostReasons ?? []).map((r) => ({ label: r.reason || (fr ? 'Motif non renseigné' : 'No reason given'), value: r.count }))} format={(n) => String(n)} emptyText={fr ? 'Aucune opportunité perdue sur la période.' : 'No lost opportunity in the period.'} />
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

// ── Staffing ───────────────────────────────────────────────────────────────

function StaffingView({ data, busy, lang }: { data: AnalyticsSummary | null; busy: boolean; lang: L }) {
  const fr = lang === 'fr';
  const s = data?.staffing;
  const a = s?.availability;
  return (
    <>
      <StatStrip
        className="mb-3"
        items={[
          { label: s ? (fr ? `occupation · ${s.now.staffed}/${s.now.capacity} consultants` : `utilisation · ${s.now.staffed}/${s.now.capacity} consultants`) : fr ? 'occupation' : 'utilisation', value: busy ? dash : pct(s?.now.rate, lang), tone: 'terra', icon: Gauge, title: fr ? 'Consultants en mission aujourd’hui / effectif disponible' : 'Consultants on assignment today / available staff' },
          { label: fr ? 'en intercontrat aujourd’hui' : 'on bench today', value: busy ? dash : (s?.now.bench ?? 0), tone: s && s.now.bench > 0 ? 'peach' : 'ivory', icon: UserMinus },
          { label: fr ? 'libérés sous 30 jours' : 'free within 30 days', value: busy ? dash : (a?.d30 ?? 0), tone: 'ivory', icon: UserPlus },
          { label: s ? (fr ? `positionnements · 12 mois · ${pct(s.positioning.rate, lang)} gagnants` : `positionings · 12 months · ${pct(s.positioning.rate, lang)} won`) : fr ? 'positionnements · 12 mois' : 'positionings · 12 months', value: busy ? dash : (s?.positioning.total ?? 0), tone: 'white', icon: Users, title: fr ? 'Part gagnante calculée sur les opportunités clôturées' : 'Win share computed on closed opportunities' },
        ]}
      />
      <div className={GRID}>
        <Panel title={fr ? 'Occupation et intercontrat' : 'Utilisation and bench'} subtitle={fr ? 'Fin de mois, 12 mois' : 'Month end, 12 months'} className="lg:col-span-8 lg:row-span-2">
          {data ? <OccupancyChart data={data.occupancy} lang={lang} height={200} fill /> : chartFallback}
        </Panel>
        <Panel title={fr ? 'Disponibilités à venir' : 'Upcoming availability'} subtitle={fr ? 'D’après les dates de fin de mission' : 'From mission end dates'} className="lg:col-span-4">
          {busy || !a ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Bars
              rows={[
                { label: fr ? 'En intercontrat' : 'On bench', value: a.now },
                { label: fr ? 'Sous 30 jours' : 'Within 30 days', value: a.d30 },
                { label: fr ? '31 à 60 jours' : '31 to 60 days', value: a.d60 },
                { label: fr ? '61 à 90 jours' : '61 to 90 days', value: a.d90 },
              ]}
              format={(n) => String(n)}
              emptyText=""
            />
          )}
        </Panel>
        <Panel title={fr ? 'Fins de mission' : 'Mission endings'} subtitle={fr ? 'Missions en cours, 6 prochains mois' : 'Active missions, next 6 months'} className="lg:col-span-4">
          {busy || !s ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Bars rows={s.endings.map((e) => ({ label: <span className="capitalize">{periodLabelShort(e.month, e.year, lang)}</span>, value: e.count }))} format={(n) => String(n)} emptyText="" />
          )}
        </Panel>
      </div>
    </>
  );
}

// ── Finance ────────────────────────────────────────────────────────────────

function FinanceView({ data, busy, lang, withCosts }: { data: FinanceSummary | null; busy: boolean; lang: L; withCosts: boolean }) {
  const fr = lang === 'fr';
  const k = data?.kpis;
  return (
    <>
      <StatStrip
        className="mb-3"
        items={[
          { label: fr ? 'CA réalisé · 12 mois' : 'actual revenue · 12 months', value: busy || !k ? dash : formatEurCompact(k.realized12m, lang), tone: 'terra', icon: Banknote, title: fr ? 'Jours validés × TJM, HT' : 'Approved days × rate, excl. VAT' },
          withCosts
            ? { label: k?.margin12m != null ? (fr ? `marge brute · ${formatEurCompact(k.margin12m, lang)}` : `gross margin · ${formatEurCompact(k.margin12m, lang)}`) : fr ? 'marge brute' : 'gross margin', value: busy || !k ? dash : pct(k.marginPct12m, lang), tone: 'peach', icon: Gauge }
            : { label: fr ? 'carnet signé' : 'booked', value: busy || !k ? dash : formatEurCompact(k.booked, lang), tone: 'peach', icon: FileCheck2 },
          { label: fr ? 'prévision · 3 prochains mois' : 'forecast · next 3 months', value: busy || !k ? dash : formatEurCompact(k.forecast3m, lang), tone: 'ivory', icon: CalendarRange },
          { label: data?.concentration.top1Name ? (fr ? `concentration · ${data.concentration.top1Name}` : `concentration · ${data.concentration.top1Name}`) : fr ? 'concentration du premier client' : 'top client concentration', value: busy || !data ? dash : pct(data.concentration.top1, lang), tone: 'white', icon: PieChart, title: fr ? 'Part du CA réalisé du premier client (indicateur)' : 'Top client share of actual revenue (indicator)' },
        ]}
      />
      <div className={GRID}>
        <Panel title={fr ? 'CA, marge et prévision' : 'Revenue, margin and forecast'} subtitle={fr ? '12 mois réalisés, 6 mois de prévision · HT' : '12 months actual, 6 months forecast · excl. VAT'} className="lg:col-span-8 lg:row-span-2">
          {data ? <RevenueMarginChart data={data.series} lang={lang} showMargin={withCosts} height={200} fill /> : chartFallback}
        </Panel>
        <Panel title={fr ? 'CA par client' : 'Revenue by client'} subtitle={fr ? '12 mois · CRA validés' : '12 months · approved timesheets'} className="lg:col-span-4">
          {busy || !data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Bars rows={data.byClient.slice(0, 8).map((r) => ({ label: r.label, value: r.revenue, href: `/clients/${r.id}` }))} format={(n) => formatEurCompact(n, lang)} emptyText={fr ? 'Aucun CRA validé sur la période.' : 'No approved timesheet in the period.'} />
          )}
        </Panel>
        <Panel title={fr ? 'CA par consultant' : 'Revenue by consultant'} subtitle={fr ? '12 mois · CRA validés' : '12 months · approved timesheets'} className="lg:col-span-4">
          {busy || !data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Bars rows={data.byConsultant.slice(0, 8).map((r) => ({ label: r.label, value: r.revenue, href: `/consultants/${r.id}` }))} format={(n) => formatEurCompact(n, lang)} emptyText={fr ? 'Aucun CRA validé sur la période.' : 'No approved timesheet in the period.'} />
          )}
        </Panel>
      </div>
    </>
  );
}

// ── Performance ────────────────────────────────────────────────────────────

function PerformanceView({ data, busy, lang }: { data: AnalyticsSummary | null; busy: boolean; lang: L }) {
  const fr = lang === 'fr';
  const punctual = (data?.punctuality ?? []).filter((p) => p.rate != null);
  const last = punctual[punctual.length - 1];
  const q = data?.quotes;
  const p = data?.performance;
  return (
    <>
      <StatStrip
        className="mb-3"
        items={[
          { label: last ? (fr ? `CRA à l’heure · ${periodLabel(last.month, last.year, lang)}` : `on-time timesheets · ${periodLabel(last.month, last.year, lang)}`) : fr ? 'CRA à l’heure' : 'on-time timesheets', value: busy ? dash : pct(last?.rate, lang), tone: 'terra', icon: BadgeCheck, title: fr ? 'Soumis au plus tard le 5 du mois suivant' : 'Submitted by the 5th of the following month' },
          { label: q ? (fr ? `acceptation des devis · ${q.sent} envoyés` : `quote acceptance · ${q.sent} sent`) : fr ? 'acceptation des devis' : 'quote acceptance', value: busy ? dash : pct(q?.acceptanceRate, lang), tone: 'peach', icon: FileCheck2, title: fr ? 'Acceptés / (acceptés + refusés), envoyés sur 12 mois' : 'Accepted / (accepted + declined), sent over 12 months' },
          { label: p ? (fr ? `délai de staffing médian · ${p.leadTime.count} opportunité(s)` : `median staffing lead time · ${p.leadTime.count} opportunity(ies)`) : fr ? 'délai de staffing médian' : 'median staffing lead time', value: busy ? dash : days(p?.leadTime.medianDays, fr), tone: 'ivory', icon: Hourglass, title: fr ? 'Jours entre la création de l’opportunité et le premier positionnement' : 'Days from opportunity creation to first positioning' },
          { label: p ? (fr ? `intercontrat moyen · ${p.bench.count} reprise(s)` : `average bench time · ${p.bench.count} restart(s)`) : fr ? 'intercontrat moyen' : 'average bench time', value: busy ? dash : days(p?.bench.averageDays, fr), tone: 'white', icon: CalendarClock, title: fr ? 'Écart moyen entre deux missions d’un même consultant' : 'Average gap between two missions of the same consultant' },
        ]}
      />
      <div className={GRID}>
        <Panel title={fr ? 'Ponctualité des CRA' : 'Timesheet punctuality'} subtitle={fr ? 'Part des CRA soumis au plus tard le 5 du mois suivant' : 'Share submitted by the 5th of the following month'} className="lg:col-span-7">
          {busy ? (
            <Skeleton className="h-24 w-full" />
          ) : !punctual.length ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Pas encore assez de CRA pour mesurer.' : 'Not enough timesheets yet.'}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {data!.punctuality.map((m) => (
                <div key={m.key} className="rounded-xl bg-app-sand/50 p-2.5 text-center">
                  <div className="text-[11px] capitalize text-muted-foreground">{periodLabelShort(m.month, m.year, lang)}</div>
                  <div className={cn('num mt-1 text-[17px] font-semibold', m.rate != null && m.rate < 70 ? 'text-warning' : '')}>{pct(m.rate, lang)}</div>
                  <div className="num text-[11px] text-muted-foreground">
                    {m.onTime}/{m.total}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title={fr ? 'Devis' : 'Quotes'} subtitle={fr ? 'Envoyés sur 12 mois' : 'Sent over 12 months'} className="lg:col-span-5">
          {busy ? (
            <Skeleton className="h-24 w-full" />
          ) : !q ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Module devis indisponible.' : 'Quotes module unavailable.'}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <Fact label={fr ? 'Acceptés' : 'Accepted'} value={`${q.accepted} · ${formatEurCompact(q.acceptedAmount, lang)}`} />
              <Fact label={fr ? 'Refusés' : 'Declined'} value={String(q.declined)} />
              <Fact label={fr ? 'En attente' : 'Pending'} value={String(q.pending)} />
              <Fact label={fr ? 'Délai médian de réponse' : 'Median response time'} value={days(q.medianDaysToDecision, fr)} />
            </dl>
          )}
        </Panel>
        <Panel title={fr ? 'Renouvellements' : 'Renewals'} subtitle={fr ? 'Décisions prises sur les missions en cours ou récentes' : 'Decisions on current or recent missions'} className="lg:col-span-5">
          {busy || !p ? (
            <Skeleton className="h-24 w-full" />
          ) : p.renewals.confirmed + p.renewals.notRenewed === 0 ? (
            <p className="text-[13px] text-muted-foreground">{fr ? 'Aucune décision de renouvellement enregistrée.' : 'No renewal decision recorded yet.'}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <RefreshCw className="h-4 w-4 text-app-terra" />
                <span className="num text-[22px] font-semibold">{pct(p.renewals.rate, lang)}</span>
                <span className="text-[13px] text-muted-foreground">{fr ? 'renouvelées' : 'renewed'}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full">
                <div className="bg-app-terra" style={{ width: `${p.renewals.rate ?? 0}%` }} />
                <div className="flex-1 bg-app-sand" />
              </div>
              <p className="num text-xs text-muted-foreground">
                {p.renewals.confirmed} {fr ? 'confirmées' : 'confirmed'} · {p.renewals.notRenewed} {fr ? 'non renouvelées' : 'not renewed'}
              </p>
            </div>
          )}
        </Panel>
        <Panel title={fr ? 'Staffing et intercontrat' : 'Staffing and bench'} subtitle={fr ? 'Comment ces durées sont calculées' : 'How these durations are computed'} className="lg:col-span-7">
          {busy || !p ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
              <Fact
                label={fr ? 'Délai de staffing médian' : 'Median staffing lead time'}
                value={days(p.leadTime.medianDays, fr)}
                hint={fr ? 'De la création de l’opportunité au premier profil positionné.' : 'From opportunity creation to the first positioned profile.'}
              />
              <Fact
                label={fr ? 'Intercontrat moyen' : 'Average bench time'}
                value={days(p.bench.averageDays, fr)}
                hint={fr ? 'Entre la fin d’une mission et le début de la suivante, reprises sur 12 mois.' : 'Between a mission end and the next start, restarts over 12 months.'}
              />
            </dl>
          )}
        </Panel>
      </div>
    </>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num text-[17px] font-semibold">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
