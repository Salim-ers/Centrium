import { cn } from '@/lib/utils';
import { CHART } from './theme';

/**
 * Mini-courbe SVG (sans librairie) pour les KPI. Décorative : la valeur
 * chiffrée reste portée par le texte de la carte.
 */
export function Sparkline({
  values,
  className,
  color = CHART.primary,
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const w = 80;
  const h = 32;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1]![0].toFixed(1)},${h} L${pts[0]![0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className={cn('overflow-visible', className)}>
      <path d={area} fill={color} opacity={0.08} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
