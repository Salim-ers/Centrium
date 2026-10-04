import { AppChrome } from '@/components/layout/AppShell';

/**
 * Layout de l'application interne : la chrome (sidebar, header, palette,
 * notifications) est montée une seule fois et persiste entre les pages.
 * L'accès est contrôlé en amont par le middleware (session, rôle, abonnement).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
