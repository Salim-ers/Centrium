'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Briefcase, ClipboardCheck, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/EmptyState';
import { FactList } from '@/components/app/FactList';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions } from '@/lib/portal/consultant-data';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { CONSULTANT_TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { missionPhase, runsInMonth } from '@/lib/portal/consultant-home';
import { phaseDisplay } from '@/lib/portal/mission-phase-label';
import { fold } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import { formatDate, formatEur } from '@/lib/format';
import type { PortalMission, Timesheet } from '@/types';
import { usePortalConsultant } from '../../portal-context';

// Détail d'une mission côté consultant : lecture seule, via
// portal_my_missions() (jamais de TJM de vente ni de marge). Le tarif n'est
// affiché qu'aux indépendants : c'est leur propre prix (CJM).

type Data = { mission: PortalMission | null; timesheets: Timesheet[] };

async function load(id: string): Promise<Data> {
  const supabase = createClient();
  const [missions, ts] = await Promise.all([
    fetchMyMissions(supabase),
    supabase.from('timesheets').select('*').eq('mission_id', id).eq('archived', false).order('period_year', { ascending: false }).order('period_month', { ascending: false }),
  ]);
  return { mission: missions.find((m) => m.id === id) ?? null, timesheets: (ts.data ?? []) as Timesheet[] };
}

export default function PortalMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { consultantId } = usePortalConsultant();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { data, loading } = useCachedQuery<Data>(`portal-mission:${consultantId}:${id}`, () => load(id), { enabled: !!id });

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  const m = data?.mission;
  if (!m) {
    return (
      <EmptyState
        icon={Briefcase}
        title={fr ? 'Mission introuvable' : 'Mission not found'}
        action={
          <Button asChild variant="secondary">
            <Link href="/portal/missions">{fr ? 'Mes missions' : 'My missions'}</Link>
          </Button>
        }
      />
    );
  }
  const now = new Date();
  const ph = phaseDisplay(missionPhase(m, now), m, lang);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const hasCurrent = data!.timesheets.some((t) => t.period_month === month && t.period_year === year);
  const canFill = (m.status === 'active' || m.status === 'ended') && runsInMonth(m, year, month) && !hasCurrent;
  const sheets = [...data!.timesheets].sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month);
  const showCompany = !!m.company_name && !fold(m.title).includes(fold(m.company_name));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/portal/missions" className="-my-2 inline-block py-2 text-[13px] text-muted-foreground hover:text-foreground">
          ← {fr ? 'Mes missions' : 'My missions'}
        </Link>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight sm:text-2xl">{m.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <StatusPill tone={ph.tone}>{ph.label}</StatusPill>
          {showCompany && <span>{m.company_name}</span>}
          {ph.detail && <span className={cn(ph.soon && 'font-medium text-warning')}>{ph.detail}</span>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <FactList
            facts={[
              { label: fr ? 'Début' : 'Start', value: formatDate(m.start_date, lang) },
              { label: fr ? 'Fin' : 'End', value: m.end_date ? formatDate(m.end_date, lang) : fr ? 'Non définie' : 'Not set' },
              { label: fr ? 'Lieu' : 'Location', value: m.location || '—' },
              { label: fr ? 'Télétravail' : 'Remote', value: m.remote_policy && REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy] ? REMOTE_POLICY_LABEL[m.remote_policy as RemotePolicy][lang] : '—' },
              ...(m.planned_days != null ? [{ label: fr ? 'Jours prévus' : 'Planned days', value: String(m.planned_days) }] : []),
              ...(m.contract_number ? [{ label: fr ? 'Référence contrat' : 'Contract ref.', value: m.contract_number }] : []),
              ...(m.consultant_rate != null ? [{ label: fr ? 'Votre tarif journalier' : 'Your day rate', value: formatEur(Number(m.consultant_rate), lang) }] : []),
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            {fr ? 'Mes CRA' : 'My timesheets'}
          </CardTitle>
          {canFill && (
            <Button asChild size="sm">
              <Link href={`/portal/cra/new?mission=${m.id}&month=${month}&year=${year}`}>
                <Plus />
                {fr ? 'CRA du mois' : 'This month'}
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {sheets.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-muted-foreground">{fr ? 'Aucun CRA pour cette mission.' : 'No timesheet for this mission.'}</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {sheets.map((t) => {
                const ts = statusOf(CONSULTANT_TIMESHEET_STATUS, t.status, lang);
                return (
                  <li key={t.id}>
                    <Link href={`/portal/cra/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-[13.5px] hover:bg-muted/50">
                      <span className="flex-1 font-medium">{periodLabel(t.period_month, t.period_year, lang)}</span>
                      <span className="num text-muted-foreground">{fr ? `${Number(t.days_worked)} j` : `${Number(t.days_worked)} d`}</span>
                      <StatusPill tone={ts.tone}>{ts.label}</StatusPill>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
