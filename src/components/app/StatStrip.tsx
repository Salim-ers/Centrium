'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { TONE_CLASSES, type TileTone } from '@/components/bento/Tile';
import { cn } from '@/lib/utils';

export type StatItem = {
  label: string;
  value: React.ReactNode;
  tone?: TileTone;
  icon?: LucideIcon;
  href?: string;
  /** Infobulle native (précision sur le calcul). */
  title?: string;
};

/**
 * Bandeau d'indicateurs compact (≈ 60 px) pour les écrans « un écran » :
 * même famille de couleurs que le tableau de bord, sans manger la hauteur
 * du tableau ou du kanban qui suit.
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-2 gap-2.5',
        items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        className,
      )}
    >
      {items.map((it) => {
        const tone = it.tone ?? 'white';
        const t = TONE_CLASSES[tone];
        const dark = tone === 'terra' || tone === 'deep' || tone === 'ink';
        const body = (
          <>
            {it.icon && (
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', dark ? 'bg-white/15 text-white' : 'bg-white/70 text-app-terra')}>
                <it.icon className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className={cn('block text-[18px] font-semibold leading-tight tracking-[-0.02em] tabular-nums', t.strong)}>{it.value}</span>
              <span className={cn('block truncate text-[11.5px] font-medium', t.muted)}>{it.label}</span>
            </span>
          </>
        );
        const cls = cn('flex min-w-0 items-center gap-3 rounded-2xl px-3.5 py-2.5', t.tile, it.href && 'transition-transform duration-200 hover:-translate-y-0.5');
        return it.href ? (
          <Link key={it.label} href={it.href} title={it.title} className={cls}>
            {body}
          </Link>
        ) : (
          <div key={it.label} title={it.title} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
