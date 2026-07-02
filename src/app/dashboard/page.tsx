'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Banknote,
  Send,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  ArrowUpRight,
  RotateCcw,
  UserPlus,
  Wand2,
  Target,
  Receipt,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  dashboardService,
  type DashboardKPIs,
  alertService,
  type ComputedAlert,
} from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { NewUserTutorial } from '@/components/onboarding/NewUserTutorial';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { relativeDate } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ResetDashboardDialog } from '@/components/dashboard/ResetDashboardDialog';
import { TopConsultantsWidget } from '@/components/dashboard/TopConsultantsWidget';
import { HotOpportunitiesWidget } from '@/components/dashboard/HotOpportunitiesWidget';
import { InvoicesToCollectWidget } from '@/components/dashboard/InvoicesToCollectWidget';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  PageHeader,
  KPICard,
  AppCard,
  AppCardBody,
  EmptyState as AppEmptyState,
} from '@/components/app';
import { useAppT } from '@/lib/i18n/LocaleProvider';

type DashboardData = {
  kpis: DashboardKPIs | null;
  alerts: ComputedAlert[];
  alertsTotal: number;
};

// Priorité → style visuel pour la mini-carte alerte sur le dashboard.
const ALERT_TONE: Record<
  ComputedAlert['priority'],
  {
    border: string;
    bg: string;
    accent: string;
    iconBg: string;
    iconText: string;
    Icon: typeof ShieldAlert;
  }
> = {
  critical: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/[0.05]',
    accent: 'bg-red-500',
    iconBg: 'bg-red-500/15',
    iconText: 'text-red-300',
    Icon: ShieldAlert,
  },
  high: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/[0.05]',
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-300',
    Icon: AlertTriangle,
  },
  medium: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/[0.04]',
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-500/15',
    iconText: 'text-blue-300',
    Icon: Clock,
  },
  low: {
    border: 'border-slate-500/25',
    bg: 'bg-slate-500/[0.04]',
    accent: 'bg-slate-500',
    iconBg: 'bg-slate-500/15',
    iconText: 'text-slate-300',
    Icon: Info,
  },
};

