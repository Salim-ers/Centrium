'use client';

import Link from 'next/link';
import { AlertTriangle, Briefcase, CalendarClock, CalendarDays, ChevronRight, ClipboardCheck, FileSignature, FileText, MapPin, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions, fetchMyProfile, type PortalProfile } from '@/lib/portal/consultant-data';
import { availabilityOf, craOverview } from '@/lib/portal/consultant-home';
import { availabilityDisplay } from '@/lib/portal/mission-phase-label';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { CONSULTANT_TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { fold } from '@/lib/utils/text';
import { formatDate } from '@/lib/format';
import { daysUntil, iso } from '@/lib/pilotage/metrics';
import { cn } from '@/lib/utils';
import type { PortalMission, Timesheet } from '@/types';
import { usePortalConsultant } from '../portal-context';
import { PortalNotifications } from '@/components/portal/PortalNotifications';

type Sheet = Pick<Timesheet, 'id' | 'mission_id' | 'period_month' | 'period_year' | 'status' | 'days_worked' | 'rejection_reason'>;

type Data = {
  profile: PortalProfile | null;
  missions: PortalMission[];
  timesheets: Sheet[];
  toSign: Array<{ id: string; title: string | null; contract_number: string | null }>;
  /** Documents partagés par l'ESN ; null si la liste n'a pas pu être lue. */
  sharedDocs: number | null;
};

async function load(consultantId: string): Promise<Data> {
  const supabase = createClient();
  const [profile, missions, timesheets, contracts, shared] = await Promise.all([
    fetchMyProfile(supabase),
    fetchMyMissions(supabase),
    supabase
      .from('timesheets')
      .select('id, mission_id, period_month, period_year, status, days_worked, rejection_reason')
      .eq('consultant_id', consultantId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24),
    supabase.from('contracts').select('id, title, contract_number').in('status', ['sent', 'pending_review']).limit(10),
    fetch('/api/portal/documents')
      .then((r) => (r.ok ? (r.json() as Promise<{ data?: unknown[] }>) : null))
      .catch(() => null),
  ]);
  return {
    profile,
    missions,
    timesheets: (timesheets.data ?? []) as Sheet[],
    toSign: (contracts.data ?? []) as Data['toSign'],
    sharedDocs: shared?.data ? shared.data.length : null,
  };
}

/**
 * Accueil du portail consultant : quatre cartes, rien de plus.
 * Ma mission, mon CRA, mes documents, ma disponibilité.
 */
export default function PortalDashboardPage() {
  const { consultantId, userId } = usePortalConsultant();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<Data>(`portal-dashboard:${consultantId}`, () => load(consultantId));

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const now = new Date();
  const missions = data?.missions ?? [];
  const cra = craOverview(missions, data?.timesheets ?? [], now);
  const { availability, next } = availabilityOf(data?.profile ?? null, missions, now);
  const todayIso = iso(now);
  const active = missions.filter((m) => m.status === 'active');
  const current = active.find((m) => m.start_date <= todayIso) ?? next;
  const others = active.filter((m) => m.id !== current?.id).length;
  const left = current?.end_date ? daysUntil(current.end_date, now) : null;
  const toSign = data?.toSign ?? [];
  const craAction = cra.rejected.length > 0 || cra.previousDue.length > 0 || cra.current.some((l) => !l.sheet || l.sheet.status === 'draft');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
          {data?.profile?.first_name ? (fr ? `Bonjour ${data.profile.first_name}` : `Hello ${data.profile.first_name}`) : fr ? 'Bonjour' : 'Hello'}
        </h1>
        <p className="text-[13.5px] text-muted-foreground">{fr ? `Votre espace ${brandName}.` : `Your ${brandName} space.`}</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Ma mission */}
        <HomeCard icon={Briefcase} title={fr ? 'Ma mission' : 'My mission'} href="/portal/missions" linkLabel={fr ? 'Mes missions' : 'My missions'}>
          {current ? (
            <>
              <Link href={`/portal/missions/${current.id}`} className="-mx-1 block rounded-lg px-1 py-0.5 hover:bg-muted/40">
                <div className="text-[15px] font-semibold leading-snug">{current.title}</div>
                {current.company_name && !fold(current.title).includes(fold(current.company_name)) && (
                  <div className="text-[13px] text-muted-foreground">{current.company_name}</div>
                )}
              </Link>
              <ul className="space-y-1 text-[12.5px] text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {current.start_date > todayIso && (fr ? 'Démarre le ' : 'Starts on ')}
                  {formatDate(current.start_date, lang)} → {current.end_date ? formatDate(current.end_date, lang) : fr ? 'sans date de fin' : 'open-ended'}
                </li>
                {(current.location || current.remote_policy) && (
                  <li className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[current.location, current.remote_policy ? REMOTE_POLICY_LABEL[current.remote_policy as RemotePolicy]?.[lang] : null].filter(Boolean).join(' · ')}
                  </li>
                )}
              </ul>
              {left != null && left >= 0 && left <= 60 && (
                <p className="text-[12.5px] font-medium text-warning">{fr ? `Se termine dans ${left} jour${left > 1 ? 's' : ''}` : `Ends in ${left} day${left > 1 ? 's' : ''}`}</p>
              )}
              {others > 0 && (
                <Link href="/portal/missions" className="text-[12.5px] text-primary-deep hover:underline">
                  {fr ? `+ ${others} autre${others > 1 ? 's' : ''} mission${others > 1 ? 's' : ''}` : `+ ${others} other mission${others > 1 ? 's' : ''}`}
                </Link>
              )}
            </>
          ) : (
            <p className="text-[13.5px] text-muted-foreground">
              {fr ? `Aucune mission en cours. Votre contact ${brandName} vous préviendra du prochain démarrage.` : `No ongoing mission. Your ${brandName} contact will let you know about the next one.`}
            </p>
          )}
        </HomeCard>

        {/* Mon CRA */}
        <HomeCard icon={ClipboardCheck} title={fr ? 'Mon CRA' : 'My timesheet'} href="/portal/cra" linkLabel={fr ? 'Tous mes CRA' : 'All timesheets'} highlight={craAction}>
          {cra.rejected.slice(0, 2).map((t) => (
            <Link key={t.id} href={`/portal/cra/${t.id}`} className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-danger-soft px-3 py-2 text-[13px]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-destructive">
                  {fr ? `À corriger : ${periodLabel(t.period_month, t.period_year, lang)}` : `To fix: ${periodLabel(t.period_month, t.period_year, lang)}`}
                </span>
                {t.rejection_reason && <span className="line-clamp-2 text-foreground/80">{t.rejection_reason}</span>}
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {cra.previousDue.map(({ mission, sheet }) => (
            <Link
              key={mission.id}
              href={sheet ? `/portal/cra/${sheet.id}` : `/portal/cra/new?mission=${mission.id}&month=${cra.prev.month}&year=${cra.prev.year}`}
              className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[13px]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {fr ? `${periodLabel(cra.prev.month, cra.prev.year, lang)} à transmettre` : `${periodLabel(cra.prev.month, cra.prev.year, lang)} to submit`}
                </span>
                {active.length > 1 && <span className="block truncate text-muted-foreground">{mission.title}</span>}
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {cra.current.length === 0 && cra.rejected.length === 0 && cra.previousDue.length === 0 && (
            <p className="text-[13.5px] text-muted-foreground">{fr ? 'Aucun CRA à remplir ce mois-ci.' : 'No timesheet to fill in this month.'}</p>
          )}
          {cra.current.map(({ mission, sheet }) => {
            const st = sheet ? statusOf(CONSULTANT_TIMESHEET_STATUS, sheet.status, lang) : null;
            const editable = !sheet || sheet.status === 'draft' || sheet.status === 'rejected';
            return (
              <div key={mission.id} className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-medium">{periodLabel(cra.month, cra.year, lang)}</span>
                  {st ? <StatusPill tone={st.tone}>{st.label}</StatusPill> : <StatusPill tone="warning">{fr ? 'À remplir' : 'To fill in'}</StatusPill>}
                  {sheet && <span className="num text-muted-foreground">{fr ? `${Number(sheet.days_worked)} j` : `${Number(sheet.days_worked)} d`}</span>}
                </div>
                {cra.current.length > 1 && <div className="-mt-1.5 truncate text-[12.5px] text-muted-foreground">{mission.title}</div>}
                <Button asChild variant={editable ? 'default' : 'secondary'} className="w-full sm:w-auto">
                  <Link href={sheet ? `/portal/cra/${sheet.id}` : `/portal/cra/new?mission=${mission.id}&month=${cra.month}&year=${cra.year}`}>
                    {!sheet && <Plus />}
                    {!sheet ? (fr ? 'Remplir mon CRA' : 'Fill in timesheet') : editable ? (fr ? 'Compléter' : 'Complete') : fr ? 'Voir' : 'View'}
                  </Link>
                </Button>
              </div>
            );
          })}
        </HomeCard>

        {/* Mes documents */}
        <HomeCard icon={FileText} title={fr ? 'Mes documents' : 'My documents'} href="/portal/documents" linkLabel={fr ? 'Ouvrir' : 'Open'} highlight={toSign.length > 0}>
          {toSign.length > 0 && (
            <Link
              href={toSign.length === 1 ? `/portal/contracts/${toSign[0]!.id}` : '/portal/contracts'}
              className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-[13px]"
            >
              <FileSignature className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{fr ? `${toSign.length} contrat${toSign.length > 1 ? 's' : ''} à signer` : `${toSign.length} contract${toSign.length > 1 ? 's' : ''} to sign`}</span>
                {toSign.length === 1 && <span className="block truncate text-muted-foreground">{toSign[0]!.title ?? toSign[0]!.contract_number}</span>}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
          <p className="text-[13.5px] text-muted-foreground">
            {data?.sharedDocs == null
              ? fr
                ? `Vos documents et ceux transmis par ${brandName}.`
                : `Your documents and those shared by ${brandName}.`
              : data.sharedDocs === 0
                ? fr
                  ? `Aucun document transmis par ${brandName} pour l’instant.`
                  : `No document shared by ${brandName} yet.`
                : fr
                  ? `${data.sharedDocs} document${data.sharedDocs > 1 ? 's' : ''} transmis par ${brandName}.`
                  : `${data.sharedDocs} document${data.sharedDocs > 1 ? 's' : ''} shared by ${brandName}.`}
          </p>
          <Button asChild variant="secondary" className="w-full sm:w-auto sm:self-start">
            <Link href="/portal/documents">{fr ? 'Déposer un document' : 'Upload a document'}</Link>
          </Button>
        </HomeCard>

        {/* Disponibilité */}
        <HomeCard icon={CalendarClock} title={fr ? 'Disponibilité' : 'Availability'} href="/portal/profile" linkLabel={fr ? 'Mon profil' : 'My profile'}>
          <div>
            <div className="text-[15px] font-semibold leading-snug">{availabilityDisplay(availability, lang).title}</div>
            <div className="text-[13px] text-muted-foreground">{availabilityDisplay(availability, lang).detail}</div>
          </div>
          {next && availability.kind === 'on_mission' && (
            <p className="text-[12.5px] text-muted-foreground">
              {fr ? `Mission suivante : ${next.title}, à partir du ${formatDate(next.start_date, lang)}.` : `Next mission: ${next.title}, from ${formatDate(next.start_date, lang)}.`}
            </p>
          )}
          <p className="text-[12.5px] text-muted-foreground">
            {fr ? `Un changement ? Prévenez votre contact ${brandName}.` : `Any change? Let your ${brandName} contact know.`}
          </p>
        </HomeCard>
      </div>

      <PortalNotifications userId={userId} limit={4} />
    </div>
  );
}

function HomeCard({
  icon: Icon,
  title,
  href,
  linkLabel,
  highlight = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  linkLabel: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4', highlight ? 'border-primary/40 ring-1 ring-primary/15' : 'border-border')}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          {title}
        </h2>
        <Link href={href} className="-my-2 py-2 text-[12.5px] text-primary-deep hover:underline">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}
