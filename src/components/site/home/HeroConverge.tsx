'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

import { Sparkline } from '@/components/bento/charts';

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

  // Inclinaison 3D qui suit la souris (amortie, sans rebond).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 22 });
  const sy = useSpring(my, { stiffness: 110, damping: 22 });
  const tiltY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const tiltX = useTransform([rotate, sy], ([r, y]: number[]) => r + y * -6);
  const chipA = useTransform(sx, [-0.5, 0.5], [-18, 18]);
  const chipB = useTransform(sy, [-0.5, 0.5], [-14, 14]);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

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
        <svg key={reduce ? 'curves-still' : 'curves-motion'} viewBox="0 0 600 120" preserveAspectRatio="none" className="h-[16vh] max-h-[180px] w-full" aria-hidden>
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
        <motion.span key={reduce ? 'dot-still' : 'dot-motion'} aria-hidden className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-terra ring-4 ring-ivory" style={reduce ? undefined : { opacity: dot }} />
      </Wide>

      <Wide className="relative mt-8 lg:mt-0">
        <div id="produit" className="mx-auto max-w-[1280px] scroll-mt-24 [perspective:1800px]" onPointerMove={reduce ? undefined : onMove} onPointerLeave={reduce ? undefined : onLeave}>
          <motion.div
            key={reduce ? 'still' : 'motion'}
            style={reduce ? undefined : { scale, rotateX: tiltX, rotateY: tiltY, y: lift, transformStyle: 'preserve-3d' }}
            className="relative origin-top"
            data-cursor="Explorer"
          >
            <ScaleFrame width={DASHBOARD_W} height={DASHBOARD_H} label={`Tableau de bord Centrium : indicateurs, mission, activité et marge, pipeline, échéances, montant à préfacturer (${EXAMPLE_LABEL.toLowerCase()}).`}>
              <ProductDashboard />
            </ScaleFrame>

            {/* Cartes flottantes, en avant du tableau de bord */}
            <motion.div aria-hidden style={reduce ? undefined : { x: chipA, y: chipB, z: 70 }} className="absolute -top-12 left-[45%] hidden w-[210px] rounded-2xl bg-white/85 p-3.5 shadow-[0_24px_50px_-20px_rgba(113,52,40,0.45)] ring-1 ring-black/[0.05] backdrop-blur-xl md:block">
              <div className="flex items-center justify-between text-[11.5px] font-medium text-taupe">
                Marge moyenne
                <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-success">+2,1 %</span>
              </div>
              <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">31,8 %</div>
              <Sparkline values={[27, 28, 27.5, 29, 29.6, 30.1, 29.8, 30.6, 31, 31.8]} className="mt-1 h-8" color="#C65F46" />
            </motion.div>
            <motion.div aria-hidden style={reduce ? undefined : { x: chipB, y: chipA, z: 110 }} className="absolute -right-3 top-[46%] hidden items-center gap-3 rounded-2xl bg-white/90 py-3 pl-3 pr-4 shadow-[0_24px_50px_-20px_rgba(25,22,20,0.4)] ring-1 ring-black/[0.05] backdrop-blur-xl md:flex xl:-right-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">CRA validé</span>
                <span className="block text-[11.5px] text-taupe">Camille R. · 18 jours</span>
              </span>
            </motion.div>
            <motion.div aria-hidden style={reduce ? undefined : { x: chipA, y: chipB, z: 90 }} className="absolute -bottom-5 left-[18%] hidden items-center gap-2.5 rounded-full bg-ink py-2 pl-2 pr-4 text-ivory shadow-[0_24px_50px_-18px_rgba(25,22,20,0.65)] md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-terra">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[12.5px] font-semibold">Matching · Yanis B.</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[12px] font-bold tabular-nums">92 %</span>
            </motion.div>
          </motion.div>
          <p className="mt-4 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-taupe md:mt-14">{EXAMPLE_LABEL} · sociétés et personnes fictives</p>
        </div>
      </Wide>
    </div>
  );
}
