'use client';

import Link from 'next/link';
import { Briefcase, CalendarDays, ChevronRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions } from '@/lib/portal/consultant-data';
import { MISSION_STATUS, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import type { PortalMission } from '@/types';
import { usePortalConsultant } from '../portal-context';

const ORDER: Record<string, number> = { active: 0, proposed: 1, suspended: 2, ended: 3, rejected: 4 };

export default function PortalMissionsPage() {
  const { consultantId } = usePortalConsultant();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<PortalMission[]>(`portal-missions:${consultantId}`, () => fetchMyMissions(createClient()));
  const missions = [...(data ?? [])].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (a.start_date < b.start_date ? 1 : -1));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mes missions' : 'My missions'}</h1>
        <p className="text-[13.5px] text-muted-foreground">{fr ? 'Missions en cours, à venir et passées.' : 'Ongoing, upcoming and past missions.'}</p>
      </header>
      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : missions.length === 0 ? (
        <EmptyState icon={Briefcase} title={fr ? 'Aucune mission' : 'No missions'} description={fr ? 'Vos missions apparaîtront ici.' : 'Your missions will appear here.'} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {missions.map((m) => {
                const st = statusOf(MISSION_STATUS, m.status, lang);
                return (
                  <li key={m.id}>
                    <Link href={`/portal/missions/${m.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{m.title}</span>
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                          {m.company_name && <span>{m.company_name}</span>}
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(m.start_date, lang)} → {m.end_date ? formatDate(m.end_date, lang) : '…'}
                          </span>
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
