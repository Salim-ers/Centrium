'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
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

/** Une entrée de la barre : pastille terracotta quand active. */
function DockLink({ item, active, collapsed, lang, onClick }: { item: NavItem; active: boolean; collapsed: boolean; lang: 'fr' | 'en'; onClick?: () => void }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label[lang] : undefined}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-xl text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70',
        collapsed ? 'mx-auto w-10 justify-center' : 'px-3',
        active ? 'bg-[#C65F46] text-white shadow-[0_8px_20px_-10px_rgba(198,95,70,.8)]' : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
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
                <span className="block truncate text-[13px] font-semibold text-white">{orgName}</span>
                <span className="block truncate text-[11.5px] text-white/55">{roleLabel || fullName}</span>
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

/**
 * Contenu de la barre (dock sombre). Réutilisé par la barre desktop et le
 * tiroir mobile (`onItemClick` ferme le tiroir après navigation).
 */
export function SidebarBody({ collapsed = false, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const items = NAV_ITEMS.filter((i) => canSeeNavItem(i, can));

  return (
    <div className="flex h-full flex-col bg-app-dock text-white">
      <Link
        href="/dashboard"
        onClick={onItemClick}
        aria-label={lang === 'fr' ? 'Centrium, tableau de bord' : 'Centrium, dashboard'}
        className={cn('flex h-16 shrink-0 items-center gap-2.5 text-[#D9785F]', collapsed ? 'justify-center' : 'px-5')}
      >
        <CentriumLogo className="h-8 w-8 shrink-0" color="currentColor" />
        {!collapsed && <CentriumType className="h-[12px] text-white" />}
      </Link>

      <nav aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'} className={cn('no-scrollbar flex-1 space-y-1 overflow-y-auto pb-3 pt-2', collapsed ? 'px-2' : 'px-3')}>
        {items.map((item) => (
          <DockLink key={item.id} item={item} active={isNavItemActive(item, pathname)} collapsed={collapsed} lang={lang} onClick={onItemClick} />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 border-t border-white/[0.07] pb-3 pt-3', collapsed ? 'px-2' : 'px-3')}>
        {SECONDARY_ITEMS.map((item) => (
          <DockLink key={item.id} item={item} active={isNavItemActive(item, pathname)} collapsed={collapsed} lang={lang} onClick={onItemClick} />
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
 * mémorisé). L'encoche sur le bord droit porte le bouton de bascule.
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const label = collapsed ? (fr ? 'Afficher les titres' : 'Show labels') : fr ? 'Réduire la barre' : 'Collapse sidebar';

  return (
    <aside
      data-app-sidebar
      style={{ width: collapsed ? SIDEBAR_COMPACT : SIDEBAR_EXPANDED }}
      className="relative z-30 hidden h-dvh shrink-0 transition-[width] duration-[240ms] ease-out-soft md:block"
    >
      <SidebarBody collapsed={collapsed} />
      {/* Encoche : congés concaves au-dessus et au-dessous de la bosse. */}
      <span aria-hidden className="pointer-events-none absolute left-full top-[60px] h-3 w-3 bg-[radial-gradient(circle_at_100%_0,transparent_11.5px,#1B1817_12px)]" />
      <span aria-hidden className="pointer-events-none absolute left-full top-[116px] h-3 w-3 bg-[radial-gradient(circle_at_100%_100%,transparent_11.5px,#1B1817_12px)]" />
      <Tooltip label={label} side="right">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={label}
          aria-expanded={!collapsed}
          className="absolute left-full top-[72px] flex h-11 w-3.5 items-center justify-center rounded-r-[10px] bg-app-dock text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65F46]/70"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </Tooltip>
    </aside>
  );
}
