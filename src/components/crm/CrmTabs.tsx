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
    <nav aria-label="CRM" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-[13px] font-medium transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}
