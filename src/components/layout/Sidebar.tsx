'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronsUpDown, Cookie, Languages, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { NAV_ITEMS, SECONDARY_ITEMS, activeSectionTab, canSeeNavItem, isNavItemActive, sectionTabsFor, type NavItem } from '@/lib/navigation';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Largeurs de la barre : compacte (icônes) et étendue (icônes, titres et descriptions). */
export const SIDEBAR_COMPACT = 76;
export const SIDEBAR_EXPANDED = 260;

/** Pastille de l'entrée active : dégradé terracotta, reflet et halo. */
const ACTIVE_FILL =
  'bg-[linear-gradient(135deg,#E2876B_0%,#C65F46_46%,#9D4432_100%)] shadow-[0_12px_26px_-12px_rgba(198,95,70,.95),inset_0_1px_0_rgba(255,255,255,.22)]';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || 'C'
  );
}

/**
 * Une destination : icône, titre et ce qu'elle contient. Active, elle prend
 * la pastille en dégradé et déroule ses sous-pages.
 */
function NavEntry({
  item,
  active,
  collapsed,
  lang,
  pathname,
  dock,
  compact = false,
  onClick,
  onPick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  lang: 'fr' | 'en';
  pathname: string;
  dock: boolean;
  /** Bas de barre : une seule ligne, sans description. */
  compact?: boolean;
  onClick?: () => void;
  onPick?: (href: string) => void;
}) {
  const { can } = usePermissions();
  const Icon = item.icon;
  const hint = !compact && item.hint ? item.hint[lang] : null;
  const tabs = sectionTabsFor(item.id).filter((t) => canSeeNavItem(t, can));
  const currentTab = active ? activeSectionTab(tabs, pathname) : null;
  const pick = (href: string) => (e: React.MouseEvent) => {
    if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) onPick?.(href);
    onClick?.();
  };

  const link = (
    <Link
      href={item.href}
      onClick={pick(item.href)}
      aria-current={active && !currentTab ? 'page' : active ? 'location' : undefined}
      aria-label={collapsed ? item.label[lang] : undefined}
      data-dock-item
      data-active={active || undefined}
      className={cn(
        'group relative z-[1] flex items-center gap-3 rounded-2xl transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2876B]/80 active:scale-[0.98]',
        collapsed ? 'mx-auto h-12 w-12 justify-center' : cn('px-3.5', hint ? 'min-h-[54px] py-2' : 'h-11'),
        active ? cn('text-white', !dock && ACTIVE_FILL) : 'text-white/75 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      <Icon strokeWidth={1.9} className={cn('h-5 w-5 shrink-0 transition-colors', active ? 'text-white' : 'text-white/55 group-hover:text-white')} />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15px] leading-5', active ? 'font-semibold' : 'font-medium')}>{item.label[lang]}</span>
          {hint && <span className={cn('block truncate text-[12px] leading-4', active ? 'text-white/80' : 'text-white/45 group-hover:text-white/65')}>{hint}</span>}
        </span>
      )}
    </Link>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip
          side="right"
          label={
            <span className="block">
              <span className="block font-medium">{item.label[lang]}</span>
              {item.hint && <span className="block text-[11.5px] opacity-75">{item.hint[lang]}</span>}
            </span>
          }
        >
          {link}
        </Tooltip>
      ) : (
        link
      )}
      {/* Sous-pages de la destination active : chacune explicite, accessible en un clic. */}
      {active && !collapsed && tabs.length > 1 && (
        <ul className="ml-[26px] mt-1 space-y-0.5 border-l border-white/[0.12] py-0.5 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {tabs.map((tab) => {
            const on = currentTab?.href === tab.href;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  onClick={pick(tab.href)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center gap-2.5 rounded-xl px-3 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2876B]/80',
                    on ? 'bg-white/[0.08] font-semibold text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-[#E2876B]' : 'bg-white/25')} />
                  {tab.label[lang]}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Bloc organisation / utilisateur en bas de barre, avec menu rapide. */
