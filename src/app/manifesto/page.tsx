'use client';

import { useEffect, useState } from 'react';

import { DICT, type Locale } from '@/lib/i18n/landing';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { PageReveal } from '@/components/marketing/PageReveal';
import { MagneticButton } from '@/components/marketing/MagneticButton';

const LOCALE_KEY = 'centrium-landing-locale';

export default function ManifestoPage() {
  const [locale, setLocale] = useState<Locale>('fr');

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
      <Header t={t} locale={locale} onLocaleChange={handleLocaleChange} />

      {/* Halo aurora subtil en fond, sans dynamique 3D pour lecture confortable */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[80vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 10%, rgba(236,72,153,0.15), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(168,85,247,0.12), transparent 65%)',
        }}
      />

      <PageReveal>
        <main className="relative pt-32 pb-20">
          <article className="max-w-3xl mx-auto px-6">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-6 text-center">
              Manifeste
            </div>

            <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(2.6rem,6vw,5rem)] text-white text-center">
              Une plateforme
              <span className="block mt-3 font-editorial italic font-normal">
                pensée pour celles et ceux
              </span>
              <span className="block mt-3">qui font tourner les ESN.</span>
            </h1>

            <div className="mt-16 space-y-10 text-[17px] md:text-[18px] leading-[1.7] text-white/75 font-light">
              <p className="font-editorial italic text-[clamp(1.4rem,2.2vw,1.8rem)] text-white/90 leading-[1.5] text-center">
                « Le staffing ne devrait pas être un sport d’endurance Excel. »
              </p>

              <p>
                Nous avons passé des années à voir des business managers
                brillants perdre 30 % de leur temps à recoller des morceaux —
                un CV dans Word, un pipeline dans Notion, un CRA sur WhatsApp,
                une facture sur un PDF retouché à la main.
              </p>

              <p>
                Pendant ce temps, les <em>vrais</em> sujets — qualifier
                finement un besoin, sentir un intercontrat qui se profile,
                soigner la relation avec un client — passaient au second plan.
                Pas par paresse. Par fatigue d’outil.
              </p>

              <p>
                Centrium est notre réponse. Une seule plateforme, qui couvre
                tout le cycle, et qui s’efface devant le métier. Pas un
                tableau de bord de plus. <strong className="text-white">L’outil</strong>.
              </p>
            </div>

            <div className="mt-20 grid md:grid-cols-3 gap-px bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {[
                {
                  num: '01',
                  title: 'Le métier d’abord',
                  body: 'Chaque écran a été dessiné avec une ESN en main. Pas un Figma envoyé par un consultant qui n’a jamais staffé.',
                },
                {
                  num: '02',
                  title: 'L’IA assistée, pas autonome',
                  body: 'Aucune décision n’est prise sans vous. L’IA propose, suggère, accélère — vous validez. Jamais d’invention.',
                },
                {
                  num: '03',
                  title: 'Conformité par défaut',
                  body: 'Hébergement EU, RLS multi-tenant, audit trail. Votre client le plus exigeant peut auditer demain.',
                },
              ].map((p) => (
                <div key={p.num} className="bg-background p-8">
                  <div className="text-[11px] font-mono text-white/30 mb-4">
                    {p.num}
                  </div>
                  <div className="font-editorial italic text-2xl text-white mb-3">
                    {p.title}
                  </div>
                  <p className="text-[14px] text-white/60 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-20 text-center">
              <p className="font-editorial italic text-[clamp(1.6rem,2.6vw,2rem)] text-white/90 leading-[1.4] mb-3">
                Vous ne devriez pas avoir à choisir
              </p>
              <p className="font-editorial italic text-[clamp(1.6rem,2.6vw,2rem)] text-white/90 leading-[1.4]">
                entre rapidité et rigueur.
              </p>
              <p className="mt-6 text-white/55 text-[15px]">— L’équipe Centrium</p>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-3">
              <MagneticButton href="/devis" variant="primary">
                Demander une démo
              </MagneticButton>
              <MagneticButton href="/plateforme" variant="ghost">
                Voir la plateforme
              </MagneticButton>
            </div>
          </article>
        </main>
      </PageReveal>

      <Footer t={t} />
    </div>
  );
}
