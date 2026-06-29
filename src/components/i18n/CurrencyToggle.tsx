'use client';

import { useCurrency, type Currency } from '@/lib/i18n/CurrencyProvider';

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'EUR', label: 'EUR', symbol: '€' },
  { code: 'USD', label: 'USD', symbol: '$' },
];

/**
 * Toggle € ↔ $ — préférence d'affichage de la devise.
 * Tous les montants sont stockés en EUR en DB. Le toggle convertit
 * à l'affichage uniquement (taux figé dans CurrencyProvider).
 *
 * Variant 'app' : pill 2 segments adaptive light/dark — pour le Header.
 */
export function CurrencyToggle({
  variant = 'app',
  className = '',
}: {
  variant?: 'app';
  className?: string;
}) {
  const { currency, setCurrency } = useCurrency();

  if (variant === 'app') {
    return (
      <div
        className={[
          'inline-flex items-center rounded-md border border-hairline bg-foreground/[0.05] p-0.5 shrink-0',
          className,
        ].join(' ')}
        role="group"
        aria-label="Currency"
      >
        {CURRENCIES.map((c) => {
          const active = c.code === currency;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              aria-pressed={active}
              title={`${c.label} (${c.symbol})`}
              className={[
                'px-2 py-1 text-[11px] font-bold tracking-[0.1em] rounded transition-all',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {c.symbol}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
