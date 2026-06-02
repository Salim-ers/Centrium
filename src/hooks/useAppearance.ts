'use client';

import { useCallback, useEffect, useState } from 'react';

const STARFIELD_KEY = 'centrium-starfield-intensity';
const DENSITY_KEY = 'centrium-density';

export type StarfieldIntensity = 'off' | 'subtle' | 'normal';
export type Density = 'compact' | 'normal';

type Appearance = {
  starfield: StarfieldIntensity;
  density: Density;
  setStarfield: (v: StarfieldIntensity) => void;
  setDensity: (v: Density) => void;
};

/**
 * Préférences d'apparence persistantes pour l'app interne.
 *
 *   - starfield : intensité du fond animé en dark mode (off | subtle | normal)
 *                 → off = aucun canvas, subtle = 120 particules speed 0.4,
 *                 normal = 420 particules speed 0.6 (défaut vitrine)
 *   - density   : compact (paddings réduits) | normal (défaut)
 *
 * Les préférences sont stockées en localStorage côté client. Le
 * provider applique aussi un data-density="…" sur <html> pour que
 * les classes CSS conditionnelles `[data-density='compact']` puissent
 * réduire les paddings globalement.
 */
export function useAppearance(): Appearance {
  const [starfield, setStarfieldState] = useState<StarfieldIntensity>('normal');
  const [density, setDensityState] = useState<Density>('normal');

  // Bootstrap depuis localStorage à l'hydrate
  useEffect(() => {
    try {
      const sf = window.localStorage.getItem(STARFIELD_KEY);
      if (sf === 'off' || sf === 'subtle' || sf === 'normal') {
        setStarfieldState(sf);
      }
      const d = window.localStorage.getItem(DENSITY_KEY);
      if (d === 'compact' || d === 'normal') {
        setDensityState(d);
        document.documentElement.dataset.density = d;
      }
    } catch {
      /* mode incognito strict */
    }
  }, []);

  const setStarfield = useCallback((v: StarfieldIntensity) => {
    setStarfieldState(v);
    try {
      window.localStorage.setItem(STARFIELD_KEY, v);
      // dispatch storage event manuel pour que les autres composants
      // (AppBackground) se re-render immédiatement sans attendre une
      // mutation observer
      window.dispatchEvent(new StorageEvent('storage', { key: STARFIELD_KEY, newValue: v }));
    } catch {
      /* idem */
    }
  }, []);

  const setDensity = useCallback((v: Density) => {
    setDensityState(v);
    try {
      window.localStorage.setItem(DENSITY_KEY, v);
      document.documentElement.dataset.density = v;
    } catch {
      /* idem */
    }
  }, []);

  return { starfield, density, setStarfield, setDensity };
}

/** Lit l'intensité Starfield depuis localStorage SANS hook (utilisable
 *  côté composant qui veut juste lire la valeur courante au mount). */
export function getStarfieldIntensity(): StarfieldIntensity {
  if (typeof window === 'undefined') return 'normal';
  try {
    const v = window.localStorage.getItem(STARFIELD_KEY);
    if (v === 'off' || v === 'subtle' || v === 'normal') return v;
  } catch {
    /* */
  }
  return 'normal';
}
