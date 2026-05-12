'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Orientation = 'horizontal' | 'vertical';

type Props = {
  size?: Size;
  /** horizontal : C-logo + texte côte à côte. vertical : empilé centré. */
  orientation?: Orientation;
  /** Affiche "by QuadCore" en sous-titre. */
  showEditor?: boolean;
  /** Wrappe dans un <Link href={href}> si fourni. */
  href?: string;
  className?: string;
};

const SIZES: Record<
  Size,
  {
    logo: string;
    name: string;
    editor: string;
    gap: string;
    vGap: string;
  }
> = {
  sm: { logo: 'h-7 w-7', name: 'text-[18px]', editor: 'text-[9px]', gap: 'gap-2', vGap: 'gap-1.5' },
  md: { logo: 'h-10 w-10', name: 'text-[26px]', editor: 'text-[10px]', gap: 'gap-2.5', vGap: 'gap-2' },
  lg: { logo: 'h-16 w-16', name: 'text-[34px]', editor: 'text-[10.5px]', gap: 'gap-3', vGap: 'gap-2.5' },
  xl: { logo: 'h-24 w-24', name: 'text-[52px]', editor: 'text-[13px]', gap: 'gap-4', vGap: 'gap-3' },
};

/**
 * Wordmark Centrium — adaptatif clair/sombre, animé.
 *
 * - C-logo SVG avec halo gradient rose+violet pulsant.
 * - "CENTRIUM" en gros, font-display, gradient pink-dominant qui pan.
 * - "BY QUADCORE" en sous-titre, muted-foreground.
 *
 * Orientation `vertical` pour les contextes étroits (sidebar 256px) :
 * logo en haut, texte en dessous, le tout centré. Plus aéré aux tailles
 * lg/xl que le mode horizontal qui déborde.
 */
export function CentriumWordmark({
  size = 'md',
  orientation = 'horizontal',
  showEditor = true,
  href,
  className,
}: Props) {
  const s = SIZES[size];

  const logoBlock = (
    <div className="relative shrink-0">
      {/* Halo rose+violet animé derrière le logo */}
      <div
        aria-hidden
        className="absolute inset-[-30%] rounded-full blur-2xl opacity-70 animate-pulse-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(236,72,153,0.8), rgba(192,38,211,0.45) 40%, rgba(168,85,247,0.25) 70%, transparent 80%)',
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/centrium-logo.svg"
        alt=""
        aria-hidden
        className={cn('relative drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]', s.logo)}
        draggable={false}
      />
    </div>
  );

  const textBlock = (
    <div className={cn('leading-none', orientation === 'vertical' && 'text-center')}>
      <span
        className={cn(
          'font-display font-extrabold tracking-tight bg-clip-text text-transparent',
          'bg-gradient-to-r from-pink-400 via-magenta to-fuchsia-500',
          'bg-[length:200%_100%] animate-gradient-pan',
          'drop-shadow-[0_0_18px_rgba(236,72,153,0.45)]',
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
  );

  const inner =
    orientation === 'vertical' ? (
      <div className={cn('inline-flex flex-col items-center select-none', s.vGap, className)}>
        {logoBlock}
        {textBlock}
      </div>
    ) : (
      <div className={cn('inline-flex items-center select-none', s.gap, className)}>
        {logoBlock}
        {textBlock}
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
