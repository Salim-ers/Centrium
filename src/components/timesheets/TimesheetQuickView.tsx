'use client';

import Link from 'next/link';
import { ArrowUpRight, Check, X } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { TimesheetCalendar, type CalendarDay } from '@/components/timesheets/TimesheetCalendar';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { createClient } from '@/lib/supabase/client';
import { consultantName, type TimesheetRow } from '@/lib/timesheets/approvals';
import { TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';

/**
 * Aperçu d'un CRA dans un tiroir : le mois jour par jour, le décompte,
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
  const sum = (pred: (d: CalendarDay) => boolean) => list.filter(pred).reduce((s, d) => s + Number(d.duration || 0), 0);
  const counts = [
    { label: fr ? 'Travaillés' : 'Worked', value: sum((d) => d.kind === 'worked') },
    { label: fr ? 'dont télétravail' : 'of which remote', value: sum((d) => d.kind === 'worked' && !!d.is_remote) },
    { label: fr ? 'Congés, absences' : 'Leave, absence', value: sum((d) => d.kind === 'paid_leave' || d.kind === 'sick_leave' || d.kind === 'unpaid_leave') },
  ];

  const overview = (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {counts.map((c) => (
          <div key={c.label} className="rounded-xl bg-app-sand/50 px-3 py-2.5">
            <div className="text-[11.5px] font-medium text-muted-foreground">{c.label}</div>
            <div className="num mt-0.5 text-[16px] font-semibold leading-tight">{loading && !days ? '…' : `${c.value} j`}</div>
          </div>
        ))}
      </div>
      {row.status === 'rejected' && row.rejection_reason && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-destructive">
          {fr ? 'Motif du renvoi : ' : 'Reason: '}
          {row.rejection_reason}
        </p>
      )}
      {loading && !days ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <TimesheetCalendar year={row.period_year} month={row.period_month} days={list} editable={false} />
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
      subtitle={[row.mission?.title, row.mission?.companies?.name].filter(Boolean).join(' · ')}
      badges={
        <>
          <StatusPill tone={st.tone}>{st.label}</StatusPill>
          <span className="num text-[12.5px] text-muted-foreground">
            {row.status === 'client_validated' ? row.days_validated : row.days_worked} {fr ? 'jours' : 'days'}
          </span>
        </>
      }
      tabs={[{ id: 'month', label: fr ? 'Mois' : 'Month', content: overview }]}
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
