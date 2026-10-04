'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar } from '@/components/ui/avatar';
import { mergeDays, nextFreeDate, segmentIn, type PlanningWindow } from '@/lib/staffing/planning';
import { formatDate } from '@/lib/format';
import type { StaffingConsultant, StaffingMission, StaffingProposal } from '@/lib/staffing/load-staffing';

type Row = {
  consultant: StaffingConsultant;
  missions: StaffingMission[];
  leaves: string[];
  proposals: StaffingProposal[];
};

const MISSION_STYLE: Record<string, string> = {
  active: 'bg-primary text-primary-foreground border-primary',
  proposed: 'bg-brand-50 text-primary-deep border-brand-200 border-dashed',
  ended: 'bg-sand-200 text-sand-800 border-sand-300',
  suspended: 'bg-warning-soft text-warning border-warning/30',
};

/**
 * Planning de staffing : une ligne par consultant, la période en colonnes.
 * Missions (en cours, proposées, terminées, suspendues), congés saisis dans
 * les CRA, disponibilité à venir et positionnements en cours.
 */
export function StaffingPlanning({ rows, win, lang, today }: { rows: Row[]; win: PlanningWindow; lang: 'fr' | 'en'; today: string }) {
  const fr = lang === 'fr';
  const todaySeg = segmentIn(win, today, today);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* En-tête des colonnes */}
          <div className="sticky top-0 z-[2] flex border-b border-border bg-muted/70 backdrop-blur-[2px]">
            <div className="sticky left-0 z-[3] w-60 shrink-0 border-r border-border bg-muted/90 px-4 py-2 text-xs font-medium text-muted-foreground">
              {fr ? 'Consultant' : 'Consultant'}
            </div>
            <div className="relative flex flex-1">
              {win.columns.map((c) => (
                <div key={c.key} className="flex-1 border-r border-border/70 px-2 py-2 last:border-r-0">
                  <div className="text-xs font-medium capitalize text-foreground">{c.label[lang]}</div>
                  {c.sub && <div className="text-[10px] text-muted-foreground">{c.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {rows.map(({ consultant: c, missions, leaves, proposals }) => {
            const free = nextFreeDate(missions, today);
            const freeSeg = free && free <= win.end ? segmentIn(win, free < win.start ? win.start : free, null) : null;
            const onBench = free === today && c.status !== 'unavailable';
            return (
              <div key={c.id} className="group flex border-b border-border last:border-b-0 hover:bg-muted/30">
                <div className="sticky left-0 z-[1] flex w-60 shrink-0 items-center gap-2.5 border-r border-border bg-card px-4 py-2.5 group-hover:bg-muted/40">
                  <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                  <div className="min-w-0">
                    <Link href={`/consultants/${c.id}`} className="block truncate text-[13px] font-medium hover:text-primary-deep">
                      {c.first_name} {c.last_name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{c.job_title}</span>
                      {onBench && <span className="shrink-0 rounded bg-warning-soft px-1 font-medium text-warning">{fr ? 'Intercontrat' : 'Bench'}</span>}
                      {proposals.length > 0 && (
                        <Tooltip
                          label={
                            <span className="block space-y-0.5">
                              {proposals.slice(0, 5).map((p) => (
                                <span key={p.opportunity_id} className="block">
                                  {p.title}
                                  {p.company_name ? ` · ${p.company_name}` : ''}
                                </span>
                              ))}
                            </span>
                          }
                        >
                          <span className="shrink-0 cursor-default rounded bg-brand-50 px-1 font-medium text-primary-deep">
                            {proposals.length} {fr ? 'posit.' : 'prop.'}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative h-12 flex-1">
                  {/* Grille */}
                  <div aria-hidden className="absolute inset-0 flex">
                    {win.columns.map((col) => (
                      <div key={col.key} className="flex-1 border-r border-border/50 last:border-r-0" />
                    ))}
                  </div>
                  {/* Disponibilité à venir */}
                  {freeSeg && c.status !== 'unavailable' && (
                    <div
                      aria-hidden
                      className="absolute inset-y-2 rounded-sm bg-success-soft"
                      style={{ left: `${freeSeg.left}%`, width: `${freeSeg.width}%` }}
                      title={fr ? `Disponible à partir du ${formatDate(free!, lang)}` : `Available from ${formatDate(free!, lang)}`}
                    />
                  )}
                  {/* Missions */}
                  {missions.map((m) => {
                    const seg = segmentIn(win, m.start_date, m.end_date);
                    if (!seg) return null;
                    return (
                      <Link
                        key={m.id}
                        href={`/missions/${m.id}`}
                        className={cn(
                          'absolute top-2.5 flex h-7 items-center overflow-hidden rounded-md border px-2 text-[11px] font-medium shadow-xs transition-transform hover:z-[1] hover:-translate-y-px',
                          MISSION_STYLE[m.status] ?? MISSION_STYLE.ended,
                          seg.clippedStart && 'rounded-l-none',
                          seg.clippedEnd && 'rounded-r-none',
                        )}
                        style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 1.2)}%` }}
                        title={`${m.title}${m.company_name ? ` · ${m.company_name}` : ''} · ${formatDate(m.start_date, lang, 'short')} → ${m.end_date ? formatDate(m.end_date, lang, 'short') : fr ? 'sans fin' : 'open'}`}
                      >
                        <span className="truncate">{m.company_name ?? m.title}</span>
                      </Link>
                    );
                  })}
                  {/* Congés */}
                  {mergeDays(leaves).map((l) => {
                    const seg = segmentIn(win, l.start, l.end);
                    if (!seg) return null;
                    return (
                      <div
                        key={l.start}
                        className="absolute bottom-0.5 h-1.5 rounded-full bg-[repeating-linear-gradient(135deg,#C4B0A1_0_3px,transparent_3px_6px)]"
                        style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.8)}%` }}
                        title={`${fr ? 'Congés' : 'Leave'} : ${formatDate(l.start, lang, 'short')} → ${formatDate(l.end, lang, 'short')}`}
                      />
                    );
                  })}
                  {/* Aujourd'hui */}
                  {todaySeg && (
                    <div aria-hidden className="absolute inset-y-0 w-px bg-primary/60" style={{ left: `${todaySeg.left + todaySeg.width / 2}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlanningLegend({ lang }: { lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const items = [
    { cls: 'bg-primary', label: fr ? 'Mission en cours' : 'Active mission' },
    { cls: 'border border-dashed border-brand-200 bg-brand-50', label: fr ? 'Mission proposée' : 'Proposed mission' },
    { cls: 'bg-sand-200', label: fr ? 'Terminée' : 'Ended' },
    { cls: 'bg-success-soft', label: fr ? 'Disponible' : 'Available' },
    { cls: 'bg-[repeating-linear-gradient(135deg,#C4B0A1_0_3px,transparent_3px_6px)]', label: fr ? 'Congés (CRA)' : 'Leave (timesheets)' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn('inline-block h-2.5 w-4 rounded-sm', i.cls)} />
          {i.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-px bg-primary/60" />
        {fr ? "Aujourd'hui" : 'Today'}
      </li>
    </ul>
  );
}
