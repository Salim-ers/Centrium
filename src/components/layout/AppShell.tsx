import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BrandingStyles } from '@/components/brand/BrandingStyles';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight-300 text-foreground">
      <BrandingStyles />
      <Sidebar />
      <Header />
      <main className="md:pl-64 pt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
