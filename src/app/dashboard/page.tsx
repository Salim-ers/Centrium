'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import { formatCurrency, relativeDate } from '@/lib/utils';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ResetDashboardDialog } from '@/components/dashboard/ResetDashboardDialog';
import { InterContractWidget } from '@/components/dashboard/InterContractWidget';
import { MissionsEndingSoonWidget } from '@/components/dashboard/MissionsEndingSoonWidget';
import { OverdueFollowUpsWidget } from '@/components/dashboard/OverdueFollowUpsWidget';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  PageHeader,
  KPICard,
  AppCard,
  AppCardBody,
  EmptyState as AppEmptyState,
} from '@/components/app';

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
        eyebrow="Pilotage"
        title={
          <>
            Votre{' '}
            <span className="qc-italic-accent font-editorial italic">tableau de bord.</span>
          </>
        }
        description={<>Vue d&apos;ensemble de votre activité {brandName}.</>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
            title="Réinitialiser les données transactionnelles (missions, CRAs, factures, alertes)"
            className="text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={Users}
          label="Consultants en mission"
          value={kpis?.consultantsOnMission ?? 0}
          tone="magenta"
          loading={!kpis}
          href="/consultants?status=on_mission"
          hint={
            kpis?.consultantsOnMission
              ? `voir la liste`
              : undefined
          }
        />
        <KPICard
          icon={CheckCircle2}
          label="Disponibles"
          value={kpis?.consultantsAvailable ?? 0}
          tone="emerald"
          loading={!kpis}
          href="/consultants?status=available"
          hint={
            kpis?.consultantsAvailable
              ? `voir le vivier disponible`
              : undefined
          }
        />
        <KPICard
          icon={TrendingUp}
          label="Opportunités ouvertes"
          value={kpis?.openOpportunities ?? 0}
          tone="cyan"
          loading={!kpis}
          href="/crm"
          hint="pipeline commercial"
        />
        <KPICard
          icon={Banknote}
          label="CA facturé ce mois"
          valueText={kpis ? formatCurrency(kpis.revenueThisMonthInvoiced ?? 0) : '—'}
          tone="violet"
          loading={!kpis}
          href="/invoices"
          hint={
            kpis
              ? `Encaissé ${formatCurrency(kpis.revenueThisMonthPaid)} · Prévu ${formatCurrency(kpis.revenueThisMonth)}`
              : undefined
          }
        />
      </div>

      {/* Action Row — 3 widgets opérationnels : ce que je dois faire aujourd'hui */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <InterContractWidget />
        <MissionsEndingSoonWidget />
        <OverdueFollowUpsWidget />
      </div>

      {/* Graph CA / Missions */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes prioritaires */}
        <AppCard variant="default" tone="amber" className="lg:col-span-2">
          <AppCardBody size="md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Alertes prioritaires
                </div>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {alertsTotal} alerte{alertsTotal > 1 ? 's' : ''} à traiter
                  {alertsTotal > alerts.length && (
                    <span className="text-foreground/60"> — top {alerts.length} affiché{alerts.length > 1 ? 'es' : 'e'}</span>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/alerts">Tout voir</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                <Skeleton />
              ) : alerts.length === 0 ? (
                <AppEmptyState
                  icon={CheckCircle2}
                  title="Tout est sous contrôle"
                  description="Aucune alerte. Tout est sous contrôle."
                />
              ) : (
                alerts.map((alert) => <DashboardAlertItem key={alert.id} alert={alert} />)
              )}
            </div>
          </AppCardBody>
        </AppCard>

        {/* État facturation */}
        <AppCard variant="default" tone="violet">
          <AppCardBody size="md">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <FileText className="h-4 w-4 text-violet-400" />
                Facturation
              </div>
              <p className="text-[12.5px] text-muted-foreground mt-1">État des factures</p>
            </div>
            <div className="space-y-3">
              <StatRow
                icon={<Send className="h-4 w-4 text-blue-400" />}
                label="En attente"
                value={<AnimatedNumber value={kpis?.pendingInvoices} />}
                href="/invoices?status=sent"
              />
              <StatRow
                icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                label="En retard"
                value={<AnimatedNumber value={kpis?.overdueInvoices} />}
                highlight={kpis?.overdueInvoices ? kpis.overdueInvoices > 0 : false}
                href="/invoices?status=overdue"
              />
              <StatRow
                icon={<Clock className="h-4 w-4 text-amber-400" />}
                label="CRA à valider"
                value={<AnimatedNumber value={kpis?.pendingTimesheets} />}
                href="/timesheets?status=submitted"
              />
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link href="/invoices">Gérer la facturation</Link>
              </Button>
            </div>
          </AppCardBody>
        </AppCard>
      </div>

      {/* Raccourcis */}
      <AppCard variant="default" className="mt-6">
        <AppCardBody size="md">
          <div className="mb-4 text-foreground font-medium">Actions rapides</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction href="/consultants" label="Ajouter consultant" />
            <QuickAction href="/cv-optimizer" label="Générer un CV" />
            <QuickAction href="/crm" label="Nouvelle opportunité" />
            <QuickAction href="/invoices" label="Créer une facture" />
          </div>
        </AppCardBody>
      </AppCard>
    </AppShell>
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
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-md hover:bg-white/[0.04] transition group">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="text-muted-foreground group-hover:text-foreground transition">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`font-semibold ${highlight ? 'text-red-400' : ''}`}>{value}</span>
        {href && (
          <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition" />
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" asChild className="h-auto py-3 justify-start">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function DashboardAlertItem({ alert }: { alert: ComputedAlert }) {
  const tone = ALERT_TONE[alert.priority];
  const inner = (
    <div
      className={`relative overflow-hidden rounded-lg border ${tone.border} ${tone.bg} transition hover:brightness-110`}
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
  return alert.link ? (
    <Link href={alert.link} className="block">
      {inner}
    </Link>
  ) : (
    inner
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
