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
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePortalConsultant } from '../portal-context';

type PortalDashboardData = {
  consultant: Consultant | null;
  timesheets: Timesheet[];
  invoices: Invoice[];
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TIMESHEET_TONE: Record<Timesheet['status'], { tone: StatusTone; label: string; label_en: string }> = {
  draft: { tone: 'pending', label: 'Brouillon', label_en: 'Draft' },
  submitted: { tone: 'info', label: 'En attente', label_en: 'Pending' },
  client_validated: { tone: 'success', label: 'Validé', label_en: 'Validated' },
  rejected: { tone: 'danger', label: 'Rejeté', label_en: 'Rejected' },
};

export default function PortalDashboardPage() {
  const { consultantId } = usePortalConsultant();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const months = isEn ? MONTHS_EN : MONTHS_FR;

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
          {isEn ? 'Hello, ' : 'Bonjour, '}<span className="qc-italic-accent font-editorial italic">{consultant.first_name}.</span>
        </>
      )
    : (
        <>
          {isEn ? 'Your ' : 'Votre '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'dashboard.' : 'tableau de bord.'}</span>
        </>
      );

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={greeting}
        description={isEn ? `Here's an overview of your ${brandName} activity.` : `Voici un aperçu de votre activité ${brandName}.`}
        actions={
          <Button asChild>
            <Link href="/portal/cra/new">
              <Plus className="h-4 w-4" />
              {isEn ? 'New CRA' : 'Nouveau CRA'}
            </Link>
          </Button>
        }
      />

      {/* KPIs */}
      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label={isEn ? 'CRA to write' : 'CRA à rédiger'}
          value={(byStatus.draft ?? 0) + (byStatus.rejected ?? 0)}
          icon={ClipboardCheck}
          tone="amber"
          hint={isEn ? 'Drafts + rejected' : 'Brouillons + rejetés'}
        />
        <KPICard
          label={isEn ? 'CRA pending' : 'CRA en attente'}
          value={byStatus.submitted ?? 0}
          icon={Hourglass}
          tone="violet"
          hint={isEn ? 'In client validation' : 'En validation client'}
        />
        <KPICard
          label={isEn ? 'CRA validated' : 'CRA validés'}
          value={byStatus.client_validated ?? 0}
          icon={CalendarCheck}
          tone="emerald"
        />
        <KPICard
          label={isEn ? 'Collected' : 'Encaissé'}
          value={totalPaid}
          prefix="€"
          icon={Wallet}
          tone="magenta"
          hint={isEn ? 'Paid invoices' : 'Factures payées'}
        />
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Derniers CRA */}
        <Reveal delay={0.08} className="lg:col-span-2">
          <SectionHeader
            eyebrow={isEn ? 'Activity' : 'Activité'}
            title={<>{isEn ? 'My latest ' : 'Mes derniers '}<span className="qc-italic-accent font-editorial italic">CRA.</span></>}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href="/portal/cra">{isEn ? 'View all' : 'Voir tout'}</Link>
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
                title={isEn ? 'No CRA yet' : 'Aucun CRA pour le moment'}
                description={isEn ? 'Start by creating your first activity report.' : "Commencez par créer votre premier compte-rendu d'activité."}
                action={
                  <Button asChild>
                    <Link href="/portal/cra/new">
                      <Plus className="h-4 w-4" />
                      {isEn ? 'New CRA' : 'Nouveau CRA'}
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
                      primary={`${months[t.period_month - 1]} ${t.period_year}`}
                      secondary={`${t.days_worked} ${isEn ? 'days worked' : 'jours travaillés'}`}
                      trailing={<StatusBadge tone={s.tone}>{isEn ? s.label_en : s.label}</StatusBadge>}
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
            title={<>{isEn ? 'Invoices ' : 'Factures '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'paid.' : 'payées.'}</span></>}
          />
          <AppCard>
            {loading ? (
              <AppCardBody>
                <SkeletonRows />
              </AppCardBody>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={isEn ? 'No paid invoice' : 'Aucune facture payée'}
                description={isEn ? 'Invoices will appear here as soon as they are marked as paid.' : "Les factures apparaîtront ici dès qu'elles seront marquées payées."}
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
                    <Link href="/portal/invoices">{isEn ? 'View all' : 'Voir toutes'}</Link>
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
