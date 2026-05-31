'use client';

import { ArrowRight } from 'lucide-react';

import { FluidField } from './FluidField';
import { MagneticButton } from './MagneticButton';
import type { LandingDict } from '@/lib/i18n/landing';

/**
 * Hero "studio premium" — court, impactant, sans badge IA / kicker.
 *
 *   - Fond : scène 3D react-three-fiber (icosaèdre liquide distort,
 *     lumières orbitales, particules néon, parallax pointer)
 *   - Titre XL serif éditoriale (Instrument Serif italic) — noble,
 *     style Vogue / The New Yorker
 *   - 2 CTA MagneticButton avec tilt 3D
 *   - Sous-titre court, une seule ligne idéalement
 *   - Pas de stats / pas de mockup ici : le hero pousse vers /plateforme
 */
export function Hero({ t }: { t: LandingDict }) {
  return (
    <section
      id="home"
      className="relative min-h-[90vh] flex items-center overflow-hidden"
    >
      {/* Fond dynamique léger style 4DX (SVG waves + particules Canvas) */}
      <FluidField className="z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
        {/* Titre — sans badge — directement éditorial */}
        <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(3rem,7vw,6.5rem)] text-white">
          {t.hero.title1}
          <span className="block mt-2 font-editorial italic font-normal text-white tracking-[-0.025em]">
            {t.hero.titleGradient}
          </span>
        </h1>

        <p className="mt-10 mx-auto max-w-xl text-[clamp(1.05rem,1.35vw,1.2rem)] leading-[1.55] text-white/65 font-light">
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

        <p className="mt-12 text-[11px] uppercase tracking-[0.3em] text-white/40">
          {t.hero.trial}
        </p>
      </div>

      {/* Indicateur scroll discret */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30">
        <div className="text-[10px] uppercase tracking-[0.3em]">Découvrir</div>
        <div className="h-10 w-px bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
