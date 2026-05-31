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
 * Header marketing unifié — utilisé sur TOUTES les pages publiques.
 *
 * Responsive :
 *   - Mobile (<lg) : wordmark à gauche + burger à droite qui ouvre un
 *     panneau plein écran avec la nav verticale
 *   - Desktop (≥lg) : wordmark + nav inline + bouton "Demander une démo"
 *
 * Le toggle FR/EN est désactivé pour le moment — la majorité des pages
 * internes n'ont pas de traduction EN complète (security, pricing,
 * devis, manifesto, legal/*). À réactiver quand les traductions seront
 * terminées.
 */
export function Header({ t, locale, onLocaleChange }: Props) {
  void t; void locale; void onLocaleChange;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ferme le menu burger à chaque changement de route
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Bloque scroll body quand menu mobile ouvert
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [menuOpen]);

  return (
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
          className="relative flex items-center group shrink-0"
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
            className="group relative inline-flex items-center gap-2 h-10 px-5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur text-white text-[14px] font-medium tracking-tight overflow-hidden transition-all hover:bg-white/[0.08] hover:border-white/30"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-pink-500/25 via-magenta/15 to-violet-500/20"
            />
            <span className="relative">Demander une démo</span>
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur text-white/85 hover:text-white hover:bg-white/[0.08] transition"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`lg:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-background/95 backdrop-blur-xl transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-6 py-8 flex flex-col h-full">
          <nav className="flex-1 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between py-4 px-4 rounded-2xl border transition ${
                    active
                      ? 'border-magenta/40 bg-magenta/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/80 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="font-editorial italic text-xl">{item.label}</span>
                  <span className="text-magenta text-sm">→</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3 pb-4">
            <Link
              href="/devis"
              className="block w-full text-center h-12 px-5 rounded-full bg-gradient-to-r from-pink-500/30 via-magenta/25 to-violet-500/25 border border-white/15 text-white text-[15px] font-medium leading-[3rem]"
            >
              Demander une démo
            </Link>
            <Link
              href="/login"
              className="block w-full text-center h-12 px-5 rounded-full border border-white/10 text-white/75 text-[14px] leading-[3rem]"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
