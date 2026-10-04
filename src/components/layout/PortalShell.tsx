import { PortalSidebar } from './PortalSidebar';
import { PortalMobileNav } from './PortalMobileNav';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { SessionPresenceGate } from '@/components/auth/SessionPresenceGate';

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg text-foreground relative">
      <BrandingStyles />
      {/* Auto-logout si l'onglet/navigateur a été fermé entre 2 visites. */}
      <SessionPresenceGate />
      {/* Starfield warp dark-only (cohérent avec AppShell BM). */}
      {/* Nav mobile (< md) : barre + tiroir avec déconnexion. */}
      <PortalMobileNav />
      <PortalSidebar />
      <main className="relative z-[1] md:pl-64 md:pt-6">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
