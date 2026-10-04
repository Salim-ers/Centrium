'use client';

import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * Tons des tuiles Bento : la couleur structure la composition (le CA en
 * blanc, la marge en terracotta, l'urgence en peach, l'objectif en
 * terracotta profond…). Chaque ton fixe aussi la couleur du texte.
 */
export type TileTone = 'white' | 'ivory' | 'peach' | 'soft' | 'terra' | 'deep' | 'ink';

export const TONE_CLASSES: Record<TileTone, { tile: string; muted: string; line: string; strong: string }> = {
  white: { tile: 'bg-white text-ink-app ring-1 ring-black/[0.05]', muted: 'text-[#827A75]', line: 'bg-black/[0.06]', strong: 'text-ink-app' },
  ivory: { tile: 'bg-ivory text-ink-app ring-1 ring-black/[0.05]', muted: 'text-[#827A75]', line: 'bg-black/[0.06]', strong: 'text-ink-app' },
  peach: { tile: 'bg-terra-blush text-ink-app', muted: 'text-[#8a5b4e]', line: 'bg-terra-deep/15', strong: 'text-terra-deep' },
  soft: { tile: 'bg-terra-soft text-ink-app', muted: 'text-[#7d4b3e]', line: 'bg-terra-deep/15', strong: 'text-terra-deep' },
  terra: { tile: 'bg-terra text-white', muted: 'text-white/70', line: 'bg-white/20', strong: 'text-white' },
  deep: { tile: 'bg-terra-deep text-white', muted: 'text-white/65', line: 'bg-white/15', strong: 'text-white' },
  ink: { tile: 'bg-ink-app text-white', muted: 'text-white/55', line: 'bg-white/10', strong: 'text-white' },
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
    'aria-label'?: string;
  }
>(function Tile({ tone = 'white', className, children, index = 0, as = 'div', ...rest }, ref) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduce ? 0 : Math.min(index, 10) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-card p-5', TONE_CLASSES[tone].tile, className)}
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
