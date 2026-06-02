import { PortalSidebar } from './PortalSidebar';
import { AppBackground } from './AppBackground';
import { BrandingStyles } from '@/components/brand/BrandingStyles';

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg text-foreground relative">
      <BrandingStyles />
      {/* Starfield warp dark-only (cohérent avec AppShell BM). */}
      <AppBackground />
      <PortalSidebar />
      <main className="relative z-[1] md:pl-64 pt-6">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
