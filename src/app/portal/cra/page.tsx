'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions } from '@/lib/portal/consultant-data';
import { TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import type { PortalMission, Timesheet } from '@/types';
import { usePortalConsultant } from '../portal-context';

type Data = { timesheets: Timesheet[]; missions: Record<string, PortalMission> };

async function load(consultantId: string): Promise<Data> {
  const supabase = createClient();
  const [ts, missions] = await Promise.all([
    supabase
      .from('timesheets')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(120),
    fetchMyMissions(supabase),
  ]);
  return { timesheets: (ts.data ?? []) as Timesheet[], missions: Object.fromEntries(missions.map((m) => [m.id, m])) };
}

export default function PortalCraListPage() {
  const { consultantId } = usePortalConsultant();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<Data>(`portal-cra:${consultantId}`, () => load(consultantId));

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mes CRA' : 'My timesheets'}</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {fr ? 'Saisissez vos jours, télétravail et absences, puis soumettez.' : 'Enter your days, remote work and absences, then submit.'}
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/portal/cra/new">
            <Plus />
            {fr ? 'Nouveau CRA' : 'New timesheet'}
          </Link>
        </Button>
      </header>
      <Button asChild className="w-full sm:hidden">
        <Link href="/portal/cra/new">
          <Plus />
          {fr ? 'Nouveau CRA' : 'New timesheet'}
        </Link>
      </Button>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data?.timesheets.length ? (
        <EmptyState icon={ClipboardCheck} title={fr ? 'Aucun CRA' : 'No timesheets'} description={fr ? 'Créez votre premier CRA pour le mois en cours.' : 'Create your first timesheet for this month.'} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {data.timesheets.map((t) => {
                const st = statusOf(TIMESHEET_STATUS, t.status, lang);
                const m = t.mission_id ? data.missions[t.mission_id] : null;
                return (
                  <li key={t.id}>
                    <Link href={`/portal/cra/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{periodLabel(t.period_month, t.period_year, lang)}</span>
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                          {m ? `${m.title}${m.company_name ? ` · ${m.company_name}` : ''}` : '—'}
                          {' · '}
                          <span className="num">{fr ? `${Number(t.days_worked)} j` : `${Number(t.days_worked)} d`}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
