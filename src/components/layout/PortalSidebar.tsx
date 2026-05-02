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
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { CentriumMark } from '@/components/brand/CentriumMark';
import { useOrganizationSafe } from '@/lib/auth/context';

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
  const org = useOrganizationSafe();
  const logoSrc = org?.branding?.logoUrl ?? null;
  const brandName = org?.branding?.brandName ?? undefined;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-white/5 bg-midnight-200/80 backdrop-blur-xl">
      {/* Logo de l'ESN (logo générique en fallback) */}
      <div className="flex h-32 items-center justify-center border-b border-white/5 px-2">
        <QuadCoreLogo size="xl" variant="dark" src={logoSrc} alt={brandName} />
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
                      ? 'bg-violet-glow/10 text-violet-glow border border-violet-glow/20'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground border border-transparent',
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

      <div className="border-t border-white/5 p-3">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.03] hover:text-foreground transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Se déconnecter
          </button>
        </form>
      </div>

      {/* Co-branding plateforme */}
      <div className="border-t border-white/5 px-4 py-3">
        <CentriumMark size="sm" />
      </div>
    </aside>
  );
}
