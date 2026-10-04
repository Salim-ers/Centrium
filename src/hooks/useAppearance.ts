'use client';

import { useCallback, useEffect, useState } from 'react';

const DENSITY_KEY = 'centrium-density';

export type Density = 'compact' | 'normal';

/**
 * Préférence d'affichage persistante (localStorage) : densité de
 * l'interface. Applique data-density sur <html> pour que les règles CSS
 * `[data-density='compact']` resserrent les espacements.
 */
export function useAppearance(): { density: Density; setDensity: (v: Density) => void } {
  const [density, setDensityState] = useState<Density>('normal');

  useEffect(() => {
    try {
      const d = window.localStorage.getItem(DENSITY_KEY);
      if (d === 'compact' || d === 'normal') {
        setDensityState(d);
        document.documentElement.dataset.density = d;
      }
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const setDensity = useCallback((v: Density) => {
    setDensityState(v);
    try {
      window.localStorage.setItem(DENSITY_KEY, v);
      document.documentElement.dataset.density = v;
    } catch {
      /* stockage indisponible */
    }
  }, []);

  return { density, setDensity };
}
