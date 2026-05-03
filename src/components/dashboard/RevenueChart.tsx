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

type RpcRow = { month: string; ca: number | string; missions: number };
type MonthlyPoint = {
  month: string;
  monthLabel: string;
  ca: number;
  missions: number;
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
      missions: Number(r.missions),
    };
  });
}

export function RevenueChart() {
  const { activeOrgId } = useOrganization();

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
  const activeCount = points[points.length - 1]?.missions ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: '#e11d74' }} />
              Chiffre d&apos;affaires &amp; missions
            </CardTitle>
            <CardDescription>12 derniers mois</CardDescription>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                CA cumulé
              </div>
              <div className="text-lg font-bold qc-gradient-text">
                {formatCurrency(totalCA)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Missions en cours
              </div>
              <div className="text-lg font-bold" style={{ color: '#e11d74' }}>
                {activeCount}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 rounded-lg bg-white/[0.02] animate-pulse" />
        ) : (
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ca-pink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d74" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#e11d74" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="missions-violet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="ca"
                  orientation="left"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <YAxis
                  yAxisId="missions"
                  orientation="right"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 17, 25, 0.95)',
                    border: '1px solid rgba(225,29,116,0.3)',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => {
                    if (name === 'CA') return [formatCurrency(Number(value)), 'CA'];
                    return [value, 'Missions actives'];
                  }}
                />
                <Area
                  yAxisId="missions"
                  type="monotone"
                  dataKey="missions"
                  name="Missions actives"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  fill="url(#missions-violet)"
                />
                <Area
                  yAxisId="ca"
                  type="monotone"
                  dataKey="ca"
                  name="CA"
                  stroke="#e11d74"
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
