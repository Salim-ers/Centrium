'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';

import { cn } from '@/lib/utils';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PORTAL_GROUPS } from './PortalSidebar';

// =========================================================================
// Navigation mobile du portail consultant (< md).
// -------------------------------------------------------------------------
// Auparavant : PortalSidebar était `hidden md:flex` et PortalShell n'avait
// AUCUNE nav mobile → sur téléphone le consultant était piégé (pas de menu,
// PAS DE BOUTON DÉCONNEXION). Ce composant ajoute une barre supérieure avec
// hamburger + un tiroir reprenant la nav, la déconnexion et le thème.
// Même exigence d'accessibilité que la MobileNav admin (aria, Escape,
// scroll-lock, fermeture au changement de route).
// =========================================================================

export function PortalMobileNav() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [open, setOpen] = useState(false);

  // Ferme au changement de route.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape + scroll-lock quand ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Barre supérieure — visible uniquement < md */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-hairline bg-background/80 px-4 py-2.5 ">
        <Link href="/portal/dashboard" aria-label={isEn ? 'Centrium — portal home' : 'Centrium — accueil portail'}>
          <CentriumWordmark size="sm" orientation="horizontal" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={isEn ? 'Open menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-foreground hover:bg-foreground/[0.05] transition"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Tiroir */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label={isEn ? 'Close menu' : 'Fermer le menu'}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/50 "
          />
          <nav className="qc-sidebar absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col border-l border-hairline">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <CentriumWordmark size="sm" orientation="horizontal" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
              {PORTAL_GROUPS.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                    <group.icon className="h-3.5 w-3.5" />
                    {isEn ? group.labelEn : group.label}
                  </div>
                  <ul className="ml-4 pl-3 space-y-0.5 border-l border-border">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors',
                              active
                                ? 'bg-primary/[0.10] text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{isEn ? item.labelEn : item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[14px] text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {isEn ? 'Sign out' : 'Se déconnecter'}
                </button>
              </form>
              <div className="flex items-center gap-2">
                <LocaleToggle variant="compact" />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
