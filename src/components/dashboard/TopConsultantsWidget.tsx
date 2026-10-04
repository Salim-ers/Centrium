'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { presenceColor, presenceInitials } from '@/lib/realtime/presence-utils';
import { cn } from '@/lib/utils';

type TopConsultant = {
  consultant_id: string;
  first_name: string | null;
  last_name: string | null;
  mission_title: string;
  client_name: string | null;
  daily_rate: number;
};

/**
 * Widget Top Consultants — affiche les 5 consultants en mission active
 * avec le TJM le plus élevé. Donne une lecture instantanée de "qui rapporte
 * le plus en ce moment" — utile pour rétention / bonus / négo renouvellement.
 *
 * Source : table `missions` (status=active, archived=false) jointe avec
 * consultants + companies.
 *
 * Drill-down : /en-mission (page de gestion des missions actives).
 */
export function TopConsultantsWidget() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();

  const { data, loading, reload } = useCachedQuery<TopConsultant[]>(
    `top-consultants:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from('missions')
        .select(
          `
          id,
          title,
          daily_rate_eur,
          consultant:consultants ( id, first_name, last_name ),
          company:companies ( name )
        `,
        )
        .eq('status', 'active')
        .eq('archived', false)
        .not('daily_rate_eur', 'is', null)
        .order('daily_rate_eur', { ascending: false })
        .limit(5);
      if (error || !rows) return [];

      return rows
        .map((r): TopConsultant | null => {
          const consultant = Array.isArray(r.consultant) ? r.consultant[0] : r.consultant;
          const company = Array.isArray(r.company) ? r.company[0] : r.company;
          if (!consultant) return null;
          return {
            consultant_id: (consultant.id as string) ?? '',
            first_name: (consultant.first_name as string | null) ?? null,
            last_name: (consultant.last_name as string | null) ?? null,
            mission_title: (r.title as string) ?? '—',
            client_name: (company?.name as string | null) ?? null,
            daily_rate: Number(r.daily_rate_eur) || 0,
          };
        })
        .filter((x): x is TopConsultant => x !== null);
    },
    { enabled: !!activeOrgId },
  );

  useRealtimeReload(['missions', 'consultants'], () => reload(), { debounceMs: 500 });

  const items = data ?? [];

  return (
    <AppCard variant="luminous" tone="emerald" className="h-full">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-success/15 border border-success/20 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.dashboard.top_consultants_title}
              </div>
              <div className="text-xs text-muted-foreground">{t.dashboard.top_consultants_sub}</div>
            </div>
          </div>
          <Link
            href="/en-mission"
            className="group text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
          >
            {t.dashboard.see_consultants}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg surface-1 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic text-center px-3">
            {t.dashboard.top_consultants_empty}
          </div>
        ) : (
          <ul className="space-y-1.5 flex-1">
            {items.map((c, i) => {
              const initials = presenceInitials(c.first_name, c.last_name, '');
              const color = presenceColor(c.consultant_id);
              const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—';
              return (
                <motion.li
                  key={c.consultant_id + c.mission_title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
                >
                  <Link
                    href={`/consultants/${c.consultant_id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-hairline hover-surface px-2.5 py-2 text-xs transition-all hover:translate-x-0.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          'w-3.5 shrink-0 text-center font-mono text-[10px] font-semibold',
                          i === 0 ? 'text-warning' : 'text-muted-foreground/50',
                        )}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                          color.bg,
                          color.text,
                        )}
                      >
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground/90 truncate">{name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {c.client_name ? `${c.client_name} · ` : ''}
                          {c.mission_title}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-success">
                      {formatCurrency(c.daily_rate)}
                      <span className="text-muted-foreground font-normal">
                        {t.dashboard.per_day_short}
                      </span>
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </AppCard>
  );
}
