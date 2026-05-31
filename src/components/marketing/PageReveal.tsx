'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Transition d'entrée de page cinématographique.
 *
 * Au mount d'une nouvelle page :
 *   1. Sweep overlay rose magenta qui traverse l'écran de gauche à droite
 *      (durée 700 ms, opacity 0 → 0.85 → 0)
 *   2. Contenu : opacity 0 → 1, scale 0.985 → 1, blur 6px → 0
 *      avec ease-out cubic, durée 900 ms
 *
 * Re-déclenché à chaque changement de pathname → vrai effet de page
 * transition entre /, /plateforme, /manifesto, /security, /pricing, /devis.
 *
 * Respecte prefers-reduced-motion (animations remplacées par fade simple).
 */
export function PageReveal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  // Force re-mount à chaque changement de path en utilisant pathname comme key
  const [sweepKey, setSweepKey] = useState(0);

  useEffect(() => {
    setSweepKey((k) => k + 1);
  }, [pathname]);

  if (reduced) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    );
  }

  return (
    <>
      {/* Sweep overlay rose : passe sur l'écran à chaque changement de page */}
      <SweepOverlay key={`sweep-${sweepKey}`} />

      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.6 },
          filter: { duration: 0.7 },
        }}
        style={{ transformOrigin: '50% 30%' }}
      >
        {children}
      </motion.div>
    </>
  );
}

/**
 * Overlay sweep — un grand panneau gradient rose magenta qui traverse
 * l'écran de gauche à droite, type "rideau" de transition cinéma.
 * Monté en position fixed pleine fenêtre, au-dessus de tout.
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
        duration: 0.85,
        ease: [0.65, 0, 0.35, 1],
        times: [0, 0.15, 0.7, 1],
      }}
    />
  );
}
