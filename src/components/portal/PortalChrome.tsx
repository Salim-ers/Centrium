'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export type PortalNavEntry = {
  href: string;
  label: { fr: string; en: string };
  icon: React.ElementType;
  /** Présent dans la barre d'onglets mobile (5 au maximum). */
  tab?: boolean;
};

export type PortalBrand = { name: string; logoUrl?: string | null };

function Brand({ brand, href }: { brand?: PortalBrand | null; href: string }) {
  if (brand?.logoUrl) {
    return (
      <Link href={href} className="-my-2 flex min-w-0 items-center gap-2 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logoUrl} alt={brand.name} className="h-7 max-w-[140px] object-contain" />
      </Link>
    );
  }
  if (brand?.name) {
    return (
      <Link href={href} className="-my-2 truncate py-2 text-[15px] font-semibold tracking-tight">
        {brand.name}
      </Link>
    );
  }
  return <CentriumWordmark size="sm" orientation="horizontal" href={href} />;
}

/**
 * Habillage des portails (consultant, client) : barre latérale sur grand
 * écran ; sur mobile, barre supérieure + menu et barre d'onglets en bas
 * (zones tactiles ≥ 44 px, safe-area iOS).
 */
export function PortalChrome({
  items,
  homeHref,
  spaceLabel,
  brand,
  children,
}: {
  items: PortalNavEntry[];
  homeHref: string;
  spaceLabel: { fr: string; en: string };
  brand?: PortalBrand | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const tabs = items.filter((i) => i.tab).slice(0, 5);

  useEffect(() => setMenuOpen(false), [pathname]);

  const logout = (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        {fr ? 'Se déconnecter' : 'Sign out'}
      </button>
    </form>
  );

  const nav = (
    <nav aria-label={fr ? 'Navigation du portail' : 'Portal navigation'} className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors',
              active ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
            {item.label[lang]}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Grand écran */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-16 items-center px-4">
          <Brand brand={brand} href={homeHref} />
        </div>
        <div className="px-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{spaceLabel[lang]}</div>
        <div className="flex-1 overflow-y-auto px-2">{nav}</div>
        <div className="space-y-1 border-t border-border p-2">
          <div className="px-2.5 py-1">
            <LocaleToggle variant="compact" />
          </div>
          {logout}
        </div>
      </aside>

      {/* Mobile : barre supérieure */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Brand brand={brand} href={homeHref} />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={fr ? 'Ouvrir le menu' : 'Open menu'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent side="right" className="w-[85vw] max-w-xs p-3 pt-12">
          <DrawerTitle className="px-2.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{spaceLabel[lang]}</DrawerTitle>
          {nav}
          <div className="mt-auto space-y-1 border-t border-border pt-2">
            <div className="px-2.5 py-1">
              <LocaleToggle variant="compact" />
            </div>
            {logout}
          </div>
        </DrawerContent>
      </Drawer>

      <main className="pb-24 md:pb-10 md:pl-60">
        <DemoBanner />
        <div className="mx-auto max-w-4xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile : barre d'onglets */}
      {tabs.length > 0 && (
        <nav
          aria-label={fr ? 'Raccourcis' : 'Shortcuts'}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = isActive(t.href);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'text-primary-deep' : 'text-muted-foreground')}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="max-w-full truncate px-1">{t.label[lang]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
