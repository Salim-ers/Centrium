'use client';

import Link from 'next/link';
import { AlertTriangle, Briefcase, CalendarDays, ChevronRight, ClipboardCheck, FileSignature, MapPin, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions, fetchMyProfile, type PortalProfile } from '@/lib/portal/consultant-data';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { daysUntil } from '@/lib/pilotage/metrics';
import type { PortalMission, Timesheet } from '@/types';
import { usePortalConsultant } from '../portal-context';
import { PortalNotifications } from '@/components/portal/PortalNotifications';

type Data = {
  profile: PortalProfile | null;
  missions: PortalMission[];
  timesheets: Timesheet[];
  toSign: Array<{ id: string; title: string | null; contract_number: string | null }>;
};

async function load(consultantId: string): Promise<Data> {
  const supabase = createClient();
  const [profile, missions, timesheets, contracts] = await Promise.all([
    fetchMyProfile(supabase),
    fetchMyMissions(supabase),
    supabase
      .from('timesheets')
      .select('*')
      .eq('consultant_id', consultantId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24),
    supabase.from('contracts').select('id, title, contract_number').in('status', ['sent', 'pending_review']).limit(10),
  ]);
  return {
    profile,
    missions,
    timesheets: (timesheets.data ?? []) as Timesheet[],
    toSign: (contracts.data ?? []) as Data['toSign'],
  };
}

export default function PortalDashboardPage() {
  const { consultantId, userId } = usePortalConsultant();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<Data>(`portal-dashboard:${consultantId}`, () => load(consultantId));

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const active = (data?.missions ?? []).filter((m) => m.status === 'active');
  const rejected = (data?.timesheets ?? []).filter((t) => t.status === 'rejected');
  const sheetFor = (missionId: string) => (data?.timesheets ?? []).find((t) => t.mission_id === missionId && t.period_month === month && t.period_year === year);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
          {data?.profile?.first_name ? (fr ? `Bonjour ${data.profile.first_name}` : `Hello ${data.profile.first_name}`) : fr ? 'Bonjour' : 'Hello'}
        </h1>
        <p className="text-[13.5px] text-muted-foreground">{fr ? `Votre espace ${brandName}.` : `Your ${brandName} space.`}</p>
      </header>

      {rejected.length > 0 && (
        <Link href={`/portal/cra/${rejected[0]!.id}`} className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-danger-soft p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span className="flex-1">
            <span className="font-medium text-destructive">{fr ? 'CRA à corriger' : 'Timesheet to fix'}</span>
            <span className="block text-foreground/80">
              {periodLabel(rejected[0]!.period_month, rejected[0]!.period_year, lang)}
              {rejected[0]!.rejection_reason ? ` — ${rejected[0]!.rejection_reason}` : ''}
            </span>
          </span>
          <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            {fr ? `CRA de ${periodLabel(month, year, lang)}` : `${periodLabel(month, year, lang)} timesheet`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">
              {fr ? `Aucune mission en cours. Votre référent ${brandName} vous préviendra du prochain démarrage.` : `No ongoing mission. Your ${brandName} contact will let you know about the next one.`}
            </p>
          ) : (
            active.map((m) => {
              const ts = sheetFor(m.id);
              const st = ts ? statusOf(TIMESHEET_STATUS, ts.status, lang) : null;
              return (
                <div key={m.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                      {m.company_name && <span>{m.company_name}</span>}
                      {st ? <StatusPill tone={st.tone}>{st.label}</StatusPill> : <StatusPill tone="warning">{fr ? 'À remplir' : 'To fill in'}</StatusPill>}
                      {ts && <span className="num">{fr ? `${Number(ts.days_worked)} j` : `${Number(ts.days_worked)} d`}</span>}
                    </div>
                  </div>
                  {ts ? (
                    <Button asChild variant={ts.status === 'draft' || ts.status === 'rejected' ? 'default' : 'secondary'} className="w-full sm:w-auto">
                      <Link href={`/portal/cra/${ts.id}`}>{ts.status === 'draft' || ts.status === 'rejected' ? (fr ? 'Compléter' : 'Complete') : fr ? 'Voir' : 'View'}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/portal/cra/new?mission=${m.id}&month=${month}&year=${year}`}>
                        <Plus />
                        {fr ? 'Remplir mon CRA' : 'Fill in timesheet'}
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <PortalNotifications userId={userId} />

      {(data?.toSign ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-primary" />
              {fr ? 'À signer' : 'To sign'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border border-t border-border">
              {data!.toSign.map((c) => (
                <li key={c.id}>
                  <Link href={`/portal/contracts/${c.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title ?? c.contract_number ?? (fr ? 'Contrat' : 'Contract')}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            {fr ? 'Mes missions' : 'My missions'}
          </CardTitle>
          <Link href="/portal/missions" className="text-[13px] text-primary-deep hover:underline">
            {fr ? 'Tout voir' : 'See all'}
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">{fr ? 'Aucune mission en cours.' : 'No ongoing mission.'}</p>
          ) : (
            active.map((m) => {
              const left = m.end_date ? daysUntil(m.end_date, now) : null;
              return (
                <Link key={m.id} href={`/portal/missions/${m.id}`} className="block rounded-lg border border-border p-3 hover:bg-muted/40">
                  <div className="font-medium">{m.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                    {m.company_name && <span>{m.company_name}</span>}
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(m.start_date, lang)} → {m.end_date ? formatDate(m.end_date, lang) : fr ? 'sans date de fin' : 'open-ended'}
                    </span>
                    {m.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {m.location}
                      </span>
                    )}
                    {m.remote_policy && REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy] && <span>{REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy][lang]}</span>}
                  </div>
                  {left != null && left >= 0 && left <= 60 && (
                    <div className="mt-2 text-[12.5px] text-warning">{fr ? `Se termine dans ${left} jours` : `Ends in ${left} days`}</div>
                  )}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
