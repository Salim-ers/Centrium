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
  Briefcase,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Activity,
  Building2,
  CheckSquare,
} from 'lucide-react';
import { Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import type { AppDict } from '@/lib/i18n/app';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Routes additionnelles qui doivent allumer cet item (ex: /consultants couvre aussi /prospects). */
  matchAlso?: string[];
};
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };

/**
 * Construit la liste des groupes/items à partir du dictionnaire i18n.
 * Appelée à chaque render via useAppT() → réactive au changement de langue.
 */
function buildGroups(t: AppDict): NavGroup[] {
  return [
    {
      id: 'pilotage',
      label: t.sidebar.pilotage,
      icon: Activity,
      items: [
        { label: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { label: t.nav.alerts, href: '/alerts', icon: BellRing },
        { label: t.nav.todos, href: '/todos', icon: CheckSquare },
      ],
    },
    {
      id: 'talents',
      label: t.sidebar.talents,
      icon: Users,
      items: [
        { label: t.nav.consultants, href: '/consultants', icon: Users, matchAlso: ['/prospects', '/cv-pushed', '/en-mission'] },
        { label: t.nav.cv_optimizer, href: '/cv-optimizer', icon: FileText },
      ],
    },
    {
      id: 'commercial',
      label: t.sidebar.commercial,
      icon: Briefcase,
      items: [
        { label: t.nav.missions, href: '/offers', icon: Briefcase },
        { label: t.nav.matching, href: '/matching', icon: Target },
        { label: t.nav.pipeline, href: '/crm', icon: Kanban },
        { label: t.nav.contacts, href: '/contacts', icon: UserCircle },
        { label: t.nav.companies, href: '/companies', icon: Building2 },
      ],
    },
    {
      id: 'facturation',
      label: t.sidebar.facturation,
      icon: Receipt,
      items: [
        { label: t.nav.cra, href: '/timesheets', icon: ClipboardCheck },
        { label: t.nav.contracts, href: '/contracts', icon: FileSignature },
        { label: t.nav.invoices, href: '/invoices', icon: Receipt },
        { label: t.nav.accounting, href: '/accounting', icon: Calculator },
      ],
    },
    {
      id: 'organisation',
      label: t.sidebar.organisation,
      icon: Building2,
      items: [
        // Menu unifié : Équipe (/settings/team) et Abonnement (/billing)
        // vivent désormais DANS le hub Paramètres (cartes de sections).
        // matchAlso garde l'item allumé quand on navigue sur /billing.
        { label: t.nav.settings, href: '/settings', icon: Settings, matchAlso: ['/billing'] },
        { label: t.nav.help, href: '/aide', icon: HelpCircle },
      ],
    },
  ];
}

// Constante de référence pour computeInitialOpenGroups (qui s'exécute hors render).
// Les IDs sont stables, seuls les labels changent avec la locale.
const GROUP_IDS = ['pilotage', 'talents', 'commercial', 'facturation', 'organisation'] as const;

const STORAGE_KEY = 'quadcore-sidebar-open-groups';

// useLayoutEffect émet un warning côté serveur — on bascule vers useEffect
// pendant le SSR. Côté client, on garde useLayoutEffect pour set le bon state
// AVANT que le browser ne peigne (évite le flash "tout fermé → tout ouvert").
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function computeInitialOpenGroups(
  pathname: string,
  groups: NavGroup[],
): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  GROUP_IDS.forEach((id) => (initial[id] = false));

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
  const activeGroup = groups.find((g) => g.items.some(matchesItem));
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
  const t = useAppT();
  const groups = buildGroups(t);
  const brandingMissing =
    !!org?.branding && !org.branding.logoUrl && !org.branding.primaryColor;

  // État initial = tous fermés (= ce que le serveur rend → pas de hydration mismatch).
  // useLayoutEffect ci-dessous corrige ÉGALEMENT avant le 1er paint client.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUP_IDS.forEach((id) => (initial[id] = false));
    return initial;
  });
  // Tant que `animEnabled` est false, on désactive les transitions CSS pour
  // ne PAS animer le passage initial "tout fermé → groupe actif ouvert"
  // (cause du "saut" visible à chaque navigation).
  const [animEnabled, setAnimEnabled] = useState(false);

  // 1) Pre-paint sync : positionne le bon state avant que le browser ne dessine.
  useIsoLayoutEffect(() => {
    setOpenGroups(computeInitialOpenGroups(pathname, groups));
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
    const activeGroup = groups.find((g) => g.items.some(matchesItem));
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
        {groups.map((group) => {
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
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const t = useAppT();

  return (
    <>
      <aside
        data-app-sidebar
        aria-hidden={collapsed}
        className={cn(
          'qc-sidebar hidden md:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-hairline backdrop-blur-xl transition-transform duration-300 ease-out',
          // Background piloté par .qc-sidebar (globals.css) :
          //   - Dark : gradient vertical subtle violet-noir → noir profond
          //   - Light : gradient terracotta sang
          collapsed ? '-translate-x-full' : 'translate-x-0',
        )}
      >
        {/* Bouton "collapse" en haut à droite de la sidebar, toujours visible */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t.nav.collapse_menu}
          title={t.nav.collapse_menu}
          className="hidden md:flex absolute top-3 right-2 z-10 h-7 w-7 items-center justify-center rounded-md bg-white/5 text-white/70 hover:bg-white/15 hover:text-white border border-white/10 transition"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <SidebarBody />
      </aside>

      {/* Bouton flottant "ouvrir le menu" quand collapsed (visible md+) */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={t.nav.expand_menu}
          title={t.nav.expand_menu}
          className="hidden md:flex fixed left-3 top-3 z-40 h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-card/90 backdrop-blur shadow-lg text-foreground/70 hover:bg-card hover:text-foreground transition"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
