'use client';

import { MissionsTile } from '@/components/bento/widgets';

import { EXAMPLE_LABEL, MISSIONS } from '../demo-data';
import { Appear, Counter, Kicker, Lead, MaskImage, Section, Title, Wide } from '../kit';

const ECONOMICS = [
  { label: 'TJM de vente', value: 650, suffix: ' €' },
  { label: 'Coût / jour', value: 430, suffix: ' €' },
  { label: 'Marge / jour', value: 220, suffix: ' €', strong: true },
];

/** « De l'opportunité à la rentabilité. » — la mission et ses chiffres. */
export function Missions() {
  return (
    <Section tone="ivory" id="missions" aria-label="Missions" className="py-24 md:py-36">
      <Wide>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 xl:gap-24">
          <MaskImage src="/photos/concrete-stairs.webp" alt="Escalier de béton en perspective" sizes="(min-width: 1024px) 38vw, 100vw" className="order-2 aspect-[4/5] rounded-[28px] lg:order-1 lg:aspect-auto lg:min-h-[640px]" />
          <div className="order-1 flex flex-col lg:order-2">
            <Kicker n="07">Missions</Kicker>
            <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.6vw,5.2rem)]" lines={[['De l’opportunité'], ['à la ', { em: 'rentabilité.' }]]} />
            <Lead className="mt-6">Chaque mission porte ses dates, ses taux et sa marge. Quand une fin approche, Centrium prévient le responsable à 90, 60, 30 et 15 jours.</Lead>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {ECONOMICS.map((e) => (
                <Appear key={e.label} className={e.strong ? 'rounded-[20px] bg-terra p-4 text-white md:p-5' : 'rounded-[20px] bg-warm p-4 ring-1 ring-ink/[0.06] md:p-5'}>
                  <div className={e.strong ? 'text-[12px] font-medium text-white/75 md:text-[13px]' : 'text-[12px] font-medium text-taupe md:text-[13px]'}>{e.label}</div>
                  <div className="mt-2 text-[clamp(1.4rem,2.6vw,2.4rem)] font-extrabold tracking-[-0.04em]">
                    <Counter value={e.value} suffix={e.suffix} />
                  </div>
                </Appear>
              ))}
            </div>

            <Appear className="mt-3">
              <MissionsTile title="Missions en cours" rows={MISSIONS} emptyLabel="Aucune mission" />
            </Appear>
            <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
          </div>
        </div>
      </Wide>
    </Section>
  );
}
