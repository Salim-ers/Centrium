'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { monthsShort } from '@/lib/i18n/months';

type RpcRow = {
  month: string;
  ca: number | string;
  /** Legacy = missions_active (rétrocompat). */
  missions: number;
  missions_active?: number;
  missions_proposed?: number;
  /** Flow : CV poussés créés ce mois-là (cf. migration 053). */
  proposed_created?: number;
};
type MonthlyPoint = {
  month: string;
  monthLabel: string;
  ca: number;
  /** Missions validées en cours sur le mois (status='active'). */
  missionsActive: number;
  /** Snapshot du pipeline pour le mois courant (status='proposed'). */
  missionsProposed: number;
  /** CV poussés créés ce mois-là (historique pour la 3e courbe). */
  proposedCreated: number;
};

function rowsToBuckets(rows: RpcRow[], months: string[]): MonthlyPoint[] {
  return rows.map((r) => {
    const [y, m] = r.month.split('-').map(Number);
    return {
      month: r.month,
      monthLabel: `${months[m - 1]} ${String(y).slice(2)}`,
      ca: Number(r.ca),
      missionsActive: Number(r.missions_active ?? r.missions ?? 0),
      missionsProposed: Number(r.missions_proposed ?? 0),
      proposedCreated: Number(r.proposed_created ?? 0),
    };
  });
}

/** Pastille de légende — trait plein ou pointillé selon la série. */
function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <span
          className="inline-block w-3.5 border-t-2 border-dashed"
          style={{ borderColor: color }}
        />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}

