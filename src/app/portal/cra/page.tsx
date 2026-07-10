'use client';

import Link from 'next/link';
import { ClipboardCheck, Plus, Eye, CalendarCheck, Hourglass, AlertTriangle, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  AppCard,
  StatusBadge,
  EmptyState,
  DataRow,
  Reveal,
  type StatusTone,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePortalConsultant } from '../portal-context';
import type { Timesheet } from '@/types';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS: Record<Timesheet['status'], { label: string; label_en: string; tone: StatusTone; highlight?: boolean }> = {
  draft: { label: 'Brouillon', label_en: 'Draft', tone: 'pending' },
  submitted: { label: 'En attente', label_en: 'Pending', tone: 'info' },
  client_validated: { label: 'Validé', label_en: 'Validated', tone: 'success' },
  rejected: { label: 'Rejeté', label_en: 'Rejected', tone: 'danger', highlight: true },
};

export default function PortalCraListPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const months = isEn ? MONTHS_EN : MONTHS;
  const { consultantId } = usePortalConsultant();
  // Cache SWR : la liste s'affiche instantanément au retour sur la page
  // (sessionStorage) pendant que la version fraîche arrive en arrière-plan.
  const { data, loading } = useCachedQuery<Timesheet[]>(
    `portal-cra-list:${consultantId}`,
    async () => {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from('timesheets')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      return (rows ?? []) as Timesheet[];
    },
  );
  const timesheets = data ?? [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthTs = timesheets.find(
    (t) => t.period_month === currentMonth && t.period_year === currentYear,
  );

  const validated = timesheets.filter((t) => t.status === 'client_validated').length;
  const pending = timesheets.filter((t) => t.status === 'submitted').length;
  const totalDays = timesheets.reduce((s, t) => s + (t.days_worked ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow={isEn ? 'My space' : 'Mon espace'}
        title={<>{isEn ? 'My ' : 'Mes '}<span className="qc-italic-accent font-editorial italic">{isEn ? 'activity reports.' : 'comptes-rendus.'}</span></>}
        description={isEn ? 'Declare your monthly activity and track the progress of your CRAs.' : "Déclarez votre activité mensuelle et suivez l'avancement de vos CRA."}
        actions={
          <Button asChild>
            <Link href="/portal/cra/new">
              <Plus className="h-4 w-4" />
              {isEn ? 'New CRA' : 'Nouveau CRA'}
            </Link>
          </Button>
        }
      />

      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label={isEn ? 'Validated CRAs' : 'CRA validés'}
          value={validated}
          icon={CalendarCheck}
          tone="emerald"
        />
        <KPICard
          label={isEn ? 'Pending' : 'En attente'}
          value={pending}
          icon={Hourglass}
          tone="amber"
          hint={isEn ? 'Client validation' : 'Validation client'}
        />
        <KPICard
          label={isEn ? 'Days entered' : 'Jours saisis'}
          value={totalDays}
          icon={CalendarDays}
          tone="violet"
          suffix={isEn ? 'd' : 'j'}
        />
        <KPICard
          label={isEn ? 'Current month' : 'Mois courant'}
          valueText={currentMonthTs ? (isEn ? STATUS[currentMonthTs.status].label_en : STATUS[currentMonthTs.status].label) : (isEn ? 'To create' : 'À créer')}
          icon={ClipboardCheck}
          tone="magenta"
          hint={`${months[currentMonth - 1]} ${currentYear}`}
        />
      </Reveal>

      {loading ? (
        <div className="h-40 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      ) : timesheets.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={isEn ? 'No CRA yet' : 'Aucun CRA pour le moment'}
          description={isEn ? 'Start by creating your first monthly activity report.' : "Commencez par créer votre premier compte-rendu d'activité mensuel."}
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
        <Reveal delay={0.08}>
        <AppCard>
          <div>
            {timesheets.map((t) => {
              const s = STATUS[t.status];
              return (
                <DataRow
                  key={t.id}
                  highlight={s.highlight}
                  primary={`${months[t.period_month - 1]} ${t.period_year}`}
                  secondary={
                    <>
                      {t.days_worked} {isEn ? 'days worked' : 'j travaillés'}
                      {t.days_validated > 0 && (
                        <> · {t.days_validated} {isEn ? 'days validated' : 'j validés'}</>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <StatusBadge tone={s.tone}>
                        {s.highlight && <AlertTriangle className="h-3 w-3" />}
                        {isEn ? s.label_en : s.label}
                      </StatusBadge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/portal/cra/${t.id}`}>
                          <Eye className="h-3 w-3" />
                          {isEn ? 'Open' : 'Ouvrir'}
                        </Link>
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </AppCard>
        </Reveal>
      )}
    </div>
  );
}
