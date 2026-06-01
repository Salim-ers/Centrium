'use client';

import { useEffect, useRef, useState } from 'react';
import { Shield, Lock, Globe2, Server, FileCheck2 } from 'lucide-react';

import { useGsapReveal } from '@/hooks/useGsapReveal';

function AnimatedCounter({
  target,
  duration = 1800,
  suffix = '',
}: {
  target: number;
  duration?: number;
  suffix?: string;
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
            setValue(Math.round(target * eased));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

const BADGES = [
  { icon: Shield, label: 'RGPD' },
  { icon: Lock, label: 'AES-256' },
  { icon: Globe2, label: 'Hébergement UE' },
  { icon: Server, label: 'Multi-tenant RLS' },
  { icon: FileCheck2, label: 'DPA fourni' },
];

export function TrustedBy() {
  const ref = useGsapReveal<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className="qc-section-divider relative py-20 overflow-hidden"
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xs font-medium text-emerald-300 mb-4">
            <Shield className="h-3 w-3" />
            Confiance & conformité
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Pensé pour la confiance des ESN exigeantes.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {[
            { value: 100, suffix: '%', label: 'Données en Union européenne' },
            { value: 99, suffix: '.9 %', label: 'Disponibilité applicative cible' },
            { value: 72, suffix: ' h', label: 'Délai notification CNIL en cas d’incident' },
            { value: 30, suffix: ' j', label: 'Délai max de réponse RGPD' },
          ].map((stat) => (
            <div
              key={stat.label}
              data-reveal
              className="rounded-2xl border border-hairline bg-white/[0.02] p-5 text-center"
            >
              <div className="font-display text-3xl md:text-4xl font-bold qc-gradient-text">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-white/60 mt-2 leading-snug">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div
          data-reveal
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <span
                key={b.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-hairline bg-white/5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <Icon className="h-3.5 w-3.5 text-emerald-300" />
                {b.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
