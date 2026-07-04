'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  Receipt,
  Plus,
  CheckCircle2,
  Hourglass,
  CalendarCheck,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  AppCard,
  AppCardBody,
  StatusBadge,
  EmptyState,
  DataRow,
  Reveal,
  type StatusTone,
} from '@/components/app';
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

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const TIMESHEET_TONE: Record<Timesheet['status'], { tone: StatusTone; label: string }> = {
  draft: { tone: 'pending', label: 'Brouillon' },
  submitted: { tone: 'info', label: 'En attente' },
  client_validated: { tone: 'success', label: 'Validé' },
  rejected: { tone: 'danger', label: 'Rejeté' },
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

  const greeting = consultant?.first_name
    ? (
        <>
          Bonjour, <span className="qc-italic-accent font-editorial italic">{consultant.first_name}.</span>
        </>
      )
    : (
        <>
          Votre <span className="qc-italic-accent font-editorial italic">tableau de bord.</span>
        </>
      );

  return (
    <div>
      <PageHeader
        eyebrow="Mon espace"
        title={greeting}
        description={`Voici un aperçu de votre activité ${brandName}.`}
        actions={
          <Button asChild>
            <Link href="/portal/cra/new">
              <Plus className="h-4 w-4" />
              Nouveau CRA
            </Link>
          </Button>
        }
      />

      {/* KPIs */}
      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="CRA à rédiger"
          value={(byStatus.draft ?? 0) + (byStatus.rejected ?? 0)}
          icon={ClipboardCheck}
          tone="amber"
          hint="Brouillons + rejetés"
        />
        <KPICard
          label="CRA en attente"
          value={byStatus.submitted ?? 0}
          icon={Hourglass}
          tone="violet"
          hint="En validation client"
        />
        <KPICard
          label="CRA validés"
          value={byStatus.client_validated ?? 0}
          icon={CalendarCheck}
          tone="emerald"
        />
        <KPICard
          label="Encaissé"
          value={totalPaid}
          prefix="€"
          icon={Wallet}
          tone="magenta"
          hint="Factures payées"
        />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Derniers CRA */}
        <Reveal delay={0.08} className="lg:col-span-2">
          <SectionHeader
            eyebrow="Activité"
            title={<>Mes derniers <span className="qc-italic-accent font-editorial italic">CRA.</span></>}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href="/portal/cra">Voir tout</Link>
              </Button>
            }
          />
          <AppCard>
            {loading ? (
              <AppCardBody>
                <SkeletonRows />
              </AppCardBody>
            ) : timesheets.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Aucun CRA pour le moment"
                description="Commencez par créer votre premier compte-rendu d'activité."
                action={
                  <Button asChild>
                    <Link href="/portal/cra/new">
                      <Plus className="h-4 w-4" />
                      Nouveau CRA
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div>
                {timesheets.map((t) => {
                  const s = TIMESHEET_TONE[t.status];
                  return (
                    <DataRow
                      key={t.id}
                      primary={`${MONTHS[t.period_month - 1]} ${t.period_year}`}
                      secondary={`${t.days_worked} jours travaillés`}
                      trailing={<StatusBadge tone={s.tone}>{s.label}</StatusBadge>}
                      href={`/portal/cra/${t.id}`}
                    />
                  );
                })}
              </div>
            )}
          </AppCard>
        </Reveal>

        {/* Dernières factures payées */}
        <Reveal delay={0.14}>
          <SectionHeader
            eyebrow="Finances"
            title={<>Factures <span className="qc-italic-accent font-editorial italic">payées.</span></>}
          />
          <AppCard>
            {loading ? (
              <AppCardBody>
                <SkeletonRows />
              </AppCardBody>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Aucune facture payée"
                description="Les factures apparaîtront ici dès qu'elles seront marquées payées."
              />
            ) : (
              <>
                <div>
                  {invoices.map((i) => (
                    <DataRow
                      key={i.id}
                      leading={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      primary={<span className="font-mono">{i.invoice_number}</span>}
                      secondary={i.period_label ?? ''}
                      trailing={
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(i.amount_ht))}
                        </span>
                      }
                    />
                  ))}
                </div>
                <AppCardBody size="sm">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/portal/invoices">Voir toutes</Link>
                  </Button>
                </AppCardBody>
              </>
            )}
          </AppCard>
        </Reveal>
      </div>
    </div>
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
