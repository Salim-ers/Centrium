'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/#produit', label: { fr: 'Produit', en: 'Product' } },
  { href: '/#parcours', label: { fr: 'Parcours', en: 'How it works' } },
  { href: '/tarifs', label: { fr: 'Tarifs', en: 'Pricing' } },
  { href: '/security', label: { fr: 'Sécurité', en: 'Security' } },
  { href: '/demo', label: { fr: 'Démo', en: 'Demo' } },
];

export function SiteHeader() {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={cn('sticky top-0 z-40 border-b transition-colors duration-200', scrolled || open ? 'border-border bg-background/95 backdrop-blur' : 'border-transparent bg-background/0')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <CentriumWordmark size="sm" orientation="horizontal" href="/" />
        <nav aria-label={lang === 'fr' ? 'Navigation principale' : 'Main navigation'} className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? 'page' : undefined}
              className={cn('rounded-md px-3 py-2 text-[14px] transition-colors hover:text-foreground', pathname === n.href ? 'text-foreground' : 'text-muted-foreground')}
            >
              {n.label[lang]}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LocaleToggle variant="compact" />
          <Link href="/login" className="rounded-md px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
            {lang === 'fr' ? 'Connexion' : 'Sign in'}
          </Link>
          <Link href="/essai" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-white transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:shadow-focus">
            {lang === 'fr' ? 'Essayer Centrium' : 'Try Centrium'}
          </Link>
        </div>
        <button
          type="button"
          className="-mr-2 ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          aria-label={open ? (lang === 'fr' ? 'Fermer le menu' : 'Close menu') : lang === 'fr' ? 'Ouvrir le menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div id="site-mobile-nav" className="border-t border-border bg-background px-4 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="border-b border-border py-3 text-[15px]">
                {n.label[lang]}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/essai" className="flex h-11 items-center justify-center rounded-lg bg-primary text-[15px] font-medium text-white">
              {lang === 'fr' ? 'Essayer Centrium' : 'Try Centrium'}
            </Link>
            <Link href="/login" className="flex h-11 items-center justify-center rounded-lg border border-border text-[15px]">
              {lang === 'fr' ? 'Connexion' : 'Sign in'}
            </Link>
            <div className="pt-2">
              <LocaleToggle variant="compact" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
