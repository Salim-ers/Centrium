'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';

import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { useIsMobile } from '@/hooks/useIsMobile';

import { Kicker, Section, Title, useReducedMotion, Wide } from '../kit';

// Les morceaux d'une ESN pilotée à la main (aucune marque citée), placés
// autour du centre. Positions en % de la scène : écrans larges, puis
// mobiles (resserrées pour ne jamais déborder).
const PIECES = [
  { label: 'Le pipeline dans un CRM', x: 18, y: 16, mx: 38, my: 6 },
  { label: 'Le staffing dans un tableur', x: 80, y: 14, mx: 60, my: 22 },
  { label: 'Les CV dans un drive', x: 10, y: 52, mx: 40, my: 38 },
  { label: 'Les CRA par email', x: 88, y: 50, mx: 62, my: 62 },
  { label: 'Les marges dans un fichier', x: 22, y: 86, mx: 40, my: 78 },
  { label: 'Le reporting du lundi', x: 76, y: 88, mx: 60, my: 94 },
];

function Piece({ label, x, y, p }: { label: string; x: number; y: number; p: MotionValue<number> }) {
  const left = useTransform(p, [0.12, 0.5], [`${x}%`, '50%']);
  const top = useTransform(p, [0.12, 0.5], [`${y}%`, '50%']);
  const scale = useTransform(p, [0.12, 0.5], [1, 0.55]);
  const opacity = useTransform(p, [0.44, 0.54], [1, 0]);
  return (
    <motion.span
      style={{ left, top, scale, opacity, x: '-50%', y: '-50%' }}
      className="absolute whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-[0_14px_30px_-18px_rgba(25,22,20,.35)] sm:px-5 sm:py-2.5 sm:text-[15px]"
    >
      {label}
    </motion.span>
  );
}

/**
 * Manifeste : les morceaux d'une ESN pilotée à la main (pipeline, staffing,
 * CV, CRA, marges, reporting) convergent au scroll vers Centrium.
 */
export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const coreOpacity = useTransform(p, [0.46, 0.58], [0, 1]);
  const coreScale = useTransform(p, [0.46, 0.62], [0.6, 1]);
  // L'onde ne naît qu'à l'arrivée du logo (pas de cercle vide avant).
  const ring = useTransform(p, [0.5, 0.75], [0.6, 1.6]);
  const ringOpacity = useTransform(p, [0.48, 0.52, 0.75], [0, 0.7, 0]);
  const outro = useTransform(p, [0.6, 0.74], [0, 1]);
  const outroY = useTransform(p, [0.6, 0.74], [40, 0]);

  if (reduce) {
    return (
      <Section tone="dune" aria-label="Manifeste" className="py-28 md:py-40">
        <Wide>
          <div ref={ref} />
          <Kicker>Manifeste</Kicker>
          <Title size="lg" className="mt-8 max-w-[16ch]" lines={[['Une ESN ne devrait pas se piloter ', { em: 'en morceaux.' }]]} />
          <ul className="mt-12 flex flex-wrap gap-3">
            {PIECES.map((t) => (
              <li key={t.label} className="rounded-full border border-line bg-white px-4 py-2 text-[14px] font-semibold text-ink/60 line-through decoration-terra">
                {t.label}
              </li>
            ))}
          </ul>
          <p className="mt-16 text-[clamp(2.2rem,5vw,5.6rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.045em]">
            Tout, <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra">au même endroit.</em>
          </p>
        </Wide>
      </Section>
    );
  }

  return (
    <Section tone="dune" aria-label="Manifeste">
      <div ref={ref} className="relative h-[280vh]">
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-10 pt-24 md:pt-28">
          <Wide>
            <Kicker className="text-terra-deep">Manifeste</Kicker>
            <Title
              size="md"
              className="mt-6 max-w-[22ch] text-[clamp(1.9rem,4vw,4.4rem)]"
              lines={[['Une ESN ne'], ['devrait pas se'], ['piloter ', { em: 'en morceaux.' }]]}
            />
          </Wide>

          <div className="relative mx-auto my-6 w-full max-w-[1280px] flex-1 px-5">
            {PIECES.map((t) => (
              <Piece key={`${t.label}-${mobile}`} label={t.label} x={mobile ? t.mx : t.x} y={mobile ? t.my : t.y} p={p} />
            ))}
            <motion.div
              style={{ opacity: coreOpacity, scale: coreScale, x: '-50%', y: '-50%' }}
              className="absolute left-1/2 top-1/2 flex items-center gap-3 rounded-full bg-white py-3 pl-3 pr-6 text-ink shadow-[0_30px_60px_-28px_rgba(120,50,35,.45)] ring-1 ring-terra/10"
            >
              <span className="flex items-center gap-3 text-[#A84B37]">
                <CentriumLogo className="h-10 w-10" color="currentColor" />
                <CentriumType className="h-[15px]" />
              </span>
            </motion.div>
            <motion.span aria-hidden style={{ scale: ring, opacity: ringOpacity, x: '-50%', y: '-50%' }} className="absolute left-1/2 top-1/2 h-40 w-40 rounded-full border border-terra/50" />
          </div>

          <Wide>
            <motion.p
              style={{ opacity: outro, y: outroY }}
              className="text-right text-[clamp(2.2rem,5.6vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em] text-ink"
            >
              Tout, <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra">au même endroit.</em>
            </motion.p>
          </Wide>
        </div>
      </div>
    </Section>
  );
}
