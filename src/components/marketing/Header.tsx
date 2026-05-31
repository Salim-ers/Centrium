'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import type { Locale, LandingDict } from '@/lib/i18n/landing';

type Props = {
  t: LandingDict;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
};

const NAV = [
  { label: 'Plateforme', href: '/plateforme' },
  { label: 'Manifeste', href: '/manifesto' },
  { label: 'Sécurité', href: '/security' },
  { label: 'Tarifs', href: '/pricing' },
];

export function Header({ t, locale, onLocaleChange }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl bg-background/70 border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="Centrium — accueil"
          className="relative flex items-center group shrink-0"
        >
          <CentriumWordmark size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-[14px] text-white/75">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 rounded-full transition ${
                  active
                    ? 'text-white'
                    : 'hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-magenta to-transparent"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Language"
            className="hidden sm:flex relative h-9 p-0.5 rounded-full border border-white/10 bg-white/[0.04] items-center text-[11px] font-medium"
          >
            <button
              type="button"
              onClick={() => onLocaleChange('fr')}
              aria-pressed={locale === 'fr'}
              className={`relative h-8 px-3 rounded-full transition-colors ${
                locale === 'fr'
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLocaleChange('en')}
              aria-pressed={locale === 'en'}
              className={`relative h-8 px-3 rounded-full transition-colors ${
                locale === 'en'
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-[14px] text-white/70 hover:text-white hover:bg-white/[0.04] transition"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/devis"
            className="group relative inline-flex items-center gap-2 h-10 px-5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur text-white text-[14px] font-medium tracking-tight overflow-hidden transition-all hover:bg-white/[0.08] hover:border-white/30"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-pink-500/25 via-magenta/15 to-violet-500/20"
            />
            <span className="relative">Demander une démo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
