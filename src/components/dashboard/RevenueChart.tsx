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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { useTheme } from '@/hooks/useTheme';
import { useAppT } from '@/lib/i18n/LocaleProvider';

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

const MONTHS_SHORT = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

function rowsToBuckets(rows: RpcRow[]): MonthlyPoint[] {
  return rows.map((r) => {
    const [y, m] = r.month.split('-').map(Number);
    return {
      month: r.month,
      monthLabel: `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`,
      ca: Number(r.ca),
      missionsActive: Number(r.missions_active ?? r.missions ?? 0),
      missionsProposed: Number(r.missions_proposed ?? 0),
      proposedCreated: Number(r.proposed_created ?? 0),
    };
  });
}

export function RevenueChart() {
  const { activeOrgId } = useOrganization();
  const theme = useTheme();
  const t = useAppT();
  // Palette du graphique adaptée au thème :
  //  - DARK : magenta + violet + amber (identité historique, lisible sur noir)
  //  - LIGHT : 3 nuances terracotta (cohérent avec la palette crème + terre,
  //    zéro jaune, zéro violet — demande utilisateur). Les 3 courbes restent
  //    distinguables : sang foncé pour CA, terracotta principal pour missions,
  //    terracotta orangé pour CV poussés.
  // Palette adaptée au thème — 3 tons distincts pour lisibilité maximale :
  //   - DARK : magenta (CA) + violet (missions) + ambre (CV poussés)
  //   - LIGHT : terracotta sang (CA) + olive (missions) + ocre brûlé (CV poussés)
  //     (palette validée user "zéro jaune/violet en light")
  const chartColors =
    theme === 'dark'
      ? { ca: '#e11d74', missions: '#8b5cf6', proposed: '#fbbf24' }
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
    `revenue-chart:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      // 1 seul round-trip via RPC SECURITY DEFINER (cf. migration 028).
      const { data: rows, error } = await supabase.rpc('dashboard_revenue_chart', {
        org_id: activeOrgId,
        months_back: 12,
      });
      if (error || !rows) return [];
      return rowsToBuckets(rows as RpcRow[]);
    },
    { enabled: !!activeOrgId },
  );

  const points = data ?? [];
  const totalCA = points.reduce((s, d) => s + d.ca, 0);
  const last = points[points.length - 1];
  const activeCount = last?.missionsActive ?? 0;
  const proposedCount = last?.missionsProposed ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: chartColors.ca }} />
              {t.dashboard.revenue_chart_title}
            </CardTitle>
            <CardDescription>{t.dashboard.last_12_months}</CardDescription>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.dashboard.ca_cumulative}
              </div>
              <div className="text-lg font-bold qc-gradient-text">
                {formatCurrency(totalCA)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.dashboard.cv_pushed_pending}
              </div>
              <div className="text-lg font-bold text-amber-300">{proposedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.dashboard.missions_active}
              </div>
              <div className="text-lg font-bold" style={{ color: chartColors.ca }}>
                {activeCount}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 rounded-lg bg-foreground/[0.04] animate-pulse" />
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
                    if (name === 'CA') return [formatCurrency(Number(value)), 'CA'];
                    return [value, name];
                  }}
                />
                {/* CV poussés (en attente) — courbe jaune historique
                    sur le nb créés chaque mois (cf. migration 053). */}
                <Area
                  yAxisId="missions"
                  type="monotone"
                  dataKey="proposedCreated"
                  name="CV poussés"
                  stroke={chartColors.proposed}
                  strokeWidth={1.5}
                  fill="url(#proposed-amber)"
                  strokeDasharray="4 4"
                />
                <Area
                  yAxisId="missions"
                  type="monotone"
                  dataKey="missionsActive"
                  name="Missions en cours"
                  stroke={chartColors.missions}
                  strokeWidth={1.5}
                  fill="url(#missions-violet)"
                />
                <Area
                  yAxisId="ca"
                  type="monotone"
                  dataKey="ca"
                  name="CA"
                  stroke={chartColors.ca}
                  strokeWidth={2.5}
                  fill="url(#ca-pink)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
