import { CentriumType } from '@/components/brand/CentriumLogo';

import { Cta, Wide } from '../kit';
import { HeroConverge } from './HeroConverge';

/**
 * Hero : titre monumental (animé en CSS — c'est l'élément LCP), CENTRIUM
 * géant en fond, puis les six briques du métier qui convergent vers le
 * cockpit.
 */
export function Hero() {
  return (
    <section data-nav="dark" className="relative overflow-hidden bg-ivory text-ink" aria-labelledby="hero-title">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[52svh] select-none overflow-hidden md:top-[46svh]">
        <div className="mx-auto w-full max-w-[1680px] px-5 text-terra/[0.07] sm:px-8 lg:px-12 2xl:px-16">
          <CentriumType className="h-auto w-full" />
        </div>
      </div>

      <Wide className="relative flex min-h-[calc(100svh-9rem)] flex-col pb-10 pt-28 md:pt-32">
        <div className="hero-fade flex items-center justify-between gap-6 text-[11.5px] font-semibold uppercase tracking-[0.22em] text-taupe" style={{ ['--d' as string]: '0ms' }}>
          <span className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-terra" aria-hidden />
            Le cockpit des ESN modernes
          </span>
          <span className="hidden md:block">CRM · Staffing · Missions · CRA · Marge</span>
        </div>

        <h1 id="hero-title" className="mt-auto pt-16 font-extrabold uppercase leading-[0.86] tracking-[-0.055em] text-[clamp(2.9rem,8.4vw,10rem)]">
          <span className="hero-line">
            <span style={{ ['--i' as string]: 0 }}>Pilotez votre ESN.</span>
          </span>
          <span className="hero-line">
            <span style={{ ['--i' as string]: 1 }}>
              Pas vos <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra">tableurs.</em>
            </span>
          </span>
        </h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <p className="hero-fade max-w-[34rem] text-[17px] leading-[1.55] text-ink-soft/80 md:text-[19px]" style={{ ['--d' as string]: '260ms' }}>
            CRM, staffing, consultants, missions, CRA et rentabilité réunis dans un seul espace.
          </p>
          <div className="hero-fade flex flex-wrap gap-3" style={{ ['--d' as string]: '360ms' }}>
            <Cta href="/plateforme" variant="terra" cursor="Explorer">
              Découvrir Centrium
            </Cta>
            <Cta href="#produit" variant="outline-dark" cursor="Voir">
              Voir le produit
            </Cta>
          </div>
        </div>
      </Wide>

      <HeroConverge />
    </section>
  );
}
