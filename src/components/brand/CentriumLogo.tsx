import { cn } from '@/lib/utils';

import { LOGO_TERRA, SYMBOL_PATH, SYMBOL_VIEWBOX, WORDMARK_PATH, WORDMARK_VIEWBOX } from './logo-paths';

/**
 * Symbole Centrium (deux C concentriques) — logo officiel, en SVG.
 * `color` : terracotta du logo par défaut, `currentColor` pour suivre le
 * texte (en-têtes sur fonds sombres). `tile` : symbole blanc sur pavé
 * terracotta (icônes d'application).
 */
export function CentriumLogo({
  className,
  title = 'Centrium',
  color = LOGO_TERRA,
  tile = false,
}: {
  className?: string;
  title?: string;
  color?: string;
  tile?: boolean;
}) {
  if (tile) {
    return (
      <svg viewBox="0 0 512 512" role="img" aria-label={title} className={cn('shrink-0', className)}>
        <rect width="512" height="512" rx="120" fill="#9D4432" />
        <path d={SYMBOL_PATH} fill="#FFFFFF" transform="translate(64 64) scale(0.75)" />
      </svg>
    );
  }
  return (
    <svg viewBox={SYMBOL_VIEWBOX} role="img" aria-label={title} className={cn('shrink-0', className)}>
      <path d={SYMBOL_PATH} fill={color} />
    </svg>
  );
}

/** Mot-symbole « CENTRIUM » du logo officiel (suit la couleur du texte). */
export function CentriumType({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox={WORDMARK_VIEWBOX} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={cn('shrink-0', className)}>
      <path d={WORDMARK_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
