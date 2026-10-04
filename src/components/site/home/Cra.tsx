'use client';

import { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

import { cn } from '@/lib/utils';

import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';
import { CraScene, SCENE_H, SCENE_W } from './StoryScenes';

const STEPS = [
  { title: 'Saisir', text: 'Le consultant déclare ses jours et son télétravail depuis son portail.' },
  { title: 'Valider', text: 'Vous validez le CRA, ou demandez une correction.' },
  { title: 'Client', text: 'Le client l’approuve depuis son propre portail, s’il y est invité.' },
  { title: 'Préfacturer', text: 'Les jours validés alimentent la préfacture de la mission.' },
];

/** « Le temps. Sans la friction. » — le calendrier se remplit au scroll. */
export function Cra() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] });
  const [fill, setFill] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setFill(Math.min(1, Math.max(0, v * 1.6))));
  const value = reduce ? 1 : fill;
  const step = Math.min(STEPS.length - 1, Math.floor(value * STEPS.length));

  return (
    <Section tone="terra" id="cra" aria-label="CRA" className="py-24 md:py-36">
      <Wide>
        <div ref={ref} className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-20">
          <div>
            <Kicker n="08">CRA</Kicker>
            <Title size="xl" className="mt-6 text-[clamp(2.4rem,6vw,7rem)]" lines={[['Le temps.'], ['Sans la ', { em: 'friction.' }]]} />
            <Lead className="mt-6 text-ivory/85">Un calendrier, un clic pour valider, et les jours passent directement à la préfacturation.</Lead>
            <ol className="mt-12 grid gap-0 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className={cn('border-t border-ivory/25 py-5 pr-6 transition-opacity duration-500', i <= step ? 'opacity-100' : 'opacity-45')}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra-peach">0{i + 1}</span>
                    <h3 className="text-[18px] font-extrabold uppercase tracking-[-0.01em]">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-[1.5] text-ivory/80">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <div data-cursor="Explorer">
            <ScaleFrame width={SCENE_W} height={SCENE_H} label={`Calendrier de CRA de novembre : 18 jours déclarés puis validés (${EXAMPLE_LABEL.toLowerCase()}).`}>
              <CraScene fill={value} />
            </ScaleFrame>
          </div>
        </div>
      </Wide>
    </Section>
  );
}
