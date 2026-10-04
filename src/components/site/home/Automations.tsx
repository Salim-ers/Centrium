'use client';

import { motion } from 'framer-motion';

import { AUTOMATION_RULES } from '@/lib/automations/rules';

import { EASE, Kicker, Lead, MaskImage, Section, Title, useReducedMotion, Wide } from '../kit';

/**
 * « Centrium garde un œil ouvert. » — les règles réellement exécutées par
 * le moteur d'automatisations (catalogue partagé avec l'application).
 */
export function Automations() {
  const reduce = useReducedMotion();
  return (
    <Section tone="dark" id="automatisations" aria-label="Automatisations" className="py-24 md:py-36">
      <Wide>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Kicker n="11">Automatisations</Kicker>
            <Title size="xl" className="mt-6 text-[clamp(2.4rem,6.4vw,7.5rem)]" lines={[['Centrium garde'], ['un œil ', { em: 'ouvert.' }]]} />
            <Lead className="mt-6 text-ivory/85">Des règles simples, qui tournent pour vous. Chacune s’active ou se coupe dans les réglages de votre organisation.</Lead>
          </div>
          <MaskImage src="/photos/desk-night.webp" alt="Bureau éclairé le soir, écran allumé" sizes="(min-width: 1024px) 34vw, 100vw" className="aspect-[4/3] rounded-[28px]" />
        </div>

        <ol className="mt-16 border-t border-ivory/15">
          {AUTOMATION_RULES.map((r, i) => (
            <motion.li
              key={r.id}
              className="grid gap-3 border-b border-ivory/15 py-6 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,5fr)] md:gap-8"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8% 0px' }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: EASE }}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terra-peach opacity-50" style={{ animationDuration: '2.4s', animationDelay: `${i * 0.35}s` }} />}
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terra-peach" />
                </span>
                <h3 className="text-[18px] font-extrabold uppercase tracking-[-0.01em]">{r.label.fr}</h3>
              </div>
              <p className="text-[15px] leading-[1.5] text-ivory/75">
                <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-peach">Quand</span>
                {r.trigger.fr}
              </p>
              <p className="text-[15px] leading-[1.5]">
                <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-peach">Alors</span>
                {r.action.fr}
              </p>
            </motion.li>
          ))}
        </ol>
      </Wide>
    </Section>
  );
}
