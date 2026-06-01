'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import type { Locale, LandingDict } from '@/lib/i18n/landing';

type Props = {
  t: LandingDict;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
};

const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'Plateforme', href: '/plateforme' },
  { label: 'Vision', href: '/manifesto' },
  { label: 'Sécurité', href: '/security' },
  { label: 'Tarifs', href: '/pricing' },
];

/**
 * Header marketing unifié — responsive solide pour toutes les pages publiques.
 *
 *   - Desktop (≥lg) : wordmark + nav inline + CTA gradient
 *   - Mobile (<lg)  : wordmark + burger 44×44 (tap target sain) → ouvre
 *                     un panneau plein écran avec slide-from-right
 *
 * Robustesse mobile :
 *   - Background panneau OPAQUE (bg-black au lieu de bg-background/95)
 *   - z-index 60 sur le panneau (au-dessus de tout, y compris sweep overlay)
 *   - transform: translateX au lieu d'opacity → meilleure perf mobile
 *   - onClick explicite sur chaque Link pour fermer immédiatement le menu
 *     (en plus du useEffect pathname, qui a un délai d'un tick)
 *   - Scroll body bloqué pendant l'ouverture
 *   - Tap targets ≥ 44×44 (recommandation Apple HIG / Material Design)
 */
export function Header({ t, locale, onLocaleChange }: Props) {
  void t;
  void locale;
  void onLocaleChange;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ferme le menu à chaque changement de route (filet de sécurité)
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Bloque scroll body quand menu mobile ouvert
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
            ? 'backdrop-blur-xl bg-background/70 border-b border-white/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
          <Link
            href="/"
            aria-label="Centrium — accueil"
            className="relative flex items-center shrink-0"
          >
            <CentriumWordmark size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-[14px] text-white/75">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-full transition ${
                    active ? 'text-white' : 'hover:text-white hover:bg-white/[0.04]'
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

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center h-10 px-4 rounded-full text-[14px] text-white/70 hover:text-white hover:bg-white/[0.04] transition"
            >
              Se connecter
            </Link>
            <Link
              href="/devis"
              className="group relative inline-flex items-center gap-2 h-10 px-5 rounded-full text-white text-[14px] font-semibold tracking-tight overflow-hidden transition-transform hover:-translate-y-0.5 shadow-[0_0_25px_-4px_rgba(225,29,116,0.6),0_0_50px_-12px_rgba(168,85,247,0.5)] hover:shadow-[0_0_32px_-4px_rgba(225,29,116,0.8),0_0_70px_-12px_rgba(168,85,247,0.7)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-magenta to-violet-500"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full overflow-hidden"
              >
                <span className="absolute top-0 -left-1/2 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
              </span>
              <span className="relative">Demander une démo</span>
            </Link>
          </div>

          {/* Mobile burger — tap target 44×44 (Apple HIG) */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur text-white hover:bg-white/[0.10] active:bg-white/[0.14] transition"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu panel — SORTI du <header> pour avoir un stacking
          context propre et un z-index garanti au-dessus de tout */}
      <div
        id="mobile-nav-panel"
        aria-hidden={!menuOpen}
        className={`lg:hidden fixed inset-0 z-[60] bg-black transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header local du panneau avec close button */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="Centrium — accueil"
            className="flex items-center"
          >
            <CentriumWordmark size="sm" />
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fermer le menu"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full border border-white/15 bg-white/[0.06] text-white"
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
                      ? 'border-magenta/40 bg-magenta/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/85 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="font-editorial italic text-xl">{item.label}</span>
                  <span className="text-magenta text-sm">→</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3">
            <Link
              href="/devis"
              onClick={closeMenu}
              className="block w-full text-center h-12 px-5 rounded-full bg-gradient-to-r from-pink-500 via-magenta to-violet-500 text-white text-[15px] font-semibold leading-[3rem] shadow-[0_0_25px_-4px_rgba(225,29,116,0.6)]"
            >
              Demander une démo
            </Link>
            <Link
              href="/login"
              onClick={closeMenu}
              className="block w-full text-center h-12 px-5 rounded-full border border-white/15 text-white/85 text-[14px] leading-[3rem]"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
