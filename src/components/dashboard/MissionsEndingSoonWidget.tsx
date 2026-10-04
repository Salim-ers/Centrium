'use client';

import Link from 'next/link';
import { CalendarClock, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type EndingMission = {
  id: string;
  title: string;
  end_date: string;
  consultant_first_name: string;
  consultant_last_name: string;
  client_name: string | null;
  days_left: number;
};

/**
 * Widget Missions qui se terminent dans les 30 prochains jours.
 *
 * Triées par end_date ASC. Couleur de l'urgence : rouge <7j, ambre <15j,
 * neutre sinon. Permet d'anticiper le staffing et de relancer le client
 * sur une éventuelle prolongation.
 *
 * Drill-down : /missions?status=active&endingWithin=30 (header)
 *            : /missions (ligne)
 */
export function MissionsEndingSoonWidget() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();

  const { data, loading, reload } = useCachedQuery<EndingMission[]>(
    `missions-ending-soon:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const today = new Date();
      const in30 = new Date(today.getTime() + 30 * 86_400_000);
      const todayStr = today.toISOString().slice(0, 10);
      const in30Str = in30.toISOString().slice(0, 10);

      const { data: rows, error } = await supabase
        .from('missions')
        .select(
          `
          id,
          title,
          end_date,
          consultant:consultants ( first_name, last_name ),
          company:companies ( name )
        `,
        )
        .eq('status', 'active')
        .eq('archived', false)
        .gte('end_date', todayStr)
        .lte('end_date', in30Str)
        .order('end_date', { ascending: true })
        .limit(6);
      if (error || !rows) return [];

      return rows.map((r) => {
        const endTime = new Date(r.end_date as string).getTime();
        const daysLeft = Math.max(0, Math.ceil((endTime - today.getTime()) / 86_400_000));
        const consultant = Array.isArray(r.consultant) ? r.consultant[0] : r.consultant;
        const company = Array.isArray(r.company) ? r.company[0] : r.company;
        return {
          id: r.id as string,
          title: (r.title as string) ?? '—',
          end_date: r.end_date as string,
          consultant_first_name: (consultant?.first_name as string) ?? '',
          consultant_last_name: (consultant?.last_name as string) ?? '',
          client_name: (company?.name as string) ?? null,
          days_left: daysLeft,
        };
      });
    },
    { enabled: !!activeOrgId },
  );

  useRealtimeReload(['missions'], () => reload(), { debounceMs: 500 });

  const missions = data ?? [];

  return (
    <AppCard variant="luminous" tone="rose" className="h-full">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-destructive/15 border border-destructive/20 flex items-center justify-center">
              <CalendarClock className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.dashboard.missions_ending_title}
              </div>
              <div className="text-xs text-muted-foreground">{t.dashboard.missions_ending_sub}</div>
            </div>
          </div>
          <Link
            href="/missions"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {t.dashboard.see_all} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-foreground/[0.04] animate-pulse" />
            ))}
          </div>
        ) : missions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
            {t.dashboard.no_mission_ending}
          </div>
        ) : (
          <ul className="space-y-1.5 flex-1">
            {missions.map((m) => {
              const tone =
                m.days_left < 7
                  ? 'text-destructive border-destructive/30 bg-destructive/5'
                  : m.days_left < 15
                    ? 'text-warning border-warning/30 bg-warning/5'
                    : 'text-muted-foreground border-border';
              return (
                <li key={m.id}>
                  <Link
                    href={`/missions`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border hover:bg-muted px-2.5 py-1.5 text-xs transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground/90 truncate">
                        {m.consultant_first_name} {m.consultant_last_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {m.client_name ? `${m.client_name} · ` : ''}
                        {m.title}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        tone,
                      )}
                    >
                      {m.days_left}j
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
