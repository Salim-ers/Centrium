'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/**
 * Apparition au scroll : léger fondu + translation. Sans animation si
 * l'utilisateur préfère réduire les mouvements.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Compteur qui s'incrémente quand il devient visible (valeur finale immédiate si mouvement réduit). */
export function CountUp({ value, format, duration = 1200 }: { value: number; format: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className="num">
      {format(n)}
    </span>
  );
}

/** Vrai quand l'élément est visible ; utile pour lancer une séquence d'animation. */
export function useVisible<T extends Element>(margin = '-80px') {
  const ref = useRef<T>(null);
  const visible = useInView(ref, { margin: margin as `${number}px` });
  return { ref, visible };
}

/** Avance un index toutes les `ms` tant que `active` (figé si mouvement réduit). */
export function useTicker(length: number, ms: number, active: boolean) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || !active || length <= 1) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % length), ms);
    return () => window.clearInterval(id);
  }, [reduce, active, length, ms]);
  return reduce ? length - 1 : i;
}
