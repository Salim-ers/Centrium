'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTION_TABS, activeSectionTab, canSeeNavItem } from '@/lib/navigation';

/**
 * Onglets d'une destination (CRM, Opérations, Staffing) en contrôle
 * segmenté : un seul niveau sous la barre latérale, jamais plus.
 */
export function SectionTabs({ section, className }: { section: keyof typeof SECTION_TABS; className?: string }) {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const tabs = SECTION_TABS[section].filter((t) => canSeeNavItem(t, can));
  const active = activeSectionTab(tabs, pathname);
  if (tabs.length < 2) return null;
  return (
    <nav
      aria-label={lang === 'fr' ? 'Vues' : 'Views'}
      className={cn('no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-app-terra/20 bg-card p-1 shadow-[0_1px_2px_rgba(25,22,20,.04)]', className)}
    >
      {tabs.map((t) => {
        const on = active?.href === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50',
              on ? 'bg-app-terra text-white shadow-[0_6px_14px_-8px_rgba(198,95,70,.9)]' : 'text-app-terra-dark hover:bg-app-peach-light',
            )}
          >
            {t.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}
