'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LandingDict } from '@/lib/i18n/landing';

export function PricingPreview({ t }: { t: LandingDict }) {
  return (
    <section id="pricing" className="relative py-24 border-t border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,116,0.08),transparent_70%)] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="text-xs font-semibold tracking-widest text-magenta mb-3">
            {t.pricing.kicker}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-white/60 leading-relaxed">{t.pricing.subtitle}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.pricing.plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`relative rounded-xl border p-6 flex flex-col ${
                p.popular
                  ? 'border-violet-brand/50 bg-gradient-to-b from-violet-brand/10 to-transparent shadow-glow'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-qc-gradient px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  {p.desc}
                </div>
              )}
              <div className="font-display text-lg font-bold">{p.name}</div>
              {!p.popular && <div className="text-xs text-white/50 mt-0.5">{p.desc}</div>}
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                {!p.isQuote && (
                  <span className="text-sm text-white/50">{t.pricing.monthSuffix}</span>
                )}
              </div>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/80">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-6 w-full ${p.popular ? 'bg-qc-gradient hover:opacity-90' : ''}`}
                variant={p.popular ? 'default' : 'outline'}
              >
                <Link href={p.isQuote ? '#contact' : '/pricing'}>{p.ctaLabel}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button variant="ghost" asChild>
            <Link href="/pricing" className="inline-flex items-center gap-1.5">
              {t.pricing.ctaView}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
