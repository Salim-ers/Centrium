'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { LandingDict, Locale } from '@/lib/i18n/landing';
import { Header } from './Header';
import { Footer } from './Footer';
import { Starfield } from '@/components/ui/starfield-1';
import { PageReveal } from './PageReveal';
import { useIsMobile } from '@/hooks/useIsMobile';

/** Hook conservé pour compat des composants existants : délègue au
 *  LocaleProvider global (root layout). */
export function useLandingDict(): { t: LandingDict; locale: Locale } {
  const { t, locale } = useLocale();
  return { t, locale };
}

/**
 * Shell partagé par TOUTES les pages marketing.
 *
 *   - StarField global fixed en arrière-plan (fond étoilé partout)
 *   - Header marketing identique (sticky, toggle FR/EN, nav routes)
 *   - PageReveal wrapper pour l'entrée animée
 *   - Footer marketing partagé
 *
 * La locale vient du LocaleProvider global (root layout) — plus de
 * state local ici, donc le toggle FR/EN fonctionne aussi sur
 * AuthShell, /login, /devis, etc.
 */
type Props = {
  children: React.ReactNode;
  noReveal?: boolean;
  noFooter?: boolean;
};

export function MarketingShell({ children, noReveal, noFooter }: Props) {
  const { t, locale, setLocale } = useLocale();
  const isMobile = useIsMobile();

  const inner = noReveal ? children : <PageReveal>{children}</PageReveal>;

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: '#000' }}
      >
        <Starfield
          speed={isMobile ? 0.45 : 0.6}
          quantity={isMobile ? 180 : 420}
        />
      </div>
      <Header t={t} locale={locale} onLocaleChange={setLocale} />
      <div className="relative z-[1]">{inner}</div>
      {!noFooter && (
        <div className="relative z-[1]">
          <Footer t={t} />
        </div>
      )}
    </div>
  );
}
