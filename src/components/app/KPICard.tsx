'use client';

import Link from 'next/link';
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Sparkline } from '@/components/charts/Sparkline';

type Tone = 'magenta' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'brand' | 'neutral';

// Couleur de l'icône uniquement : la carte reste neutre.
const ICON_TONE: Record<Tone, string> = {
  brand: 'text-primary bg-brand-50',
  magenta: 'text-primary bg-brand-50',
  violet: 'text-primary bg-brand-50',
  emerald: 'text-success bg-success-soft',
  amber: 'text-warning bg-warning-soft',
  cyan: 'text-info bg-info-soft',
  rose: 'text-destructive bg-danger-soft',
  neutral: 'text-sand-700 bg-sand-100',
};

type Props = {
  label: string;
  /** Valeur numérique animée. Pour un texte fixe, utiliser `valueText`. */
  value?: number;
  valueText?: string;
  /** Formatage de la valeur animée (devise, pourcentage…). */
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** Variation en % vs période précédente. */
  delta?: number;
  /** Une hausse est-elle une bonne nouvelle ? (false pour l'intercontrat, les retards…) */
  deltaPositiveIsGood?: boolean;
  hint?: React.ReactNode;
  /** Mini-courbe de tendance (valeurs chronologiques). */
  trend?: number[];
  href?: string;
  loading?: boolean;
  className?: string;
};

/**
 * Carte KPI : libellé, valeur, variation et contexte. Lisible en une
 * seconde, cliquable vers le détail quand `href` est fourni.
 */
export function KPICard({
  label,
  value,
  valueText,
  format,
  prefix,
  suffix,
  icon: Icon,
  tone = 'neutral',
  delta,
  deltaPositiveIsGood = true,
  hint,
  trend,
  href,
  loading = false,
  className,
}: Props) {
  const good = delta === undefined || delta === 0 ? null : (delta > 0) === deltaPositiveIsGood;
  const DeltaIcon =
    delta === undefined ? null : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
        {Icon && (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', ICON_TONE[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="num flex min-h-[2rem] items-baseline gap-0.5 font-display text-[26px] font-semibold leading-8 tracking-tight text-foreground">
          {loading ? (
            <span className="skeleton inline-block h-7 w-24" />
          ) : (
            <>
              {prefix && <span className="mr-0.5 text-lg font-medium text-muted-foreground">{prefix}</span>}
              {valueText !== undefined ? (
                valueText
              ) : value !== undefined && Number.isFinite(value) ? (
                <AnimatedNumber value={value} format={format} />
              ) : (
                '—'
              )}
              {suffix && <span className="ml-0.5 text-lg font-medium text-muted-foreground">{suffix}</span>}
            </>
          )}
        </div>
        {trend && trend.length > 1 && !loading && (
          <Sparkline values={trend} className="mb-1 h-8 w-20 shrink-0" />
        )}
      </div>
      {(hint || delta !== undefined) && (
        <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {DeltaIcon && delta !== undefined && (
            <span
              className={cn(
                'num inline-flex items-center gap-0.5 rounded px-1 py-px font-medium',
                good === null
                  ? 'bg-muted text-muted-foreground'
                  : good
                    ? 'bg-success-soft text-success'
                    : 'bg-danger-soft text-destructive',
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta > 0 ? '+' : ''}
              {delta}%
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      )}
    </>
  );

  const base = cn(
    'group relative block rounded-xl border border-border bg-card p-4 shadow-xs',
    href && 'transition-[border-color,box-shadow] duration-150 hover:border-sand-300 hover:shadow-md',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={base} prefetch={false}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}
