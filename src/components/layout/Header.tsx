'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  LogOut,
  ShieldCheck,
  UserRound,
  Settings,
  CheckSquare,
  Languages,
  Building2,
  Target,
  Users,
  Briefcase,
  Receipt,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOrganizationSafe } from '@/lib/auth/context';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { MobileNav } from './MobileNav';
import { NotificationCenter } from './NotificationCenter';
import { openCommandPalette } from './CommandPalette';
import { NAV_SECTIONS, isNavItemActive } from '@/lib/navigation';

/** Fil d'Ariane de la page courante (section › module › détail). */
function useCrumbs(pathname: string, lang: 'fr' | 'en'): string[] {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (!isNavItemActive(item, pathname)) continue;
      const crumbs = [section.label[lang], item.label[lang]];
      const deeper = pathname !== item.href && pathname.startsWith(item.href + '/');
      if (deeper) crumbs.push(lang === 'fr' ? 'Détail' : 'Details');
      return crumbs;
    }
  }
  return [];
}

const CREATE_ITEMS: Array<{
  label: { fr: string; en: string };
  href: string;
  icon: typeof Plus;
  permission: Permission;
}> = [
  { label: { fr: 'Client', en: 'Client' }, href: '/clients?new=1', icon: Building2, permission: 'clients.edit' },
  { label: { fr: 'Opportunité', en: 'Opportunity' }, href: '/crm?new=1', icon: Target, permission: 'opportunities.edit' },
  { label: { fr: 'Consultant', en: 'Consultant' }, href: '/consultants?new=1', icon: Users, permission: 'consultants.edit' },
  { label: { fr: 'Mission', en: 'Mission' }, href: '/missions?new=1', icon: Briefcase, permission: 'missions.edit' },
  { label: { fr: 'Devis', en: 'Quote' }, href: '/documents/quotes/new', icon: Receipt, permission: 'documents.edit' },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const org = useOrganizationSafe();
  const [collapsed] = useSidebarCollapsed();
  const { locale, setLocale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can, role } = usePermissions();
  const [isFounder, setIsFounder] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Super console : lien affiché aux fondateurs (allowlist serveur).
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

  const fullName = `${org?.user?.firstName ?? ''} ${org?.user?.lastName ?? ''}`.trim();
  const createItems = CREATE_ITEMS.filter((i) => can(i.permission));
  const crumbs = useCrumbs(pathname, lang);
  const onDashboard = pathname === '/dashboard';
  const hour = new Date().getHours();
  const hello = lang === 'fr' ? (hour < 18 ? 'Bonjour' : 'Bonsoir') : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const activeOrg = org?.memberships.find((m) => m.id === org.activeOrgId);
  const orgName = org?.branding?.brandName || activeOrg?.name || '';

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-20 h-16 bg-background/85 backdrop-blur-md transition-[left] duration-300 ease-out-soft',
        collapsed ? 'md:left-[72px]' : 'md:left-[260px]',
      )}
    >
      <div className="relative flex h-full items-center gap-3 px-3 sm:px-6">
        {/* Centrium au centre : l'outil reste identifiable, quelle que soit l'ESN. */}
        <Link
          href="/dashboard"
          aria-label={lang === 'fr' ? 'Centrium, tableau de bord' : 'Centrium, dashboard'}
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-xl px-2 py-1 text-[#A84B37] transition-opacity hover:opacity-80 lg:flex"
        >
          <CentriumLogo className="h-8 w-8" color="currentColor" />
          <CentriumType className="h-[14px]" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-[calc(50%-120px)]">
          <MobileNav />
          <Link href="/dashboard" className="md:hidden" aria-label={lang === 'fr' ? 'Accueil' : 'Home'}>
            <CentriumLogo className="h-7 w-7" />
          </Link>

          <div className="hidden min-w-0 md:block">
            {onDashboard ? (
              <div className="truncate text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                {hello}
                {org?.user?.firstName ? ` ${org.user.firstName}` : ''}
              </div>
            ) : (
              <nav aria-label={lang === 'fr' ? 'Fil d’Ariane' : 'Breadcrumb'}>
                <ol className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
                  {crumbs.map((c, i) => (
                    <li key={i} className={cn('flex min-w-0 items-center gap-1.5', i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
                      <span className="truncate" aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
                        {c}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>

        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="hidden h-10 w-[220px] items-center gap-2.5 rounded-xl bg-card px-3.5 text-left text-[13px] text-muted-foreground ring-1 ring-black/[0.06] transition-shadow hover:ring-black/[0.12] 2xl:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{lang === 'fr' ? 'Rechercher…' : 'Search…'}</span>
            <kbd className="shrink-0 rounded-md bg-black/[0.05] px-1.5 py-0.5 font-sans text-[10.5px] font-medium">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <Button variant="ghost" size="icon" className="2xl:hidden" onClick={() => openCommandPalette()} aria-label={lang === 'fr' ? 'Rechercher' : 'Search'}>
            <Search />
          </Button>

          {createItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden h-10 rounded-xl px-4 sm:inline-flex">
                  <Plus />
                  {lang === 'fr' ? 'Créer' : 'Create'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {createItems.map((item) => (
                  <DropdownMenuItem key={item.href} onSelect={() => router.push(item.href)}>
                    <item.icon />
                    {item.label[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <NotificationCenter />

          {orgName && (
            <Link
              href="/settings"
              title={lang === 'fr' ? 'Organisation' : 'Organisation'}
              className="hidden h-10 max-w-[180px] items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-foreground ring-1 ring-black/[0.06] transition-shadow hover:ring-black/[0.12] 2xl:inline-flex"
            >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{orgName}</span>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-0.5 rounded-full focus-visible:outline-none focus-visible:shadow-focus"
                aria-label={lang === 'fr' ? 'Mon compte' : 'My account'}
              >
                <Avatar name={fullName || org?.user?.email} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-2">
                <div className="truncate text-[13px] font-medium text-foreground">{fullName || org?.user?.email}</div>
                {fullName && <div className="truncate text-xs text-muted-foreground">{org?.user?.email}</div>}
                {role && (
                  <div className="mt-1 text-xs text-muted-foreground">{ROLE_LABEL[role]?.[lang] ?? role}</div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/settings/profile')}>
                <UserRound />
                {lang === 'fr' ? 'Mon profil' : 'My profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/todos')}>
                <CheckSquare />
                {lang === 'fr' ? 'Mes tâches' : 'My tasks'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Settings />
                {lang === 'fr' ? 'Paramètres' : 'Settings'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocale(lang === 'fr' ? 'en' : 'fr')}>
                <Languages />
                {lang === 'fr' ? 'English' : 'Français'}
              </DropdownMenuItem>
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
                  {lang === 'fr' ? 'Se déconnecter' : 'Log out'}
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
