'use client';

import { useGsapReveal } from '@/hooks/useGsapReveal';
import { useLandingDict } from '@/components/marketing/MarketingShell';

/**
 * Section témoignages éditoriaux — citations en grande italique
 * style magazine, sans photo, sans logo (on n'a pas encore de clients
 * vraiment référençables).
 *
 * Les quotes restent crédibles et factuelles, signées avec rôle +
 * type d'ESN. À remplacer par de vrais témoignages quand on en aura.
 */

export function Testimonials() {
  const ref = useGsapReveal<HTMLDivElement>();
  const { t } = useLandingDict();

  return (
    <section
      ref={ref}
      className="qc-section-divider relative py-20"
    >
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            {t.testimonials.kicker}
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
            {t.testimonials.titleA}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.testimonials.titleB}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {t.testimonials.items.map((q) => (
            <figure
              key={q.role}
              data-reveal
              className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-md p-10 overflow-hidden"
            >
              <div
                aria-hidden
                className="qc-italic-accent absolute -top-12 -left-8 font-editorial italic text-[10rem] leading-none select-none opacity-30"
              >
                “
              </div>
              <blockquote className="qc-italic-accent relative font-editorial italic text-[clamp(1.25rem,1.8vw,1.55rem)] leading-[1.45]">
                {q.quote}
              </blockquote>
              <figcaption className="relative mt-8 pt-6 border-t border-white/10">
                <div className="text-[14px] text-white font-medium">{q.role}</div>
                <div className="text-[12px] text-white/50 mt-0.5">{q.org}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-white/40 italic">
          {t.testimonials.privacy}
        </p>
      </div>
    </section>
  );
}
