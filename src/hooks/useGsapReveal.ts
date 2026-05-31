'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook GSAP réutilisable pour révéler les enfants au scroll.
 *
 * Sélectionne `[data-reveal]` à l'intérieur du ref, applique un fade + rise
 * orchestré par ScrollTrigger. Respecte prefers-reduced-motion.
 *
 * Usage :
 *   const ref = useGsapReveal<HTMLDivElement>();
 *   return <section ref={ref}>
 *     <div data-reveal>...</div>
 *     <div data-reveal>...</div>
 *   </section>;
 */
export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(opts?: {
  selector?: string;
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!ref.current) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.from(opts?.selector ?? '[data-reveal]', {
          opacity: 0,
          y: opts?.y ?? 28,
          duration: opts?.duration ?? 0.7,
          stagger: opts?.stagger ?? 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ref.current!,
            start: opts?.start ?? 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }, ref);

      cleanup = () => ctx.revert();
    })();

    return () => cleanup?.();
  }, [opts?.selector, opts?.y, opts?.duration, opts?.stagger, opts?.start]);

  return ref;
}
