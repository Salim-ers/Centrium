'use client';

import { ArrowRight } from 'lucide-react';

import { MagneticButton } from './MagneticButton';
import type { LandingDict } from '@/lib/i18n/landing';

/**
 * Hero "studio premium" — fond Starfield warp fourni par MarketingShell
 * en arrière-plan global. Le Hero pose juste un voile sombre central
 * pour préserver la lisibilité du titre, puis le contenu éditorial.
 */
export function Hero({ t }: { t: LandingDict }) {
  return (
    <section
      id="home"
      className="relative min-h-[90vh] flex items-center overflow-hidden"
    >
      {/* Voile sombre central pour préserver la lisibilité du titre
          au-dessus du starfield warp global */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 55%, transparent 80%)',
        }}
      />

      {/* Pas de voile bas — le Starfield warp (noir pur #000) couvre déjà
          toute la fenêtre en fond fixed, on laisse la continuité totale */}

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(3rem,7vw,6.5rem)] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          {t.hero.title1}
          <span className="block mt-2 font-editorial italic font-normal text-white tracking-[-0.025em]">
            {t.hero.titleGradient}
          </span>
        </h1>

        <p className="mt-10 mx-auto max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-[1.55] text-white/80 font-light drop-shadow-[0_2px_20px_rgba(0,0,0,0.7)]">
          {t.hero.subtitle}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <MagneticButton href="/devis" variant="primary">
            {t.hero.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton href="/plateforme" variant="ghost">
            {t.hero.ctaSecondary}
          </MagneticButton>
        </div>

        <p className="mt-12 text-[11px] uppercase tracking-[0.3em] text-white/55 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          {t.hero.trial}
        </p>
      </div>

      {/* Indicateur scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40">
        <div className="text-[10px] uppercase tracking-[0.3em]">Découvrir</div>
        <div className="h-10 w-px bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
