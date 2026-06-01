'use client';

import { motion } from 'framer-motion';
import { Users, Sparkles, Search, FileSignature } from 'lucide-react';

import type { LandingDict } from '@/lib/i18n/landing';

/**
 * Pillars — 4 modules métier de Centrium présentés en cards premium :
 *
 *   1. Consultants  · Users  · "+87 actifs"     (emerald)
 *   2. CV IA        · Sparkles · "0 invention"  (magenta)
 *   3. Matching     · Search · "score 92 %"     (violet)
 *   4. CRA & Facture · FileSignature · "auto"   (cyan)
 *
 * Au hover : la carte SE REMPLIT d'un gradient rose/violet/cyan profond
 * façon "card premium qui s'illumine de l'intérieur" :
 *   - background passe de white/[0.02] à un dégradé conique sombre→rose→violet
 *   - 2 halos radial rose + violet qui apparaissent dans les coins
 *   - bordure s'illumine en magenta + ombre interne glow
 *   - icône scale 1.1 + couleur intensifiée
 *   - texte s'éclaire (white/55 → white/85)
 *   - flèche ArrowUpRight apparaît en haut à droite
 */

const META = [
  {
    icon: Users,
    metric: '+87 actifs',
    metricColor: 'text-emerald-300',
    metricGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.7)]',
  },
  {
    icon: Sparkles,
    metric: '0 invention',
    metricColor: 'text-magenta',
    metricGlow: 'shadow-[0_0_8px_rgba(236,72,153,0.7)]',
  },
  {
    icon: Search,
    metric: 'score 92 %',
    metricColor: 'text-violet-300',
    metricGlow: 'shadow-[0_0_8px_rgba(168,85,247,0.7)]',
  },
  {
    icon: FileSignature,
    metric: 'auto · 1 clic',
    metricColor: 'text-cyan-300',
    metricGlow: 'shadow-[0_0_8px_rgba(34,211,238,0.7)]',
  },
];

export function Pillars({ t }: { t: LandingDict }) {
  return (
    <section className="qc-section-divider relative py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
          {t.pillars.items.map((it, i) => {
            const M = META[i];
            const Icon = M.icon;
            return (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.55,
                  delay: i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-7 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-magenta/40 hover:shadow-[0_30px_60px_-30px_rgba(225,29,116,0.5),0_0_0_1px_rgba(236,72,153,0.25)] cursor-default select-none"
              >
                {/* === COUCHE 1 : Gradient REMPLISSAGE au hover === */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                >
                  {/* Base gradient diagonal */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/35 via-magenta/25 to-violet-500/35" />
                  {/* Aurora radial dans 2 coins opposés */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(236,72,153,0.45), transparent 55%), radial-gradient(ellipse 70% 60% at 80% 90%, rgba(168,85,247,0.45), transparent 55%)',
                    }}
                  />
                  {/* Inner glow border */}
                  <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(236,72,153,0.25),inset_0_0_30px_rgba(168,85,247,0.2)]" />
                </div>

                {/* === COUCHE 2 : Sweep diagonal au hover === */}
                <div
                  aria-hidden
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                >
                  <div className="absolute top-0 -left-1/2 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-0 group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
                </div>

                {/* === CONTENU === */}
                <div className="relative z-10">
                  {/* Numéro */}
                  <div className="text-[10px] font-mono text-white/40 group-hover:text-white/70 transition mb-5">
                    0{i + 1}
                  </div>

                  {/* Icône */}
                  <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/15 bg-white/[0.04] backdrop-blur mb-5 transition-all duration-500 group-hover:scale-110 group-hover:border-white/50 group-hover:bg-white/15 group-hover:rotate-3">
                    <Icon className="h-5 w-5 text-magenta group-hover:text-white transition-colors duration-500" />
                  </div>

                  {/* Titre */}
                  <div className="font-display text-xl md:text-2xl font-medium text-white tracking-tight mb-2 group-hover:text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    {it.title}
                  </div>

                  {/* Tag label */}
                  <div className="text-[10px] uppercase tracking-[0.2em] text-magenta/80 group-hover:text-white/85 transition mb-3">
                    {it.label}
                  </div>

                  {/* Description */}
                  <p className="text-[13px] text-white/55 leading-relaxed mb-5 group-hover:text-white/90 transition-colors duration-500">
                    {it.desc}
                  </p>

                  {/* Pill métrique */}
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/15 bg-black/30 backdrop-blur text-[10px] font-mono">
                    <span
                      className={`h-1.5 w-1.5 rounded-full bg-current animate-pulse ${M.metricColor} ${M.metricGlow}`}
                    />
                    <span className={`${M.metricColor} group-hover:text-white transition`}>
                      {M.metric}
                    </span>
                  </div>
                </div>

                {/* Ligne dégradée animée au bas (vestige du divider) */}
                <div
                  aria-hidden
                  className="absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-magenta/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
