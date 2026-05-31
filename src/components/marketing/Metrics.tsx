'use client';

import { useEffect, useRef, useState } from 'react';

import { useGsapReveal } from '@/hooks/useGsapReveal';

/**
 * Section "Métriques chiffrées" — 4 chiffres clés avec counters
 * animés au viewport. Style éditorial : font serif italique sur la
 * valeur, petit label en uppercase tracking large.
 */
function AnimatedNum({
  target,
  duration = 1800,
  suffix = '',
  prefix = '',
  decimals = 0,
}: {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (done) return;
        if (entries[0]?.isIntersecting) {
          done = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 4);
            setValue(target * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const ITEMS = [
  { value: 30, suffix: ' min', label: 'Pour qualifier un besoin client' },
  { value: 48, suffix: ' h', label: 'Pour recevoir votre devis détaillé' },
  { value: 100, suffix: ' %', label: 'Des données hébergées en Europe' },
  { value: 0, suffix: '', label: 'Engagement avant signature' },
];

export function Metrics() {
  const ref = useGsapReveal<HTMLDivElement>();

  return (
    <section ref={ref} className="relative py-24 border-t border-white/5">
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-14" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            En chiffres
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.5vw,2.8rem)] text-white">
            Centrium en{' '}
            <span className="font-editorial italic">quelques mesures.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ITEMS.map((it) => (
            <div
              key={it.label}
              data-reveal
              className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-7 text-center"
            >
              <div className="font-editorial italic text-[clamp(2.4rem,4.5vw,3.6rem)] text-white leading-none">
                <AnimatedNum target={it.value} suffix={it.suffix} />
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/55">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
