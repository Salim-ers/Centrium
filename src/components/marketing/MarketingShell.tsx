'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DICT, type Locale, type LandingDict } from '@/lib/i18n/landing';
import { Header } from './Header';
import { Footer } from './Footer';
import { StarField } from './StarField';
import { PageReveal } from './PageReveal';

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
      <div className="min-h-screen bg-background text-white relative overflow-x-hidden">
        <StarField />
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
