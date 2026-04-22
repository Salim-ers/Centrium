'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import type { Locale, LandingDict } from '@/lib/i18n/landing';

type Props = {
  t: LandingDict;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
};

function scrollToTop(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (history.replaceState) history.replaceState(null, '', '#home');
}

export function Header({ t, locale, onLocaleChange }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-midnight-300/70 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between gap-6">
        <a
          href="#home"
          onClick={scrollToTop}
          aria-label="Retour en haut"
          className="relative flex items-center group ml-2 md:ml-6 shrink-0"
        >
          <span className="absolute inset-[-35%] rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.55),rgba(139,92,246,0.18),transparent_70%)] blur-2xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-90" />
          <span className="relative rounded-2xl bg-[#0a0b14] border border-white/10 p-2.5 shadow-[0_0_40px_rgba(225,29,116,0.25)] transition-transform duration-300 group-hover:scale-[1.03]">
            <QuadCoreLogo
              size="md"
              variant="dark"
              className="[mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
            />
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-9 text-[15px] font-medium text-white/80">
          <a href="#home" className="hover:text-white transition">{t.nav.home}</a>
          <a href="#product" className="hover:text-white transition">{t.nav.product}</a>
          <a href="#features" className="hover:text-white transition">{t.nav.features}</a>
          <a href="#pricing" className="hover:text-white transition">{t.nav.pricing}</a>
          <a href="#contact" className="hover:text-white transition">{t.nav.contact}</a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Language"
            className="relative h-10 p-0.5 rounded-full border border-white/10 bg-white/5 flex items-center text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => onLocaleChange('fr')}
              aria-pressed={locale === 'fr'}
              className={`relative h-9 px-3.5 rounded-full transition-colors ${
                locale === 'fr'
                  ? 'bg-qc-gradient text-white shadow-[0_0_18px_rgba(225,29,116,0.55)]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => onLocaleChange('en')}
              aria-pressed={locale === 'en'}
              className={`relative h-9 px-3.5 rounded-full transition-colors ${
                locale === 'en'
                  ? 'bg-qc-gradient text-white shadow-[0_0_18px_rgba(225,29,116,0.55)]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/signup"
            className="relative inline-flex items-center h-11 px-5 rounded-full bg-qc-gradient text-white text-sm font-semibold shadow-[0_0_25px_rgba(225,29,116,0.45)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(225,29,116,0.6)] transition-all"
          >
            {t.nav.signup}
          </Link>
        </div>
      </div>
    </header>
  );
}
