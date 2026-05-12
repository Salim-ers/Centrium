'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  size?: Size;
  /** Affiche "by QuadCore" en sous-titre. */
  showEditor?: boolean;
  /** Wrappe dans un <Link href={href}> si fourni. */
  href?: string;
  className?: string;
};

const SIZES: Record<
  Size,
  { logo: string; name: string; editor: string; gap: string }
> = {
  sm: { logo: 'h-7 w-7', name: 'text-[18px]', editor: 'text-[9px]', gap: 'gap-2' },
  md: { logo: 'h-10 w-10', name: 'text-[26px]', editor: 'text-[10px]', gap: 'gap-2.5' },
  lg: { logo: 'h-14 w-14', name: 'text-[38px]', editor: 'text-[11px]', gap: 'gap-3' },
  xl: { logo: 'h-20 w-20', name: 'text-[56px]', editor: 'text-[13px]', gap: 'gap-4' },
};

/**
 * Wordmark Centrium grand format — adaptatif clair/sombre.
 *
 * - Le C-logo SVG est à gauche, avec un glow pink→violet animé.
 * - "CENTRIUM" en gros, font-display, gradient cross-mode (pink→violet→pink).
 * - "BY QUADCORE" en sous-titre, muted-foreground.
 *
 * Optionnel `href` pour rendre cliquable (utilisé en sidebar pour ramener au dashboard).
 */
export function CentriumWordmark({
  size = 'md',
  showEditor = true,
  href,
  className,
}: Props) {
  const s = SIZES[size];

  const inner = (
    <div className={cn('inline-flex items-center select-none', s.gap, className)}>
      {/* C-logo avec halo gradient animé */}
      <div className="relative shrink-0">
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse-slow',
            'bg-gradient-to-br from-magenta via-violet-glow to-magenta',
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/centrium-logo.svg"
          alt=""
          aria-hidden
          className={cn('relative', s.logo)}
          draggable={false}
        />
      </div>

      {/* Wordmark + by QuadCore */}
      <div className="leading-none">
        <span
          className={cn(
            'font-display font-extrabold tracking-tight bg-clip-text text-transparent',
            'bg-gradient-to-r from-magenta via-violet-glow to-magenta',
            'bg-[length:200%_100%] animate-gradient-pan',
            s.name,
          )}
        >
          CENTRIUM
        </span>
        {showEditor && (
          <div
            className={cn(
              'mt-1 uppercase tracking-[0.28em] text-muted-foreground/70 font-semibold',
              s.editor,
            )}
          >
            by <span className="text-magenta">QUADCORE</span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition hover:opacity-90" aria-label="Centrium — accueil">
        {inner}
      </Link>
    );
  }
  return inner;
}
