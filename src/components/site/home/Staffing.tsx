'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { EASE, Kicker, Lead, MaskImage, Section, Title, useReducedMotion, Wide } from '../kit';

const W = 820;
const H = 600;
const WEEKS = ['S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47', 'S48', 'S49', 'S50', 'S51', 'S52'];

type Bar = { from: number; to: number; kind: 'mission' | 'proposed' | 'leave'; label?: string };
const ROWS: Array<{ name: string; role: string; dot: string; bars: Bar[]; highlight?: boolean }> = [
  { name: 'Camille R.', role: 'Lead dev', dot: 'bg-terra', bars: [{ from: 0, to: 3, kind: 'mission', label: 'Nordal' }, { from: 4, to: 12, kind: 'mission', label: 'Nordal · renouvelée' }] },
  { name: 'Inès M.', role: 'Data engineer', dot: 'bg-warning', highlight: true, bars: [{ from: 0, to: 4, kind: 'mission', label: 'Varenne' }, { from: 5, to: 12, kind: 'proposed', label: 'Proposée · Opaline' }] },
  { name: 'Yanis B.', role: 'Data engineer', dot: 'bg-success', bars: [{ from: 1, to: 12, kind: 'proposed', label: 'Proposé · Varenne' }] },
  { name: 'Hugo L.', role: 'DevOps', dot: 'bg-terra', bars: [{ from: 0, to: 12, kind: 'mission', label: 'Helio Retail' }] },
  { name: 'Léa D.', role: 'Product owner', dot: 'bg-sand-400', bars: [{ from: 0, to: 2, kind: 'leave', label: 'Congés' }, { from: 2, to: 12, kind: 'mission', label: 'Varenne' }] },
  { name: 'Thomas G.', role: 'Analytics eng.', dot: 'bg-terra', bars: [{ from: 0, to: 7, kind: 'mission', label: 'Opaline' }] },
];

function Gantt({ still }: { still: boolean }) {
  const left = 190;
  const colW = (W - left - 28) / WEEKS.length;
  return (
    <div className="relative h-full w-full rounded-[28px] bg-white p-6 text-ink-app ring-1 ring-black/[0.05] shadow-[0_40px_80px_-50px_rgba(25,22,20,.45)]">
      <div className="mb-5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.18em] text-terra-deep">
        <span>Staffing · 12 semaines</span>
        <span className="normal-case tracking-normal text-[#827A75]">{EXAMPLE_LABEL}</span>
      </div>
      <div className="relative" style={{ paddingLeft: left - 24 }}>
        <div className="flex text-[11px] font-medium text-[#827A75]">
          {WEEKS.map((w) => (
            <div key={w} style={{ width: colW }} className="text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 top-6 w-px bg-terra" style={{ left: left - 24 + colW * 0.6 }}>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-terra px-2 py-0.5 text-[10px] font-semibold text-white">Aujourd’hui</span>
        </div>
      </div>
      <motion.div className="mt-4 space-y-2.5" initial={still ? undefined : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-10% 0px' }}>
        {ROWS.map((r, ri) => (
          <div key={r.name} className={cn('relative flex h-[58px] items-center rounded-2xl', r.highlight && 'bg-terra-blush/60')}>
            <div className="flex shrink-0 items-center gap-3 pl-3" style={{ width: left - 24 }}>
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-[12px] font-semibold">
                {r.name.slice(0, 1)}
                <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white', r.dot)} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold">{r.name}</div>
                <div className="truncate text-[11.5px] text-[#827A75]">{r.role}</div>
              </div>
            </div>
            <div className="relative h-full flex-1">
              {r.bars.map((b, bi) => (
                <motion.div
                  key={bi}
                  className={cn(
                    'absolute top-[13px] flex h-8 origin-left items-center overflow-hidden whitespace-nowrap rounded-lg px-2.5 text-[11.5px] font-semibold',
                    b.kind === 'mission' && 'bg-terra text-white',
                    b.kind === 'proposed' && 'border border-dashed border-terra bg-white/70 text-terra-deep',
                    b.kind === 'leave' && 'bg-[#E9E1DB] text-[#6F6560]',
                  )}
                  style={{ left: b.from * colW, width: (b.to - b.from) * colW - 4 }}
                  variants={still ? undefined : { hidden: { scaleX: 0, opacity: 0 }, shown: { scaleX: 1, opacity: 1, transition: { duration: 0.8, delay: 0.15 + ri * 0.08 + bi * 0.12, ease: EASE } } }}
                >
                  {b.label}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
      <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 rounded-2xl bg-ink-app px-4 py-3 text-[13px] text-white">
        <Sparkles className="h-4 w-4 text-terra-peach" />
        <span>
          <b className="font-semibold">Inès M.</b> se libère dans 27 jours · 2 opportunités compatibles
        </span>
        <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold">Voir le matching</span>
      </div>
    </div>
  );
}

/** « Les bonnes personnes. Au bon moment. » — la ligne de temps du staffing. */
export function Staffing() {
  const reduce = useReducedMotion();
  return (
    <Section tone="warm" id="staffing" aria-label="Staffing" className="py-24 md:py-36">
      <Wide>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 xl:gap-24">
          <div>
            <div className="lg:sticky lg:top-28">
              <Kicker n="05">Staffing</Kicker>
              <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.4vw,5rem)]" lines={[['Les bonnes'], ['personnes.'], ['Au bon ', { em: 'moment.' }]]} />
              <Lead className="mt-6">Missions, fins de mission, congés et propositions sur une même ligne de temps. Quand un consultant se libère, Centrium cherche les opportunités qui lui correspondent et prévient son référent.</Lead>
            </div>
          </div>
          <div className="space-y-6">
            <div data-cursor="Explorer">
              <ScaleFrame width={W} height={H} label={`Planning de staffing sur douze semaines : missions, propositions et congés de six consultants (${EXAMPLE_LABEL.toLowerCase()}).`}>
                <Gantt key={reduce ? 'still' : 'motion'} still={!!reduce} />
              </ScaleFrame>
            </div>
            <MaskImage src="/photos/concrete-corridor.webp" alt="Couloir de béton baigné de lumière" sizes="(min-width: 1024px) 56vw, 100vw" className="aspect-[16/9] rounded-[28px]" />
          </div>
        </div>
      </Wide>
    </Section>
  );
}
