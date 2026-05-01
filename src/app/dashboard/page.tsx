'use client';

import Link from 'next/link';
import {
  Users,
  TrendingUp,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Banknote,
  Send,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardService, type DashboardKPIs, alertService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { Alert } from '@/types';
import { formatCurrency, relativeDate } from '@/lib/utils';
import { ALERT_PRIORITY_STYLE } from '@/constants';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

type DashboardData = { kpis: DashboardKPIs | null; alerts: Alert[] };

export default function DashboardPage() {
  const { activeOrgId } = useOrganization();
  const { data, loading } = useCachedQuery<DashboardData>(
    `dashboard:${activeOrgId ?? 'none'}`,
    async () => {
      const [kpisRes, alertsRes] = await Promise.all([
        dashboardService.getKPIs(),
        alertService.list('new'),
      ]);
      return {
        kpis: kpisRes.data ?? null,
        alerts: alertsRes.data ? alertsRes.data.slice(0, 5) : [],
      };
    },
    { enabled: !!activeOrgId },
  );
  const kpis = data?.kpis ?? null;
  const alerts = data?.alerts ?? [];

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Vue d'ensemble de votre activité QuadCore
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={<Users className="h-4 w-4" />}
          label="En mission"
          value={kpis?.consultantsOnMission ?? '—'}
          accent="violet"
        />
        <KPICard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Disponibles"
          value={kpis?.consultantsAvailable ?? '—'}
          accent="emerald"
        />
        <KPICard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Opportunités ouvertes"
          value={kpis?.openOpportunities ?? '—'}
          accent="magenta"
        />
        <KPICard
          icon={<Banknote className="h-4 w-4" />}
          label="CA du mois"
          value={kpis ? formatCurrency(kpis.revenueThisMonth) : '—'}
          accent="violet"
          hint={
            kpis
              ? `Encaissé : ${formatCurrency(kpis.revenueThisMonthPaid)}`
              : undefined
          }
          title="CA produit ce mois-ci = somme(TJM × jours ouvrés écoulés) sur les missions actives. Évolue automatiquement chaque jour ouvré."
        />
      </div>

      {/* Graph CA / Missions */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes prioritaires */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Alertes prioritaires
                </CardTitle>
                <CardDescription>
                  {alerts.length} alerte{alerts.length > 1 ? 's' : ''} à traiter
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/alerts">Tout voir</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton />
            ) : alerts.length === 0 ? (
              <EmptyState text="Aucune alerte. Tout est sous contrôle 🎯" />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={ALERT_PRIORITY_STYLE[alert.priority]}
                      >
                        {alert.priority}
                      </Badge>
                      <span className="text-sm font-medium truncate">{alert.title}</span>
                    </div>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {relativeDate(alert.due_date)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* État facturation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Facturation
            </CardTitle>
            <CardDescription>État des factures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatRow
              icon={<Send className="h-4 w-4 text-blue-400" />}
              label="En attente"
              value={kpis?.pendingInvoices ?? '—'}
            />
            <StatRow
              icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
              label="En retard"
              value={kpis?.overdueInvoices ?? '—'}
              highlight={kpis?.overdueInvoices ? kpis.overdueInvoices > 0 : false}
            />
            <StatRow
              icon={<Clock className="h-4 w-4 text-amber-400" />}
              label="CRA à valider"
              value={kpis?.pendingTimesheets ?? '—'}
            />
            <Button variant="outline" className="w-full mt-2" asChild>
              <Link href="/invoices">Gérer la facturation</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/consultants" label="Ajouter consultant" />
          <QuickAction href="/cv-optimizer" label="Générer un CV" />
          <QuickAction href="/crm" label="Nouvelle opportunité" />
          <QuickAction href="/invoices" label="Créer une facture" />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function KPICard({
  icon,
  label,
  value,
  accent,
  hint,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: 'violet' | 'magenta' | 'emerald';
  hint?: string;
  title?: string;
}) {
  const accentClass = {
    violet: 'text-violet-glow bg-violet-glow/10',
    magenta: 'text-magenta-neon bg-magenta/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
  }[accent];
  return (
    <Card className="qc-card-hover" title={title}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold font-display mt-2">{value}</p>
            {hint && (
              <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${accentClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className={`font-semibold ${highlight ? 'text-red-400' : ''}`}>{value}</span>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" asChild className="h-auto py-3 justify-start">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-white/[0.02] animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
