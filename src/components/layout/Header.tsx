'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';
import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { breadcrumb } from '@/lib/navigation';
import { MobileNav } from './MobileNav';
import { NotificationCenter } from './NotificationCenter';
import { QuickCreate } from './QuickCreate';
import { openCommandPalette } from './CommandPalette';

/**
 * Barre supérieure, volontairement légère : fil d'Ariane, recherche (⌘K),
 * « + Créer » et notifications. L'organisation et le compte sont en bas de
 * la barre latérale.
 */
export function Header() {
  const pathname = usePathname() ?? '';
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const crumbs = breadcrumb(pathname, lang);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-black/[0.05] bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <MobileNav />
      <Link href="/dashboard" className="md:hidden" aria-label={lang === 'fr' ? 'Accueil' : 'Home'}>
        <CentriumLogo className="h-7 w-7" />
      </Link>

      <nav aria-label={lang === 'fr' ? 'Fil d’Ariane' : 'Breadcrumb'} className="hidden min-w-0 flex-1 md:block lg:max-w-[calc(50%-230px)]">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
          {crumbs.map((c, i) => (
            <li key={c} className={cn('flex min-w-0 items-center gap-1.5', i === crumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {i > 0 && (
                <span aria-hidden className="text-muted-foreground/50">
                  /
                </span>
              )}
              <span className="truncate" aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
                {c}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={() => openCommandPalette()}
        className="hidden h-9 w-full max-w-[420px] items-center gap-2.5 rounded-xl bg-card px-3.5 text-left text-[13px] text-muted-foreground ring-1 ring-black/[0.06] transition-shadow hover:ring-black/[0.12] md:ml-auto md:flex lg:absolute lg:left-1/2 lg:ml-0 lg:-translate-x-1/2"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">
          {lang === 'fr' ? 'Rechercher un client, un consultant, une mission…' : 'Search a client, consultant, mission…'}
        </span>
        <kbd className="shrink-0 rounded-md bg-black/[0.05] px-1.5 py-0.5 font-sans text-[10.5px] font-medium">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => openCommandPalette()} aria-label={lang === 'fr' ? 'Rechercher' : 'Search'}>
          <Search />
        </Button>
        <QuickCreate />
        <NotificationCenter />
      </div>
    </header>
  );
}
