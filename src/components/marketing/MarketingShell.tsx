'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DICT, type Locale, type LandingDict } from '@/lib/i18n/landing';
import { Header } from './Header';
import { Footer } from './Footer';
import { Starfield } from '@/components/ui/starfield-1';
import { PageReveal } from './PageReveal';
import { useIsMobile } from '@/hooks/useIsMobile';

const LOCALE_KEY = 'centrium-landing-locale';

type Ctx = { t: LandingDict; locale: Locale };
const MarketingCtx = createContext<Ctx>({ t: DICT.fr, locale: 'fr' });

/** Hook à utiliser dans n'importe quel composant marketing pour récupérer
 *  le dictionnaire et le locale courants depuis le MarketingShell parent. */
export function useLandingDict(): Ctx {
  return useContext(MarketingCtx);
}

/**
 * Shell partagé par TOUTES les pages marketing.
 *
 *   - StarField global fixed en arrière-plan (fond étoilé partout)
 *   - Header marketing identique (sticky, FR/EN, nav routes)
 *   - PageReveal wrapper pour l'entrée animée
 *   - Footer marketing partagé
 *   - Context React pour exposer t/locale aux enfants
 */
type Props = {
  children: React.ReactNode;
  noReveal?: boolean;
  noFooter?: boolean;
};

export function MarketingShell({ children, noReveal, noFooter }: Props) {
  const [locale, setLocale] = useState<Locale>('fr');
  const isMobile = useIsMobile();

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === 'fr' || stored === 'en') setLocale(stored);
  }, []);

  function handleLocaleChange(l: Locale) {
    setLocale(l);
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_KEY, l);
  }

  const t = DICT[locale];
  const ctxValue = useMemo<Ctx>(() => ({ t, locale }), [t, locale]);

  const inner = noReveal ? children : <PageReveal>{children}</PageReveal>;

  return (
    <MarketingCtx.Provider value={ctxValue}>
      {/* Fond Starfield warp pleine fenêtre, fixed inset-0, derrière
          tout le contenu. Le wrapper bg-black assure le noir profond
          comme couleur de base ; le composant Starfield ajoute les
          traînées d'étoiles qui foncent vers le viewer (effet warp). */}
      <div className="min-h-screen text-white relative overflow-x-hidden">
        <div
          aria-hidden
          className="fixed inset-0 z-0 pointer-events-none"
          style={{ background: '#000' }}
        >
          {/* Sur mobile (perf GPU plus faible + écran réduit), on baisse
              la densité d'étoiles et la vitesse → animation plus fluide */}
          <Starfield
            speed={isMobile ? 0.45 : 0.6}
            quantity={isMobile ? 180 : 420}
          />
        </div>
        <Header t={t} locale={locale} onLocaleChange={handleLocaleChange} />
        <div className="relative z-[1]">{inner}</div>
        {!noFooter && (
          <div className="relative z-[1]">
            <Footer t={t} />
          </div>
        )}
      </div>
    </MarketingCtx.Provider>
  );
}
