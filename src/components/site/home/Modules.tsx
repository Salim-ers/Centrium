'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL } from '../demo-data';
import { EASE, Kicker, Section, Title, useReducedMotion, Wide } from '../kit';

type Tone = 'light' | 'terra' | 'ink';

const CARD: Record<Tone, string> = {
  light: 'bg-gradient-to-b from-white to-[#FBF8F5] text-ink ring-1 ring-black/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_48px_-30px_rgba(113,52,40,0.35)]',
  terra: 'bg-gradient-to-br from-[#D7745A] via-terra to-terra-deep text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_28px_56px_-30px_rgba(113,52,40,0.7)]',
  ink: 'bg-gradient-to-br from-[#2D2724] via-ink to-[#0F0D0C] text-ivory shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_28px_56px_-30px_rgba(25,22,20,0.8)]',
};

function Card({ n, title, text, tone = 'light', className, children }: { n: string; title: string; text: string; tone?: Tone; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const dark = tone !== 'light';
  return (
    <motion.article
      className={cn('group relative flex min-h-[300px] flex-col overflow-hidden rounded-[28px] p-6 md:p-7', CARD[tone], className)}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -6 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.6, ease: EASE }}
      data-cursor="Explorer"
    >
      <div className={cn('text-[11.5px] font-semibold tabular-nums tracking-[0.2em]', dark ? 'text-white/60' : 'text-terra')}>{n}</div>
      <h3 className="mt-2 max-w-[20ch] text-[clamp(1.25rem,1.7vw,1.6rem)] font-extrabold uppercase leading-[1.02] tracking-[-0.03em]">{title}</h3>
      <p className={cn('mt-2 max-w-[42ch] text-[14.5px] leading-[1.5]', dark ? 'text-white/75' : 'text-ink-soft/70')}>{text}</p>
      <div className="mt-auto pt-6">{children}</div>
    </motion.article>
  );
}

/** Déclenche les petites boucles d'animation seulement à l'écran. */
function useLive() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-10% 0px' });
  const reduce = useReducedMotion();
  return { ref, live: inView && !reduce };
}

function CrmVisual() {
  const { ref, live } = useLive();
  const cols = ['Qualif.', 'Propo.', 'Négo.', 'Gagné'];
  return (
    <div ref={ref} className="relative">
      <div className="grid grid-cols-4 gap-2">
        {cols.map((c) => (
          <div key={c}>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-taupe">{c}</div>
            <div className="h-9 rounded-xl border border-dashed border-terra/30" />
            <div className="mt-1.5 h-7 rounded-xl bg-black/[0.04]" />
          </div>
        ))}
      </div>
      <motion.div
        className="absolute left-0 top-[22px] flex h-9 w-[calc(25%-6px)] items-center justify-between rounded-xl bg-terra px-2 text-[10.5px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(113,52,40,0.8)]"
        animate={live ? { x: ['0%', '0%', '108%', '108%', '216%', '216%', '324%', '324%'] } : { x: '324%' }}
        transition={live ? { duration: 6, times: [0, 0.12, 0.25, 0.37, 0.5, 0.62, 0.75, 1], repeat: Infinity, ease: EASE } : { duration: 0 }}
      >
        Helio <span className="tabular-nums opacity-80">78 k€</span>
      </motion.div>
    </div>
  );
}

