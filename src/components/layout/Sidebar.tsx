'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  Send,
  ClipboardCheck,
  Receipt,
  UserCircle,
  BellRing,
  FileSignature,
  FileCheck,
  Kanban,
  Settings,
  Calculator,
  CreditCard,
  Briefcase,
  ChevronDown,
  Activity,
  Building2,
  Package,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { useOrganizationSafe } from '@/lib/auth/context';

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  /** Si true, tous les items du groupe s'allument dès qu'un seul est actif. */
  linkSiblings?: boolean;
};

const GROUPS: NavGroup[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    icon: Activity,
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Alertes', href: '/alerts', icon: BellRing },
    ],
  },
  {
    id: 'talents',
    label: 'Talents',
    icon: Users,
    items: [
      { label: 'Consultants', href: '/consultants', icon: Users },
      { label: 'Prospection consultants', href: '/prospects', icon: UserPlus },
      { label: 'CV Optimizer', href: '/cv-optimizer', icon: FileText },
      { label: 'Templates CV', href: '/templates', icon: FileCheck },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: Briefcase,
    items: [
      { label: 'Offres & missions', href: '/offers', icon: Briefcase },
      { label: 'Matching', href: '/matching', icon: Target },
      { label: 'Réponse AO', href: '/responses', icon: Send },
      { label: 'Pipeline (CRM)', href: '/crm', icon: Kanban },
      { label: 'Carnet de contacts', href: '/contacts', icon: UserCircle },
      { label: 'Contrats', href: '/contracts', icon: FileSignature },
    ],
  },
  {
    id: 'facturation',
    label: 'Facturation',
    icon: Receipt,
    items: [
      { label: 'Comptes rendus (CRA)', href: '/timesheets', icon: ClipboardCheck },
      { label: 'Factures', href: '/invoices', icon: Receipt },
      { label: 'Assistant compta', href: '/accounting', icon: Calculator },
      { label: 'Abonnement', href: '/billing', icon: CreditCard },
    ],
  },
  {
    id: 'organisation',
    label: 'Organisation',
    icon: Building2,
    linkSiblings: true,
    items: [
      { label: 'Équipe', href: '/settings/team', icon: Package },
      { label: 'Paramètres', href: '/settings', icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'quadcore-sidebar-open-groups';

export function Sidebar() {
  const pathname = usePathname();
  const org = useOrganizationSafe();
  const logoSrc = org?.branding?.logoUrl ?? null;
  const brandName = org?.branding?.brandName ?? undefined;

  // État ouvert/fermé par groupe (persisté en localStorage).
  // Par défaut tout est fermé ; seul le groupe contenant la page active est ouvert.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUPS.forEach((g) => (initial[g.id] = false));
    return initial;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const activeGroup = GROUPS.find((g) =>
      g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/')),
    );

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        if (activeGroup) parsed[activeGroup.id] = true;
        setOpenGroups((prev) => ({ ...prev, ...parsed }));
        return;
      } catch {
        // ignore, fallback below
      }
    }

    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-white/5 bg-midnight-200/80 backdrop-blur-xl">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-28 items-center justify-center border-b border-white/5 px-2 hover:opacity-80 transition shrink-0"
      >
        <QuadCoreLogo size="lg" variant="dark" src={logoSrc} alt={brandName} />
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {GROUPS.map((group) => {
          const open = openGroups[group.id] ?? false;
          const GroupIcon = group.icon;
          const groupActive = group.items.some(
            (i) => pathname === i.href || pathname.startsWith(i.href + '/'),
          );

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition',
                  groupActive ? 'text-violet-300' : 'text-white/40 hover:text-white/70',
                )}
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="h-3 w-3" />
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    open ? 'rotate-0' : '-rotate-90',
                  )}
                />
              </button>

              {open && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const itemActive =
                      pathname === item.href || pathname.startsWith(item.href + '/');
                    // Groupes "liés" (ex: Organisation) : tous les items
                    // s'allument dès qu'un seul l'est.
                    const active =
                      group.linkSiblings && groupActive ? true : itemActive;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all',
                            active
                              ? 'bg-violet-glow/10 text-violet-glow border border-violet-glow/20 shadow-[0_0_20px_-10px_rgba(139,92,246,0.4)]'
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
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
