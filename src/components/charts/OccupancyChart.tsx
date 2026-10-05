'use client';

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART, axisProps, gridProps, tooltipStyle } from './theme';
import { monthLabel } from '@/lib/format';

/** Taux d'occupation (aire) et nombre de consultants en intercontrat (barres). */
export default function OccupancyChart({
  data,
  lang,
  height = 220,
  fill = false,
}: {
  data: Array<{ key: string; rate: number | null; bench: number }>;
  lang: 'fr' | 'en';
  height?: number;
  /** Occupe toute la hauteur du parent, avec `height` pour minimum. */
  fill?: boolean;
}) {
  const fr = lang === 'fr';
  const rows = data.map((p) => ({ ...p, label: monthLabel(p.key, lang) }));
  return (
    <div style={fill ? { height: '100%', minHeight: height } : { height }} role="img" aria-label={fr ? "Occupation et intercontrat" : 'Utilisation and bench'}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="occ-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.18} />
              <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis yAxisId="rate" {...axisProps} width={40} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
          <YAxis yAxisId="bench" orientation="right" {...axisProps} width={28} allowDecimals={false} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number, name: string) =>
              name === 'rate'
                ? [`${value ?? '—'} %`, fr ? 'Occupation' : 'Utilisation']
                : [value, fr ? 'Intercontrat' : 'Bench']
            }
          />
          <Bar yAxisId="bench" dataKey="bench" fill={CHART.sand} radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Area
            yAxisId="rate"
            type="monotone"
            dataKey="rate"
            stroke={CHART.primary}
            strokeWidth={2}
            fill="url(#occ-fill)"
            connectNulls
            dot={{ r: 2.5, fill: CHART.primary, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
