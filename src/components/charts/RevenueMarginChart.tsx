'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART, axisProps, compactEuro, gridProps, tooltipStyle } from './theme';
import { formatEur, monthLabel } from '@/lib/format';
import type { MonthPoint } from '@/lib/pilotage/metrics';

/**
 * CA mensuel (réalisé = CRA validés ; prévisionnel = missions actives) et
 * marge (ligne). Le mois courant affiche les deux barres côte à côte.
 */
export default function RevenueMarginChart({
  data,
  lang,
  showMargin,
  height = 260,
}: {
  data: MonthPoint[];
  lang: 'fr' | 'en';
  showMargin: boolean;
  height?: number;
}) {
  const rows = data.map((p) => ({
    ...p,
    label: monthLabel(p.key, lang),
  }));
  const fr = lang === 'fr';
  return (
    <div style={{ height }} role="img" aria-label={fr ? 'CA et marge mensuels' : 'Monthly revenue and margin'}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compactEuro(v, lang)} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number, name: string) => {
              const label =
                name === 'realized'
                  ? fr ? 'CA réalisé' : 'Actual revenue'
                  : name === 'forecast'
                    ? fr ? 'CA prévisionnel' : 'Forecast revenue'
                    : fr ? 'Marge' : 'Margin';
              return [formatEur(value, lang), label];
            }}
          />
          <Bar dataKey="realized" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="forecast" fill={CHART.primarySoft} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={28} />
          {showMargin && (
            <Line
              type="monotone"
              dataKey="margin"
              stroke={CHART.deep}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CHART.deep, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
