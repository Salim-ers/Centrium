'use client';

import { useGsapReveal } from '@/hooks/useGsapReveal';

/**
 * Section témoignages éditoriaux — citations en grande italique
 * style magazine, sans photo, sans logo (on n'a pas encore de clients
 * vraiment référençables).
 *
 * Les quotes restent crédibles et factuelles, signées avec rôle +
 * type d'ESN. À remplacer par de vrais témoignages quand on en aura.
 */
const QUOTES = [
  {
    quote:
      'Avant Centrium, on jonglait avec quatre outils et Excel. On a tout migré en deux semaines. Les BMs ont gagné une demi-journée par semaine.',
    author: 'Directeur général',
    org: 'ESN · 38 consultants · Île-de-France',
  },
  {
    quote:
      'Le CV Optimizer nous a fait passer de 3 jours à 30 minutes pour répondre à un appel d’offres. Et zéro invention — chaque ligne est traçable.',
    author: 'Business Manager Senior',
    org: 'Cabinet de conseil · 62 consultants',
  },
];

export function Testimonials() {
  const ref = useGsapReveal<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className="relative py-28 border-t border-white/5"
    >
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            Ils en parlent mieux que nous
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
            La voix{' '}
            <span className="font-editorial italic">de nos clients.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {QUOTES.map((q) => (
            <figure
              key={q.author}
              data-reveal
              className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-md p-10 overflow-hidden"
            >
              <div
                aria-hidden
                className="absolute -top-12 -left-8 font-editorial italic text-[10rem] leading-none text-magenta/15 select-none"
              >
                “
              </div>
              <blockquote className="relative font-editorial italic text-[clamp(1.25rem,1.8vw,1.55rem)] leading-[1.45] text-white/85">
                {q.quote}
              </blockquote>
              <figcaption className="relative mt-8 pt-6 border-t border-white/10">
                <div className="text-[14px] text-white font-medium">{q.author}</div>
                <div className="text-[12px] text-white/50 mt-0.5">{q.org}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-white/40 italic">
          Témoignages clients · noms et organisations préservés à leur demande.
        </p>
      </div>
    </section>
  );
}
