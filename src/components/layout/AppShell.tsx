'use client';

import { createContext, Suspense, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useInShellFrame } from './shell-frame';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { OrgActivityListener } from '@/components/realtime/OrgActivityListener';
import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';
import { useAppearance } from '@/hooks/useAppearance';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export { ShellFrame, useInShellFrame } from './shell-frame';

/** Présent quand la chrome (barre latérale + barre supérieure) est rendue par un layout. */
const ChromeContext = createContext(false);

/**
 * Coque de l'application, rendue une fois par le layout `(app)` : hauteur
 * `100dvh`, barre latérale fixe, barre supérieure fixe, et un espace de
 * travail qui défile seul. Seul l'espace de travail change d'une page à
 * l'autre.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  // Applique la densité choisie (Paramètres → Affichage) dès l'arrivée.
  useAppearance();
  const pathname = usePathname();
  const { locale } = useLocale();
  const fr = locale !== 'en';

  // L'espace de travail défile seul : on le remet en haut à chaque page.
  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <ChromeContext.Provider value={true}>
      <div className="app-bg flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
        >
          {fr ? 'Aller au contenu' : 'Skip to content'}
        </a>
        <BrandingStyles />
        <SessionPresenceGate />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main id="main" tabIndex={-1} className="app-main relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
            {/* Suspense : les pages qui lisent useSearchParams() restent rendables statiquement. */}
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
        <CommandPalette />
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
 * `wide` : pleine largeur. `fill` : la page occupe exactement la hauteur de
 * l'espace de travail et fait défiler ses propres zones (tableaux, colonnes),
 * jamais la page entière.
 */
export function AppShell({ children, wide = false, fill = false }: { children: React.ReactNode; wide?: boolean; fill?: boolean }) {
  const insideChrome = useContext(ChromeContext);
  const framed = useInShellFrame();
  if (framed) return <div className={cn('min-w-0', fill && 'flex h-full min-h-0 flex-col')}>{children}</div>;
  const content = (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 md:px-6',
        wide || fill ? 'max-w-none' : 'max-w-[1440px]',
        fill ? 'flex h-full min-h-0 flex-col md:py-5' : 'md:py-6',
      )}
    >
      {children}
    </div>
  );
  if (insideChrome) return content;
  return <AppChrome>{content}</AppChrome>;
}
