'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { EASE } from './kit';

// useLayoutEffect sans avertissement au rendu serveur.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const NAMES: Record<string, string> = {
  '/': 'Centrium',
  '/plateforme': 'Plateforme',
  '/solutions': 'Solutions',
  '/tarifs': 'Tarifs',
  '/securite': 'Sécurité',
  '/demo': 'Démo',
};

// Vrai seulement après le premier rendu côté client : le premier
// chargement est couvert par l'intro, seules les navigations internes
// affichent le panneau.
let hasMounted = false;

/**
 * Transition entre pages : un panneau terracotta portant le nom de la page
 * se retire vers le haut (≈ 700 ms). Monté par `(site)/template.tsx`, qui
 * est recréé à chaque navigation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [panel, setPanel] = useState(() => hasMounted);

  useIsoLayoutEffect(() => {
    // Les titres révélés en CSS (`.hero-line`, `.hero-fade`) attendent que
    // le panneau se retire.
    if (panel && !reduce) document.documentElement.style.setProperty('--intro-delay', '0.45s');
    // Une seule fois, au montage de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hasMounted = true;
  }, []);

  return (
    <>
      {panel && !reduce && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[80] flex items-end bg-terra-deep px-5 pb-10 text-ivory sm:px-8 lg:px-12 2xl:px-16"
          initial={{ y: '0%' }}
          animate={{ y: '-100%' }}
          transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
          onAnimationComplete={() => setPanel(false)}
        >
          <motion.span
            className="text-[clamp(3rem,12vw,12rem)] font-extrabold uppercase leading-[0.85] tracking-[-0.06em]"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          >
            {NAMES[pathname] ?? 'Centrium'}
          </motion.span>
        </motion.div>
      )}
      {children}
    </>
  );
}
