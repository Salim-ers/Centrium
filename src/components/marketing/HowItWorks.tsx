'use client';

import { motion } from 'framer-motion';
import type { LandingDict } from '@/lib/i18n/landing';

export function HowItWorks({ t }: { t: LandingDict }) {
  return (
    <section className="relative py-24 border-t border-hairline">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <div className="text-xs font-semibold tracking-widest text-violet-300 mb-3">
            {t.how.kicker}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {t.how.title}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative">
          <div className="hidden md:block absolute top-[38px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-violet-brand/50 to-transparent" />
          {t.how.steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full bg-qc-gradient opacity-20 blur-xl" />
                <div className="relative h-full w-full rounded-full border border-violet-brand/40 bg-card flex items-center justify-center">
                  <span className="font-display text-xl font-bold bg-qc-gradient bg-clip-text text-transparent">
                    {s.n}
                  </span>
                </div>
              </div>
              <h3 className="font-display text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
