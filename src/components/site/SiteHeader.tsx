'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { cn } from '@/lib/utils';

import { MobileMenu } from './MobileMenu';

export const SITE_NAV = [
  { href: '/plateforme', label: 'Produit' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/plateforme#modules', label: 'Fonctionnalités' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/securite', label: 'Sécurité' },
] as const;

/**
 * En-tête fin du site. Transparent sur le hero, ivoire translucide au
 * scroll ; la couleur du texte suit la section qui passe dessous
 * (attribut `data-nav` des sections : `light` = texte clair). Se masque en
 * descendant, réapparaît en remontant.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 480 && y > last + 2);
      if (y < last - 2 || y < 480) setHidden(false);
      last = y;
      const header = ref.current;
      const h = header?.offsetHeight ?? 64;
      const under = document.elementsFromPoint(window.innerWidth / 2, h / 2).find((el) => !header?.contains(el));
      const section = under?.closest<HTMLElement>('[data-nav]');
      setLight(section?.dataset.nav === 'light');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <header
        ref={ref}
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,color] duration-500 ease-out-soft',
          hidden && !open ? '-translate-y-full' : 'translate-y-0',
          light ? 'text-ivory' : 'text-ink',
          scrolled && !open
            ? light
              ? 'border-b border-ivory/10 bg-ink/10 backdrop-blur-md'
              : 'border-b border-ink/[0.06] bg-ivory/80 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center gap-8 px-5 sm:px-8 lg:px-12 2xl:px-16">
          <Link href="/" aria-label="Centrium — accueil" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra" data-cursor="Ouvrir">
            <CentriumLogo className="h-7 w-7" />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">Centrium</span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {SITE_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className={cn('relative rounded-md px-3.5 py-2 text-[14px] font-medium transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra', isActive(n.href) ? 'opacity-100' : 'opacity-70')}
              >
                {n.label}
                {isActive(n.href) && <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-current" aria-hidden />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link href="/login" className="rounded-md px-3 py-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra">
              Se connecter
            </Link>
            <Link
              href="/demo"
              data-cursor="Ouvrir"
              className={cn(
                'inline-flex h-10 items-center rounded-full px-5 text-[12.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2',
                light ? 'bg-ivory text-ink hover:bg-white' : 'bg-terra text-white hover:bg-terra-deep',
              )}
            >
              Demander une démo
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="-mr-2 ml-auto inline-flex h-11 items-center gap-3 rounded-full px-3 text-[12px] font-semibold uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra lg:hidden"
          >
            Menu
            <span className="flex w-5 flex-col gap-[5px]" aria-hidden>
              <span className="h-[1.5px] w-full bg-current" />
              <span className="h-[1.5px] w-3/4 self-end bg-current" />
            </span>
          </button>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
