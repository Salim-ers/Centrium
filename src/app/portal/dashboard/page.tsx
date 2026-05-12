'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  Receipt,
  FileSignature,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatCurrency } from '@/lib/utils';
import type { Consultant, Timesheet, Invoice } from '@/types';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { usePortalConsultant } from '../portal-context';

type PortalDashboardData = {
  consultant: Consultant | null;
  timesheets: Timesheet[];
  invoices: Invoice[];
};

export default function PortalDashboardPage() {
  const { consultantId } = usePortalConsultant();
  const brandName = useBrandName();

  const { data, loading } = useCachedQuery<PortalDashboardData>(
    `portal-dashboard:${consultantId}`,
    async () => {
      const supabase = createClient();
      const [{ data: c }, { data: t }, { data: i }] = await Promise.all([
        supabase.from('consultants').select('*').eq('id', consultantId).maybeSingle(),
        supabase
          .from('timesheets')
          .select('*')
          .eq('consultant_id', consultantId)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(5),
        supabase
          .from('invoices')
          .select('*')
          .eq('status', 'paid')
          .order('payment_date', { ascending: false })
          .limit(5),
      ]);
      return {
        consultant: (c as Consultant | null) ?? null,
        timesheets: ((t ?? []) as Timesheet[]),
        invoices: ((i ?? []) as Invoice[]),
      };
    },
  );

  const consultant = data?.consultant ?? null;
  const timesheets = data?.timesheets ?? [];
  const invoices = data?.invoices ?? [];

  const byStatus = timesheets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_ht), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bonjour {consultant?.first_name ?? ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici un aperçu de votre activité {brandName}.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="CRA à rédiger / corriger"
          value={(byStatus.draft ?? 0) + (byStatus.rejected ?? 0)}
          tone="warn"
        />
        <KpiCard label="CRA en attente de validation" value={byStatus.submitted ?? 0} tone="neutral" />
        <KpiCard label="CRA validés" value={byStatus.client_validated ?? 0} tone="good" />
        <KpiCard label="Encaissé (factures payées)" value={formatCurrency(totalPaid)} tone="good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Derniers CRA */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-violet-glow" />
              Mes derniers CRA
            </CardTitle>
            <Button size="sm" asChild>
              <Link href="/portal/cra/new">
                <Plus className="h-3.5 w-3.5" />
                Nouveau CRA
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonRows />
            ) : timesheets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucun CRA pour le moment. Commence par créer ton premier CRA.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {timesheets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-hairline bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {MONTHS[t.period_month - 1]} {t.period_year}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.days_worked} j travaillés
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/portal/cra/${t.id}`}>Ouvrir</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Dernières factures payées */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-violet-glow" />
              Factures payées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonRows />
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune facture payée pour le moment.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {invoices.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-hairline bg-white/[0.02]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate">{i.invoice_number}</div>
                      <div className="text-[10px] text-muted-foreground">{i.period_label ?? ''}</div>
                    </div>
                    <span className="text-xs font-semibold">
                      {formatCurrency(Number(i.amount_ht))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="w-full mt-3" asChild>
              <Link href="/portal/invoices">Voir toutes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'good' | 'warn' | 'neutral';
}) {
  const color =
    tone === 'good'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : 'text-muted-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`text-2xl font-bold font-display mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Timesheet['status'] }) {
  const map: Record<Timesheet['status'], { label: string; className: string; icon?: React.ReactNode }> = {
    draft: { label: 'Brouillon', className: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    submitted: { label: 'Envoyé', className: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    client_validated: {
      label: 'Validé',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    rejected: {
      label: 'Rejeté',
      className: 'bg-red-500/10 text-red-300 border-red-500/20',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={`${s.className} text-[10px] flex items-center gap-1`}>
      {s.icon}
      {s.label}
    </Badge>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-white/[0.02] animate-pulse" />
      ))}
    </div>
  );
}
