'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * Item FAQ animé — remplace les <details> HTML natifs qui ne savent pas
 * animer leur hauteur. Composant React contrôlé qui :
 *
 *   - garde l'accessibilité (aria-expanded, role button, focus visible)
 *   - anime la hauteur via framer-motion height auto (cubic-bezier premium)
 *   - rotate l'icône + (Plus → X) avec spring physique
 *   - applique .qc-luminous-static (border-gradient pan + glow rose/violet
 *     au hover qui bascule vers violet à l'ouverture)
 *   - lift +translateY au hover
 */
type Props = { q: string; a: string };

export function FaqItem({ q, a }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`qc-luminous-static group rounded-xl border border-border bg-card hover:bg-muted overflow-hidden transition-colors ${
        open ? 'bg-muted border-primary/30' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
      >
        <span className="font-medium text-foreground text-[15px] sm:text-base">
          {q}
        </span>
        <motion.span
          aria-hidden
          animate={{
            rotate: open ? 45 : 0,
            backgroundColor: open ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.10)',
            borderColor: open ? 'rgba(236,72,153,0.7)' : 'rgba(236,72,153,0.35)',
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full border text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, ease: 'easeOut' },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
