'use client';

import { useRef } from 'react';

import { cn } from '@/lib/utils';

import { DASHBOARD_H, DASHBOARD_W, ProductDashboard, type DashboardZone } from '../ProductDashboard';
import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';
import { useActiveStep } from '../useSteps';

const ZONES: Array<{ id: DashboardZone; title: string; text: string }> = [
  { id: 'kpis', title: 'Les chiffres qui comptent', text: 'CA signé et marge, avec leur tendance. Pas trente indicateurs : ceux qui pilotent.' },
  { id: 'todo', title: 'À traiter', text: 'CRA à valider, fins de mission, relances : ce qui demande une décision aujourd’hui.' },
  { id: 'activity', title: 'Activité & marge', text: 'Douze mois de CA et de marge, et la prévision des mois à venir.' },
  { id: 'staffing', title: 'Staffing', text: 'Qui est en mission, qui se libère, qui est disponible : l’équipe d’un coup d’œil.' },
  { id: 'pipeline', title: 'Pipeline & clients', text: 'Le pipeline par étape et les clients qui pèsent dans le CA.' },
];

const TITLE = [['Tout voir.'], ['Sans tout ', { em: 'chercher.' }]];

function Legend({ active, className, collapse = false }: { active: number | null; className?: string; collapse?: boolean }) {
  return (
    <ol className={className}>
      {ZONES.map((z, i) => {
        const on = active == null || active === i;
        return (
          <li key={z.id} className={cn('border-t border-ink/10 py-3.5 transition-opacity duration-500', on ? 'opacity-100' : 'opacity-40')}>
            <div className="flex items-baseline gap-4">
              <span className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">0{i + 1}</span>
              <div>
                <h3 className="text-[16px] font-bold uppercase tracking-[-0.01em]">{z.title}</h3>
                <div className={cn('grid transition-[grid-template-rows] duration-500 ease-out-soft', !collapse || on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <p className="overflow-hidden text-[15px] leading-[1.5] text-ink-soft/75">
                    <span className="block pt-1">{z.text}</span>
                  </p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** « Tout voir. Sans tout chercher. » — le cockpit annoté, zone par zone. */
export function Cockpit() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { active } = useActiveStep(ref, ZONES.length);
  const label = `Tableau de bord Centrium annoté (${EXAMPLE_LABEL.toLowerCase()}).`;

  return (
    <Section tone="dune" id="cockpit" aria-label="Le cockpit">
      {!reduce && (
        <div ref={ref} className="relative hidden lg:block" style={{ height: `${ZONES.length * 70 + 40}vh` }}>
          <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-16">
            <Wide className="grid grid-cols-[minmax(0,4fr)_minmax(0,8fr)] items-center gap-12 xl:gap-16">
              <div>
                <Kicker n="03">Le cockpit</Kicker>
                <Title size="md" className="mt-6 text-[clamp(2.2rem,3.6vw,4.4rem)]" lines={TITLE} />
                <Legend active={active} collapse className="mt-10" />
              </div>
              <div data-cursor="Explorer">
                <ScaleFrame width={DASHBOARD_W} height={DASHBOARD_H} label={label}>
                  <ProductDashboard focus={ZONES[active]!.id} markers />
                </ScaleFrame>
                <p className="mt-3 text-right text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
              </div>
            </Wide>
          </div>
        </div>
      )}

      <div ref={reduce ? ref : undefined} className={cn('py-24 md:py-32', !reduce && 'lg:hidden')}>
        <Wide>
          <Kicker n="03">Le cockpit</Kicker>
          <Title size="lg" className="mt-6" lines={TITLE} />
          <Lead className="mt-6">Le tableau de bord rassemble ce que vous cherchiez dans cinq onglets différents.</Lead>
          <div className="mt-12">
            <ScaleFrame width={DASHBOARD_W} height={DASHBOARD_H} label={label}>
              <ProductDashboard markers />
            </ScaleFrame>
            <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
          </div>
          <Legend active={null} className="mt-10" />
        </Wide>
      </div>
    </Section>
  );
}
