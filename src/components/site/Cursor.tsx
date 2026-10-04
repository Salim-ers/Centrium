'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * Curseur du site (ordinateur uniquement, désactivé en mouvement réduit) :
 * un point qui devient une étiquette (EXPLORER, OUVRIR, VOIR) au-dessus des
 * éléments marqués `data-cursor`. Les champs de saisie gardent le curseur
 * texte natif.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [onLink, setOnLink] = useState(false);
  const [onDark, setOnDark] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Ressort amorti : suit sans rebond.
  const sx = useSpring(x, { stiffness: 900, damping: 60, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 900, damping: 60, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnabled(fine.matches && !reduced.matches);
    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('site-cursor');
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const over = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      const tagged = t?.closest<HTMLElement>('[data-cursor]');
      setLabel(tagged?.dataset.cursor ?? null);
      setOnLink(!!t?.closest('a, button, [role="button"], summary, label'));
      setOnDark(t?.closest<HTMLElement>('[data-nav]')?.dataset.nav === 'light');
    };
    const leave = () => setVisible(false);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      root.classList.remove('site-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[90]" style={{ x: sx, y: sy, opacity: visible ? 1 : 0 }}>
      <div
        className={cn(
          'flex -translate-x-1/2 -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full font-semibold uppercase tracking-[0.18em] transition-[width,height,padding,background-color,color] duration-300 ease-out-soft',
          onDark ? 'bg-ivory text-ink' : 'bg-ink text-ivory',
          label ? 'h-11 px-5 text-[11px]' : onLink ? 'h-9 w-9' : 'h-2.5 w-2.5',
          !label && onLink && (onDark ? 'bg-ivory/30' : 'bg-terra/25'),
        )}
      >
        {label}
      </div>
    </motion.div>
  );
}
