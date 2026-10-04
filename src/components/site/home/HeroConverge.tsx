'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import { DASHBOARD_H, DASHBOARD_W, ProductDashboard } from '../ProductDashboard';
import { ScaleFrame } from '../ScaleFrame';
import { useReducedMotion, Wide } from '../kit';
import { EXAMPLE_LABEL } from '../demo-data';

const NODES = [
  { label: 'Client', value: 'Nordal Assurances' },
  { label: 'Opportunité', value: 'Lead dev · 3 mois' },
  { label: 'Consultant', value: 'Camille R. · 92 %' },
  { label: 'Mission', value: 'Démarrage le 4 nov.' },
  { label: 'CRA', value: '18 jours validés' },
  { label: 'Marge', value: '34 %' },
];

/**
 * Les six briques du métier, reliées par la ligne terracotta, convergent
 * vers le cockpit : les courbes se tracent et le tableau de bord se pose
 * au fil du scroll.
 */
export function HeroConverge() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 92%', 'center 45%'] });
  const draw = useTransform(scrollYProgress, [0, 0.55], [0.08, 1]);
  const dot = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);
  const scale = useTransform(scrollYProgress, [0.15, 1], [0.9, 1]);
  const rotate = useTransform(scrollYProgress, [0.15, 1], [10, 0]);
  const lift = useTransform(scrollYProgress, [0.15, 1], [60, 0]);

  return (
    <div ref={ref} className="relative pb-20 md:pb-28">
      <Wide>
        <ol className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
          <span aria-hidden className="absolute left-[8.33%] right-[8.33%] top-1/2 hidden h-px bg-terra/30 lg:block" />
          {NODES.map((n, i) => (
            <li key={n.label} className="hero-fade relative" style={{ ['--d' as string]: `${420 + i * 70}ms` }}>
              <div className="relative rounded-2xl border border-line bg-warm/90 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-terra-deep">
                  <span className="h-1.5 w-1.5 rounded-full bg-terra" aria-hidden />
                  {n.label}
                </div>
                <div className="mt-1 truncate text-[14px] font-semibold text-ink">{n.value}</div>
              </div>
            </li>
          ))}
        </ol>
      </Wide>

      {/* Courbes de convergence (écrans larges) */}
      <Wide className="relative hidden lg:block">
        <svg key={reduce ? 'still' : 'motion'} viewBox="0 0 600 120" preserveAspectRatio="none" className="h-[16vh] max-h-[180px] w-full" aria-hidden>
          {NODES.map((_, i) => {
            const x = 50 + i * 100;
            return (
              <motion.path
                key={i}
                d={`M${x},0 C${x},70 300,50 300,120`}
                fill="none"
                stroke="#C65F46"
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
                style={reduce ? undefined : { pathLength: draw }}
              />
            );
          })}
        </svg>
        {/* Point de convergence (HTML : le SVG est étiré, un cercle s'y déformerait). */}
        <motion.span key={reduce ? 'still' : 'motion'} aria-hidden className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-terra ring-4 ring-ivory" style={reduce ? undefined : { opacity: dot }} />
      </Wide>

      <Wide className="relative mt-8 lg:mt-0">
        <div id="produit" className="mx-auto max-w-[1280px] scroll-mt-24 [perspective:1600px]">
          <motion.div key={reduce ? 'still' : 'motion'} style={reduce ? undefined : { scale, rotateX: rotate, y: lift }} className="origin-top" data-cursor="Explorer">
            <ScaleFrame width={DASHBOARD_W} height={DASHBOARD_H} label={`Tableau de bord Centrium : CA signé, marge, éléments à traiter, activité, staffing, pipeline et meilleurs clients (${EXAMPLE_LABEL.toLowerCase()}).`}>
              <ProductDashboard />
            </ScaleFrame>
          </motion.div>
          <p className="mt-4 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL} · sociétés et personnes fictives</p>
        </div>
      </Wide>
    </div>
  );
}
