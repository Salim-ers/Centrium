'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

import { AuroraField } from './AuroraField';
import { MagneticButton } from './MagneticButton';
import type { LandingDict } from '@/lib/i18n/landing';

/**
 * Hero "premium" :
 *   - section pleine largeur avec AuroraField en fond (Canvas fluide)
 *   - bandeau de marque discret en haut (kicker éditorial)
 *   - titre XL display avec dégradé subtil sur la 2e ligne
 *   - 2 CTA Magnetic (primary + ghost)
 *   - mockup floating qui descend, glassmorphic, avec halo
 *   - parallax léger sur le mockup au scroll
 *
 * Pas d'image humaine, pas de wordmark redondant avec le header,
 * pas de "AI startup look" — éditorial chic.
 */
export function Hero({ t }: { t: LandingDict }) {
  const mockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = mockRef.current;
    if (!el) return;
    let raf = 0;
    function onScroll() {
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        // parallax très léger — max ~30 px de déplacement
        const dy = Math.min(60, y * 0.08);
        el.style.transform = `translate3d(0, ${dy}px, 0)`;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative pt-36 pb-32 md:pt-44 md:pb-40 overflow-hidden"
    >
      {/* Fond Aurora premium plein écran */}
      <AuroraField className="opacity-90" intensity={0.95} />

      {/* Voile dégradé pour fondre vers la section suivante */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
      />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        {/* Kicker éditorial — plus chic qu'un badge "IA" */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md text-[11px] uppercase tracking-[0.2em] text-white/70 mb-10">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          Centrium · plateforme métier ESN
        </div>

        {/* Titre XL display */}
        <h1 className="font-display font-medium tracking-[-0.04em] leading-[0.98] text-[clamp(2.6rem,6vw,5.5rem)] text-white">
          {t.hero.title1}{' '}
          <span className="italic font-light text-white/90">
            {t.hero.titleGradient}
          </span>
        </h1>

        {/* Sous-titre serif-style, plus court, plus éditorial */}
        <p className="mt-8 mx-auto max-w-2xl text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-white/65 font-light">
          {t.hero.subtitle}
        </p>

        {/* CTAs premium */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <MagneticButton href="/devis" variant="primary">
            {t.hero.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton href="#preview" variant="ghost">
            {t.hero.ctaSecondary}
          </MagneticButton>
        </div>

        {/* Mini-stats trust en bas, très sobre */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-white/55">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/80" />
            {t.hero.trial}
          </span>
          <span className="hidden sm:inline-block w-px h-3 bg-white/15" />
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-300/80" />
            Sans engagement avant signature
          </span>
        </div>
      </div>

      {/* Mockup floating premium */}
      <div
        ref={mockRef}
        className="relative max-w-6xl mx-auto px-6 mt-20 md:mt-24 will-change-transform"
      >
        <div className="relative">
          {/* halo derrière le mockup */}
          <div
            aria-hidden
            className="absolute inset-x-10 -inset-y-4 rounded-[3rem] bg-gradient-to-br from-pink-500/25 via-violet-500/15 to-transparent blur-3xl"
          />
          <div
            className="relative rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl shadow-[0_60px_120px_-40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden"
          >
            {/* barre browser premium */}
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/10 bg-black/30">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400/70" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="ml-3 flex-1 h-6 max-w-md rounded-md bg-white/[0.04] border border-white/10 flex items-center px-3 text-[11px] text-white/45 font-mono tracking-tight">
                centrium.app/dashboard
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-[10px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </div>
            </div>

            {/* contenu mockup */}
            <div className="grid lg:grid-cols-[280px_1fr] gap-0">
              <div className="hidden lg:block border-r border-white/10 bg-black/20 p-5 space-y-1">
                {[
                  { label: 'Dashboard', active: true },
                  { label: 'Consultants', sub: '87' },
                  { label: 'Missions', sub: '12' },
                  { label: 'CV Optimizer' },
                  { label: 'Pipeline', sub: '4 hot' },
                  { label: 'CRA & factures' },
                ].map((it) => (
                  <div
                    key={it.label}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] ${
                      it.active
                        ? 'bg-white/10 text-white border border-white/10'
                        : 'text-white/55 hover:text-white/80'
                    }`}
                  >
                    <span>{it.label}</span>
                    {it.sub && (
                      <span className="text-[10px] text-white/45">{it.sub}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                      Bonjour, Marc
                    </div>
                    <div className="font-display text-xl text-white">
                      Vue d’ensemble — mai 2026
                    </div>
                  </div>
                  <div className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300">
                    Tout est sous contrôle
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Consultants', value: '87', tone: 'text-white' },
                    { label: 'Missions', value: '12', tone: 'text-violet-200' },
                    { label: 'Intercontrat', value: '8 %', tone: 'text-amber-200' },
                    { label: 'CA M+1', value: '412 k€', tone: 'text-pink-200' },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="text-[9px] uppercase tracking-widest text-white/40 mb-1">
                        {k.label}
                      </div>
                      <div className={`font-display text-2xl ${k.tone}`}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      CA mensuel
                    </div>
                    <div className="text-[10px] text-emerald-300">+18 %</div>
                  </div>
                  <svg viewBox="0 0 600 80" className="w-full h-16">
                    <defs>
                      <linearGradient id="hero-spark" x1="0" x2="1">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                      <linearGradient id="hero-spark-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(236,72,153,0.30)" />
                        <stop offset="100%" stopColor="rgba(168,85,247,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,60 L80,55 L160,58 L240,42 L320,46 L400,30 L480,25 L560,15 L600,10 L600,80 L0,80 Z"
                      fill="url(#hero-spark-fill)"
                    />
                    <path
                      d="M0,60 L80,55 L160,58 L240,42 L320,46 L400,30 L480,25 L560,15 L600,10"
                      fill="none"
                      stroke="url(#hero-spark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="rounded-xl border border-violet-glow/30 bg-violet-glow/[0.06] p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-glow/20 border border-violet-glow/40 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-violet-200" />
                  </div>
                  <div className="text-[12px] leading-relaxed text-white/85">
                    <span className="font-semibold text-violet-200">Suggestion · </span>
                    3 profils correspondent à la mission « Tech Lead React » de Capgemini —
                    score moyen <span className="text-emerald-300 font-mono">87 %</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
