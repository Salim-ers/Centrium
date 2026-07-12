'use client';

import Link from 'next/link';
import { PhoneOff, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type OverdueFollowUp = {
  id: string;
  title: string;
  next_follow_up: string;
  priority: string | null;
  company_name: string | null;
  days_overdue: number;
};

/**
 * Widget Relances en retard — opportunités CRM dont next_follow_up est
 * dépassé sans qu'elles soient closes (won/lost/on_hold).
 *
 * Indispensable discipline commerciale. Triée par retard décroissant.
 *
 * Drill-down : /crm?followUp=overdue (header)
 *            : /crm (ligne — la page ouvre la modale d'édition)
 */
export function OverdueFollowUpsWidget() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const { data, loading, reload } = useCachedQuery<OverdueFollowUp[]>(
    `overdue-followups:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data: rows, error } = await supabase
        .from('opportunities')
        .select(
          `
          id, title, next_follow_up, priority,
          company:companies ( name )
        `,
        )
        .lt('next_follow_up', today)
        .not('status', 'in', '("won","lost","on_hold")')
        .order('next_follow_up', { ascending: true })
        .limit(6);
      if (error || !rows) return [];

      const now = Date.now();
      return rows.map((r) => {
        const company = Array.isArray(r.company) ? r.company[0] : r.company;
        const fu = new Date(r.next_follow_up as string).getTime();
        const daysOverdue = Math.max(0, Math.floor((now - fu) / 86_400_000));
        return {
          id: r.id as string,
          title: (r.title as string) ?? '—',
          next_follow_up: r.next_follow_up as string,
          priority: (r.priority as string) ?? null,
          company_name: (company?.name as string) ?? null,
          days_overdue: daysOverdue,
        };
      });
    },
    { enabled: !!activeOrgId },
  );

  useRealtimeReload(['opportunities'], () => reload(), { debounceMs: 500 });

  const items = data ?? [];

  return (
    <AppCard variant="luminous" tone="cyan" className="h-full">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center">
              <PhoneOff className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.dashboard.overdue_followups_title}
              </div>
              <div className="text-xs text-muted-foreground">{t.dashboard.overdue_followups_sub}</div>
            </div>
          </div>
          <Link
            href="/crm"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {t.nav.pipeline} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-foreground/[0.04] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
            {t.dashboard.no_overdue}
          </div>
        ) : (
          <ul className="space-y-1.5 flex-1">
            {items.map((opp) => {
              const tone =
                opp.days_overdue > 14
                  ? 'text-rose-300 border-rose-400/30 bg-rose-500/5'
                  : opp.days_overdue > 7
                    ? 'text-amber-300 border-amber-400/30 bg-amber-500/5'
                    : 'text-cyan-300 border-cyan-400/30 bg-cyan-500/5';
              return (
                <li key={opp.id}>
                  <Link
                    href={`/crm`}
                    className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] hover:bg-white/[0.04] px-2.5 py-1.5 text-xs transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground/90 truncate">
                        {opp.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {opp.company_name ?? '—'}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        tone,
                      )}
                      title={
                        isEn
                          ? `Follow-up due on ${opp.next_follow_up}`
                          : `Relance prévue le ${opp.next_follow_up}`
                      }
                    >
                      +{opp.days_overdue}{isEn ? 'd' : 'j'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppCard>
  );
}
