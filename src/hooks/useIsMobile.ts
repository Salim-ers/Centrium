'use client';

import { useEffect, useState } from 'react';

/**
 * Hook qui détecte si on est sur mobile (< 768px) via matchMedia.
 *
 * Retourne `false` au premier render côté serveur, puis se synchronise
 * avec la valeur réelle au mount client. Réagit aux changements de
 * taille de fenêtre (rotation portrait/paysage, resize desktop).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}
