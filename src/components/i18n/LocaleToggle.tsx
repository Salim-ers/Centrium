'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { Locale } from '@/lib/i18n/landing';

type Variant = 'default' | 'compact' | 'mobile' | 'app';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
];

/**
 * Toggle FR ↔ EN, basé sur LocaleProvider (root global).
 *
 * Variants :
 *   - default : pill avec 2 segments, pour Header desktop
 *   - compact : version réduite (icône+code), pour AuthShell ou bandeau
 *   - mobile  : pleine largeur, pour panneau burger
 */
export function LocaleToggle({
  variant = 'default',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const { locale, setLocale } = useLocale();

  if (variant === 'mobile') {
    return (
      <div
        className={`flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] p-1 ${className}`}
        role="group"
        aria-label="Langue / Language"
      >
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code)}
              aria-pressed={active}
              className={[
                'flex-1 px-4 py-2 text-[12px] font-semibold tracking-[0.15em] rounded-full transition',
                active
                  ? 'bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.15)]'
                  : 'text-white/55 hover:text-white',
              ].join(' ')}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Variante "app" : pill 2 segments très visible, adaptive light/dark.
  // Conçue pour le Header app où le fond peut être crème (light) ou noir (dark).
  if (variant === 'app') {
    return (
      <div
        className={[
          'inline-flex items-center rounded-md border border-hairline bg-foreground/[0.05] p-0.5 shrink-0',
          className,
        ].join(' ')}
        role="group"
        aria-label="Langue / Language"
      >
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code)}
              aria-pressed={active}
              title={l.code === 'fr' ? 'Français' : 'English'}
              className={[
                'px-2.5 py-1 text-[11px] font-bold tracking-[0.15em] rounded transition-all',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    const next: Locale = locale === 'fr' ? 'en' : 'fr';
    return (
      <button
        type="button"
        onClick={() => setLocale(next)}
        className={[
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur',
          'text-[11px] font-semibold tracking-[0.18em] text-white/70 hover:text-white hover:border-white/30 transition',
          className,
        ].join(' ')}
        aria-label={`Switch to ${next.toUpperCase()}`}
      >
        <span className={locale === 'fr' ? 'text-white' : 'text-white/40'}>FR</span>
        <span className="text-white/30">/</span>
        <span className={locale === 'en' ? 'text-white' : 'text-white/40'}>EN</span>
      </button>
    );
  }

  // default : pill 2 segments
  return (
    <div
      className={[
        'inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] backdrop-blur p-0.5',
        className,
      ].join(' ')}
      role="group"
      aria-label="Langue / Language"
    >
      {LOCALES.map((l) => {
        const active = l.code === locale;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            aria-pressed={active}
            className={[
              'px-3 py-1 text-[11px] font-semibold tracking-[0.18em] rounded-full transition',
              active
                ? 'bg-white text-black'
                : 'text-white/55 hover:text-white',
            ].join(' ')}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
