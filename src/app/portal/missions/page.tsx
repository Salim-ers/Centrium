'use client';

import Link from 'next/link';
import { Briefcase, CalendarDays, ChevronRight, MapPin } from 'lucide-react';

import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/EmptyState';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions } from '@/lib/portal/consultant-data';
import { missionPhase, type MissionPhase } from '@/lib/portal/consultant-home';
import { phaseDisplay } from '@/lib/portal/mission-phase-label';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { formatDate } from '@/lib/format';
import { fold } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import type { PortalMission } from '@/types';
import { usePortalConsultant } from '../portal-context';

const RANK: Record<MissionPhase['kind'], number> = { running: 0, upcoming: 1, other: 2, ended: 3 };

/** Mes missions : en cours et à venir d'abord, puis l'historique. */
export default function PortalMissionsPage() {
  const { consultantId } = usePortalConsultant();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<PortalMission[]>(`portal-missions:${consultantId}`, () => fetchMyMissions(createClient()));

  const today = new Date();
  const rows = (data ?? [])
    .map((m) => ({ m, phase: missionPhase(m, today) }))
    .sort((a, b) => RANK[a.phase.kind] - RANK[b.phase.kind] || (a.m.start_date < b.m.start_date ? 1 : -1));
  const current = rows.filter((r) => r.phase.kind !== 'ended');
  const past = rows.filter((r) => r.phase.kind === 'ended');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? 'Mes missions' : 'My missions'}</h1>
        <p className="text-[13.5px] text-muted-foreground">
          {fr ? `Vos missions avec ${brandName} : en cours, à venir et passées.` : `Your missions with ${brandName}: ongoing, upcoming and past.`}
        </p>
      </header>
      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={fr ? 'Aucune mission pour l’instant' : 'No mission yet'}
          description={fr ? `Votre contact ${brandName} vous préviendra dès qu’une mission démarre.` : `Your ${brandName} contact will let you know as soon as a mission starts.`}
        />
      ) : (
        <>
          {current.length > 0 && <MissionGroup id="missions-current" title={fr ? 'En cours et à venir' : 'Ongoing and upcoming'} rows={current} lang={lang} />}
          {past.length > 0 && <MissionGroup id="missions-past" title={fr ? 'Passées' : 'Past'} rows={past} lang={lang} />}
        </>
      )}
    </div>
  );
}

function MissionGroup({ id, title, rows, lang }: { id: string; title: string; rows: Array<{ m: PortalMission; phase: MissionPhase }>; lang: 'fr' | 'en' }) {
  return (
    <section className="space-y-2" aria-labelledby={id}>
      <h2 id={id} className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map(({ m, phase }) => {
          const ph = phaseDisplay(phase, m, lang);
          const showCompany = !!m.company_name && !fold(m.title).includes(fold(m.company_name));
          const where = [m.location, m.remote_policy ? REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy]?.[lang] : null].filter(Boolean).join(' · ');
          return (
            <li key={m.id}>
              <Link href={`/portal/missions/${m.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    <StatusPill tone={ph.tone}>{ph.label}</StatusPill>
                  </span>
                  {showCompany && <span className="block text-[13px] text-muted-foreground">{m.company_name}</span>}
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(m.start_date, lang)} → {m.end_date ? formatDate(m.end_date, lang) : '…'}
                    </span>
                    {where && phase.kind !== 'ended' && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {where}
                      </span>
                    )}
                  </span>
                  {ph.detail && phase.kind !== 'ended' && (
                    <span className={cn('mt-0.5 block text-[12.5px] font-medium', ph.soon ? 'text-warning' : 'text-muted-foreground')}>{ph.detail}</span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
