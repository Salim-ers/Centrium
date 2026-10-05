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
  /** Override pour le logo de l'organisation cliente. Fallback = cascade QuadCore. */
  src?: string | null;
  /** Texte alternatif personnalisable (branding client). */
  alt?: string;
  /** Nom de marque utilisé pour générer un fallback d'initiale quand aucun
   *  logo n'est uploadé — évite de leak "QuadCore" sur les comptes tenants. */
  brandName?: string;
  /** Couleur primaire utilisée par le fallback d'initiale (cohérent avec
   *  le branding utilisateur). */
  primaryColor?: string | null;
  /** Cache buster — concaténé en query string sur le src pour forcer le
   *  navigateur à re-fetcher après un upload de nouveau logo. Recommandé :
   *  brandingVersion / updated_at de l'org. */
  cacheKey?: string | number | null;
};

const HEIGHT = {
  sm: 'h-12',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-32',
  '2xl': 'h-40',
};

const PX_HEIGHT = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
  '2xl': 160,
};

// Cascade de fallback PNG QuadCore — seulement utilisée pour la marque éditrice.
// Les tenants sans logo verront le fallback SVG d'initiale.
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

/** Première lettre majuscule, fallback sur ? */
function brandInitial(brandName: string | undefined): string {
  if (!brandName) return '?';
  const ch = brandName.trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

/** Ajoute ?v=cacheKey à une URL si présente. Évite de toucher aux data: URLs. */
function withCacheBuster(url: string, cacheKey: Props['cacheKey']): string {
  if (cacheKey == null || url.startsWith('data:')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(String(cacheKey))}`;
}

export function QuadCoreLogo({
  size = 'md',
  showTagline: _showTagline,
  className,
  variant,
  src: overrideSrc,
  alt,
  brandName,
  primaryColor,
  cacheKey,
}: Props) {
  // Si aucun overrideSrc ET un brandName est fourni → on rend une initiale
  // colorée SVG. C'est le path "tenant qui n'a pas uploadé de logo".
  // Sans brandName, on retombe sur la cascade QuadCore (marque éditrice).
  const [idx, setIdx] = useState(0);
  // Logo d'organisation illisible (URL cassée) : initiale, jamais la marque éditrice.
  const [broken, setBroken] = useState(false);
  const useInitialFallback = (!overrideSrc || broken) && !!brandName;

  if (useInitialFallback) {
    const px = PX_HEIGHT[size];
    const initial = brandInitial(brandName);
    const bg = primaryColor || '#23201d';
    return (
      <div
        role="img"
        aria-label={alt ?? brandName}
        className={cn(HEIGHT[size], 'w-auto aspect-square inline-flex items-center justify-center select-none rounded-lg shrink-0', className)}
        style={{
          background: bg,
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: Math.round(px * 0.55),
          lineHeight: 1,
          width: px,
          height: px,
        }}
      >
        {initial}
      </div>
    );
  }

  // Mode classique : image (override ou cascade QuadCore).
  if (overrideSrc && broken) return null;
  const cascade = overrideSrc ? [overrideSrc] : CASCADES[variant ?? 'default'];
  const src = withCacheBuster(cascade[idx], cacheKey);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? brandName ?? ''}
      className={cn(HEIGHT[size], 'w-auto object-contain select-none', className)}
      onError={() => {
        if (idx < cascade.length - 1) setIdx(idx + 1);
        else if (overrideSrc) setBroken(true);
      }}
      draggable={false}
    />
  );
}