function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const org = useOrganizationSafe();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { role } = usePermissions();
  const [isFounder, setIsFounder] = useState(false);

  // Super console : lien réservé aux fondateurs (allowlist côté serveur).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/founder-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled) setIsFounder(!!body?.data?.isFounder);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const active = org?.memberships.find((m) => m.id === org.activeOrgId);
  const orgName = org?.branding?.brandName || active?.name || 'Centrium';
  const logo = org?.branding?.logoUrl;
  const fullName = `${org?.user?.firstName ?? ''} ${org?.user?.lastName ?? ''}`.trim() || org?.user?.email || '';
  const roleLabel = role ? (ROLE_LABEL[role]?.[lang] ?? role) : '';
  const others = (org?.memberships ?? []).filter((m) => m.id !== org?.activeOrgId);

  const avatar = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C65F46]/20 text-[13px] font-semibold text-[#F1C7BA]">{initials(orgName)}</span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={fr ? 'Organisation et compte' : 'Organisation and account'}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2876B]/80',
            collapsed && 'justify-center',
          )}
        >
          {avatar}
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-white">{fullName || orgName}</span>
                <span className="block truncate text-[12px] text-white/55">{[orgName, roleLabel].filter(Boolean).join(' · ')}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/45" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-64">
        <div className="px-2 py-2">
          <div className="truncate text-[13px] font-medium text-foreground">{fullName}</div>
          {fullName !== org?.user?.email && <div className="truncate text-xs text-muted-foreground">{org?.user?.email}</div>}
          {roleLabel && <div className="mt-1 text-xs text-muted-foreground">{roleLabel} · {orgName}</div>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/settings/profile')}>
          <UserRound />
          {fr ? 'Mon profil' : 'My profile'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/settings')}>
          <Settings />
          {fr ? 'Paramètres' : 'Settings'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLocale(fr ? 'en' : 'fr')}>
          <Languages />
          {fr ? 'English' : 'Français'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new CustomEvent('centrium-open-cookie-preferences'))}>
          <Cookie />
          {fr ? 'Confidentialité et cookies' : 'Privacy and cookies'}
        </DropdownMenuItem>
        {others.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{fr ? 'Changer d’organisation' : 'Switch organisation'}</DropdownMenuLabel>
            {(org?.memberships ?? []).map((m) => (
              <DropdownMenuItem key={m.id} onSelect={() => org?.switchOrg(m.id).then(() => window.location.assign('/dashboard'))}>
                <span className="flex-1 truncate">{m.name}</span>
                {m.id === org?.activeOrgId && <Check className="!text-primary" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {isFounder && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/admin/organizations')}>
              <ShieldCheck />
              Super console
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-destructive outline-none transition-colors hover:bg-danger-soft focus-visible:bg-danger-soft"
          >
            <LogOut className="h-4 w-4" />
            {fr ? 'Se déconnecter' : 'Log out'}
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Marker = { top: number; left: number; width: number; height: number };

/**
 * Contenu de la barre (dock sombre). Réutilisé par la barre desktop et le
 * tiroir mobile (`onItemClick` ferme le tiroir après navigation).
 *
 * `dock` (barre desktop) : la pastille en dégradé est un seul indicateur,
 * mesuré sur l'entrée active et animé d'une entrée à l'autre, dès le clic.
 */
export function SidebarBody({ collapsed = false, onItemClick, dock = false }: { collapsed?: boolean; onItemClick?: () => void; dock?: boolean }) {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const items = NAV_ITEMS.filter((i) => canSeeNavItem(i, can));
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  // Pas d'animation à la première mesure : l'indicateur apparaît en place.
  const [animate, setAnimate] = useState(false);
  // Entrée cliquée : active immédiatement, sans attendre le chargement de la page.
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [pathname]);
  // Navigation annulée (ou même page) : on revient à l'adresse réelle.
  useEffect(() => {
    if (!picked) return;
    const t = window.setTimeout(() => setPicked(null), 4000);
    return () => window.clearTimeout(t);
  }, [picked]);
  // Une sous-page cliquée garde sa destination active.
  const isActive = (item: NavItem) => {
    if (!picked) return isNavItemActive(item, pathname);
    return item.href === picked || sectionTabsFor(item.id).some((t) => t.href === picked);
  };

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!dock || !root) return;
    const el = root.querySelector<HTMLElement>('a[data-dock-item][data-active]');
    if (!el) {
      setMarker(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const next = { top: r.top - box.top, left: r.left - box.left, width: r.width, height: r.height };
    setMarker((m) => (m && m.top === next.top && m.left === next.left && m.width === next.width && m.height === next.height ? m : next));
  }, [dock]);

  useIsoLayoutEffect(() => {
    measure();
  }, [measure, pathname, picked, collapsed, lang, items.length]);

  useEffect(() => {
    if (!marker || animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [marker, animate]);

  useEffect(() => {
    if (!dock) return;
    const root = rootRef.current;
    const nav = navRef.current;
    // La largeur change pendant le repli : l'observateur suit l'entrée active jusqu'au bout.
    const observer = new ResizeObserver(() => measure());
    if (root) observer.observe(root);
    nav?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      nav?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [dock, measure]);

  const motion = animate ? 'transition-[transform,width,height,opacity] duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none' : '';

  return (
    <div ref={rootRef} className="relative flex h-full flex-col bg-app-dock text-white">
      {dock && marker && (
        <span
          aria-hidden
          className={cn('pointer-events-none absolute left-0 top-0 z-0 rounded-2xl', ACTIVE_FILL, motion)}
          style={{ transform: `translate3d(${marker.left}px, ${marker.top}px, 0)`, width: marker.width, height: marker.height }}
        />
      )}
      <Link
        href="/dashboard"
        onClick={onItemClick}
        aria-label={lang === 'fr' ? 'Centrium, tableau de bord' : 'Centrium, dashboard'}
        className={cn('flex h-16 shrink-0 items-center gap-3 text-[#E2876B]', collapsed ? 'justify-center' : 'px-5')}
      >
        <CentriumLogo className="h-9 w-9 shrink-0" color="currentColor" />
        {!collapsed && <CentriumType className="h-[13px] text-white" />}
      </Link>

      <nav
        ref={navRef}
        aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'}
        className={cn('no-scrollbar flex-1 space-y-1 overflow-y-auto pb-3 pt-3', collapsed ? 'px-2' : 'px-3')}
      >
        {items.map((item) => (
          <NavEntry key={item.id} item={item} active={isActive(item)} collapsed={collapsed} lang={lang} pathname={pathname} dock={dock} onClick={onItemClick} onPick={setPicked} />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 border-t border-white/[0.08] pb-3 pt-3', collapsed ? 'px-2' : 'px-3')}>
        {SECONDARY_ITEMS.map((item) => (
          <NavEntry key={item.id} item={item} active={isActive(item)} collapsed={collapsed} lang={lang} pathname={pathname} dock={dock} compact onClick={onItemClick} onPick={setPicked} />
        ))}
        <div className="pt-2">
          <ProfileMenu collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}

/**
 * Barre latérale desktop : dock sombre fixe, compacte ou étendue (choix
 * mémorisé). La flèche du bord droit replie ou déplie la barre (touche [).
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const label = collapsed ? (fr ? 'Déplier la barre' : 'Expand sidebar') : fr ? 'Replier la barre' : 'Collapse sidebar';

  return (
    <aside
      data-app-sidebar
      style={{ width: collapsed ? SIDEBAR_COMPACT : SIDEBAR_EXPANDED }}
      className="no-print relative z-30 hidden h-dvh shrink-0 transition-[width] duration-[260ms] ease-out-soft lg:block"
    >
      <SidebarBody collapsed={collapsed} dock />
      <Tooltip side="right" label={<span>{label} <kbd className="ml-1 rounded border border-current/30 px-1 font-sans text-[11px]">[</kbd></span>}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={label}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-[18px] z-40 grid h-7 w-7 place-items-center rounded-full border border-black/10 bg-white text-[#9D4432] shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)] transition-[transform,color] duration-200 hover:scale-110 hover:text-[#C65F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70 active:scale-95"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} strokeWidth={2.6} />
        </button>
      </Tooltip>
    </aside>
  );
}
