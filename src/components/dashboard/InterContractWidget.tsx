'use client';

import Link from 'next/link';
import { UserMinus, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';

type InterContractStats = {
  total: number;
  longTerm: number; // > 30 jours
  avgDays: number | null;
  maxDays: number | null;
};

/**
 * Widget Intercontrat — affiche le nombre de consultants disponibles dont
 * la dernière mission est terminée + l'ancienneté du bench. Critique pour
 * piloter le coût latent et prioriser la prospection.
 *
 * Source : table `consultants` (status='available' + current_mission_end < NOW()).
 * Drill-down : /consultants?status=available&endedBefore=today
 */
export function InterContractWidget() {
  const { activeOrgId } = useOrganization();

  const { data, loading, reload } = useCachedQuery<InterContractStats>(
    `intercontract:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data: rows, error } = await supabase
        .from('consultants')
        .select('current_mission_end')
        .eq('archived', false)
        .eq('is_prospect', false)
        .eq('status', 'available')
        .not('current_mission_end', 'is', null)
        .lte('current_mission_end', today);
      if (error || !rows) {
        return { total: 0, longTerm: 0, avgDays: null, maxDays: null };
      }
      const now = Date.now();
      const days = rows
        .map((r) => {
          const t = new Date(r.current_mission_end as string).getTime();
          return Math.max(0, Math.floor((now - t) / 86_400_000));
        })
        .filter((d) => Number.isFinite(d));
      return {
        total: rows.length,
        longTerm: days.filter((d) => d > 30).length,
        avgDays: days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null,
        maxDays: days.length > 0 ? Math.max(...days) : null,
      };
    },
    { enabled: !!activeOrgId },
  );

  // Refresh quand un consultant change de status / mission (vue temps réel)
  useRealtimeReload(['consultants', 'missions'], () => reload(), { debounceMs: 500 });

  const stats = data ?? { total: 0, longTerm: 0, avgDays: null, maxDays: null };

  return (
    <AppCard variant="luminous" tone="amber" className="h-full">
      <Link
        href="/consultants?status=available&endedBefore=today"
        className="block p-5 h-full flex flex-col"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
              <UserMinus className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Intercontrat
              </div>
              <div className="text-xs text-muted-foreground">consultants sur le banc</div>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/60" />
        </div>

        {loading ? (
          <div className="h-12 w-20 rounded bg-foreground/[0.06] animate-pulse" />
        ) : (
          <div className="font-display font-light tracking-[-0.04em] text-[clamp(2rem,3vw,2.75rem)] text-foreground leading-none">
            {stats.total}
          </div>
        )}

        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          {stats.longTerm > 0 ? (
            <div className="text-amber-300/80 font-medium">
              ⚠ {stats.longTerm} depuis &gt;30 jours
            </div>
          ) : (
            <div className="text-emerald-300/70">Bench récent ✓</div>
          )}
          {stats.avgDays !== null && (
            <div>
              Ancienneté moyenne&nbsp;: <span className="text-foreground/80 font-medium">{stats.avgDays}j</span>
              {stats.maxDays !== null && stats.maxDays !== stats.avgDays && (
                <span> · max {stats.maxDays}j</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </AppCard>
  );
}
