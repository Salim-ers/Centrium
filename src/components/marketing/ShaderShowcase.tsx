'use client';

import { useEffect, useRef, useState } from 'react';

import { ShaderAnimation } from '@/components/ui/shader-animation';

/**
 * Section "Shader showcase" — fond shader RGB pleine largeur avec un
 * titre éditorial Centrium par-dessus. Cadre rounded-3xl + border
 * luminous pour rester dans l'identité visuelle.
 *
 * Optimisation : le shader anime en continu à 60fps ; on ne le monte
 * que quand la section entre dans le viewport (IntersectionObserver)
 * et on le démonte quand elle en sort. Évite de chauffer le GPU sur
 * une section non visible.
 */
export function ShaderShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '120px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-20 sm:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            En mouvement
          </div>
          <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
            Une plateforme{' '}
            <span className="font-editorial italic">vivante.</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-white/55 text-[15px] leading-relaxed">
            Chaque flux de données, chaque mission, chaque CV — orchestré en
            temps réel. Centrium ne dort jamais.
          </p>
        </div>

        <div className="qc-luminous-static relative rounded-3xl border border-white/10 bg-black overflow-hidden shadow-[0_60px_120px_-40px_rgba(225,29,116,0.35)]">
          {/* Conteneur du shader — height contrainte (pas h-screen),
              ne monte que si la section est dans le viewport */}
          <div className="relative w-full h-[420px] sm:h-[560px]">
            {active ? (
              <div className="absolute inset-0 [&>div]:!h-full">
                <ShaderAnimation />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-cyan-500/5" />
            )}
          </div>

          {/* Texte par dessus le shader */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6">
            <div className="font-editorial italic text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.95] text-white text-center drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
              Centrium,
              <br />
              <span className="font-display not-italic font-light tracking-[-0.03em]">
                en flux continu.
              </span>
            </div>
            <div className="mt-6 sm:mt-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur text-[10px] uppercase tracking-[0.25em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
              live · 60 fps
            </div>
          </div>

          {/* Voiles latéraux pour focus central */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/60 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/60 to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
