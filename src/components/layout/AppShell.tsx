'use client';

import Link from 'next/link';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AppBackground } from './AppBackground';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { OrgCursorsOverlay } from '@/components/realtime/OrgCursorsOverlay';
import { OrgActivityListener } from '@/components/realtime/OrgActivityListener';
import { ManageCookiesLink } from '@/components/marketing/CookieBanner';
import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useAppT } from '@/lib/i18n/LocaleProvider';

export function AppShell({
  children,
  /**
   * `wide` : retire le max-w-7xl pour utiliser toute la largeur disponible.
   * Recommandé pour les vues type Kanban (CRM Pipeline), tableaux denses,
   * matching où l'utilisateur a besoin de voir beaucoup de colonnes en
   * parallèle. Par défaut (false), garde la lecture confortable centrée.
   */
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [collapsed] = useSidebarCollapsed();
  const t = useAppT();
  return (
    <div className="min-h-screen app-bg text-foreground flex flex-col relative">
      <BrandingStyles />
      {/* Auto-logout si l'onglet/navigateur a été fermé entre 2 visites
          (flag sessionStorage absent → re-login forcé). */}
      <SessionPresenceGate />
      {/* Starfield warp en fond — dark uniquement (mêmes éléments que la vitrine).
          En light, retourne null → aucune charge GPU, juste le bg crème natif. */}
      <AppBackground />
      <Sidebar />
      <Header />
      <main
        className={`relative z-[1] pt-16 flex-1 flex flex-col transition-[padding] duration-300 ease-out ${
          collapsed ? 'md:pl-0' : 'md:pl-64'
        }`}
      >
        <div
          className={`mx-auto w-full px-4 md:px-8 py-8 flex-1 ${
            wide ? 'max-w-none' : 'max-w-7xl'
          }`}
        >
          {children}
        </div>
        <footer className="md:pl-0 mt-8 border-t border-hairline">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} Centrium — {t.footer.edited_by}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/settings/privacy"
                className="hover:text-foreground transition"
              >
                {t.footer.my_data}
              </Link>
              <Link
                href="/legal/privacy"
                className="hover:text-foreground transition"
              >
                {t.footer.privacy}
              </Link>
              <Link
                href="/engagements"
                className="hover:text-foreground transition"
              >
                {t.footer.engagements}
              </Link>
              <Link
                href="/legal/cgu"
                className="hover:text-foreground transition"
              >
                {t.footer.terms}
              </Link>
              <ManageCookiesLink className="hover:text-foreground transition" />
            </div>
          </div>
        </footer>
      </main>
      <OrgCursorsOverlay />
      <OrgActivityListener />
    </div>
  );
}
