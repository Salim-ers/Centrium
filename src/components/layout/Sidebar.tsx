'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Cookie,
  Languages,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { NAV_ITEMS, SECONDARY_ITEMS, canSeeNavItem, isNavItemActive, type NavItem } from '@/lib/navigation';
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

/** Largeurs de la barre : compacte (icônes) et étendue (icônes + titres). */
export const SIDEBAR_COMPACT = 72;
export const SIDEBAR_EXPANDED = 228;

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

/** Une entrée de la barre : pastille terracotta quand active (glissante dans le dock). */
function DockLink({ item, active, collapsed, lang, onClick, onPick, dock = false }: { item: NavItem; active: boolean; collapsed: boolean; lang: 'fr' | 'en'; onClick?: () => void; onPick?: (href: string) => void; dock?: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={(e) => {
        if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) onPick?.(item.href);
        onClick?.();
      }}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label[lang] : undefined}
      data-dock-item
      className={cn(
        'group relative z-[1] flex h-10 items-center gap-3 rounded-xl text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70',
        collapsed ? 'mx-auto w-10 justify-center' : 'px-3',
        active
          ? dock
            ? 'text-white'
            : 'bg-[#C65F46] text-white shadow-[0_8px_20px_-10px_rgba(198,95,70,.8)]'
          : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      <Icon strokeWidth={1.9} className={cn('h-[19px] w-[19px] shrink-0 transition-colors', active ? 'text-white' : 'text-white/60 group-hover:text-white')} />
      {!collapsed && <span className="truncate">{item.label[lang]}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip label={item.label[lang]} side="right">
      {link}
    </Tooltip>
  ) : (
    link
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
    <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-0.5" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C65F46]/20 text-[12px] font-semibold text-[#F1C7BA]">{initials(orgName)}</span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={fr ? 'Organisation et compte' : 'Organisation and account'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70',
            collapsed && 'justify-center',
          )}
        >
          {avatar}
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{fullName || orgName}</span>
                <span className="block truncate text-[11.5px] text-white/55">{[orgName, roleLabel].filter(Boolean).join(' · ')}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-white/45" />
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
 * `dock` (barre desktop) : la pastille terracotta du menu actif et
 * l'encoche du bord droit sont un seul indicateur, mesuré sur l'entrée
 * active et animé d'une entrée à l'autre (y compris Paramètres et Aide).
 */
export function SidebarBody({ collapsed = false, onItemClick, dock = false, onToggle }: { collapsed?: boolean; onItemClick?: () => void; dock?: boolean; onToggle?: () => void }) {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
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
  const isActive = (item: NavItem) => (picked ? item.href === picked : isNavItemActive(item, pathname));

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!dock || !root) return;
    const el = root.querySelector<HTMLElement>('a[data-dock-item][aria-current="page"]');
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
  const toggleLabel = collapsed ? (fr ? 'Afficher les titres' : 'Show labels') : fr ? 'Réduire la barre' : 'Collapse sidebar';
  const toggle = onToggle ? (
    <button
      type="button"
      onClick={onToggle}
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      className={cn(
        'relative z-[1] flex h-9 items-center gap-3 rounded-xl text-[13px] text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70',
        collapsed ? 'mx-auto w-10 justify-center' : 'w-full px-3',
      )}
    >
      {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
      {!collapsed && <span>{toggleLabel}</span>}
    </button>
  ) : null;

  return (
    <div ref={rootRef} className="relative flex h-full flex-col bg-app-dock text-white">
      {dock && marker && (
        <>
          {/* Pastille de l'entrée active. */}
          <span
            aria-hidden
            className={cn('pointer-events-none absolute left-0 top-0 z-0 rounded-xl bg-[#C65F46] shadow-[0_8px_20px_-10px_rgba(198,95,70,.8)]', motion)}
            style={{ transform: `translate3d(${marker.left}px, ${marker.top}px, 0)`, width: marker.width, height: marker.height }}
          />
          {/* Encoche du bord droit, à hauteur de l'entrée active. */}
          <span
            aria-hidden
            className={cn('pointer-events-none absolute left-full top-0 z-10 flex w-3.5 flex-col', motion)}
            style={{ transform: `translate3d(0, ${marker.top + marker.height / 2 - 34}px, 0)` }}
          >
            <span className="block h-3 w-3 bg-[radial-gradient(circle_at_100%_0,transparent_11.5px,#1B1817_12px)]" />
            <span className="flex h-11 w-3.5 items-center justify-center rounded-r-[10px] bg-app-dock">
              <ChevronRight className="h-3 w-3 text-[#E8876E]" strokeWidth={3} />
            </span>
            <span className="block h-3 w-3 bg-[radial-gradient(circle_at_100%_100%,transparent_11.5px,#1B1817_12px)]" />
          </span>
        </>
      )}
      <Link
        href="/dashboard"
        onClick={onItemClick}
        aria-label={lang === 'fr' ? 'Centrium, tableau de bord' : 'Centrium, dashboard'}
        className={cn('flex h-16 shrink-0 items-center gap-2.5 text-[#D9785F]', collapsed ? 'justify-center' : 'px-5')}
      >
        <CentriumLogo className="h-8 w-8 shrink-0" color="currentColor" />
        {!collapsed && <CentriumType className="h-[12px] text-white" />}
      </Link>

      <nav ref={navRef} aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'} className={cn('no-scrollbar flex-1 space-y-1 overflow-y-auto pb-3 pt-2', collapsed ? 'px-2' : 'px-3')}>
        {items.map((item) => (
          <DockLink key={item.id} item={item} active={isActive(item)} collapsed={collapsed} lang={lang} onClick={onItemClick} onPick={setPicked} dock={dock} />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 border-t border-white/[0.07] pb-3 pt-3', collapsed ? 'px-2' : 'px-3')}>
        {SECONDARY_ITEMS.map((item) => (
          <DockLink key={item.id} item={item} active={isActive(item)} collapsed={collapsed} lang={lang} onClick={onItemClick} onPick={setPicked} dock={dock} />
        ))}
        {toggle &&
          (collapsed ? (
            <Tooltip label={toggleLabel} side="right">
              {toggle}
            </Tooltip>
          ) : (
            toggle
          ))}
        <div className="pt-1.5">
          <ProfileMenu collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}

/**
 * Barre latérale desktop : dock sombre fixe, compacte ou étendue (choix
 * mémorisé). L'encoche du bord droit suit l'entrée active ; la bascule
 * compacte / étendue est en bas de la barre.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <aside
      data-app-sidebar
      style={{ width: collapsed ? SIDEBAR_COMPACT : SIDEBAR_EXPANDED }}
      className="no-print relative z-30 hidden h-dvh shrink-0 transition-[width] duration-[240ms] ease-out-soft lg:block"
    >
      <SidebarBody collapsed={collapsed} dock onToggle={() => setCollapsed(!collapsed)} />
    </aside>
  );
}
