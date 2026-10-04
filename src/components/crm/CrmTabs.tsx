'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kanban, UserRound, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';

const TABS = [
  { href: '/crm', icon: Kanban, label: { fr: 'Pipeline', en: 'Pipeline' } },
  { href: '/contacts', icon: UserRound, label: { fr: 'Contacts', en: 'Contacts' } },
  { href: '/crm/tasks', icon: ListChecks, label: { fr: 'Tâches', en: 'Tasks' } },
];

/** Navigation interne du CRM (pipeline, contacts, tâches). */
export function CrmTabs() {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  return (
    <nav aria-label="CRM" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-border">
      {TABS.map((t) => {
        const active = t.href === '/crm' ? pathname === '/crm' : pathname.startsWith(t.href);
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
