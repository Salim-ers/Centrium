'use client';

import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * Tons des tuiles Bento : la couleur structure la composition (le CA en
 * blanc, la marge en terracotta, l'urgence en peach, l'objectif en
 * terracotta profond…). Chaque ton fixe aussi la couleur du texte.
 * Rendu « Apple » : léger dégradé, reflet intérieur en haut, ombre douce
 * en profondeur, et la tuile se soulève au survol.
 */
export type TileTone = 'white' | 'ivory' | 'peach' | 'soft' | 'terra' | 'deep' | 'ink';

const HIGHLIGHT = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_2px_rgba(25,22,20,0.04),0_14px_34px_-20px_rgba(25,22,20,0.28)]';
const HIGHLIGHT_DARK = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_40px_-22px_rgba(25,22,20,0.55)]';

export const TONE_CLASSES: Record<TileTone, { tile: string; muted: string; line: string; strong: string }> = {
  white: { tile: cn('bg-gradient-to-b from-white to-[#FCFAF8] text-ink-app ring-1 ring-black/[0.05]', HIGHLIGHT), muted: 'text-[#827A75]', line: 'bg-black/[0.06]', strong: 'text-ink-app' },
  ivory: { tile: cn('bg-gradient-to-b from-[#FFFDFB] to-ivory text-ink-app ring-1 ring-black/[0.05]', HIGHLIGHT), muted: 'text-[#827A75]', line: 'bg-black/[0.06]', strong: 'text-ink-app' },
  peach: { tile: cn('bg-gradient-to-br from-[#F8EAE5] to-terra-blush text-ink-app ring-1 ring-terra/10', HIGHLIGHT), muted: 'text-[#8a5b4e]', line: 'bg-terra-deep/15', strong: 'text-terra-deep' },
  soft: { tile: cn('bg-gradient-to-br from-[#F5DDD4] to-terra-soft text-ink-app ring-1 ring-terra/10', HIGHLIGHT), muted: 'text-[#7d4b3e]', line: 'bg-terra-deep/15', strong: 'text-terra-deep' },
  terra: { tile: cn('bg-gradient-to-br from-[#D7745A] via-terra to-terra-deep text-white', HIGHLIGHT_DARK), muted: 'text-white/75', line: 'bg-white/20', strong: 'text-white' },
  deep: { tile: cn('bg-gradient-to-br from-[#B0533E] via-terra-deep to-terra-dark text-white', HIGHLIGHT_DARK), muted: 'text-white/70', line: 'bg-white/15', strong: 'text-white' },
  ink: { tile: cn('bg-gradient-to-br from-[#2D2724] via-ink-app to-[#120F0E] text-white', HIGHLIGHT_DARK), muted: 'text-white/55', line: 'bg-white/10', strong: 'text-white' },
};

export const Tile = forwardRef<
  HTMLDivElement,
  {
    tone?: TileTone;
    className?: string;
    children: React.ReactNode;
    /** Index d'apparition (léger décalage entre tuiles). */
    index?: number;
    as?: 'div' | 'section' | 'article';
    /** Soulèvement au survol (désactivable, ex. mode édition). */
    lift?: boolean;
    'aria-label'?: string;
  }
>(function Tile({ tone = 'white', className, children, index = 0, as = 'div', lift = true, ...rest }, ref) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={lift && !reduce ? { y: -4 } : undefined}
      transition={{ duration: 0.45, delay: reduce ? 0 : Math.min(index, 10) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-[22px] p-5 transition-shadow duration-300', TONE_CLASSES[tone].tile, className)}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/** En-tête de tuile : libellé discret, action à droite. */
export function TileHeader({ title, tone = 'white', action, icon }: { title: React.ReactNode; tone?: TileTone; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className={cn('flex min-w-0 items-center gap-2 text-[13px] font-medium', TONE_CLASSES[tone].muted)}>
        {icon}
        <span className="truncate">{title}</span>
      </div>
      {action}
    </div>
  );
}

/** Variation (+12,4 %) : vert/rouge seulement pour l'état, jamais décoratif. */
export function Delta({ value, tone = 'white', positiveIsGood = true, suffix = '%' }: { value: number | null; tone?: TileTone; positiveIsGood?: boolean; suffix?: string }) {
  if (value == null || !Number.isFinite(value)) return null;
  const good = value === 0 ? null : (value > 0) === positiveIsGood;
  const onColor = tone === 'terra' || tone === 'deep' || tone === 'ink';
  const color = good == null ? TONE_CLASSES[tone].muted : onColor ? 'text-white' : good ? 'text-success' : 'text-destructive';
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums', onColor ? 'bg-white/15' : good ? 'bg-success-soft' : good === false ? 'bg-danger-soft' : 'bg-black/[0.04]', color)}>
      {value > 0 ? '+' : ''}
      {value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}
