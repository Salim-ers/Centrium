'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { SidebarBody } from './Sidebar';

/**
 * Navigation mobile / tablette (< 768 px) : la sidebar s'ouvre dans un
 * tiroir latéral. Focus piégé, Échap et tap extérieur ferment le tiroir.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale } = useLocale();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label={locale === 'en' ? 'Open navigation' : 'Ouvrir la navigation'}
        aria-expanded={open}
      >
        <Menu />
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="left" className="w-[260px] bg-app-dock p-0" hideClose>
          <DrawerTitle className="sr-only">{locale === 'en' ? 'Navigation' : 'Navigation'}</DrawerTitle>
          <SidebarBody onItemClick={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
