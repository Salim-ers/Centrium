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

// Couleurs V2 : mission en cours terracotta, à venir pêche, fin imminente
// ambre, proposée en pointillés, terminée sable ; disponible sauge clair.
const MISSION_STYLE: Record<string, string> = {
  active: 'bg-app-terra text-white border-app-terra',
  future: 'bg-app-peach text-app-terra-deep border-app-peach',
  ending: 'bg-[#E3A23F] text-white border-[#E3A23F]',
  proposed: 'bg-app-peach-light text-app-terra-dark border-app-terra/40 border-dashed',
  ended: 'bg-app-sand text-app-muted border-black/[0.05]',
  suspended: 'bg-warning-soft text-warning border-warning/30',
};
const AVAILABLE = 'bg-[#E3EDE4]';
const LEAVE = 'bg-[repeating-linear-gradient(135deg,#C9B8AC_0_3px,transparent_3px_6px)]';

function addDaysIso(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Style d'une mission selon sa position dans le temps. */
function missionStyle(m: StaffingMission, today: string) {
  if (m.status !== 'active') return MISSION_STYLE[m.status] ?? MISSION_STYLE.ended;
  if (m.start_date > today) return MISSION_STYLE.future;
  if (m.end_date && m.end_date >= today && m.end_date <= addDaysIso(today, 30)) return MISSION_STYLE.ending;
  return MISSION_STYLE.active;
}

/**
 * Planning de staffing : une ligne par consultant, la période en colonnes.
 * Missions (en cours, proposées, terminées, suspendues), congés saisis dans
 * les CRA, disponibilité à venir et positionnements en cours.
 */
export function StaffingPlanning({ rows, win, lang, today, fill = false }: { rows: Row[]; win: PlanningWindow; lang: 'fr' | 'en'; today: string; fill?: boolean }) {
  const fr = lang === 'fr';
  const todaySeg = segmentIn(win, today, today);

  return (
    <div className={cn('tile-surface overflow-hidden', fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className={cn('overflow-x-auto', fill && 'min-h-0 flex-1 overflow-y-auto')}>
        <div className="min-w-[960px]">
          {/* En-tête des colonnes */}
          <div className="sticky top-0 z-[2] flex border-b border-border bg-card/95 backdrop-blur-[2px]">
            <div className="sticky left-0 z-[3] w-60 shrink-0 border-r border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
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

                <div className="relative h-11 flex-1">
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
                      className={cn('absolute inset-y-2 rounded-md', AVAILABLE)}
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
                          'absolute top-2 flex h-7 items-center overflow-hidden rounded-lg border px-2 text-[11px] font-semibold shadow-xs transition-transform hover:z-[1] hover:-translate-y-px',
                          missionStyle(m, today),
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
                        className={cn('absolute bottom-0.5 h-1.5 rounded-full', LEAVE)}
                        style={{ left: `${seg.left}%`, width: `${Math.max(seg.width, 0.8)}%` }}
                        title={`${fr ? 'Congés' : 'Leave'} : ${formatDate(l.start, lang, 'short')} → ${formatDate(l.end, lang, 'short')}`}
                      />
                    );
                  })}
                  {/* Aujourd'hui */}
                  {todaySeg && (
                    <div aria-hidden className="absolute inset-y-0 w-px bg-app-terra" style={{ left: `${todaySeg.left + todaySeg.width / 2}%` }} />
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
    { cls: 'bg-app-terra', label: fr ? 'En mission' : 'On mission' },
    { cls: 'bg-app-peach', label: fr ? 'Mission à venir' : 'Upcoming' },
    { cls: 'bg-[#E3A23F]', label: fr ? 'Fin sous 30 j' : 'Ends within 30 d' },
    { cls: 'border border-dashed border-app-terra/40 bg-app-peach-light', label: fr ? 'Proposée' : 'Proposed' },
    { cls: AVAILABLE, label: fr ? 'Disponible' : 'Available' },
    { cls: LEAVE, label: fr ? 'Congés' : 'Leave' },
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
        <span aria-hidden className="inline-block h-3 w-px bg-app-terra" />
        {fr ? "Aujourd'hui" : 'Today'}
      </li>
    </ul>
  );
}