function StaffingVisual() {
  const reduce = useReducedMotion();
  const rows = [
    { n: 'Camille R.', bars: [[0, 62, 'm'], [68, 100, 'p']] },
    { n: 'Inès M.', bars: [[0, 30, 'm']] },
    { n: 'Yanis B.', bars: [[12, 90, 'p']] },
    { n: 'Hugo L.', bars: [[0, 100, 'm']] },
  ] as const;
  return (
    <motion.div key={reduce ? 'still' : 'motion'} className="relative space-y-2" initial={reduce ? undefined : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-10% 0px' }}>
      <span className="absolute bottom-0 top-0 w-px bg-terra" style={{ left: 'calc(84px + 8%)' }} aria-hidden />
      {rows.map((r, ri) => (
        <div key={r.n} className="flex items-center gap-3">
          <span className="w-[72px] shrink-0 truncate text-[12px] font-medium">{r.n}</span>
          <div className="relative h-6 flex-1 rounded-lg bg-black/[0.04]">
            {r.bars.map(([a, b, k], bi) => (
              <motion.span
                key={bi}
                className={cn('absolute inset-y-0 origin-left rounded-lg', k === 'm' ? 'bg-terra' : 'border border-dashed border-terra bg-white')}
                style={{ left: `${a}%`, width: `${b - a}%` }}
                variants={reduce ? undefined : { hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: 0.8, delay: 0.1 + ri * 0.08 + bi * 0.1, ease: EASE } } }}
              />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function MarginVisual() {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={9} />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#C65F46"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - 0.338) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <dl className="space-y-1 text-[13px]">
        {[
          ['TJM', '650 €'],
          ['Coût', '430 €'],
          ['Marge', '33,8 %'],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-12 text-taupe">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CraVisual() {
  const { ref, live } = useLive();
  const days = Array.from({ length: 21 }, (_, i) => i);
  return (
    <div ref={ref}>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const weekend = d % 7 >= 5;
          return (
            <motion.span
              key={d}
              className={cn('h-7 rounded-lg', weekend ? 'bg-white/10' : 'bg-white/25')}
              animate={!weekend && live ? { backgroundColor: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.95)'] } : undefined}
              transition={{ duration: 0.3, delay: 0.2 + d * 0.06 }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-success">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Validé
        </span>
        <span className="text-white/80">→ préfacture prête</span>
      </div>
    </div>
  );
}

function PortalVisual() {
  const { ref, live } = useLive();
  return (
    <div ref={ref} className="relative flex items-center justify-between gap-3">
      <div className="w-[48%] rounded-2xl bg-black/[0.04] p-2.5 sm:p-3">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-taupe">Espace client</div>
        <span className="mt-2 inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-terra px-2 py-1 text-[10.5px] font-semibold text-white sm:text-[11px]">
          <Plus className="h-3 w-3" /> Nouveau besoin
        </span>
      </div>
      <div className="w-[46%] rounded-2xl bg-ink p-3 text-ivory">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">CRM</div>
        <div className="mt-2 h-6 rounded-lg border border-dashed border-white/20" />
      </div>
      <motion.span
        className="absolute left-[4%] top-[58%] rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-ink shadow-[0_10px_20px_-10px_rgba(25,22,20,0.6)]"
        animate={live ? { x: [0, 0, 190, 190], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
        transition={live ? { duration: 3.2, times: [0, 0.2, 0.75, 1], repeat: Infinity, ease: EASE } : { duration: 0 }}
      >
        Data engineer
      </motion.span>
    </div>
  );
}

function AutomationVisual() {
  const reduce = useReducedMotion();
  const rules = ['Fin de mission à 30 jours', 'CRA à valider depuis 1 jour', 'Consultant disponible : 2 besoins compatibles'];
  return (
    <ul className="space-y-2.5">
      {rules.map((r, i) => (
        <li key={r} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[13px]">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terra-light opacity-60" style={{ animationDuration: '2.4s', animationDelay: `${i * 0.5}s` }} />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terra-light" />
          </span>
          {r}
        </li>
      ))}
    </ul>
  );
}

function AnalyticsVisual() {
  const reduce = useReducedMotion();
  const bars = [52, 58, 55, 63, 68, 72, 70, 76, 81, 79, 86, 88];
  return (
    <motion.div key={reduce ? 'still' : 'motion'} className="flex h-28 items-end gap-1.5" initial={reduce ? undefined : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-10% 0px' }}>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={cn('flex-1 origin-bottom rounded-t-lg', i === bars.length - 1 ? 'bg-terra' : 'bg-terra/25')}
          style={{ height: `${h}%` }}
          variants={reduce ? undefined : { hidden: { scaleY: 0 }, shown: { scaleY: 1, transition: { duration: 0.7, delay: i * 0.04, ease: EASE } } }}
        />
      ))}
    </motion.div>
  );
}

/** « Tout le cycle. Un seul espace. » — les modules, condensés en une grille. */
export function Modules() {
  return (
    <Section tone="dune" id="modules" aria-label="Les modules" className="py-24 md:py-32">
      <Wide>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker n="03">Le cockpit</Kicker>
            <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.6vw,5.2rem)]" lines={[['Tout le cycle.'], ['Un seul ', { em: 'espace.' }]]} />
          </div>
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <Card n="01" title="Du premier contact à la mission." text="Contacts, opportunités et devis dans un pipeline. Une affaire gagnée devient une mission." className="xl:col-span-7">
            <CrmVisual />
          </Card>
          <Card n="02" title="Les bonnes personnes. Au bon moment." text="Missions, fins de mission et propositions sur une même ligne de temps." className="xl:col-span-5">
            <StaffingVisual />
          </Card>
          <Card n="03" title="De l’opportunité à la rentabilité." text="Chaque mission porte ses taux et sa marge, sans tableur." className="xl:col-span-4">
            <MarginVisual />
          </Card>
          <Card n="04" title="Le temps. Sans la friction." text="Le consultant saisit, vous validez, la préfacture est prête." tone="terra" className="xl:col-span-4">
            <CraVisual />
          </Card>
          <Card n="05" title="Votre client entre dans le flux." text="Un besoin déposé sur son portail devient une opportunité." className="xl:col-span-4">
            <PortalVisual />
          </Card>
          <Card n="06" title="Centrium garde un œil ouvert." text="Des règles simples préviennent la bonne personne, au bon moment." tone="ink" className="xl:col-span-7">
            <AutomationVisual />
          </Card>
          <Card n="07" title="Les chiffres qui comptent." text="Occupation, CA par consultant, transformation : sur vos données." className="xl:col-span-5">
            <AnalyticsVisual />
          </Card>
        </div>
      </Wide>
    </Section>
  );
}
