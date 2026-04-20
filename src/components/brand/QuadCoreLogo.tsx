'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Conservé pour rétro-compat. Le PNG embarque déjà la baseline. */
  showTagline?: boolean;
  className?: string;
  /** Choisit la variante du PNG. Cascade de fallback automatique. */
  variant?: 'light' | 'dark';
};

const HEIGHT = {
  sm: 'h-12',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-32',
  '2xl': 'h-40',
};

// Cascade de fallback. Si le premier échoue, essaie le suivant, etc.
const CASCADES: Record<'dark' | 'light' | 'default', string[]> = {
  dark: [
    '/brand/quadcore-logo-dark.png',
    '/brand/quadcore-logo.png',
    '/brand/quadcore-logo-light.png',
  ],
  light: [
    '/brand/quadcore-logo-light.png',
    '/brand/quadcore-logo.png',
    '/brand/quadcore-logo-dark.png',
  ],
  default: [
    '/brand/quadcore-logo.png',
    '/brand/quadcore-logo-light.png',
    '/brand/quadcore-logo-dark.png',
  ],
};

export function QuadCoreLogo({
  size = 'md',
  showTagline: _showTagline,
  className,
  variant,
}: Props) {
  const cascade = CASCADES[variant ?? 'default'];
  const [idx, setIdx] = useState(0);
  const src = cascade[idx];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="QuadCore — IT Services & Consulting"
      className={cn(HEIGHT[size], 'w-auto object-contain select-none', className)}
      onError={() => {
        // Essaie le fichier suivant dans la cascade
        if (idx < cascade.length - 1) setIdx(idx + 1);
      }}
      draggable={false}
    />
  );
}
