'use client';

import { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;

function path(points: Array<[number, number]>) {
  if (!points.length) return '';
  // Courbe lissée (Catmull-Rom → Bézier), sans dépassement visible.
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Mini-courbe (tendance) : se dessine à l'apparition. */
export function Sparkline({ values, className, color = 'currentColor', area = true }: { values: number[]; className?: string; color?: string; area?: boolean }) {
  const reduce = useReducedMotion();
  const id = useId();
  const pts = useMemo(() => {
    if (values.length < 2) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values.map((v, i) => [(i / (values.length - 1)) * 100, 28 - ((v - min) / span) * 24] as [number, number]);
  }, [values]);
  if (!pts.length) return null;
  const d = path(pts);
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full overflow-visible', className)} aria-hidden>
      {area && (
        <>
          <defs>
            <linearGradient id={`sg-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path d={`${d} L100,32 L0,32 Z`} fill={`url(#sg-${id})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
        </>
      )}
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease }} />
    </svg>
  );
}

export type SeriesPoint = { label: string; revenue: number | null; margin: number | null; forecast: number | null };

/**
 * Graphique Activité & rentabilité : lignes fines (CA, marge, prévision),
 * survol avec infobulle discrète. Tracé animé à l'apparition.
 */
export function ActivityChart({
  data,
  height = 220,
  format,
  labels,
  tone = 'light',
}: {
  data: SeriesPoint[];
  height?: number;
  format: (n: number) => string;
  labels: { revenue: string; margin: string; forecast: string };
  tone?: 'light' | 'dark';
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = { t: 12, b: 24, l: 4, r: 4 };
  const values = data.flatMap((d) => [d.revenue, d.margin, d.forecast]).filter((v): v is number => v != null);
  const max = Math.max(1, ...values) * 1.08;
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const series = (key: 'revenue' | 'margin' | 'forecast') => data.map((d, i) => (d[key] == null ? null : ([x(i), y(d[key] as number)] as [number, number])));
  const segments = (pts: Array<[number, number] | null>) => {
    const out: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    for (const p of pts) {
      if (p) cur.push(p);
      else if (cur.length) {
        out.push(cur);
        cur = [];
      }
    }
    if (cur.length) out.push(cur);
    return out;
  };
  const dark = tone === 'dark';
  const c = { revenue: dark ? '#F1C7BA' : '#C65F46', margin: dark ? '#FFFFFF' : '#191817', forecast: dark ? 'rgba(255,255,255,.55)' : '#C65F46', grid: dark ? 'rgba(255,255,255,.08)' : 'rgba(30,25,22,.06)', text: dark ? 'rgba(255,255,255,.55)' : '#827A75' };

  const hp = hover != null ? data[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label={`${labels.revenue}, ${labels.margin}`} onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} stroke={c.grid} strokeWidth={1} />
        ))}
        {(['forecast', 'revenue', 'margin'] as const).map((k) =>
          segments(series(k)).map((seg, si) => (
            <motion.path
              key={`${k}-${si}`}
              d={path(seg)}
              fill="none"
              stroke={c[k]}
              strokeWidth={k === 'revenue' ? 2 : 1.5}
              strokeDasharray={k === 'forecast' ? '4 5' : undefined}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: k === 'margin' ? 0.15 : k === 'forecast' ? 0.3 : 0, ease }}
            />
          )),
        )}
        {data.map((d, i) => (
          <g key={d.label}>
            <rect x={x(i) - W / data.length / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill={c.text}>
              {d.label}
            </text>
          </g>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke={c.grid} strokeWidth={1.5} />}
        {hover != null &&
          (['revenue', 'margin'] as const).map((k) =>
            data[hover]![k] != null ? <circle key={k} cx={x(hover)} cy={y(data[hover]![k] as number)} r={3.5} fill={c[k]} stroke={dark ? '#191817' : '#fff'} strokeWidth={2} /> : null,
          )}
      </svg>
      {hp && hover != null && (
        <div
          className={cn('pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl px-3 py-2 text-[12px] shadow-lg backdrop-blur', dark ? 'bg-black/60 text-white' : 'bg-white/95 text-ink-app ring-1 ring-black/[0.06]')}
          style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 75px), calc(100% - 150px))` }}
        >
          <div className="mb-1 font-semibold">{hp.label}</div>
          {hp.revenue != null && <Row color={c.revenue} label={labels.revenue} value={format(hp.revenue)} />}
          {hp.margin != null && <Row color={c.margin} label={labels.margin} value={format(hp.margin)} />}
          {hp.forecast != null && <Row color={c.forecast} label={labels.forecast} value={format(hp.forecast)} />}
        </div>
      )}
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 opacity-80">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Barre de progression fine. */
export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-black/[0.06]', className)}>
      <motion.div className={cn('h-full rounded-full bg-terra', barClassName)} initial={reduce ? false : { width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.9, ease }} />
    </div>
  );
}
