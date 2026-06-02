'use client';

import { useEffect, useState } from 'react';
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
  type StatusTone,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const STATUS: Record<Timesheet['status'], { label: string; tone: StatusTone; highlight?: boolean }> = {
  draft: { label: 'Brouillon', tone: 'pending' },
  submitted: { label: 'En attente', tone: 'info' },
  client_validated: { label: 'Validé', tone: 'success' },
  rejected: { label: 'Rejeté', tone: 'danger', highlight: true },
};

export default function PortalCraListPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('timesheets')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      setTimesheets((data ?? []) as Timesheet[]);
      setLoading(false);
    })();
  }, []);

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
        eyebrow="Mon espace"
        title={<>Mes <span className="qc-italic-accent font-editorial italic">comptes-rendus.</span></>}
        description="Déclarez votre activité mensuelle et suivez l'avancement de vos CRA."
        actions={
          <Button asChild>
            <Link href="/portal/cra/new">
              <Plus className="h-4 w-4" />
              Nouveau CRA
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="CRA validés"
          value={validated}
          icon={CalendarCheck}
          tone="emerald"
        />
        <KPICard
          label="En attente"
          value={pending}
          icon={Hourglass}
          tone="amber"
          hint="Validation client"
        />
        <KPICard
          label="Jours saisis"
          value={totalDays}
          icon={CalendarDays}
          tone="violet"
          suffix="j"
        />
        <KPICard
          label="Mois courant"
          valueText={currentMonthTs ? STATUS[currentMonthTs.status].label : 'À créer'}
          icon={ClipboardCheck}
          tone="magenta"
          hint={`${MONTHS[currentMonth - 1]} ${currentYear}`}
        />
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />
      ) : timesheets.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucun CRA pour le moment"
          description="Commencez par créer votre premier compte-rendu d'activité mensuel."
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
        <AppCard>
          <div>
            {timesheets.map((t) => {
              const s = STATUS[t.status];
              return (
                <DataRow
                  key={t.id}
                  highlight={s.highlight}
                  primary={`${MONTHS[t.period_month - 1]} ${t.period_year}`}
                  secondary={
                    <>
                      {t.days_worked} j travaillés
                      {t.days_validated > 0 && (
                        <> · {t.days_validated} j validés</>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <StatusBadge tone={s.tone}>
                        {s.highlight && <AlertTriangle className="h-3 w-3" />}
                        {s.label}
                      </StatusBadge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/portal/cra/${t.id}`}>
                          <Eye className="h-3 w-3" />
                          Ouvrir
                        </Link>
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </AppCard>
      )}
    </div>
  );
}
