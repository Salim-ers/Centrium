'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DICT, type LandingDict, type Locale } from './landing';

const LOCALE_KEY = 'centrium-landing-locale';

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: LandingDict;
};

const Ctx = createContext<LocaleCtx>({
  locale: 'fr',
  setLocale: () => {},
  t: DICT.fr,
});

/**
 * Provider global de la locale — placé au root layout pour que le toggle
 * FR/EN soit accessible PARTOUT (pages marketing, auth, devis, login, etc.)
 * et pas seulement sous MarketingShell.
 *
 * Persistance localStorage clé `centrium-landing-locale`.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if (stored === 'fr' || stored === 'en') setLocaleState(stored);
    } catch {
      /* localStorage indisponible (mode incognito strict) — fallback FR */
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LOCALE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* idem */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale, t: DICT[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook universel : { locale, setLocale, t } — utilisable partout. */
export function useLocale(): LocaleCtx {
  return useContext(Ctx);
}
