'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DICT, type LandingDict, type Locale } from './landing';
import { APP_DICT, type AppDict } from './app';

const LOCALE_KEY = 'centrium-landing-locale';

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Dictionnaire des pages publiques (landing, pricing, footer…). */
  t: LandingDict;
  /** Dictionnaire de l'app admin (sidebar, dashboard, KPIs…). */
  app: AppDict;
};

const Ctx = createContext<LocaleCtx>({
  locale: 'fr',
  setLocale: () => {},
  t: DICT.fr,
  app: APP_DICT.fr,
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
    () => ({ locale, setLocale, t: DICT[locale], app: APP_DICT[locale] }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook universel : { locale, setLocale, t, app } — utilisable partout. */
export function useLocale(): LocaleCtx {
  return useContext(Ctx);
}

/**
 * Sucre syntaxique : retourne directement le dictionnaire APP pour
 * raccourcir les usages dans les composants admin :
 *
 *   const t = useAppT();
 *   <h1>{t.dashboard.title_a}</h1>
 */
export function useAppT(): AppDict {
  return useContext(Ctx).app;
}
