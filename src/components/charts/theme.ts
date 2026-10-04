// =========================================================================
// Thème des graphiques (recharts) — dérivé des tokens Centrium.
// Série principale terracotta, séries secondaires en tons chauds désaturés,
// grille et axes discrets. Les couleurs d'état ne servent qu'aux états.
// =========================================================================

export const CHART = {
  primary: '#C65F46',
  primarySoft: '#E0A28B',
  deep: '#9D4432',
  sand: '#DDCDC0',
  steel: '#527A96',
  olive: '#7D8B5A',
  ochre: '#C2913B',
  grid: '#EFE9E3',
  axis: '#8C8580',
  text: '#706A66',
  success: '#2F7D5B',
  warning: '#B45309',
  danger: '#B42318',
} as const;

/** Palette catégorielle ordonnée (répartition par client, etc.). */
export const CATEGORICAL = [
  CHART.primary,
  CHART.steel,
  CHART.ochre,
  CHART.olive,
  CHART.deep,
  CHART.sand,
  '#A9776A',
  '#8FA3B3',
];

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.text, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: CHART.grid,
  strokeDasharray: '0',
  vertical: false,
} as const;

export const tooltipStyle = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid #E8E1DB',
    borderRadius: 8,
    boxShadow: '0 10px 24px -8px rgba(25,24,23,0.12)',
    fontSize: 12,
    padding: '8px 10px',
  },
  labelStyle: { color: '#191817', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#191817', padding: 0 },
  cursor: { fill: 'rgba(198,95,70,0.06)', stroke: 'rgba(198,95,70,0.25)' },
} as const;

/** Format compact des montants pour les axes (12 k€, 1,2 M€). */
export function compactEuro(n: number, locale: 'fr' | 'en' = 'fr'): string {
  const abs = Math.abs(n);
  const fmt = (v: number, d = 1) =>
    v.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: d });
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)} M€`;
  if (abs >= 1_000) return `${fmt(n / 1_000, 0)} k€`;
  return `${fmt(n, 0)} €`;
}
