'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, X } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { NotesPanel } from '@/components/app/NotesPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { TimesheetCalendar, type CalendarDay } from '@/components/timesheets/TimesheetCalendar';
import { MonthChecks } from '@/components/timesheets/MonthChecks';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { createClient } from '@/lib/supabase/client';
import { consultantName, missionLabel, type TimesheetRow } from '@/lib/timesheets/approvals';
import { expectedDays, monthChecks, monthTotals } from '@/lib/timesheets/month';
import { TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';

/**
 * Aperçu d'un CRA dans un tiroir : le décompte, les contrôles (jours sans
 * saisie, saisies hors mission, fériés travaillés), le mois jour par jour
 * et la décision (valider, renvoyer) sans quitter la liste.
 */
export function TimesheetQuickView({
  row,
  open,
  onOpenChange,
  lang,
  canValidate,
  busy,
  onValidate,
  onReject,
}: {
  row: TimesheetRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: 'fr' | 'en';
  canValidate: boolean;
  busy: boolean;
  onValidate: (row: TimesheetRow) => void;
  onReject: (row: TimesheetRow) => void;
}) {
  const fr = lang === 'fr';
  const { data: days, loading } = useCachedQuery<CalendarDay[]>(
    `timesheet-days:${row?.id ?? 'none'}`,
    async () => {
      const { data } = await createClient().from('timesheet_days').select('*').eq('timesheet_id', row!.id).order('day_date', { ascending: true });
      return (data ?? []) as CalendarDay[];
    },
    { enabled: open && !!row },
  );
  if (!row) return null;

  const st = statusOf(TIMESHEET_STATUS, row.status, lang);
  const list = days ?? [];
  // Les absences ont une durée nulle : on les compte en jours, pas en durée.
  const totals = monthTotals(list);
  const counts = [
    { label: fr ? 'Travaillés' : 'Worked', value: totals.worked },
    { label: fr ? 'dont télétravail' : 'of which remote', value: totals.remote },
    { label: fr ? 'Congés, absences' : 'Leave, absence', value: totals.absences },
  ];
  const span = row.mission ? { start_date: row.mission.start_date ?? null, end_date: row.mission.end_date ?? null } : null;
  const expected = expectedDays(row.period_year, row.period_month, span).length;
  const checks = monthChecks(row.period_year, row.period_month, span, list);
  const reviewing = row.status === 'submitted' || row.status === 'draft';

  const overview = (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {counts.map((c) => (
          <div key={c.label} className="rounded-xl bg-app-sand/50 px-3 py-2.5">
            <div className="text-[11.5px] font-medium text-muted-foreground">{c.label}</div>
            <div className="num mt-0.5 text-[16px] font-semibold leading-tight">{loading && !days ? '…' : `${c.value.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} ${fr ? 'j' : 'd'}`}</div>
          </div>
        ))}
      </div>
      {reviewing && !(loading && !days) && (
        <div className="space-y-2">
          <p className="text-[12.5px] text-muted-foreground">
            {fr
              ? `${expected} jour${expected > 1 ? 's' : ''} ouvré${expected > 1 ? 's' : ''} attendu${expected > 1 ? 's' : ''} sur la mission ce mois-ci.`
              : `${expected} working day${expected > 1 ? 's' : ''} expected on the mission this month.`}
          </p>
          <MonthChecks checks={checks} okText={fr ? 'Rien à signaler : chaque jour ouvré de la mission est renseigné.' : 'Nothing to flag: every working day of the mission is filled in.'} />
        </div>
      )}
      {row.status === 'rejected' && row.rejection_reason && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-destructive">
          {fr ? 'Motif du renvoi : ' : 'Reason: '}
          {row.rejection_reason}
        </p>
      )}
      {loading && !days ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <TimesheetCalendar year={row.period_year} month={row.period_month} days={list} editable={false} missionSpan={span} />
      )}
      {row.submitted_at && (
        <p className="text-xs text-muted-foreground">
          {fr ? 'Soumis le' : 'Submitted on'} {formatDate(row.submitted_at, lang)}
        </p>
      )}
    </div>
  );

  const decide = canValidate && row.status === 'submitted';
  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`${consultantName(row)} · ${periodLabel(row.period_month, row.period_year, lang)}`}
      subtitle={missionLabel(row.mission?.title, row.mission?.companies?.name)}
      badges={
        <>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          <span className="num text-[12.5px] text-muted-foreground">
            {row.status === 'client_validated' ? row.days_validated : row.days_worked} {fr ? 'jours' : 'days'}
          </span>
        </>
      }
      tabs={[
        { id: 'month', label: fr ? 'Mois' : 'Month', content: overview },
        {
          id: 'comments',
          label: fr ? 'Commentaires' : 'Comments',
          content: (
            <div className="space-y-3">
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-[12px] text-muted-foreground">
                {fr
                  ? 'Commentaires internes de l’équipe, jamais visibles par le consultant. Pour lui demander une correction, renvoyez le CRA avec un motif.'
                  : 'Internal team comments, never shown to the consultant. To ask for a fix, send the timesheet back with a reason.'}
              </p>
              <NotesPanel entityType="timesheet" entityId={row.id} canEdit={canValidate} />
            </div>
          ),
        },
      ]}
      footer={
        <>
          <Button asChild variant="ghost" className="mr-auto">
            <Link href={`/timesheets/${row.id}`}>
              {fr ? 'Ouvrir le CRA' : 'Open timesheet'}
              <ArrowUpRight />
            </Link>
          </Button>
          {decide && (
            <>
              <Button variant="secondary" onClick={() => onReject(row)} disabled={busy}>
                <X />
                {fr ? 'Renvoyer' : 'Send back'}
              </Button>
              <Button onClick={() => onValidate(row)} loading={busy}>
                <Check />
                {fr ? 'Valider' : 'Approve'}
              </Button>
            </>
          )}
        </>
      }
    />
  );
}
