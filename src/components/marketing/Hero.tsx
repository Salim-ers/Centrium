'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { VideoHero } from './VideoHero';
import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import type { LandingDict } from '@/lib/i18n/landing';

export function Hero({ t }: { t: LandingDict }) {
  return (
    <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(225,29,116,0.22),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(225,29,116,0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_right,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex"
          >
            <CentriumWordmark size="xl" orientation="horizontal" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-8 font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight"
          >
            {t.hero.title1}
            <br />
            <span className="bg-qc-gradient bg-clip-text text-transparent">
              {t.hero.titleGradient}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <Button size="lg" asChild className="bg-qc-gradient hover:opacity-90 shadow-glow">
              <Link href="/devis" className="inline-flex items-center gap-2">
                {t.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/15 bg-white/5 hover:bg-white/10">
              <a href="#product">{t.hero.ctaSecondary}</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-5 text-xs text-violet-300/80 inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            {t.hero.trial}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          <VideoHero />
        </motion.div>
      </div>
    </section>
  );
}
