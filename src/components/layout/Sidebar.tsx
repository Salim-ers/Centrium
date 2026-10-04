'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, Check, LifeBuoy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { NAV_SECTIONS, isNavItemActive } from '@/lib/navigation';
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
    <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-md border border-border bg-white object-contain" />
  ) : (
    <CentriumLogo className="h-7 w-7" />
  );

  const trigger = (
    <button
      type="button"
      disabled={!canSwitch}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
        canSwitch && 'hover:bg-black/[0.04]',
        collapsed && 'justify-center px-0',
      )}
      aria-label={locale === 'fr' ? "Changer d'organisation" : 'Switch organisation'}
    >
      {mark}
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
            {role && (
              <span className="block truncate text-[11px] text-muted-foreground">
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
    items: s.items.filter((i) => can(i.permission)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 shrink-0 items-center border-b border-border px-3', collapsed && 'px-2')}>
        <OrgSwitcher collapsed={collapsed} />
      </div>

      <nav
        aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'}
        className="no-scrollbar flex-1 overflow-y-auto px-2.5 py-3"
      >
        {sections.map((section, si) => (
          <div key={section.id} className={cn(si > 0 && 'mt-4')}>
            {collapsed ? (
              si > 0 && <div aria-hidden className="mx-2 mb-2 h-px bg-border" />
            ) : (
              <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/90">
                {section.label[lang]}
              </div>
            )}
            <ul className="space-y-0.5">
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
                      'group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-card font-medium text-foreground shadow-xs ring-1 ring-border'
                        : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
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

      <div className={cn('shrink-0 space-y-1 border-t border-border p-2.5', collapsed && 'px-2')}>
        {!collapsed && <SetupProgress onNavigate={onItemClick} />}
        <Link
          href="/aide"
          onClick={onItemClick}
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? (lang === 'fr' ? 'Aide' : 'Help') : undefined}
        >
          <LifeBuoy className="h-4 w-4 shrink-0" />
          {!collapsed && (lang === 'fr' ? 'Aide & support' : 'Help & support')}
        </Link>
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
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <SidebarBody collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={label}
        title={label}
        className="absolute -right-3 top-[4.25rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
