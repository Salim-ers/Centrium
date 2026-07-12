'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Hero } from '@/components/marketing/Hero';
import { Pillars } from '@/components/marketing/Pillars';
import { LiveDemos } from '@/components/marketing/LiveDemos';
import { Metrics } from '@/components/marketing/Metrics';
import { Testimonials } from '@/components/marketing/Testimonials';
import { MarketingShell, useLandingDict } from '@/components/marketing/MarketingShell';
import { MagneticButton } from '@/components/marketing/MagneticButton';

/**
 * Page d'accueil enrichie (réponse au feedback "trop vide / pas assez de démos") :
 *   1. Hero 3D galaxy/network plein écran
 *   2. Pillars (architecture en 4 mots)
 *   3. LiveDemos (3 mini-démos animées en boucle)
 *   4. Trio de portes éditoriales avec halos couleur cyclique
 *   5. Metrics (4 chiffres clés)
 *   6. Testimonials (2 quotes éditoriales)
 *   7. CTA finale
 */
export default function LandingPage() {
  return (
    <MarketingShell>
      <HomeContent />
    </MarketingShell>
  );
}

function HomeContent() {
  const { t } = useLandingDict();

  return (
    <main className="relative">
      <Hero t={t} />
      <Pillars t={t} />
      <LiveDemos />

      {/* Trio de portes avec halos couleur cyclique */}
      <section className="qc-section-divider relative py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              {t.home.trio.kicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
              {t.home.trio.titleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{t.home.trio.titleB}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {t.home.trio.doors.map((door, idx) => {
              const local = [
                { href: '/plateforme', accent: 'from-pink-500/30 to-violet-500/10' },
                { href: '/engagements', accent: 'from-violet-500/30 to-indigo-500/10' },
                { href: '/pricing', accent: 'from-emerald-500/25 to-cyan-500/10' },
              ][idx]!;
              return (
                <Link
                  key={local.href}
                  href={local.href}
                  className="group qc-luminous relative block rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md p-8 md:p-10 overflow-hidden"
                >
                  <div
                    aria-hidden
                    className={`absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br ${local.accent} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 qc-color-cycle-always`}
                  />
                  <div className="relative">
                    <div className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40 mb-6">
                      {door.eyebrow}
                    </div>
                    <div className="qc-italic-accent font-editorial italic text-[clamp(1.8rem,2.4vw,2.4rem)] font-normal leading-[1.1] mb-3">
                      {door.title}
                    </div>
                    <p className="text-[14px] text-white/55 leading-relaxed mb-8 max-w-xs">
                      {door.body}
                    </p>
                    <div className="inline-flex items-center gap-2 text-[13px] text-white/70 group-hover:text-white transition">
                      {t.home.trio.discover}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Metrics />
      <Testimonials />

      {/* CTA finale */}
      <section className="qc-section-divider relative py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display font-light tracking-[-0.04em] leading-[1] text-[clamp(2.4rem,5.5vw,4.5rem)] text-white">
            {t.home.finalCta.titleA}
            <span className="qc-italic-accent block mt-3 font-editorial italic">
              {t.home.finalCta.titleB}
            </span>
          </h2>
          <p className="mt-8 mx-auto max-w-xl text-white/60 text-[15px] md:text-base leading-relaxed">
            {t.home.finalCta.sub}
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton href="/essai" variant="primary">
              {t.home.finalCta.primary}
            </MagneticButton>
            <MagneticButton href="/plateforme" variant="ghost">
              {t.home.finalCta.secondary}
            </MagneticButton>
          </div>
        </div>
      </section>
    </main>
  );
}
