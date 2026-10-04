'use client';

import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import { ScaleFrame } from '../ScaleFrame';
import { EASE, FlowLine, Kicker, Section, Title, useReducedMotion, Wide } from '../kit';
import { useActiveStep } from '../useSteps';
import { CraScene, MarginScene, MissionScene, OpportunityScene, ProspectScene, SCENE_H, SCENE_W } from './StoryScenes';

const STEPS = [
  { title: 'Prospect', text: 'Le contact, sa société, chaque échange : l’historique commercial vit au même endroit que le reste.', Scene: ProspectScene },
  { title: 'Opportunité', text: 'Le besoin est qualifié : montant, probabilité, étape. Le matching propose les consultants compatibles.', Scene: OpportunityScene },
  { title: 'Mission', text: 'Gagnée, l’opportunité devient une mission : consultant, dates, TJM de vente et coût.', Scene: MissionScene },
  { title: 'CRA', text: 'Le consultant déclare ses jours depuis son portail. Vous validez, sans relance par email.', Scene: CraScene },
  { title: 'Marge', text: 'Jours validés, TJM, coût : la marge de chaque mission se lit sans ressaisie, jusqu’à la préfacturation.', Scene: MarginScene },
] as const;

const TITLE = [['Un flux.'], ['Du premier contact'], ['à la ', { em: 'marge.' }]] as const;

/**
 * « Un flux. Du premier contact à la marge. » — récit en cinq étapes.
 * Grand écran : section collante, l'étape suit le scroll. Mobile et
 * mouvement réduit : les étapes s'empilent.
 */
export function FlowStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { active } = useActiveStep(ref, STEPS.length);
  const step = STEPS[active]!;

  return (
    <Section tone="warm" id="flux" aria-label="Du premier contact à la marge">
      {!reduce && (
        <div ref={ref} className="relative hidden lg:block" style={{ height: `${STEPS.length * 85 + 30}vh` }}>
          <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
            <Wide className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-14 xl:gap-24">
              <div>
                <Kicker n="02">Le flux</Kicker>
                <Title size="md" className="mt-6 text-[clamp(2.2rem,3.6vw,4.4rem)]" lines={TITLE.map((l) => [...l])} />
                <div className="mt-12 flex gap-8">
                  <FlowLine orientation="vertical" active={active} className="h-[250px] shrink-0" />
                  <div className="relative min-h-[250px] flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={active} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: EASE }}>
                        <div className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">
                          0{active + 1} / 0{STEPS.length}
                        </div>
                        <h3 className="mt-3 text-[clamp(2rem,3vw,3.2rem)] font-extrabold uppercase leading-none tracking-[-0.04em]">{step.title}</h3>
                        <p className="mt-4 max-w-sm text-[17px] leading-[1.55] text-ink-soft/80">{step.text}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <div className="relative" data-cursor="Explorer">
                <ScaleFrame width={SCENE_W} height={SCENE_H} label={`Étape ${active + 1} sur ${STEPS.length} : ${step.title}. ${step.text}`}>
                  <div className="relative h-full w-full">
                    {STEPS.map(({ title, Scene }, i) => (
                      <div
                        key={title}
                        className={cn('absolute inset-0 transition-[opacity,transform] duration-700 ease-out-soft', i === active ? 'opacity-100' : 'pointer-events-none opacity-0', i < active ? '-translate-y-6' : i > active ? 'translate-y-6' : 'translate-y-0')}
                      >
                        <Scene />
                      </div>
                    ))}
                  </div>
                </ScaleFrame>
              </div>
            </Wide>
          </div>
        </div>
      )}

      <div ref={reduce ? ref : undefined} className={cn('py-24 md:py-32', !reduce && 'lg:hidden')}>
        <Wide>
          <Kicker n="02">Le flux</Kicker>
          <Title size="md" className="mt-6" lines={TITLE.map((l) => [...l])} />
          <FlowLine className="mt-10" />
          <ol className="mt-14 space-y-16">
            {STEPS.map(({ title, text, Scene }, i) => (
              <li key={title} className="grid gap-6 md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] md:items-center md:gap-10">
                <div>
                  <div className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">
                    0{i + 1} / 0{STEPS.length}
                  </div>
                  <h3 className="mt-2 text-[clamp(1.9rem,6vw,2.8rem)] font-extrabold uppercase leading-none tracking-[-0.04em]">{title}</h3>
                  <p className="mt-3 max-w-md text-[16px] leading-[1.55] text-ink-soft/80">{text}</p>
                </div>
                <ScaleFrame width={SCENE_W} height={SCENE_H} label={`Illustration : ${title}`}>
                  <Scene />
                </ScaleFrame>
              </li>
            ))}
          </ol>
        </Wide>
      </div>
    </Section>
  );
}