export default function DashboardPage() {
  const { activeOrgId, branding } = useOrganization();
  const brandName = useBrandName();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  // "Branding non configuré" = pas de logo ET pas de couleur primaire perso.
  // Évite de hasseler les orgs qui ont décidé de garder le défaut.
  const brandingMissing =
    !!branding && !branding.logoUrl && !branding.primaryColor;
  const { data, loading, reload } = useCachedQuery<DashboardData>(
    `dashboard:${activeOrgId ?? 'none'}`,
    async () => {
      // Passe activeOrgId aux deux RPC pour éviter un round-trip profiles
      // dans le service. Total : 1 RPC dashboard_kpis + 1 RPC compute_org_alerts.
      const [kpisRes, alertsRes] = await Promise.all([
        dashboardService.getKPIs(activeOrgId ?? undefined),
        alertService.listComputed(activeOrgId ?? undefined),
      ]);
      const all = alertsRes.data ?? [];
      return {
        kpis: kpisRes.data ?? null,
        alerts: all.slice(0, 5),
        alertsTotal: all.length,
      };
    },
    { enabled: !!activeOrgId },
  );
  const kpis = data?.kpis ?? null;
  const alerts = data?.alerts ?? [];
  const alertsTotal = data?.alertsTotal ?? 0;
  const [resetOpen, setResetOpen] = useState(false);

  // Auto-invalidation : dès qu'une table impactant un KPI change (chez moi
  // ou un collègue), on relance les RPC dashboard. Évite le bug "11 en
  // mission alors qu'il y en a 0" qui demandait un F5 manuel.
  useRealtimeReload(
    [
      'missions',
      'invoices',
      'timesheets',
      'opportunities',
      'job_offers',
      'consultants',
      'alerts',
    ],
    () => reload(),
    { debounceMs: 400 },
  );

  return (
    <AppShell>
      <ResetDashboardDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={() => reload()}
      />
      <PageHeader
        eyebrow={t.dashboard.eyebrow}
        title={
          <>
            {t.dashboard.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.dashboard.title_b}</span>
          </>
        }
        description={t.dashboard.description.replace('{brand}', brandName)}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
            title={t.dashboard.reset_title}
            className="text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
          >
            <RotateCcw className="h-4 w-4" />
            {t.dashboard.reset}
          </Button>
        }
      />


      {/* Auto-ouvre le tuto au 1er montage si pas vu */}
      <NewUserTutorial />

      {brandingMissing && (
        <Link
          href="/onboarding/setup"
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-violet-glow/40 bg-gradient-to-r from-violet-glow/10 to-magenta/5 px-5 py-4 hover:border-violet-glow/70 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-violet-glow/15 p-2 shrink-0">
              <Sparkles className="h-4 w-4 text-violet-glow" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Personnalise l&apos;identité visuelle de ton ESN
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Logo, couleurs, signature, mentions légales — pour que tes contrats, factures et
                CV soient à ton image.
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-violet-glow shrink-0" />
        </Link>
      )}

      {/* KPIs — chaque carte est cliquable et drille vers la page concernée */}
      <Reveal className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={Users}
          label={t.dashboard.consultants_on_mission}
          value={kpis?.consultantsOnMission ?? 0}
          tone="magenta"
          loading={!kpis}
          href="/consultants?status=on_mission"
          hint={kpis?.consultantsOnMission ? t.dashboard.see_list : undefined}
        />
        <KPICard
          icon={CheckCircle2}
          label={t.dashboard.available}
          value={kpis?.consultantsAvailable ?? 0}
          tone="emerald"
          loading={!kpis}
          href="/consultants?status=available"
          hint={kpis?.consultantsAvailable ? t.dashboard.see_available_pool : undefined}
        />
        <KPICard
          icon={TrendingUp}
          label={t.dashboard.open_opportunities}
          value={kpis?.openOpportunities ?? 0}
          tone="cyan"
          loading={!kpis}
          href="/crm"
          hint={t.dashboard.commercial_pipeline}
        />
        <KPICard
          icon={Banknote}
          label={t.dashboard.invoiced_this_month}
          valueText={kpis ? formatCurrency(kpis.revenueThisMonthInvoiced ?? 0) : '—'}
          tone="violet"
          loading={!kpis}
          href="/invoices"
          hint={
            kpis
              ? `${t.dashboard.cashed} ${formatCurrency(kpis.revenueThisMonthPaid)} · ${t.dashboard.forecast} ${formatCurrency(kpis.revenueThisMonth)}`
              : undefined
          }
        />
      </Reveal>

      {/* Action Row — 3 widgets actionnables : qui me rapporte, où pousser, qui me doit. */}
      <Reveal delay={0.05} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <TopConsultantsWidget />
        <HotOpportunitiesWidget />
        <InvoicesToCollectWidget />
      </Reveal>

      {/* Graph CA / Missions */}
      <Reveal delay={0.1} className="mb-6">
        <RevenueChart />
      </Reveal>

      <Reveal delay={0.15} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes prioritaires */}
        <AppCard variant="default" tone="amber" className="lg:col-span-2">
          <AppCardBody size="md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-foreground font-medium">{t.dashboard.priority_alerts}</div>
                  <p className="text-[12px] text-muted-foreground">
                    {t.dashboard.alerts_to_handle
                      .replace('{n}', String(alertsTotal))
                      .replace('{s}', alertsTotal > 1 ? 's' : '')}
                    {alertsTotal > alerts.length && (
                      <span className="text-foreground/60"> — top {alerts.length}</span>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/alerts">{t.dashboard.see_all}</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <Skeleton />
              ) : alerts.length === 0 ? (
                <AppEmptyState
                  icon={CheckCircle2}
                  title={t.dashboard.all_under_control}
                  description={t.dashboard.all_under_control}
                />
              ) : (
                alerts.map((alert, i) => (
                  <DashboardAlertItem key={alert.id} alert={alert} index={i} />
                ))
              )}
            </div>
          </AppCardBody>
        </AppCard>

        {/* État facturation */}
        <AppCard variant="default" tone="violet">
          <AppCardBody size="md">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-glow/30 bg-violet-glow/15 text-violet-glow">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div className="text-foreground font-medium">{t.dashboard.invoicing}</div>
                <p className="text-[12px] text-muted-foreground">{t.dashboard.invoices_state}</p>
              </div>
            </div>
            <div className="space-y-3">
              <StatRow
                icon={<Send className="h-4 w-4 text-blue-400" />}
                label={t.dashboard.pending}
                value={<AnimatedNumber value={kpis?.pendingInvoices} />}
                href="/invoices?status=sent"
              />
              <StatRow
                icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                label={t.dashboard.overdue}
                value={<AnimatedNumber value={kpis?.overdueInvoices} />}
                highlight={kpis?.overdueInvoices ? kpis.overdueInvoices > 0 : false}
                href="/invoices?status=overdue"
              />
              <StatRow
                icon={<Clock className="h-4 w-4 text-amber-400" />}
                label={t.dashboard.cra_to_validate}
                value={<AnimatedNumber value={kpis?.pendingTimesheets} />}
                href="/timesheets?status=submitted"
              />
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link href="/invoices">{t.dashboard.manage_invoicing}</Link>
              </Button>
            </div>
          </AppCardBody>
        </AppCard>
      </Reveal>

      {/* Raccourcis */}
      <Reveal delay={0.2} className="mt-6">
        <AppCard variant="default">
          <AppCardBody size="md">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-magenta/30 bg-magenta/10 text-magenta-neon">
                <Zap className="h-4 w-4" />
              </span>
              <div className="text-foreground font-medium">{t.dashboard.quick_actions}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction href="/consultants" label={t.dashboard.add_consultant} icon={UserPlus} />
              <QuickAction href="/cv-optimizer" label={t.dashboard.generate_cv} icon={Wand2} />
              <QuickAction href="/crm" label={t.dashboard.new_opportunity} icon={Target} />
              <QuickAction href="/invoices" label={t.dashboard.new_invoice} icon={Receipt} />
            </div>
          </AppCardBody>
        </AppCard>
      </Reveal>
    </AppShell>
  );
}

