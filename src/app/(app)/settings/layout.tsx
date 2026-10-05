import { AppShell, ShellFrame } from '@/components/layout/AppShell';
import { SettingsNav } from '@/components/settings/SettingsNav';

/**
 * Paramètres : navigation interne compacte à gauche, section à droite.
 * Chaque sous-page garde son propre AppShell, rendu « encadré » ici.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="grid gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav />
        <ShellFrame>{children}</ShellFrame>
      </div>
    </AppShell>
  );
}
