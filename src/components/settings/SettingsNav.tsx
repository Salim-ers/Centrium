'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePermissions } from '@/hooks/usePermissions';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, activeSectionTab, canSeeNavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * Navigation interne des Paramètres : une colonne compacte en desktop, une
 * rangée défilante en mobile. Un clic affiche la section à droite, sans
 * page-catalogue à faire défiler.
 */
export function SettingsNav() {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const { can } = usePermissions();
  const sections = SETTINGS_SECTIONS.filter((s) => canSeeNavItem(s, can));
  const active = activeSectionTab(sections, pathname);

  return (
    <nav aria-label={lang === 'fr' ? 'Paramètres' : 'Settings'} className="min-w-0 lg:sticky lg:top-0 lg:self-start">
      <p className="mb-3 hidden font-display text-[22px] font-semibold leading-tight tracking-[-0.025em] lg:block">{lang === 'fr' ? 'Paramètres' : 'Settings'}</p>
      {/* Mobile : rangée défilante. */}
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.map((s) => {
          const on = active?.href === s.href;
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors',
                on ? 'border-app-terra bg-app-terra text-white' : 'border-app-terra/20 bg-card text-app-terra-dark',
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label[lang]}
            </Link>
          );
        })}
      </div>
      {/* Desktop : colonne groupée. */}
      <div className="hidden space-y-4 lg:block">
        {SETTINGS_GROUPS.map((g) => {
          const items = sections.filter((s) => s.group === g.id);
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g.label[lang]}</p>
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const on = active?.href === s.href;
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50',
                          on ? 'bg-app-terra text-white shadow-[0_6px_14px_-8px_rgba(198,95,70,.9)]' : 'text-foreground/80 hover:bg-app-peach-light hover:text-foreground',
                        )}
                      >
                        <s.icon className={cn('h-4 w-4 shrink-0', on ? 'text-white' : 'text-app-terra')} />
                        <span className="truncate">{s.label[lang]}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
