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
  Activity,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// =========================================================================
// Sidebar du portail consultant — MÊME langage que la sidebar admin :
//   - fond .qc-sidebar (gradient terracotta sang en light, nuit en dark)
//   - wordmark vertical grand format
//   - groupes en CAPS letterspacing avec pastille d'icône
//   - items indentés sur un rail, actif = pill magenta + barre lumineuse
// Pas d'accordéon : 7 items, tout reste visible.
// =========================================================================

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };

const PORTAL_GROUPS: NavGroup[] = [
  {
    id: 'espace',
    label: 'Mon espace',
    icon: Activity,
    items: [
      { label: 'Accueil', href: '/portal/dashboard', icon: LayoutDashboard },
      { label: 'Mes missions', href: '/portal/missions', icon: Briefcase },
      { label: 'Mes CRA', href: '/portal/cra', icon: ClipboardCheck },
    ],
  },
  {
    id: 'administratif',
    label: 'Administratif',
    icon: FolderOpen,
    items: [
      { label: 'Mes factures', href: '/portal/invoices', icon: Receipt },
      { label: 'Mes contrats', href: '/portal/contracts', icon: FileSignature },
      { label: 'Mes documents', href: '/portal/documents', icon: FileText },
    ],
  },
  {
    id: 'compte',
    label: 'Compte',
    icon: UserCircle,
    items: [{ label: 'Mon profil', href: '/portal/profile', icon: UserCircle }],
  },
];

export function PortalSidebar() {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <aside className="qc-sidebar hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-hairline backdrop-blur-xl">
      {/* Wordmark Centrium grand format */}
      <Link
        href="/portal/dashboard"
        className="relative flex h-44 items-center justify-center border-b border-hairline px-3 shrink-0 hover:opacity-95 transition"
        aria-label="Centrium — accueil portail"
      >
        <CentriumWordmark size="lg" orientation="vertical" />
      </Link>

      <nav className="relative flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {PORTAL_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.items.some(isActive);
          return (
            <div key={group.id}>
              <div
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] rounded-lg',
                  groupActive ? 'text-magenta-neon' : 'text-muted-foreground/70',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-200',
                    groupActive
                      ? 'bg-magenta/15 text-magenta-neon'
                      : 'bg-white/[0.04] text-muted-foreground/80',
                  )}
                >
                  <GroupIcon className="h-3.5 w-3.5" />
                </span>
                {group.label}
              </div>

              <ul className="mt-1 mb-2 ml-4 pl-3 space-y-0.5 border-l border-white/[0.06]">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="relative">
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-magenta-neon shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                        />
                      )}
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group/link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-all duration-150',
                          active
                            ? 'bg-magenta/[0.10] text-magenta-neon font-medium'
                            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-150',
                            active ? 'scale-110' : 'group-hover/link:scale-105',
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-hairline px-4 py-3 flex items-center justify-between">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Se déconnecter
          </button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  );
}
