'use client';

import { useEffect, useRef, useState } from 'react';

import { useGsapReveal } from '@/hooks/useGsapReveal';
import { useLandingDict } from '@/components/marketing/MarketingShell';

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
  { value: 30, suffix: ' min' },
  { value: 48, suffix: ' h' },
  { value: 100, suffix: ' %' },
  { value: 0, suffix: '' },
];

export function Metrics() {
  const ref = useGsapReveal<HTMLDivElement>();
  const { t } = useLandingDict();

  return (
    <section ref={ref} className="qc-section-divider relative py-16">
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-14" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-primary mb-3">
            {t.metrics.kicker}
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.5vw,2.8rem)] text-foreground">
            {t.metrics.titleA}{' '}
            <span className="text-primary font-display ">{t.metrics.titleB}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ITEMS.map((it, i) => {
            const label = t.metrics.items[i]?.label ?? '';
            return (
              <div
                key={label || i}
                data-reveal
                className="qc-luminous-static rounded-3xl border border-border bg-card p-7 text-center"
              >
                <div className="text-primary font-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-none">
                  <AnimatedNum target={it.value} suffix={it.suffix} />
                </div>
                <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
