'use client';

import { motion } from 'framer-motion';

import { ActivityTile } from '@/components/bento/widgets';
import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL, SERIES, eurK } from '../demo-data';
import { Appear, Counter, EASE, Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';

const OCCUPATION = [81, 84, 86, 83, 88, 90, 89, 85, 87, 91, 88, 87];
const BY_CONSULTANT = [
  { n: 'Camille R.', v: 100 },
  { n: 'Hugo L.', v: 86 },
  { n: 'Inès M.', v: 79 },
  { n: 'Thomas G.', v: 64 },
  { n: 'Léa D.', v: 58 },
];
const LOSS = [
  { r: 'Prix', c: 4 },
  { r: 'Délai de démarrage', c: 3 },
  { r: 'Profil retenu ailleurs', c: 2 },
];

const tile = 'rounded-[24px] bg-white p-6 text-ink-app ring-1 ring-ink/[0.06]';

/** « Les chiffres qui comptent. » — les analyses réellement disponibles. */
export function Analytics() {
  const reduce = useReducedMotion();
  return (
    <Section tone="warm" id="analytics" aria-label="Analytics" className="py-24 md:py-36">
      <Wide>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Kicker n="12">Analytics</Kicker>
            <Title size="lg" className="mt-6 text-[clamp(2.1rem,5vw,5.6rem)]" lines={[['Les chiffres'], ['qui ', { em: 'comptent.' }]]} />
          </div>
          <Lead className="lg:justify-self-end">Occupation, transformation, CA par consultant, motifs de perte, ponctualité des CRA : calculés à partir de vos CRA validés, de vos opportunités et de vos devis.</Lead>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          <Appear className="lg:col-span-8">
            <ActivityTile title="Activité & marge · 12 mois" series={SERIES} format={eurK} labels={{ revenue: 'CA', margin: 'Marge', forecast: 'Prévision' }} tone="white" height={240} className="h-full" />
          </Appear>
          <Appear className={cn(tile, 'flex flex-col bg-terra-deep text-white ring-0 lg:col-span-4')} delay={0.05}>
            <div className="text-[13px] font-medium text-white/70">Taux de transformation</div>
            <div className="mt-auto pt-10 text-[clamp(3.5rem,7vw,6rem)] font-extrabold leading-none tracking-[-0.05em]">
              <Counter value={38} suffix=" %" />
            </div>
            <div className="mt-3 text-[13px] text-white/70">12 opportunités gagnées sur 32 décidées</div>
          </Appear>

          <Appear className={cn(tile, 'lg:col-span-5')}>
            <div className="text-[13px] font-medium text-[#827A75]">Occupation des consultants</div>
            <motion.div key={reduce ? 'still' : 'motion'} className="mt-6 flex h-[150px] items-end gap-1.5" initial={reduce ? undefined : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-10% 0px' }}>
              {OCCUPATION.map((v, i) => (
                <motion.span
                  key={i}
                  className={cn('flex-1 origin-bottom rounded-t-md', i === OCCUPATION.length - 1 ? 'bg-terra' : 'bg-terra-soft')}
                  style={{ height: `${v}%` }}
                  variants={reduce ? undefined : { hidden: { scaleY: 0 }, shown: { scaleY: 1, transition: { duration: 0.7, delay: i * 0.04, ease: EASE } } }}
                />
              ))}
            </motion.div>
            <div className="mt-3 flex justify-between text-[12px] text-[#827A75]">
              <span>Il y a 12 mois</span>
              <span className="font-semibold text-ink-app">87 % ce mois-ci</span>
            </div>
          </Appear>

          <Appear className={cn(tile, 'lg:col-span-4')} delay={0.05}>
            <div className="text-[13px] font-medium text-[#827A75]">CA par consultant · CRA validés × TJM</div>
            <motion.ul key={reduce ? 'still' : 'motion'} className="mt-5 space-y-3" initial={reduce ? undefined : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-10% 0px' }}>
              {BY_CONSULTANT.map((c, i) => (
                <li key={c.n} className="grid grid-cols-[90px_1fr] items-center gap-3 text-[13px]">
                  <span className="truncate font-medium">{c.n}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                    <motion.span
                      className="block h-full origin-left rounded-full bg-ink-app"
                      style={{ width: `${c.v}%` }}
                      variants={reduce ? undefined : { hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: 0.8, delay: i * 0.07, ease: EASE } } }}
                    />
                  </span>
                </li>
              ))}
            </motion.ul>
          </Appear>

          <Appear className={cn(tile, 'bg-terra-blush ring-0 lg:col-span-3')} delay={0.1}>
            <div className="text-[13px] font-medium text-[#8a5b4e]">Motifs de perte</div>
            <ul className="mt-5 space-y-3 text-[14px]">
              {LOSS.map((l) => (
                <li key={l.r} className="flex items-center justify-between gap-3">
                  <span>{l.r}</span>
                  <span className="font-semibold tabular-nums text-terra-deep">{l.c}</span>
                </li>
              ))}
            </ul>
          </Appear>
        </div>
        <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
      </Wide>
    </Section>
  );
}
