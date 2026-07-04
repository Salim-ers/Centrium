'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Currency = 'EUR' | 'USD';

const CURRENCY_KEY = 'centrium-currency';

/**
 * Taux de conversion EUR → USD figé (indicatif).
 * Les montants sont TOUS stockés en EUR en DB. Quand l'utilisateur passe
 * en USD on convertit à l'affichage uniquement. Pas de conversion à
 * l'écriture — les formulaires saisissent toujours en EUR.
 *
 * Taux mis à jour le 2026-06-29. À ajuster manuellement si besoin.
 */
const EUR_TO_USD = 1.08;

type CurrencyCtx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /**
   * Formatte un montant stocké en EUR vers la devise active de l'utilisateur.
   * - locale='fr' + EUR → "1 234 €"
   * - locale='en' + USD → "$1,333"
   */
  format: (amountInEur: number | null, opts?: { maximumFractionDigits?: number }) => string;
  /**
   * Convertit un montant EUR vers la devise active et renvoie le NOMBRE
   * (arrondi à l'unité) — pour les compteurs animés (KPICard/AnimatedNumber)
   * qui ont besoin d'une valeur numérique, pas d'une chaîne formatée.
   */
  convert: (amountInEur: number) => number;
  /** Symbole court de la devise active ('€' ou '$'). */
  symbol: string;
};

const Ctx = createContext<CurrencyCtx>({
  currency: 'EUR',
  setCurrency: () => {},
  format: () => '—',
  convert: (n) => n,
  symbol: '€',
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('EUR');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CURRENCY_KEY);
      if (stored === 'EUR' || stored === 'USD') setCurrencyState(stored);
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try {
      window.localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* idem */
    }
  }, []);

  const value = useMemo<CurrencyCtx>(() => {
    const symbol = currency === 'USD' ? '$' : '€';
    function format(amountInEur: number | null, opts?: { maximumFractionDigits?: number }): string {
      if (amountInEur === null || amountInEur === undefined || Number.isNaN(amountInEur)) return '—';
      const converted = currency === 'USD' ? amountInEur * EUR_TO_USD : amountInEur;
      const locale =
        typeof document !== 'undefined' && document.documentElement.lang === 'en'
          ? 'en-US'
          : 'fr-FR';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
      }).format(converted);
    }
    function convert(amountInEur: number): number {
      if (!Number.isFinite(amountInEur)) return 0;
      return Math.round(currency === 'USD' ? amountInEur * EUR_TO_USD : amountInEur);
    }
    return { currency, setCurrency, format, convert, symbol };
  }, [currency, setCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hook : currency + setCurrency + format() + symbol. */
export function useCurrency(): CurrencyCtx {
  return useContext(Ctx);
}
