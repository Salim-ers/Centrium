import Link from 'next/link';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { OrgCursorsOverlay } from '@/components/realtime/OrgCursorsOverlay';
import { OrgActivityListener } from '@/components/realtime/OrgActivityListener';
import { ManageCookiesLink } from '@/components/marketing/CookieBanner';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg text-foreground flex flex-col">
      <BrandingStyles />
      <Sidebar />
      <Header />
      <main className="md:pl-64 pt-16 flex-1 flex flex-col">
        <div className="mx-auto max-w-7xl w-full px-4 md:px-8 py-8 flex-1">
          {children}
        </div>
        <footer className="md:pl-0 mt-8 border-t border-hairline">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} Centrium — édité par QuadCore SAS</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/settings/privacy"
                className="hover:text-foreground transition"
              >
                Mes données
              </Link>
              <Link
                href="/legal/privacy"
                className="hover:text-foreground transition"
              >
                Confidentialité
              </Link>
              <Link
                href="/security"
                className="hover:text-foreground transition"
              >
                Sécurité
              </Link>
              <Link
                href="/legal/cgu"
                className="hover:text-foreground transition"
              >
                CGU
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
