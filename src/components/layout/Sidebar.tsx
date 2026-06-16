'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
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
  CheckSquare,
} from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
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
      // To do list privée par utilisateur (RLS stricte sur user_todos.user_id).
      { label: 'À faire', href: '/todos', icon: CheckSquare },
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
      { label: 'Consultants', href: '/consultants', icon: Users, matchAlso: ['/prospects', '/cv-pushed', '/en-mission'] },
      { label: 'CV Optimizer', href: '/cv-optimizer', icon: FileText },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: Briefcase,
    items: [
      { label: 'Missions', href: '/offers', icon: Briefcase },
      { label: 'Matching IA', href: '/matching', icon: Target },
      { label: 'Pipeline', href: '/crm', icon: Kanban },
      { label: 'Contacts', href: '/contacts', icon: UserCircle },
    ],
  },
  {
    id: 'facturation',
    label: 'Facturation',
    icon: Receipt,
    items: [
      { label: 'CRA', href: '/timesheets', icon: ClipboardCheck },
      { label: 'Contrats', href: '/contracts', icon: FileSignature },
      { label: 'Factures', href: '/invoices', icon: Receipt },
      { label: 'Comptabilité', href: '/accounting', icon: Calculator },
    ],
  },
  {
    id: 'organisation',
    label: 'Organisation',
    icon: Building2,
    items: [
      { label: 'Équipe', href: '/settings/team', icon: Package },
      { label: 'Abonnement', href: '/billing', icon: CreditCard },
      { label: 'Paramètres', href: '/settings', icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'quadcore-sidebar-open-groups';

// useLayoutEffect émet un warning côté serveur — on bascule vers useEffect
// pendant le SSR. Côté client, on garde useLayoutEffect pour set le bon state
// AVANT que le browser ne peigne (évite le flash "tout fermé → tout ouvert").
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function computeInitialOpenGroups(pathname: string): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  GROUPS.forEach((g) => (initial[g.id] = false));

  // Lecture localStorage (peut être null en SSR ou si bloqué)
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        Object.assign(initial, parsed);
      }
    }
  } catch {
    // ignore — localStorage parse error
  }

  // Auto-ouverture du groupe contenant la route active
  const matchesItem = (i: NavItem) =>
    pathname === i.href ||
    pathname.startsWith(i.href + '/') ||
    (i.matchAlso ?? []).some(
      (m) => pathname === m || pathname.startsWith(m + '/'),
    );
  const activeGroup = GROUPS.find((g) => g.items.some(matchesItem));
  if (activeGroup) initial[activeGroup.id] = true;

  return initial;
}

/**
 * Contenu intérieur de la sidebar : halo, wordmark, nav, footer.
 * Réutilisé par la Sidebar desktop (fixed) ET le MobileNav (drawer).
 *
 * `onItemClick` est appelé après chaque tap sur un lien — utile en mobile
 * pour fermer le drawer après navigation.
 */
export function SidebarBody({ onItemClick }: { onItemClick?: () => void } = {}) {
  const pathname = usePathname();
  const org = useOrganizationSafe();
  const brandingMissing =
    !!org?.branding && !org.branding.logoUrl && !org.branding.primaryColor;

  // État initial = tous fermés (= ce que le serveur rend → pas de hydration mismatch).
  // useLayoutEffect ci-dessous corrige ÉGALEMENT avant le 1er paint client.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUPS.forEach((g) => (initial[g.id] = false));
    return initial;
  });
  // Tant que `animEnabled` est false, on désactive les transitions CSS pour
  // ne PAS animer le passage initial "tout fermé → groupe actif ouvert"
  // (cause du "saut" visible à chaque navigation).
  const [animEnabled, setAnimEnabled] = useState(false);

  // 1) Pre-paint sync : positionne le bon state avant que le browser ne dessine.
  useIsoLayoutEffect(() => {
    setOpenGroups(computeInitialOpenGroups(pathname));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Post-paint : active les animations APRÈS le 1er paint avec le bon state.
  //    Double rAF garantit qu'on est passé au-delà de la peinture initiale.
  useEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setAnimEnabled(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  // 3) Sur changement de route, ouvre le groupe contenant la page courante
  //    SANS toucher aux autres groupes (l'utilisateur peut en garder plusieurs
  //    ouverts manuellement).
  useEffect(() => {
    const matchesItem = (i: NavItem) =>
      pathname === i.href ||
      pathname.startsWith(i.href + '/') ||
      (i.matchAlso ?? []).some(
        (m) => pathname === m || pathname.startsWith(m + '/'),
      );
    const activeGroup = GROUPS.find((g) => g.items.some(matchesItem));
    if (activeGroup) {
      setOpenGroups((prev) => (prev[activeGroup.id] ? prev : { ...prev, [activeGroup.id]: true }));
    }
  }, [pathname]);

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
    <>
      {/* Halo rose/violet derrière le wordmark RETIRÉ — demande utilisateur :
          sidebar plus sobre, fond uniformément noir/bleu nuit en dark. */}

      {/* Wordmark Centrium grand format */}
      <Link
        href="/dashboard"
        onClick={onItemClick}
        className="relative flex h-44 items-center justify-center border-b border-hairline px-3 shrink-0 group hover:opacity-95 transition"
        aria-label="Centrium — accueil"
      >
        <CentriumWordmark size="lg" orientation="vertical" />
      </Link>

      <nav className="relative flex-1 overflow-y-auto px-2 py-3 space-y-1">
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
            <div key={group.id} className="relative">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={open}
                className={cn(
                  'group/btn w-full flex items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] rounded-lg transition-all duration-200',
                  groupActive
                    ? 'text-magenta-neon bg-magenta/[0.06]'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.03]',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200',
                      groupActive
                        ? 'bg-magenta/15 text-magenta-neon'
                        : 'bg-white/[0.04] text-muted-foreground/80 group-hover/btn:bg-white/[0.08] group-hover/btn:text-foreground',
                    )}
                  >
                    <GroupIcon className="h-3.5 w-3.5" />
                  </span>
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-300 ease-out',
                    open ? 'rotate-0' : '-rotate-90',
                    groupActive ? 'opacity-80' : 'opacity-50 group-hover/btn:opacity-90',
                  )}
                />
              </button>

              {/* Conteneur animé pour smooth open/close (grid-rows trick = animation height auto).
                  La transition est désactivée au premier rendu pour éviter le "saut" à chaque
                  remount (AppShell n'étant pas un layout Next.js persistant). */}
              <div
                className={cn(
                  'grid',
                  animEnabled && 'transition-[grid-template-rows,opacity] duration-300 ease-out',
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  {group.id === 'organisation' && brandingMissing && (
                    <Link
                      href="/onboarding/setup"
                      onClick={onItemClick}
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

                  <ul className="mt-1 mb-2 ml-4 pl-3 space-y-0.5 border-l border-white/[0.06]">
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
                        <li key={item.href} className="relative">
                          {/* Indicateur de page active : barre verticale magenta à gauche */}
                          {active && (
                            <span
                              aria-hidden
                              className="absolute -left-[13px] top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-magenta-neon shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                            />
                          )}
                          <Link
                            href={item.href}
                            onClick={onItemClick}
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
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-hairline px-4 py-3 flex items-center justify-end">
        <ThemeToggle />
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside
      data-app-sidebar
      className={[
        'qc-sidebar hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-hairline backdrop-blur-xl',
        // Background piloté par .qc-sidebar (globals.css) :
        //   - Dark : gradient vertical subtle violet-noir → noir profond
        //   - Light : gradient terracotta sang
      ].join(' ')}
    >
      <SidebarBody />
    </aside>
  );
}
