'use client';

import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL, MATCHES, MATCHING_CRITERIA } from '../demo-data';
import { Appear, Counter, EASE, Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';

const NEED = ['Python', 'Spark', 'Airflow', 'SQL', 'AWS', 'Anglais'];

/**
 * « Trouver. Pas deviner. » — le seul endroit où Centrium calcule à votre
 * place, et il montre son calcul : 7 critères réels, pondérés.
 */
export function Matching() {
  const reduce = useReducedMotion();
  return (
    <Section tone="charcoal" id="matching" aria-label="Matching" className="overflow-hidden py-24 md:py-36">
      <div aria-hidden className="pointer-events-none absolute -right-[20vw] top-[10%] h-[60vw] w-[60vw] rounded-full border border-terra/20" />
      <div aria-hidden className="pointer-events-none absolute -right-[10vw] top-[22%] h-[40vw] w-[40vw] rounded-full border border-terra/15" />
      <Wide className="relative">
        <div className="flex flex-wrap items-center gap-4">
          <Kicker>Matching</Kicker>
          <span className="rounded-full border border-terra-light/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-terra-light">Intelligence explicable</span>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <Title size="xl" lines={[['Trouver.'], ['Pas ', { em: 'deviner.' }]]} />
          <Lead className="lg:justify-self-end">
            Pour chaque besoin, Centrium classe vos consultants sur 100, à partir de sept critères visibles. Aucune compétence n’est déduite ni inventée : seules celles qui ont été saisies comptent.
          </Lead>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <Appear className="rounded-[24px] border border-ivory/10 bg-ivory/[0.04] p-6 md:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-light">Le besoin</div>
            <div className="mt-3 text-[26px] font-bold tracking-[-0.02em]">Data engineer</div>
            <div className="text-[14px] text-ivory/60">Varenne Énergie · démarrage sous 30 jours</div>
            <div className="mt-6 flex flex-wrap gap-2">
              {NEED.map((s) => (
                <span key={s} className="rounded-full bg-ivory/[0.08] px-3 py-1.5 text-[13px] font-medium">
                  {s}
                </span>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ivory/10 pt-5 text-[13px]">
              <div>
                <dt className="text-ivory/50">Séniorité</dt>
                <dd className="mt-1 font-semibold">6 ans et plus</dd>
              </div>
              <div>
                <dt className="text-ivory/50">TJM cible</dt>
                <dd className="mt-1 font-semibold">600 – 650 €</dd>
              </div>
            </dl>
            <p className="mt-6 text-[11.5px] uppercase tracking-[0.18em] text-ivory/40">{EXAMPLE_LABEL}</p>
          </Appear>

          <ol className="space-y-3">
            {MATCHES.map((m, i) => (
              <motion.li
                key={m.name}
                className={cn('grid gap-5 rounded-[24px] p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:p-6', i === 0 ? 'bg-terra text-white' : 'border border-ivory/10 bg-ivory/[0.03]')}
                initial={reduce ? false : { opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[18px] font-bold">{m.name}</div>
                    <div className="text-[13px] opacity-65">{m.role}</div>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
                  {m.criteria.map((c) => (
                    <li key={c.label} className="flex items-center gap-1.5">
                      {c.ok ? <Check className="h-3.5 w-3.5 shrink-0 opacity-90" /> : <Minus className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                      <span className="opacity-60">{c.label}</span>
                      <span className="font-semibold">{c.value}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[clamp(2.6rem,5vw,4rem)] font-extrabold leading-none tracking-[-0.05em]">
                  <Counter value={m.score} suffix=" %" duration={1.2 + i * 0.15} />
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <p className="mt-10 border-t border-ivory/10 pt-6 text-[13.5px] leading-[1.7] text-ivory/65">
          <span className="mr-2 font-semibold uppercase tracking-[0.14em] text-terra-light">Le calcul</span>
          {MATCHING_CRITERIA.map((c) => `${c.label} ${c.max}`).join(' · ')} — sur 100 points, chaque point justifié.
        </p>
      </Wide>
    </Section>
  );
}
