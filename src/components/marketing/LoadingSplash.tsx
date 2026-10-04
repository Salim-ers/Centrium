'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';

type Props = {
  /** Durée minimum d'affichage en ms (par défaut 1500) */
  minDuration?: number;
  /** Label affiché sous la barre */
  label?: string;
};

export function LoadingSplash({ minDuration = 1500, label = 'CHARGEMENT' }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const start = Date.now();

    const finish = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDuration - elapsed);
      window.setTimeout(() => setVisible(false), remaining);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    return () => window.removeEventListener('load', finish);
  }, [minDuration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[999] bg-background flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,116,0.18),transparent_60%)]" />

          <div className="relative flex flex-col items-center gap-8">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative"
            >
              <div className="absolute inset-[-40%] rounded-[2rem] bg-[radial-gradient(circle,rgba(225,29,116,0.55),rgba(139,92,246,0.3),transparent_70%)] blur-2xl animate-pulse" />
              <div className="relative rounded-2xl bg-card border border-hairline p-6 shadow-[0_0_80px_rgba(225,29,116,0.35)] overflow-hidden">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(225,29,116,0.18),transparent_70%)]" />
                <CentriumWordmark size="lg" orientation="vertical" />
              </div>
            </motion.div>

            <div className="w-64 space-y-3">
              <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
                />
              </div>
              <div className="text-center text-[11px] tracking-[0.3em] font-semibold text-muted-foreground">
                {label}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
