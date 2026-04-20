'use client';

import { useEffect, useState } from 'react';
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

export function RevenueChart() {
  const [data, setData] = useState<MonthlyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      const [{ data: invoices }, { data: missions }] = await Promise.all([
        supabase
          .from('invoices')
          .select('amount_ht, issue_date, status')
          .in('status', ['paid', 'sent', 'overdue'])
          .gte('issue_date', from.toISOString().slice(0, 10)),
        supabase
          .from('missions')
          .select('id, start_date, end_date'),
      ]);

      const buckets: MonthlyPoint[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        buckets.push({
          month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          monthLabel: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          ca: 0,
          missions: 0,
        });
      }

      for (const inv of invoices ?? []) {
        const k = (inv.issue_date as string).slice(0, 7);
        const b = buckets.find((x) => x.month === k);
        if (b) b.ca += Number(inv.amount_ht);
      }

      for (const m of missions ?? []) {
        const start = new Date(m.start_date as string);
        const end = m.end_date ? new Date(m.end_date as string) : now;
        for (const b of buckets) {
          const [by, bm] = b.month.split('-').map(Number);
          const bucketStart = new Date(by, bm - 1, 1);
          const bucketEnd = new Date(by, bm, 0);
          if (start <= bucketEnd && end >= bucketStart) b.missions += 1;
        }
      }

      setData(buckets);
      setLoading(false);
    })();
  }, []);

  const totalCA = data.reduce((s, d) => s + d.ca, 0);
  const activeCount = data[data.length - 1]?.missions ?? 0;

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
              <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
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