export function RevenueChart() {
  const { activeOrgId } = useOrganization();
  const theme = 'light' as 'light' | 'dark';
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const months = monthsShort(isEn);
  const caLabel = isEn ? 'Revenue' : 'CA';
  const { format: formatCurrency } = useCurrency();
  // Palette adaptée au thème — 3 tons distincts pour lisibilité maximale :
  //   - DARK : magenta (CA) + violet (missions) + ambre (CV poussés)
  //   - LIGHT : terracotta sang (CA) + olive (missions) + ocre brûlé (CV poussés)
  //     (palette validée user "zéro jaune/violet en light")
  const chartColors =
    theme === 'dark'
      ? { ca: '#9D4432', missions: '#C65F46', proposed: '#fbbf24' }
      : { ca: '#9a3e2e', missions: '#5b6f3a', proposed: '#c97a1f' };

  // Couleurs axes/grid/tooltip — contraste WCAG AA sur fond crème/noir
  const chartTheme =
    theme === 'dark'
      ? {
          axisStroke: 'rgba(255,255,255,0.55)',
          gridStroke: 'rgba(255,255,255,0.06)',
          tooltipBg: 'rgba(15, 17, 25, 0.95)',
          tooltipBorder: 'rgba(225,29,116,0.3)',
          tooltipText: '#ffffff',
        }
      : {
          axisStroke: 'rgba(42,26,18,0.7)', // terre sombre lisible sur crème
          gridStroke: 'rgba(42,26,18,0.12)',
          tooltipBg: '#fffaf2',
          tooltipBorder: 'rgba(154,62,46,0.7)', // bumped pour contraste border visible (≥3.5:1)
          tooltipText: '#2a1a12',
        };

  const { data, loading } = useCachedQuery<MonthlyPoint[]>(
    `revenue-chart:${activeOrgId ?? 'none'}:${locale}`,
    async () => {
      const supabase = createClient();
      // 1 seul round-trip via RPC SECURITY DEFINER (cf. migration 028).
      const { data: rows, error } = await supabase.rpc('dashboard_revenue_chart', {
        org_id: activeOrgId,
        months_back: 12,
      });
      if (error || !rows) return [];
      return rowsToBuckets(rows as RpcRow[], months);
    },
    { enabled: !!activeOrgId },
  );

  const points = data ?? [];
  const totalCA = points.reduce((s, d) => s + d.ca, 0);
  const last = points[points.length - 1];
  const activeCount = last?.missionsActive ?? 0;
  const proposedCount = last?.missionsProposed ?? 0;

  return (
    <div className="qc-premium relative overflow-hidden rounded-2xl border">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <TrendingUp className="h-4 w-4" style={{ color: chartColors.ca }} />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {t.dashboard.revenue_chart_title}
            </h2>
            <p className="text-[11px] text-muted-foreground">{t.dashboard.last_12_months}</p>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.dashboard.ca_cumulative}
            </div>
            <div className="font-display text-xl font-light tracking-[-0.02em] text-primary">
              <AnimatedNumber
                value={loading ? null : totalCA}
                format={(n) => formatCurrency(n)}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.dashboard.cv_pushed_pending}
            </div>
            <div
              className="font-display text-xl font-light tracking-[-0.02em]"
              style={{ color: chartColors.proposed }}
            >
              <AnimatedNumber value={loading ? null : proposedCount} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.dashboard.missions_active}
            </div>
            <div
              className="font-display text-xl font-light tracking-[-0.02em]"
              style={{ color: chartColors.ca }}
            >
              <AnimatedNumber value={loading ? null : activeCount} />
            </div>
          </div>
        </div>
      </header>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <LegendItem color={chartColors.ca} label={caLabel} />
          <LegendItem color={chartColors.missions} label={t.dashboard.missions_active} />
          <LegendItem color={chartColors.proposed} label={t.dashboard.cv_pushed_pending} dashed />
        </div>

        {loading ? (
          <div className="h-64 rounded-xl surface-1 animate-pulse" />
        ) : (
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ca-pink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.ca} stopOpacity={theme === 'light' ? 0.45 : 0.55} />
                    <stop offset="100%" stopColor={chartColors.ca} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="missions-violet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.missions} stopOpacity={theme === 'light' ? 0.32 : 0.35} />
                    <stop offset="100%" stopColor={chartColors.missions} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="proposed-amber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.proposed} stopOpacity={theme === 'light' ? 0.28 : 0.3} />
                    <stop offset="100%" stopColor={chartColors.proposed} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.gridStroke} vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke={chartTheme.axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="ca"
                  orientation="left"
                  stroke={chartTheme.axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <YAxis
                  yAxisId="missions"
                  orientation="right"
                  stroke={chartTheme.axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: chartTheme.tooltipBg,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: 8,
                    color: chartTheme.tooltipText,
                    fontSize: 12,
                    boxShadow: theme === 'light' ? '0 8px 24px -8px rgba(40,30,25,0.25)' : '0 8px 24px -8px rgba(0,0,0,0.5)',
                  }}
                  labelStyle={{ color: chartTheme.tooltipText, fontWeight: 600 }}
                  itemStyle={{ color: chartTheme.tooltipText }}
                  formatter={(value, name) => {
                    if (name === caLabel) return [formatCurrency(Number(value)), caLabel];
                    return [value, name];
                  }}
                />
                {/* CV poussés (en attente) — courbe jaune historique
                    sur le nb créés chaque mois (cf. migration 053). */}
                <Area
                  yAxisId="missions"
                  type="monotone"
                  dataKey="proposedCreated"
                  name={t.dashboard.cv_pushed_pending}
                  stroke={chartColors.proposed}
                  strokeWidth={1.5}
                  fill="url(#proposed-amber)"
                  strokeDasharray="4 4"
                  animationDuration={800}
                />
                <Area
                  yAxisId="missions"
                  type="monotone"
                  dataKey="missionsActive"
                  name={t.dashboard.missions_active}
                  stroke={chartColors.missions}
                  strokeWidth={1.5}
                  fill="url(#missions-violet)"
                  animationDuration={800}
                />
                <Area
                  yAxisId="ca"
                  type="monotone"
                  dataKey="ca"
                  name={caLabel}
                  stroke={chartColors.ca}
                  strokeWidth={2.5}
                  fill="url(#ca-pink)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
