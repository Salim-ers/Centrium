'use client';

import { motion } from 'framer-motion';
import type { LandingDict } from '@/lib/i18n/landing';

/**
 * "Pillars" repensé en cards glassmorphic plus chic, moins "data dense".
 * Chaque card a un numéro éditorial fin en haut à gauche, un titre
 * display medium, et une description courte. Hover : lift + glow bordure.
 */
export function Pillars({ t }: { t: LandingDict }) {
  return (
    <section className="qc-section-divider relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="text-[11px] font-semibold tracking-[0.25em] text-magenta mb-3">
            L’ARCHITECTURE
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-[-0.02em] text-white">
            {t.pillars.title}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.pillars.items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="qc-luminous-static group relative rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.045] backdrop-blur-md p-7"
            >
              <div className="text-[10px] font-mono text-white/30 mb-5">
                0{i + 1}
              </div>
              <div className="font-display text-xl md:text-2xl font-medium text-white tracking-tight mb-2">
                {it.title}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-magenta/80 mb-3">
                {it.label}
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed">{it.desc}</p>

              <div
                aria-hidden
                className="absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-magenta/40 to-transparent opacity-0 group-hover:opacity-100 transition"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
