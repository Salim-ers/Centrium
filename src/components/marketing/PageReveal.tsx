'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Transition d'entrée de page.
 *
 *   1. Sweep overlay rose magenta + violet qui traverse l'écran de
 *      droite à gauche (effet cinéma, indépendant du contenu)
 *   2. Contenu : fade rapide opacity 0 → 1 sur 200ms — quasi-instantané
 *      pour ne pas faire attendre l'utilisateur. Pas de blur ni scale
 *      qui retardaient la lisibilité.
 *
 * Le sweep continue de donner l'effet de transition cinéma pendant
 * que le contenu est déjà lisible derrière. Respecte
 * prefers-reduced-motion.
 */
export function PageReveal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [sweepKey, setSweepKey] = useState(0);

  useEffect(() => {
    setSweepKey((k) => k + 1);
  }, [pathname]);

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <>
      <SweepOverlay key={`sweep-${sweepKey}`} />

      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </>
  );
}

/**
 * Overlay sweep — un grand panneau gradient rose magenta qui traverse
 * l'écran de droite à gauche. Indépendant du contenu, donne l'effet
 * "rideau" sans bloquer la lecture.
 */
function SweepOverlay() {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
        background:
          'linear-gradient(105deg, transparent 0%, transparent 25%, rgba(236,72,153,0.55) 45%, rgba(168,85,247,0.4) 55%, transparent 75%, transparent 100%)',
        backgroundSize: '300% 100%',
      }}
      initial={{ backgroundPosition: '100% 0%', opacity: 0 }}
      animate={{
        backgroundPosition: ['100% 0%', '-50% 0%'],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 0.7,
        ease: [0.65, 0, 0.35, 1],
        times: [0, 0.15, 0.7, 1],
      }}
    />
  );
}
