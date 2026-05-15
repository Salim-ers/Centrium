import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BrandingStyles } from '@/components/brand/BrandingStyles';
import { OrgCursorsOverlay } from '@/components/realtime/OrgCursorsOverlay';
import { OrgActivityListener } from '@/components/realtime/OrgActivityListener';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg text-foreground">
      <BrandingStyles />
      <Sidebar />
      <Header />
      <main className="md:pl-64 pt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">{children}</div>
      </main>
      {/* Curseurs en direct + toaster d'activité — montés une seule fois ici
          pour partager la channel entre toutes les pages connectées. */}
      <OrgCursorsOverlay />
      <OrgActivityListener />
    </div>
  );
}
