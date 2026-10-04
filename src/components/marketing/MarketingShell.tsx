'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { LandingDict, Locale } from '@/lib/i18n/landing';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

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
 * Habillage partagé de toutes les pages publiques : fond clair, en-tête
 * et pied de page Centrium (même langage visuel que l'application).
 */
export function MarketingShell({ children, noFooter }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-md">
        Aller au contenu
      </a>
      <SiteHeader />
      <div id="contenu">{children}</div>
      {!noFooter && <SiteFooter />}
    </div>
  );
}
