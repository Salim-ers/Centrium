'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Receipt,
  FileSignature,
  FileText,
  UserCircle,
  LogOut,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const PORTAL_NAV = [
  { label: 'Accueil', href: '/portal/dashboard', icon: LayoutDashboard },
  { label: 'Mes missions', href: '/portal/missions', icon: Briefcase },
  { label: 'Mes CRA', href: '/portal/cra', icon: ClipboardCheck },
  { label: 'Mes factures', href: '/portal/invoices', icon: Receipt },
  { label: 'Mes contrats', href: '/portal/contracts', icon: FileSignature },
  { label: 'Mes documents', href: '/portal/documents', icon: FileText },
  { label: 'Mon profil', href: '/portal/profile', icon: UserCircle },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-hairline bg-card/80 backdrop-blur-xl">
      {/* Wordmark Centrium grand format — adaptatif clair/sombre */}
      <div className="relative flex h-28 items-center justify-start border-b border-hairline px-4 shrink-0">
        <CentriumWordmark size="md" href="/portal/dashboard" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {PORTAL_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                    active
                      ? 'bg-violet-glow/10 text-violet-glow border border-violet-glow/25 shadow-[0_0_24px_-10px_rgba(225,29,116,0.45)]'
                      : 'text-muted-foreground hover-surface hover:text-foreground border border-transparent',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-hairline p-3">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover-surface hover:text-foreground transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Se déconnecter
          </button>
        </form>
      </div>

      {/* Footer : toggle thème uniquement */}
      <div className="border-t border-hairline px-4 py-3 flex items-center justify-end">
        <ThemeToggle />
      </div>
    </aside>
  );
}
