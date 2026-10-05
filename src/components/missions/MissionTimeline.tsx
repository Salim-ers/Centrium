'use client';

import Link from 'next/link';

import { missionTimeline, type MonthState } from '@/lib/missions/timeline';
import { cn } from '@/lib/utils';

const STYLE: Record<MonthState, string> = {
  validated: 'bg-[#E3EDE4] text-[#2F6B45]',
  submitted: 'bg-app-peach text-app-terra-deep',
  draft: 'bg-app-sand text-app-terra-dark',
  rejected: 'bg-danger-soft text-destructive',
  missing: 'border border-dashed border-destructive/40 bg-danger-soft/40 text-destructive',
  current: 'bg-app-sand/70 text-app-terra-dark',
  future: 'border border-dashed border-border bg-card text-muted-foreground',
};

const LABEL: Record<MonthState, { fr: string; en: string }> = {
  validated: { fr: 'Validé', en: 'Approved' },
  submitted: { fr: 'À valider', en: 'To approve' },
  draft: { fr: 'Brouillon', en: 'Draft' },
  rejected: { fr: 'Refusé', en: 'Rejected' },
  missing: { fr: 'Manquant', en: 'Missing' },
  current: { fr: 'En cours', en: 'In progress' },
  future: { fr: 'À venir', en: 'Upcoming' },
};

const LEGEND: MonthState[] = ['validated', 'submitted', 'missing', 'current', 'future'];

/**
 * Frise de la mission : un mois par case, état du CRA et jours. Un clic
 * ouvre le CRA du mois.
 */
export function MissionTimeline({
  start,
  end,
  sheets,
  today,
  lang,
}: {
  start: string;
  end: string | null;
  sheets: Array<{ id: string; period_year: number; period_month: number; status: string; days_worked: number | null; days_validated: number | null }>;
  today: string;
  lang: 'fr' | 'en';
}) {
  const fr = lang === 'fr';
  const months = missionTimeline(start, end, sheets, today);
  const fmt = new Intl.DateTimeFormat(fr ? 'fr-FR' : 'en-GB', { month: 'short' });

  return (
    <div>
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-1.5" aria-label={fr ? 'Mois de la mission' : 'Mission months'}>
        {months.map((mo, i) => {
          const label = fmt.format(new Date(Date.UTC(mo.year, mo.month - 1, 15)));
          const showYear = i === 0 || mo.month === 1;
          const body = (
            <>
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-[12.5px] font-semibold capitalize">{label}</span>
                {showYear && <span className="num text-[10.5px] opacity-70">{mo.year}</span>}
              </span>
              <span className="num mt-1 block text-[15px] font-semibold leading-none">{mo.days != null ? `${mo.days} j` : '—'}</span>
              <span className="mt-1 block truncate text-[10.5px] font-medium opacity-80">{LABEL[mo.state][lang]}</span>
            </>
          );
          const cls = cn('block rounded-xl px-2.5 py-2 transition-transform', STYLE[mo.state], mo.isCurrent && 'ring-2 ring-app-terra ring-offset-1 ring-offset-card');
          return (
            <li key={`${mo.year}-${mo.month}`}>
              {mo.timesheetId ? (
                <Link href={`/timesheets/${mo.timesheetId}`} className={cn(cls, 'hover:-translate-y-0.5')} aria-label={`${label} ${mo.year} · ${LABEL[mo.state][lang]}`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        {LEGEND.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-[4px]', STYLE[s])} />
            {LABEL[s][lang]}
          </span>
        ))}
      </div>
    </div>
  );
}
