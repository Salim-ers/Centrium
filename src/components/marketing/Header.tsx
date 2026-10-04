'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogIn } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import type { Locale, LandingDict } from '@/lib/i18n/landing';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

type Props = {
  t: LandingDict;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
};

/**
 * Header marketing unifié — responsive solide pour toutes les pages publiques.
 *
 *   - Desktop (≥lg) : wordmark + nav inline + toggle FR/EN + CTA gradient
 *   - Mobile (<lg)  : wordmark + burger 44×44 → panneau plein écran avec
 *                     nav + toggle FR/EN mobile + CTA
 *
 * Tous les labels (NAV, CTAs) sont tirés de `t` (dictionnaire i18n).
 * La locale et le setter viennent du LocaleProvider via les props
 * (passées par MarketingShell qui consomme le contexte global).
 */
export function Header({ t, locale, onLocaleChange }: Props) {
  // locale/onLocaleChange consommés via LocaleToggle (contexte global)
  void locale;
  void onLocaleChange;

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const NAV = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.product, href: '/plateforme' },
    { label: t.nav.features, href: '/engagements' },
    { label: t.nav.pricing, href: '/pricing' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-background/70 border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
          <Link
            href="/"
            aria-label="Centrium — home"
            className="relative flex items-center shrink-0"
          >
            <CentriumWordmark size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-[14px] text-muted-foreground">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-full transition ${
                    active ? 'text-white' : 'hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA + toggle */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <LocaleToggle variant="default" />
            <Link
              href="/login"
              className="group inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-card text-[13.5px] text-foreground hover:text-foreground hover:border-border hover:bg-muted hover:shadow-[0_0_18px_-4px_rgba(236,72,153,0.4)] transition-all"
            >
              <LogIn className="h-3.5 w-3.5 text-primary group-hover:text-foreground transition-colors" />
              {t.nav.login}
            </Link>
            <Link
              href="/essai"
              className="group relative inline-flex items-center gap-2 h-10 px-5 rounded-full text-foreground text-[14px] font-semibold tracking-tight overflow-hidden transition-transform hover:-translate-y-0.5 shadow-[0_0_25px_-4px_rgba(225,29,116,0.6),0_0_50px_-12px_rgba(168,85,247,0.5)] hover:shadow-[0_0_32px_-4px_rgba(225,29,116,0.8),0_0_70px_-12px_rgba(168,85,247,0.7)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full overflow-hidden"
              >
                <span className="absolute top-0 -left-1/2 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-transparent to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
              </span>
              <span className="relative">{t.hero.ctaPrimary}</span>
            </Link>
          </div>

          {/* Mobile burger — tap target 44×44 */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-full border border-border bg-muted text-foreground hover:bg-muted active:bg-muted transition"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      <div
        id="mobile-nav-panel"
        aria-hidden={!menuOpen}
        className={`lg:hidden fixed inset-0 z-[60] bg-foreground transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Centrium — home"
            className="flex items-center"
          >
            <CentriumWordmark size="sm" />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full border border-border bg-muted text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-8 flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          <nav className="flex-1 flex flex-col gap-2">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`flex items-center justify-between py-4 px-5 rounded-2xl border transition active:scale-[0.98] ${
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-card text-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="font-display text-xl">{item.label}</span>
                  <span className="text-primary text-sm">→</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3">
            {/* Toggle FR/EN mobile — pleine largeur, segmented */}
            <LocaleToggle variant="mobile" />
            <Link
              href="/essai"
              onClick={closeMenu}
              className="block w-full text-center h-12 px-5 rounded-full bg-gradient-to-r from-primary via-primary to-primary text-white text-[15px] font-semibold leading-[3rem] shadow-[0_0_25px_-4px_rgba(225,29,116,0.6)]"
            >
              {t.hero.ctaPrimary}
            </Link>
            <Link
              href="/login"
              onClick={closeMenu}
              className="block w-full text-center h-12 px-5 rounded-full border border-border text-foreground text-[14px] leading-[3rem]"
            >
              {t.nav.login}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
