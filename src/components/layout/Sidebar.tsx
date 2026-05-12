'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  ClipboardCheck,
  Receipt,
  UserCircle,
  BellRing,
  FileSignature,
  Kanban,
  Settings,
  Calculator,
  CreditCard,
  Briefcase,
  ChevronDown,
  Activity,
  Building2,
  Package,
} from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { CentriumMark } from '@/components/brand/CentriumMark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useOrganizationSafe } from '@/lib/auth/context';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Routes additionnelles qui doivent allumer cet item (ex: /consultants couvre aussi /prospects). */
  matchAlso?: string[];
};
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };

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
      // Consultants regroupe la bibliothèque + le vivier (prospection), avec
      // un switcher d'onglets sur les pages elles-mêmes. Une seule entrée
      // dans le menu pour ne pas alourdir la navigation.
      { label: 'Consultants', href: '/consultants', icon: Users, matchAlso: ['/prospects'] },
      { label: 'CV Optimizer', href: '/cv-optimizer', icon: FileText },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: Briefcase,
    items: [
      { label: 'Offres & missions', href: '/offers', icon: Briefcase },
      { label: 'Matching', href: '/matching', icon: Target },
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
  // Hint visuel sur "Paramètres" quand l'identité visuelle n'a pas encore
  // été configurée (logo manquant ET pas de couleur perso définie).
  const brandingMissing =
    !!org?.branding && !org.branding.logoUrl && !org.branding.primaryColor;

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
    const matchesItem = (i: NavItem) => {
      if (pathname === i.href || pathname.startsWith(i.href + '/')) return true;
      return (i.matchAlso ?? []).some(
        (m) => pathname === m || pathname.startsWith(m + '/'),
      );
    };
    const activeGroup = GROUPS.find((g) => g.items.some(matchesItem));

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
    <aside className="hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-hairline bg-card/80 backdrop-blur-xl">
      {/* Halo gradient "façon bannière" — accent visuel discret en haut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(225,29,116,0.18), transparent 65%), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(139,92,246,0.14), transparent 65%)',
        }}
      />

      {/* Logo */}
      <Link
        href="/dashboard"
        className="relative flex h-28 items-center justify-center border-b border-hairline px-2 hover:opacity-80 transition shrink-0"
      >
        <QuadCoreLogo size="lg" variant="dark" src={logoSrc} alt={brandName} />
      </Link>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {GROUPS.map((group) => {
          const open = openGroups[group.id] ?? false;
          const GroupIcon = group.icon;
          const itemMatches = (i: NavItem) =>
            pathname === i.href ||
            pathname.startsWith(i.href + '/') ||
            (i.matchAlso ?? []).some(
              (m) => pathname === m || pathname.startsWith(m + '/'),
            );
          const groupActive = group.items.some(itemMatches);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition',
                  groupActive
                    ? 'text-violet-glow'
                    : 'text-muted-foreground/70 hover:text-foreground',
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

              {open && group.id === 'organisation' && brandingMissing && (
                <Link
                  href="/onboarding/setup"
                  className="mt-2 mx-1 flex items-start gap-2 rounded-lg border border-violet-glow/30 bg-violet-glow/[0.06] px-3 py-2 hover:border-violet-glow/60 transition-colors"
                  title="Configure le logo, les couleurs et l'identité légale de ton ESN"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-glow shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-violet-glow">Personnalise ton ESN</div>
                    <div className="text-muted-foreground mt-0.5">
                      Logo, couleurs, identité légale
                    </div>
                  </div>
                </Link>
              )}

              {open && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    // Match "le plus spécifique l'emporte" : si un sibling a
                    // un href plus précis qui matche aussi (ex: /settings/team
                    // sibling de /settings), il prend la priorité et les
                    // autres ne s'allument pas.
                    let active = itemMatches(item);
                    if (active && pathname !== item.href) {
                      const moreSpecific = group.items.some(
                        (other) =>
                          other.href !== item.href &&
                          other.href.startsWith(item.href + '/') &&
                          (pathname === other.href ||
                            pathname.startsWith(other.href + '/')),
                      );
                      if (moreSpecific) active = false;
                    }
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all',
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
              )}
            </div>
          );
        })}
      </nav>

      {/* Co-branding + theme toggle : Centrium en bas, sous le branding ESN.
          Toggle clair/sombre à droite. */}
      <div className="relative border-t border-hairline px-4 py-3 flex items-center justify-between gap-2">
        <CentriumMark size="sm" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
