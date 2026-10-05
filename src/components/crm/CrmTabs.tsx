'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kanban, UserRound, ListChecks, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/auth/permissions';

type Tab = {
  href: string;
  icon: LucideIcon;
  label: { fr: string; en: string };
  match: (pathname: string) => boolean;
  /** Une seule de ces permissions suffit. */
  permission: Permission[];
};

const TABS: Tab[] = [
  {
    href: '/crm',
    icon: Kanban,
    label: { fr: 'Opportunités', en: 'Opportunities' },
    // Tableau (/crm) et liste (/opportunities) sont deux vues du même onglet.
    match: (p) => p === '/crm' || p.startsWith('/opportunities'),
    permission: ['crm.view', 'opportunities.view'],
  },
  { href: '/contacts', icon: UserRound, label: { fr: 'Contacts', en: 'Contacts' }, match: (p) => p.startsWith('/contacts'), permission: ['crm.view'] },
  { href: '/crm/tasks', icon: ListChecks, label: { fr: 'Tâches', en: 'Tasks' }, match: (p) => p.startsWith('/crm/tasks'), permission: ['crm.view'] },
];

/** Navigation interne du CRM : opportunités, contacts, tâches. */
export function CrmTabs() {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const { can } = usePermissions();
  const lang = locale === 'en' ? 'en' : 'fr';
  const tabs = TABS.filter((t) => t.permission.some(can));
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="CRM" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 text-[14px] font-semibold transition-colors',
              active ? 'border-terra bg-terra text-white shadow-sm' : 'border-terra/35 bg-card text-terra-deep hover:border-terra hover:bg-terra-blush/60',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}
