'use client';

import { createContext, Suspense, useContext } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { OrgActivityListener } from '@/components/realtime/OrgActivityListener';
import { ManageCookiesLink } from '@/components/marketing/CookieBanner';
import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useAppearance } from '@/hooks/useAppearance';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/** Présent quand la chrome (sidebar + header) est rendue par un layout. */
const ChromeContext = createContext(false);

/**
 * Chrome persistante de l'application : sidebar, header, palette de
 * commandes, notifications. Rendue UNE fois par le layout `(app)` — elle
 * ne se remonte pas à chaque navigation.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const [collapsed] = useSidebarCollapsed();
  // Applique la densité choisie (Paramètres → Affichage) dès l'arrivée.
  useAppearance();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  return (
    <ChromeContext.Provider value={true}>
      <div className="app-bg relative flex min-h-screen flex-col bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
        >
          {fr ? 'Aller au contenu' : 'Skip to content'}
        </a>
        <BrandingStyles />
        <SessionPresenceGate />
        <Sidebar />
        <Header />
        <CommandPalette />
        <main
          id="main"
          className={cn(
            'app-main relative flex flex-1 flex-col pt-14 transition-[padding] duration-200 ease-out',
            collapsed ? 'md:pl-16' : 'md:pl-60',
          )}
        >
          {/* Suspense : les pages qui lisent useSearchParams() restent rendables statiquement. */}
          <div className="flex flex-1 flex-col">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
          <footer className="border-t border-border">
            <div className="flex flex-col gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8">
              <div>© {new Date().getFullYear()} Centrium · {fr ? 'édité par QuadCore' : 'by QuadCore'}</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href="/settings/privacy" className="hover:text-foreground">
                  {fr ? 'Mes données' : 'My data'}
                </Link>
                <Link href="/legal/privacy" className="hover:text-foreground">
                  {fr ? 'Confidentialité' : 'Privacy'}
                </Link>
                <Link href="/legal/cgu" className="hover:text-foreground">
                  {fr ? 'CGU' : 'Terms'}
                </Link>
                <ManageCookiesLink className="hover:text-foreground" />
              </div>
            </div>
          </footer>
        </main>
        <OrgActivityListener />
      </div>
    </ChromeContext.Provider>
  );
}

/**
 * Conteneur de page. Dans le layout `(app)`, il ne rend que la zone de
 * contenu (la chrome est déjà là) ; hors layout, il rend la chrome complète
 * pour rester compatible.
 *
 * `wide` : pleine largeur (pipeline, planning, tableaux denses).
 */
export function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const insideChrome = useContext(ChromeContext);
  const content = (
    <div className={cn('mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-8', wide ? 'max-w-none' : 'max-w-[1360px]')}>
      {children}
    </div>
  );
  if (insideChrome) return content;
  return <AppChrome>{content}</AppChrome>;
}
