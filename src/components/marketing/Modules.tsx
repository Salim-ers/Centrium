'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import type { LandingDict } from '@/lib/i18n/landing';
import {
  ConsultantsMockup,
  CVOptimizerMockup,
  MatchingMockup,
  TimesheetsMockup,
} from './ModuleMockups';

const MOCKUPS = [ConsultantsMockup, CVOptimizerMockup, MatchingMockup, TimesheetsMockup];

export function Modules({ t }: { t: LandingDict }) {
  return (
    <section id="product" className="qc-section-divider relative py-16">
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="text-xs font-semibold tracking-widest text-violet-300 mb-3">
            {t.modules.kicker}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {t.modules.title}
          </h2>
          <p className="mt-4 text-white/60 leading-relaxed">{t.modules.subtitle}</p>
        </motion.div>

        <div id="features" className="mt-20 space-y-24">
          {t.modules.items.map((m, i) => {
            const Mock = MOCKUPS[i];
            const reversed = i % 2 === 1;
            return (
              <motion.div
                key={m.tag}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7 }}
                className={`grid lg:grid-cols-2 gap-10 items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}
              >
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-magenta mb-3">
                    {m.tag}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight">
                    {m.title}
                  </h3>
                  <p className="mt-4 text-white/65 leading-relaxed">{m.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {m.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-white/80">
                        <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-brand/20 border border-violet-brand/40 shrink-0">
                          <Check className="h-2.5 w-2.5 text-violet-300" />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="absolute -inset-6 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.2),transparent_70%)] blur-2xl" />
                  <div className="relative">
                    <Mock />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
