'use client';

/**
 * Drawer de navigation pour mobile / tablette < md (768px).
 *
 * Sur desktop la Sidebar (fixed left, w-64) est toujours visible. Sur
 * petit écran on la cache et on expose un bouton hamburger dans le
 * header qui ouvre le SidebarBody dans un drawer slide-in.
 *
 * - Ouverture : tap sur le hamburger
 * - Fermeture : backdrop, bouton X, ou navigation vers une autre page
 * - Body scroll lock pendant que le drawer est ouvert
 * - Animations Framer Motion (slide depuis la gauche + fade du backdrop)
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarBody } from './Sidebar';
import { useLocale } from '@/lib/i18n/LocaleProvider';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale } = useLocale();
  const isEn = locale === 'en';

  // Ferme le drawer quand la route change (sécurité : si un Link n'a
  // pas appelé son onClick pour une raison X, on rattrape ici).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Empêche le scroll du body quand le drawer est ouvert.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Échap = fermer (raccourci clavier desktop sur iPad clavier).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-white/[0.06] transition"
        aria-label={isEn ? 'Open menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed left-0 top-0 z-50 h-screen w-72 max-w-[85vw] border-r border-hairline bg-card/95 backdrop-blur-xl md:hidden flex flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={isEn ? 'Navigation menu' : 'Menu de navigation'}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 z-20 h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition"
                aria-label={isEn ? 'Close menu' : 'Fermer le menu'}
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarBody onItemClick={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
