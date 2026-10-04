'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  CalendarClock,
  UserCheck,
  Hourglass,
  FileWarning,
  Inbox,
  Receipt,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionKind, ActionTone, TodayAction } from '@/lib/pilotage/load-dashboard';

const ICON: Record<ActionKind, LucideIcon> = {
  timesheets_pending: ClipboardCheck,
  missions_ending: CalendarClock,
  consultants_soon: UserCheck,
  opportunity_stale: Hourglass,
  quote_expiring: FileWarning,
  client_request: Inbox,
  prefacture_pending: Receipt,
  consultant_match: Sparkles,
};

const TONE: Record<ActionTone, string> = {
  brand: 'bg-brand-50 text-primary',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-destructive',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
};

/**
 * « À traiter aujourd'hui » : chaque ligne mène directement à l'action.
 * Liste construite à partir de l'état réel de l'organisation.
 */
export function TodayActions({
  actions,
  lang,
  loading,
}: {
  actions: TodayAction[];
  lang: 'fr' | 'en';
  loading?: boolean;
}) {
  const fr = lang === 'fr';
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">
            {fr ? "À traiter aujourd'hui" : 'To handle today'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {fr ? 'Priorités calculées sur vos données' : 'Priorities computed from your data'}
          </p>
        </div>
        {!loading && actions.length > 0 && (
          <span className="num rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {actions.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <CheckCircle2 className="mb-2 h-6 w-6 text-success" />
          <p className="text-sm font-medium text-foreground">{fr ? 'Rien d’urgent' : 'Nothing urgent'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fr ? 'CRA, missions, devis et relances sont à jour.' : 'Timesheets, missions, quotes and follow-ups are up to date.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {actions.map((a, i) => {
            const Icon = ICON[a.kind];
            return (
              <li key={a.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', TONE[a.tone])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-5 text-foreground">{a.title[lang]}</span>
                    {a.detail && <span className="block truncate text-xs text-muted-foreground">{a.detail[lang]}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