/** Entrée en cascade des sections du dashboard (fondu + translation). */
function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatRow({
  icon,
  label,
  value,
  highlight,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-lg hover-surface transition group">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="text-muted-foreground group-hover:text-foreground transition">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {highlight && (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 text-rose-400 animate-pulse shadow-[0_0_8px_currentColor]" />
        )}
        <span className={`font-semibold ${highlight ? 'text-rose-400' : ''}`}>{value}</span>
        {href && (
          <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-hairline surface-1 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-magenta/30 hover-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-magenta/30 bg-magenta/10 text-magenta-neon transition-transform duration-200 group-hover:scale-110">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">{label}</span>
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

function DashboardAlertItem({ alert, index = 0 }: { alert: ComputedAlert; index?: number }) {
  const tone = ALERT_TONE[alert.priority];
  const inner = (
    <div
      className={`relative overflow-hidden rounded-lg border ${tone.border} ${tone.bg} transition-all hover:translate-x-0.5 dark:hover:brightness-110`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.accent}`} />
      <div className="pl-4 pr-3 py-2.5 flex items-start gap-2.5">
        <div className={`rounded-md p-1.5 shrink-0 ${tone.iconBg} ${tone.iconText}`}>
          <tone.Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight truncate">{alert.title}</div>
          {alert.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {alert.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {alert.due_date && (
            <span className="text-[10px] text-muted-foreground">
              {relativeDate(alert.due_date)}
            </span>
          )}
          {alert.link && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
    >
      {alert.link ? (
        <Link href={alert.link} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-foreground/[0.04] animate-pulse" />
      ))}
    </div>
  );
}
