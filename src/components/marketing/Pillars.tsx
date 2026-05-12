'use client';

import { motion } from 'framer-motion';
import type { LandingDict } from '@/lib/i18n/landing';

const GRADIENTS = [
  'from-magenta to-violet-brand',
  'from-violet-brand to-violet-glow',
  'from-violet-glow to-cyan-400',
  'from-cyan-400 to-emerald-400',
];

export function Pillars({ t }: { t: LandingDict }) {
  return (
    <section className="relative py-16 border-t border-hairline">
      <div className="max-w-7xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center text-sm text-white/50 uppercase tracking-widest mb-10"
        >
          {t.pillars.title}
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {t.pillars.items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative"
            >
              <div className={`text-3xl md:text-4xl font-display font-bold bg-gradient-to-r ${GRADIENTS[i]} bg-clip-text text-transparent`}>
                {it.title}
              </div>
              <div className="mt-2 text-[10px] font-semibold tracking-widest text-white/40">
                {it.label}
              </div>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
