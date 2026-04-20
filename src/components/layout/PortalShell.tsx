import { PortalSidebar } from './PortalSidebar';

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight-300 text-foreground">
      <PortalSidebar />
      <main className="md:pl-64 pt-6">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
