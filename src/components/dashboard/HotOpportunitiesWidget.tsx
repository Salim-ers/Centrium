'use client';

import Link from 'next/link';
import { Flame, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { useOpportunityStatusLabels } from '@/lib/i18n/useBadges';
import { OPPORTUNITY_STATUS_LABEL } from '@/constants';
import { cn } from '@/lib/utils';

type HotOpportunity = {
  id: string;
  title: string;
  status: string;
  company_name: string | null;
  expected_revenue: number;
  probability: number;
  weighted_value: number;
};

/**
 * Widget Opportunités Prioritaires — affiche les 5 opportunités au
 * stade avancé (cv_sent → negotiation) classées par valeur PONDÉRÉE
 * (expected_revenue × probability / 100). Donne une lecture instantanée
 * de "où concentrer mon effort commercial cette semaine".
 *
 * Source : table `opportunities` joint avec companies.
 * Drill-down : /crm (Kanban du pipeline).
 */
export function HotOpportunitiesWidget() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  const oppLabels = useOpportunityStatusLabels();

  const { data, loading, reload } = useCachedQuery<HotOpportunity[]>(
    `hot-opportunities:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from('opportunities')
        .select(
          `
          id, title, status, expected_revenue, probability,
          company:companies ( name )
        `,
        )
        // Stades engagés où il y a vraiment quelque chose à pousser.
        .in('status', ['cv_sent', 'client_interview', 'negotiation'])
        .not('expected_revenue', 'is', null)
        .gt('expected_revenue', 0);
      if (error || !rows) return [];

      const items: HotOpportunity[] = rows
        .map((r) => {
          const company = Array.isArray(r.company) ? r.company[0] : r.company;
          const expected = Number(r.expected_revenue) || 0;
          // Default 50% si pas saisi (mieux que d'exclure).
          const prob = Number(r.probability) || 50;
          return {
            id: r.id as string,
            title: (r.title as string) ?? '—',
            status: (r.status as string) ?? 'new',
            company_name: (company?.name as string) ?? null,
            expected_revenue: expected,
            probability: prob,
            weighted_value: (expected * prob) / 100,
          };
        })
        .sort((a, b) => b.weighted_value - a.weighted_value)
        .slice(0, 5);

      return items;
    },
    { enabled: !!activeOrgId },
  );

  useRealtimeReload(['opportunities'], () => reload(), { debounceMs: 500 });

  const items = data ?? [];

  return (
    <AppCard variant="luminous" tone="magenta" className="h-full">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-magenta/15 border border-magenta/20 flex items-center justify-center">
              <Flame className="h-4 w-4 text-magenta-neon" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.dashboard.hot_opportunities_title}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.dashboard.hot_opportunities_sub}
              </div>
            </div>
          </div>
          <Link
            href="/crm"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {t.dashboard.see_pipeline} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-foreground/[0.04] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic text-center px-3">
            {t.dashboard.hot_opportunities_empty}
          </div>
        ) : (
          <ul className="space-y-1.5 flex-1">
            {items.map((opp) => {
              const statusLabel =
                oppLabels[opp.status as keyof typeof oppLabels] ??
                OPPORTUNITY_STATUS_LABEL[opp.status as keyof typeof OPPORTUNITY_STATUS_LABEL] ??
                opp.status;
              return (
                <li key={opp.id}>
                  <Link
                    href={`/crm`}
                    className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] hover:bg-white/[0.04] px-2.5 py-1.5 text-xs transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground/90 truncate">{opp.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1.5">
                        <span className="truncate">{opp.company_name ?? '—'}</span>
                        <span className="opacity-60">·</span>
                        <span
                          className={cn(
                            'shrink-0 px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold',
                            opp.status === 'negotiation'
                              ? 'bg-amber-500/15 text-amber-300'
                              : opp.status === 'client_interview'
                                ? 'bg-fuchsia-500/15 text-fuchsia-300'
                                : 'bg-violet-500/15 text-violet-300',
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold text-magenta-neon">
                        {formatCurrency(opp.weighted_value)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {opp.probability}% · {formatCurrency(opp.expected_revenue)}
                      </div>
                    </div>
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
