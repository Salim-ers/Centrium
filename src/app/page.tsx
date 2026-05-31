'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { DICT, type Locale } from '@/lib/i18n/landing';
import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { Pillars } from '@/components/marketing/Pillars';
import { Footer } from '@/components/marketing/Footer';
import { PageReveal } from '@/components/marketing/PageReveal';
import { LoadingSplash } from '@/components/marketing/LoadingSplash';

const LOCALE_KEY = 'centrium-landing-locale';

/**
 * Landing minimaliste — 3 sections :
 *   - Hero 3D plein écran (scène react-three-fiber)
 *   - Pillars (architecture en 4 mots)
 *   - Trio de portes : Plateforme / Manifeste / Sécurité
 *
 * Le détail produit, les modules, le pricing, les screenshots vivent
 * sur des pages dédiées (/plateforme, /manifesto, /pricing, /security).
 * Permet d'arriver vite à l'essentiel : impact visuel + CTA.
 */
export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === 'fr' || stored === 'en') setLocale(stored);
  }, []);

  function handleLocaleChange(l: Locale) {
    setLocale(l);
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_KEY, l);
  }

  const t = DICT[locale];

  return (
    <div className="min-h-screen bg-background text-white relative overflow-x-hidden">
      {showSplash && <LoadingSplash />}
      <Header t={t} locale={locale} onLocaleChange={handleLocaleChange} />
      <PageReveal>
        <main className="relative">
          <Hero t={t} />
          <Pillars t={t} />

          {/* Portes d'entrée éditoriales — 3 cards full bleed qui mènent
              aux pages dédiées. Évite la landing longue / scroll infini. */}
          <section className="relative py-24 border-t border-hairline">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-14">
                <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
                  Explorer Centrium
                </div>
                <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(2rem,4vw,3.2rem)] text-white">
                  Trois portes,{' '}
                  <span className="font-editorial italic">une plateforme.</span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {[
                  {
                    eyebrow: 'Le produit',
                    title: 'La plateforme',
                    body: 'Modules, fonctionnalités, parcours métier de A à Z.',
                    href: '/plateforme',
                    accent: 'from-pink-500/30 to-violet-500/10',
                  },
                  {
                    eyebrow: 'La vision',
                    title: 'Notre manifeste',
                    body: 'Pourquoi nous avons construit Centrium, et pour qui.',
                    href: '/manifesto',
                    accent: 'from-violet-500/30 to-indigo-500/10',
                  },
                  {
                    eyebrow: 'La confiance',
                    title: 'Sécurité & conformité',
                    body: 'RGPD, hébergement EU, audit, isolation multi-tenant.',
                    href: '/security',
                    accent: 'from-emerald-500/25 to-cyan-500/10',
                  },
                ].map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="group qc-premium qc-premium-link relative block rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md p-8 md:p-10 overflow-hidden"
                  >
                    {/* halo coloré qui apparaît au hover */}
                    <div
                      aria-hidden
                      className={`absolute -top-20 -right-20 h-60 w-60 rounded-full bg-gradient-to-br ${c.accent} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div className="relative">
                      <div className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40 mb-6">
                        {c.eyebrow}
                      </div>
                      <div className="font-editorial italic text-[clamp(1.8rem,2.4vw,2.4rem)] font-normal text-white leading-[1.1] mb-3">
                        {c.title}
                      </div>
                      <p className="text-[14px] text-white/55 leading-relaxed mb-8 max-w-xs">
                        {c.body}
                      </p>
                      <div className="inline-flex items-center gap-2 text-[13px] text-white/70 group-hover:text-white transition">
                        Découvrir
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
      </PageReveal>
      <Footer t={t} />
    </div>
  );
}
