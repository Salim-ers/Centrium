'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Inbox, ShieldAlert, ArrowLeft, LogOut, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =========================================================================
// En-tête unifié de la super-console (navigation + déconnexion).
// Onglets : Organisations (supervision) · Clients (devis) · Audit.
// « Retour à l'app » et « Déconnexion » à droite (POST natif = instantané).
// =========================================================================

const TABS = [
  { href: '/admin/organizations', label: 'Organisations', icon: Building2 },
  { href: '/admin/clients', label: 'Clients & devis', icon: Inbox },
  { href: '/admin/audit', label: 'Audit', icon: ShieldAlert },
];

export function AdminConsoleHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  return (
    <header className="border-b border-hairline bg-card/40 backdrop-blur-xl sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-6 w-6 text-magenta shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold tracking-tight truncate">{title}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard" className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à l&apos;app
              </a>
            </Button>
            <form action="/api/auth/logout" method="POST" className="inline">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>

        {/* Onglets de navigation console */}
        <nav className="mt-3 flex items-center gap-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-magenta/10 text-magenta ring-1 ring-magenta/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
