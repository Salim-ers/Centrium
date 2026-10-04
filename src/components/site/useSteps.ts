'use client';

import { useState, type RefObject } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

/**
 * Étape active d'une section « sticky » : la progression du scroll dans la
 * section (0 → 1) est découpée en `count` étapes égales.
 */
export function useActiveStep(ref: RefObject<HTMLElement>, count: number) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.min(count - 1, Math.max(0, Math.floor(v * count)));
    setActive((prev) => (prev === i ? prev : i));
  });
  return { active, progress: scrollYProgress };
}
