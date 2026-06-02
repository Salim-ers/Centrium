'use client';

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

type Tone = 'magenta' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose';

const TONE_CLASSES: Record<Tone, { glow: string; ring: string; text: string }> = {
  magenta: {
    glow: 'from-pink-500/30 via-magenta/15 to-transparent',
    ring: 'hover:border-magenta/40',
    text: 'text-magenta',
  },
  violet: {
    glow: 'from-violet-500/30 via-indigo-500/15 to-transparent',
    ring: 'hover:border-violet-500/40',
    text: 'text-violet-400',
  },
  emerald: {
    glow: 'from-emerald-500/25 via-green-500/12 to-transparent',
    ring: 'hover:border-emerald-500/40',
    text: 'text-emerald-400',
  },
  amber: {
    glow: 'from-amber-500/25 via-orange-500/12 to-transparent',
    ring: 'hover:border-amber-500/40',
    text: 'text-amber-400',
  },
  cyan: {
    glow: 'from-cyan-500/25 via-sky-500/12 to-transparent',
    ring: 'hover:border-cyan-500/40',
    text: 'text-cyan-400',
  },
  rose: {
    glow: 'from-rose-500/30 via-pink-500/15 to-transparent',
    ring: 'hover:border-rose-500/40',
    text: 'text-rose-400',
  },
};

type Props = {
  label: string;
  /** Valeur numérique (animée via AnimatedNumber). Pour un texte fixe, utiliser `valueText`. */
  value?: number;
  /** Texte fixe alternatif à `value` (ex: "—", "N/A"). */
  valueText?: string;
  /** Préfixe affiché AVANT la valeur (ex: "€") */
  prefix?: string;
  /** Suffixe (ex: "%", "k") */
  suffix?: string;
  /** Icône lucide-react */
  icon?: LucideIcon;
  /** Couleur de l'accent + glow */
  tone?: Tone;
  /** Variation par rapport à la période précédente, en %. ±N → flèche colorée. */
  delta?: number;
  /** Sous-titre / contexte sous la valeur */
  hint?: string;
  /** Si défini, rend la carte cliquable comme un Link */
  href?: string;
  className?: string;
};

/**
 * KPI card stylée vitrine : glass + halo de couleur (tone) + animated number.
 *
 * - Glass : border + bg semi-translucide + backdrop-blur
 * - Halo : gradient radial au coin top-right, opacité 0 → 100% au hover
 * - Animated value : AnimatedNumber framer-motion pour le compte
 * - Delta : flèche colorée (up emerald / down rose / flat slate)
 *
 * Usage :
 *   <KPICard label="Consultants actifs" value={42} icon={Users} tone="magenta" delta={+5} />
 */
export function KPICard({
  label,
  value,
  valueText,
  prefix,
  suffix,
  icon: Icon,
  tone = 'magenta',
  delta,
  hint,
  href,
  className,
}: Props) {
  const t = TONE_CLASSES[tone];
  const DeltaIcon =
    delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor =
    delta === undefined
      ? ''
      : delta > 0
        ? 'text-emerald-400'
        : delta < 0
          ? 'text-rose-400'
          : 'text-muted-foreground';

  const inner = (
    <>
      {/* Halo radial coloré — visible UNIQUEMENT en dark.
          En light mode (demande utilisateur : pas d'aura rose), opacity 0 →
          la card reste sur fond crème pur, accent terracotta seulement
          sur les bordures et icônes. */}
      <div
        aria-hidden
        className={cn(
          'absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br blur-3xl opacity-0 dark:opacity-30 dark:group-hover:opacity-80 transition-opacity duration-500',
          t.glow,
        )}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.18em] font-medium text-muted-foreground/80">
          {label}
        </div>
        {Icon && (
          <div
            className={cn(
              'p-2 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm transition-transform group-hover:scale-110',
              t.text,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="relative z-10 mt-4 flex items-baseline gap-1">
        {prefix && <span className="text-2xl text-muted-foreground">{prefix}</span>}
        <span className="font-display font-light tracking-[-0.04em] text-[clamp(1.8rem,3vw,2.5rem)] text-foreground leading-none">
          {valueText !== undefined ? (
            valueText
          ) : value !== undefined ? (
            <AnimatedNumber value={value} />
          ) : (
            '—'
          )}
        </span>
        {suffix && <span className="text-2xl text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {(hint || delta !== undefined) && (
        <div className="relative z-10 mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          {DeltaIcon && delta !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold', deltaColor)}>
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

  const baseClasses = cn(
    'group relative overflow-hidden rounded-2xl border border-hairline bg-card/60 backdrop-blur-md p-5 transition-all duration-300',
    // Shadow magenta en dark, terracotta en light (override CSS dans globals).
    'hover:-translate-y-0.5 dark:hover:shadow-[0_20px_60px_-20px_rgba(225,29,116,0.25)] hover:shadow-[0_12px_36px_-14px_rgba(178,58,38,0.25)]',
    t.ring,
    className,
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {inner}
      </a>
    );
  }
  return <div className={baseClasses}>{inner}</div>;
}
