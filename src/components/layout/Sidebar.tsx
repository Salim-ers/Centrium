'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, Check, LifeBuoy, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { NAV_SECTIONS, canSeeNavItem, isNavItemActive } from '@/lib/navigation';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SetupProgress } from '@/components/onboarding/SetupProgress';

/** Bloc organisation : logo de l'ESN (ou symbole Centrium) + sélecteur. */
function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const org = useOrganizationSafe();
  const { locale } = useLocale();
  const { role } = usePermissions();
  const active = org?.memberships.find((m) => m.id === org.activeOrgId);
  const name = org?.branding?.brandName || active?.name || 'Centrium';
  const logo = org?.branding?.logoUrl;
  const canSwitch = (org?.memberships.length ?? 0) > 1;

  const mark = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className={cn('shrink-0 rounded-xl border border-border bg-white object-contain', collapsed ? 'h-10 w-10' : 'h-11 w-11')} />
  ) : (
    <CentriumLogo className={collapsed ? 'h-10 w-10' : 'h-11 w-11'} />
  );

  const trigger = (
    <button
      type="button"
      disabled={!canSwitch}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors',
        canSwitch && 'hover:bg-black/[0.04]',
        collapsed && 'justify-center px-0',
      )}
      aria-label={locale === 'fr' ? "Changer d'organisation" : 'Switch organisation'}
    >
      {mark}
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
            {role && (
              <span className="block truncate text-[12px] text-muted-foreground">
                {ROLE_LABEL[role]?.[locale === 'en' ? 'en' : 'fr'] ?? role}
              </span>
            )}
          </span>
          {canSwitch && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </>
      )}
    </button>
  );

  if (!canSwitch) return trigger;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>{locale === 'fr' ? 'Organisations' : 'Organisations'}</DropdownMenuLabel>
        {org?.memberships.map((m) => (
          <DropdownMenuItem key={m.id} onSelect={() => org.switchOrg(m.id).then(() => window.location.assign('/dashboard'))}>
            <span className="flex-1 truncate">{m.name}</span>
            {m.id === org.activeOrgId && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Contenu de la navigation. Réutilisé par la sidebar desktop et le tiroir
 * mobile (`onItemClick` ferme le tiroir après navigation).
 */
export function SidebarBody({
  collapsed = false,
  onItemClick,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.id !== 'settings' && i.sidebar !== false && canSeeNavItem(i, can)),
  })).filter((s) => s.items.length > 0);
  const settingsActive = ['/settings', '/billing', '/onboarding/setup'].some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-20 shrink-0 items-center px-3', collapsed && 'justify-center')}>
        <OrgSwitcher collapsed={collapsed} />
      </div>

      <nav
        aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'}
        className={cn('no-scrollbar flex-1 overflow-y-auto py-2', collapsed ? 'px-3' : 'px-3')}
      >
        {/* Une liste simple : pas de titres de section, un trait fin entre les groupes. */}
        {sections.map((section, si) => (
          <div key={section.id} aria-label={section.label[lang]} role="group">
            {si > 0 && <div aria-hidden className={cn('my-2.5 h-px bg-border', collapsed ? 'mx-auto w-7' : 'mx-3')} />}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onItemClick}
                    aria-current={active ? 'page' : undefined}
                    aria-label={collapsed ? item.label[lang] : undefined}
                    className={cn(
                      'group relative flex h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] transition-colors duration-200',
                      collapsed && 'mx-auto h-11 w-11 justify-center px-0',
                      active
                        ? 'bg-terra-blush font-medium text-terra-deep'
                        : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
                    )}
                  >
                    <Icon
                      strokeWidth={1.8}
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        active ? 'text-terra-deep' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label[lang]}</span>}
                  </Link>
                );
                return (
                  <li key={item.id}>
                    {collapsed ? (
                      <Tooltip label={item.label[lang]} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 p-3')}>
        {!collapsed && <SetupProgress onNavigate={onItemClick} />}
        {[
          { href: '/settings', icon: Settings, label: lang === 'fr' ? 'Paramètres' : 'Settings', active: settingsActive },
          { href: '/aide', icon: LifeBuoy, label: lang === 'fr' ? 'Aide & support' : 'Help & support', active: pathname.startsWith('/aide') },
        ].map((l) => {
          const link = (
            <Link
              key={l.href}
              href={l.href}
              onClick={onItemClick}
              aria-current={l.active ? 'page' : undefined}
              aria-label={collapsed ? l.label : undefined}
              className={cn(
                'flex h-11 items-center gap-3.5 rounded-xl px-3 text-[15px] transition-colors duration-200',
                collapsed && 'mx-auto h-11 w-11 justify-center px-0',
                l.active ? 'bg-terra-blush font-medium text-terra-deep' : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
              )}
            >
              <l.icon strokeWidth={1.8} className="h-5 w-5 shrink-0" />
              {!collapsed && l.label}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={l.href} label={l.label} side="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { locale } = useLocale();
  const label = collapsed
    ? locale === 'fr'
      ? 'Déplier la navigation'
      : 'Expand navigation'
    : locale === 'fr'
      ? 'Replier la navigation'
      : 'Collapse navigation';

  return (
    <aside
      data-app-sidebar
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-black/[0.06] bg-sidebar transition-[width] duration-300 ease-out-soft md:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <SidebarBody collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={label}
        title={label}
        className="absolute -right-3 top-[5.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
