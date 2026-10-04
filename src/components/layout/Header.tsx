'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { MobileNav } from './MobileNav';
import { NotificationCenter } from './NotificationCenter';
import { openCommandPalette } from './CommandPalette';

const CREATE_ITEMS: Array<{
  label: { fr: string; en: string };
  href: string;
  icon: typeof Plus;
  permission: Permission;
}> = [
  { label: { fr: 'Client', en: 'Client' }, href: '/clients?new=1', icon: Building2, permission: 'clients.edit' },
  { label: { fr: 'Opportunité', en: 'Opportunity' }, href: '/opportunities?new=1', icon: Target, permission: 'opportunities.edit' },
  { label: { fr: 'Consultant', en: 'Consultant' }, href: '/consultants?new=1', icon: Users, permission: 'consultants.edit' },
  { label: { fr: 'Mission', en: 'Mission' }, href: '/missions?new=1', icon: Briefcase, permission: 'missions.edit' },
  { label: { fr: 'Devis', en: 'Quote' }, href: '/documents/quotes/new', icon: Receipt, permission: 'documents.edit' },
];

export function Header() {
  const router = useRouter();
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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-20 h-14 border-b border-border bg-background/90 backdrop-blur-[6px] transition-[left] duration-200 ease-out',
        collapsed ? 'md:left-16' : 'md:left-60',
      )}
    >
      <div className="flex h-full items-center gap-2 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MobileNav />
          <Link href="/dashboard" className="md:hidden" aria-label={lang === 'fr' ? 'Accueil' : 'Home'}>
            <CentriumLogo className="h-7 w-7" />
          </Link>

          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="hidden h-9 w-full max-w-md items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-[13px] text-muted-foreground shadow-xs transition-colors hover:border-sand-300 sm:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">
              {lang === 'fr' ? 'Rechercher, créer ou poser une question…' : 'Search, create or ask a question…'}
            </span>
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium md:inline">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => openCommandPalette()}
            aria-label={lang === 'fr' ? 'Rechercher' : 'Search'}
          >
            <Search />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden lg:block">
            <PresenceAvatars />
          </div>

          {createItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden sm:inline-flex">
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
