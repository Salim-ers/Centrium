'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Bell, Check, FileText, FolderOpen, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ScaleFrame } from '../ScaleFrame';
import { EXAMPLE_LABEL } from '../demo-data';
import { EASE, Kicker, Lead, Section, Title, useReducedMotion, Wide } from '../kit';

const muted = 'text-[#827A75]';

// ── Portail client : un besoin déposé arrive dans le CRM ────────────────
const FLOW_W = 1200;
const FLOW_H = 500;
const TRAVEL = 680;

function ClientFlow({ still }: { still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '-20% 0px' });
  const play = still || seen;
  const t = (delay: number, duration = 0.6) => ({ duration: still ? 0 : duration, delay: still ? 0 : delay, ease: EASE });

  return (
    <div ref={ref} className="relative h-full w-full text-ink-app">
      {/* Portail client */}
      <div className="absolute left-0 top-0 h-full w-[520px] rounded-[28px] bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_40px_80px_-50px_rgba(25,22,20,.45)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F4B45] text-[13px] font-bold text-white">V</span>
          <div>
            <div className="text-[15px] font-semibold">Varenne Énergie</div>
            <div className={cn('text-[12px]', muted)}>Espace client</div>
          </div>
          <Bell className={cn('ml-auto h-4 w-4', muted)} />
        </div>
        <div className="mt-5 flex gap-1 text-[12.5px] font-medium">
          {['Missions', 'CRA', 'Devis', 'Documents', 'Demandes'].map((n, i) => (
            <span key={n} className={cn('rounded-lg px-2.5 py-1.5', i === 4 ? 'bg-canvas text-ink-app' : muted)}>
              {n}
            </span>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="text-[18px] font-semibold">Vos demandes</div>
          <motion.span
            className="inline-flex items-center gap-1.5 rounded-xl bg-terra px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-white"
            animate={play && !still ? { scale: [1, 0.94, 1] } : undefined}
            transition={t(0.3, 0.4)}
          >
            <Plus className="h-4 w-4" /> Nouveau besoin
          </motion.span>
        </div>
        <div className="mt-4 h-[96px] rounded-2xl border border-dashed border-terra/30" />
        <div className="mt-3 rounded-2xl bg-canvas p-4">
          <div className="flex items-center justify-between text-[14px] font-semibold">
            Chef de projet SI <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] text-success">Staffée</span>
          </div>
          <div className={cn('mt-1 text-[12.5px]', muted)}>Déposée le 2 sept.</div>
        </div>
      </div>

      {/* Ligne de passage */}
      <svg className="absolute left-[520px] top-[208px] h-[60px] w-[160px]" viewBox="0 0 160 60" aria-hidden>
        <motion.path d="M0,30 C60,30 100,30 160,30" stroke="#C65F46" strokeWidth={1.5} strokeDasharray="5 6" fill="none" initial={{ pathLength: still ? 1 : 0 }} animate={play ? { pathLength: 1 } : undefined} transition={t(0.9, 0.8)} />
      </svg>

      {/* CRM */}
      <div className="absolute right-0 top-0 h-full w-[520px] rounded-[28px] bg-ink-app p-6 text-white">
        <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.18em] text-terra-peach">
          <span>CRM · Qualification</span>
          <span className="normal-case tracking-normal text-white/50">{EXAMPLE_LABEL}</span>
        </div>
        <div className="mt-6 grid h-[60px] grid-cols-3 gap-3">
          {[
            ['Ouvertes', '7'],
            ['Pondéré', '142 k€'],
            ['Ce mois-ci', '2'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white/[0.05] px-3 py-2">
              <div className="text-[11px] text-white/50">{l}</div>
              <div className="text-[16px] font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 h-[96px] rounded-2xl border border-dashed border-white/15" />
        <div className="mt-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="text-[14px] font-semibold">Opaline Banque</div>
          <div className="mt-1 text-[12.5px] text-white/55">Architecte cloud · 64 k€</div>
        </div>
        <motion.div className="mt-5 flex flex-wrap gap-2 text-[12px] font-semibold" initial={{ opacity: still ? 1 : 0 }} animate={play ? { opacity: 1 } : undefined} transition={t(2.3)}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            <Check className="h-3.5 w-3.5 text-terra-peach" /> Opportunité créée
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            <Check className="h-3.5 w-3.5 text-terra-peach" /> 3 consultants compatibles
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            <Check className="h-3.5 w-3.5 text-terra-peach" /> Équipe commerciale prévenue
          </span>
        </motion.div>
      </div>

      {/* La demande, du portail au CRM */}
      <motion.div
        className="absolute left-[24px] top-[190px] h-[96px] w-[472px] rounded-2xl bg-terra p-4 text-white shadow-[0_20px_40px_-20px_rgba(113,52,40,.7)]"
        initial={still ? { opacity: 1, x: TRAVEL } : { opacity: 0, x: 0, y: 12 }}
        animate={play && !still ? { opacity: [0, 1, 1], y: [12, 0, 0], x: [0, 0, TRAVEL] } : undefined}
        transition={{ duration: 1.9, delay: 0.5, times: [0, 0.3, 1], ease: EASE }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">Data engineer</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-semibold">Nouveau</span>
        </div>
        <div className="mt-1 text-[12.5px] text-white/80">Varenne Énergie · démarrage en janvier · 6 mois</div>
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-white/70">
          <FileText className="h-3.5 w-3.5" /> fiche-de-poste.pdf
        </div>
      </motion.div>
    </div>
  );
}

// ── Portail consultant : l'essentiel, rien de plus ──────────────────────
function ConsultantPhone() {
  return (
    <div className="flex h-full w-full flex-col rounded-[44px] bg-ink-app p-3 shadow-[0_40px_80px_-40px_rgba(25,22,20,.6)]">
      <div className="flex flex-1 flex-col overflow-hidden rounded-[34px] bg-canvas px-5 pb-6 pt-8 text-ink-app">
        <div className={cn('text-[12px]', muted)}>Espace consultant</div>
        <div className="text-[24px] font-semibold tracking-[-0.02em]">Bonjour Camille</div>
        <div className="mt-5 rounded-[20px] bg-white p-4 ring-1 ring-black/[0.05]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-deep">Ma mission</div>
          <div className="mt-2 text-[16px] font-semibold">Nordal Assurances</div>
          <div className={cn('text-[13px]', muted)}>Lead dev Java · jusqu’au 3 févr.</div>
        </div>
        <div className="mt-3 rounded-[20px] bg-terra p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Mon CRA · novembre</div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-[30px] font-semibold leading-none tracking-[-0.02em]">18 j</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold">Soumis</span>
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} className={cn('h-2.5 rounded-sm', i < 18 ? 'bg-white/85' : 'bg-white/25')} />
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-[20px] bg-white p-4 ring-1 ring-black/[0.05]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-deep">Mes documents</div>
          {['Contrat de mission', 'Ordre de mission'].map((d) => (
            <div key={d} className="mt-2.5 flex items-center gap-2.5 text-[13.5px]">
              <FolderOpen className="h-4 w-4 text-terra" /> {d}
            </div>
          ))}
        </div>
        <div className={cn('mt-auto text-center text-[11px]', muted)}>{EXAMPLE_LABEL}</div>
      </div>
    </div>
  );
}

const SEES = ['Sa mission et ses dates', 'Son CRA, jour par jour, télétravail compris', 'Ses documents et ses contrats'];
const NEVER = ['Le TJM de vente', 'La marge', 'Les notes internes'];

/** Portails client et consultant. */
export function Portals() {
  const reduce = useReducedMotion();
  return (
    <Section tone="dune" id="portails" aria-label="Portails client et consultant" className="py-24 md:py-36">
      <Wide>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Kicker n="09">Portail client</Kicker>
            <Title size="lg" className="mt-6 text-[clamp(2.1rem,5vw,5.6rem)]" lines={[['Votre client entre'], ['dans le ', { em: 'flux.' }]]} />
          </div>
          <Lead className="lg:justify-self-end">Votre client dépose un besoin depuis son espace. Centrium crée l’opportunité, cherche les consultants compatibles et prévient votre équipe commerciale.</Lead>
        </div>
        <div className="mt-12" data-cursor="Explorer">
          <ScaleFrame width={FLOW_W} height={FLOW_H} label={`Un client dépose un besoin « Data engineer » depuis son portail ; la demande devient une opportunité dans le CRM (${EXAMPLE_LABEL.toLowerCase()}).`}>
            <ClientFlow key={reduce ? 'still' : 'motion'} still={!!reduce} />
          </ScaleFrame>
        </div>

        <div className="mt-28 grid items-center gap-14 md:mt-40 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-24">
          <div className="mx-auto w-full max-w-[340px]" data-cursor="Explorer">
            <ScaleFrame width={390} height={780} label={`Portail consultant : sa mission, son CRA de novembre et ses documents (${EXAMPLE_LABEL.toLowerCase()}).`}>
              <ConsultantPhone />
            </ScaleFrame>
          </div>
          <div>
            <Kicker n="10">Portail consultant</Kicker>
            <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.6vw,5.2rem)]" lines={[['Ce dont il a besoin.'], ['Rien de ', { em: 'plus.' }]]} />
            <Lead className="mt-6">Un espace simple, sur ordinateur comme sur téléphone. Les consultants n’occupent pas de licence.</Lead>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-terra-deep">Il voit</h3>
                <ul className="mt-4 space-y-3 text-[15.5px]">
                  {SEES.map((s) => (
                    <li key={s} className="flex gap-3">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-terra" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-taupe">Il ne voit jamais</h3>
                <ul className="mt-4 space-y-3 text-[15.5px] text-ink/70">
                  {NEVER.map((s) => (
                    <li key={s} className="flex gap-3">
                      <X className="mt-1 h-4 w-4 shrink-0 text-taupe" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Wide>
    </Section>
  );
}
