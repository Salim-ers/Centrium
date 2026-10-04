'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDown, Briefcase } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';

const W = 1100;
const H = 450;
const PAD = 24;
const GAP = 16;
const COL = (W - PAD * 2 - GAP * 3) / 4;
const colX = (i: number) => PAD + i * (COL + GAP);

const COLUMNS = [
  { label: 'Qualification', total: '142 k€', cards: [{ t: 'Opaline Banque', d: 'Architecte cloud · 64 k€' }, { t: 'Varenne Énergie', d: 'Data engineer · 52 k€' }] },
  { label: 'Proposition', total: '118 k€', cards: [{ t: 'Nordal Assurances', d: 'Lead dev Java · 78 k€' }] },
  { label: 'Négociation', total: '96 k€', cards: [{ t: 'Opaline Banque', d: 'Scrum master · 41 k€' }, { t: 'Nordal Assurances', d: 'QA · 33 k€' }] },
  { label: 'Gagné', total: '64 k€', cards: [{ t: 'Varenne Énergie', d: 'PO data · 36 k€' }] },
];

// Le dossier suivi : il marque une pause dans chaque colonne.
const STOPS = [0.08, 0.18, 0.26, 0.36, 0.44, 0.54, 0.6];
const XS = [colX(0), colX(0), colX(1), colX(1), colX(2), colX(2), colX(3)];

function Board({ p, still }: { p: MotionValue<number>; still: boolean }) {
  const x = useTransform(p, STOPS, XS);
  const prob = useTransform(p, (v): string => (v < 0.22 ? '20 %' : v < 0.4 ? '50 %' : v < 0.57 ? '75 %' : 'Gagné'));
  const bg = useTransform(p, [0.54, 0.6], ['#FFFFFF', '#C65F46']);
  const fg = useTransform(p, [0.54, 0.6], ['#191817', '#FFFFFF']);
  const mission = useTransform(p, [0.64, 0.74], [0, 1]);
  const missionY = useTransform(p, [0.64, 0.74], [24, 0]);

  return (
    <div className="relative h-full w-full rounded-[28px] bg-warm p-6 text-ink-app shadow-[0_40px_80px_-50px_rgba(113,52,40,.6)]">
      <div className="mb-4 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.18em] text-terra-deep">
        <span>Pipeline commercial</span>
        <span className="normal-case tracking-normal text-[#827A75]">{EXAMPLE_LABEL}</span>
      </div>
      {COLUMNS.map((c, i) => (
        <div key={c.label} className="absolute top-[64px]" style={{ left: colX(i), width: COL }}>
          <div className="flex items-baseline justify-between px-1 text-[13px]">
            <span className="font-semibold">{c.label}</span>
            <span className="tabular-nums text-[#827A75]">{c.total}</span>
          </div>
          <div className="mt-3 h-[92px] rounded-2xl border border-dashed border-terra/30" />
          <div className="mt-3 space-y-3">
            {c.cards.map((card) => (
              <div key={card.t + card.d} className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
                <div className="text-[14px] font-semibold">{card.t}</div>
                <div className="mt-1 text-[12.5px] text-[#827A75]">{card.d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <motion.div
        className="absolute top-[96px] h-[92px] rounded-2xl p-4 shadow-[0_18px_36px_-18px_rgba(25,22,20,.45)]"
        style={still ? { left: colX(3), width: COL, background: '#C65F46', color: '#FFFFFF' } : { left: 0, x, width: COL, background: bg, color: fg }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">Helio Retail</span>
          <motion.span className="rounded-full bg-black/[0.08] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums">{still ? 'Gagné' : prob}</motion.span>
        </div>
        <div className="mt-1 text-[12.5px] opacity-75">DevOps senior · 78 k€</div>
        <div className="mt-2 text-[11.5px] font-medium opacity-70">Hugo L. proposé</div>
      </motion.div>

      <motion.div className="absolute" style={still ? { left: colX(3), top: 300, width: COL } : { left: colX(3), top: 300, width: COL, opacity: mission, y: missionY }}>
        <div className="mb-2 flex justify-center text-terra">
          <ArrowDown className="h-5 w-5" />
        </div>
        <div className="rounded-2xl bg-ink-app p-4 text-white">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-terra-peach">
            <Briefcase className="h-3.5 w-3.5" /> Mission créée
          </div>
          <div className="mt-2 text-[14px] font-semibold">Helio Retail · DevOps</div>
          <div className="mt-1 text-[12.5px] text-white/65">Hugo L. · démarrage le 4 nov.</div>
        </div>
      </motion.div>
    </div>
  );
}

/** « Du premier contact à la mission. » — l'opportunité traverse le pipeline. */
export function Crm() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const head = (
    <Wide className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
      <div>
        <Kicker n="04">CRM</Kicker>
        <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.4vw,5rem)]" lines={[['Du premier contact'], ['à la ', { em: 'mission.' }]]} />
      </div>
      <Lead className="text-ink/80 lg:justify-self-end">Contacts, sociétés, opportunités et devis au même endroit. Une affaire gagnée devient une mission, sans ressaisie.</Lead>
    </Wide>
  );
  const scene = (
    <Wide className="mt-8 md:mt-12">
      <div className="mx-auto max-w-[1100px]" data-cursor="Explorer">
        <ScaleFrame width={W} height={H} label={`Pipeline commercial : une opportunité Helio Retail passe de la qualification à « Gagné », puis devient une mission (${EXAMPLE_LABEL.toLowerCase()}).`}>
          <Board p={p} still={!!reduce} />
        </ScaleFrame>
      </div>
    </Wide>
  );

  return (
    <Section tone="light" id="crm" aria-label="CRM">
      {reduce ? (
        <div ref={ref} className="py-24 md:py-32">
          {head}
          {scene}
        </div>
      ) : (
        <div ref={ref} className="relative h-[260vh]">
          <div className={cn('sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pb-8 pt-20')}>
            {head}
            {scene}
          </div>
        </div>
      )}
    </Section>
  );
}
