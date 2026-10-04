'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { LandingDict, Locale } from '@/lib/i18n/landing';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

/** Hook conservé pour compat des composants existants : délègue au
 *  LocaleProvider global (root layout). */
export function useLandingDict(): { t: LandingDict; locale: Locale } {
  const { t, locale } = useLocale();
  return { t, locale };
}

type Props = {
  children: React.ReactNode;
  /** Conservé pour compatibilité (plus d'animation d'entrée globale). */
  noReveal?: boolean;
  noFooter?: boolean;
};

/**
 * Habillage des pages publiques hors site vitrine (légal, état du
 * service) : même en-tête et même pied de page que le site. L'en-tête
 * étant fixe, le contenu démarre sous ses 64 px.
 */
export function MarketingShell({ children, noFooter }: Props) {
  return (
    <div className="min-h-screen overflow-x-clip bg-ivory text-ink">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[95] focus:rounded-md focus:bg-ivory focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <SiteHeader />
      <div id="contenu" className="pt-16">
        {children}
      </div>
      {!noFooter && <SiteFooter />}
    </div>
  );
}
