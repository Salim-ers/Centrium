'use client';

import Link from 'next/link';
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TONE_CLASSES } from '@/components/bento/Tile';
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

/** Couleur de la tuile (même famille que le tableau de bord). */
export type KPIAccent = 'white' | 'terra' | 'peach' | 'soft' | 'ink';

type Props = {
  label: string;
  /** terra : indicateur principal ; peach : à traiter ; white par défaut. */
  accent?: KPIAccent;
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
  accent = 'white',
  delta,
  deltaPositiveIsGood = true,
  hint,
  trend,
  href,
  loading = false,
  className,
}: Props) {
  const t = TONE_CLASSES[accent];
  const onColor = accent === 'terra' || accent === 'ink';
  const good = delta === undefined || delta === 0 ? null : (delta > 0) === deltaPositiveIsGood;
  const DeltaIcon =
    delta === undefined ? null : delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('text-[13px] font-medium', t.muted)}>{label}</div>
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', onColor ? 'bg-white/15 text-white' : accent === 'white' ? ICON_TONE[tone] : 'bg-white/60 text-terra-deep')}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className={cn('num flex min-h-[2.25rem] items-baseline gap-0.5 font-display text-[30px] font-semibold leading-9 tracking-tight', t.strong)}>
          {loading ? (
            <span className="skeleton inline-block h-7 w-24" />
          ) : (
            <>
              {prefix && <span className={cn('mr-0.5 text-lg font-medium', t.muted)}>{prefix}</span>}
              {valueText !== undefined ? (
                valueText
              ) : value !== undefined && Number.isFinite(value) ? (
                <AnimatedNumber value={value} format={format} />
              ) : (
                '—'
              )}
              {suffix && <span className={cn('ml-0.5 text-lg font-medium', t.muted)}>{suffix}</span>}
            </>
          )}
        </div>
        {trend && trend.length > 1 && !loading && (
          <Sparkline values={trend} className="mb-1 h-8 w-20 shrink-0" />
        )}
      </div>
      {(hint || delta !== undefined) && (
        <div className={cn('mt-auto flex min-w-0 items-center gap-2 pt-2 text-xs', t.muted)}>
          {DeltaIcon && delta !== undefined && (
            <span
              className={cn(
                'num inline-flex items-center gap-0.5 rounded px-1 py-px font-medium',
                onColor
                  ? 'bg-white/15 text-white'
                  : good === null
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

  // Tuile « Bento » : arrondie, dégradé et ombre douce, comme le tableau de bord.
  const base = cn(
    'group relative flex min-h-[132px] flex-col rounded-[22px] p-5 transition-transform duration-300',
    t.tile,
    href && 'hover:-translate-y-1',
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
