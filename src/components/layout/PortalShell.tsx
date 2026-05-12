import { PortalSidebar } from './PortalSidebar';
import { BrandingStyles } from '@/components/brand/BrandingStyles';

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrandingStyles />
      <PortalSidebar />
      <main className="md:pl-64 pt-6">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
