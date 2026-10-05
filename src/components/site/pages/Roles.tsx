'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, FileText, Plus } from 'lucide-react';

import { KpiTile, PipelineTile, StaffingTile, TodoTile } from '@/components/bento/widgets';
import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL, KPIS, PIPELINE, STAFF, eurK } from '../demo-data';
import { EASE, Kicker, Lead, Section, Title, Wide, type TitleLine } from '../kit';

type Persona = {
  id: string;
  label: string;
  title: TitleLine[];
  text: string;
  points: string[];
  Scene: () => JSX.Element;
};

function DirectionScene() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <KpiTile data={KPIS[1]!} tone="terra" />
      <KpiTile data={KPIS[2]!} tone="white" index={1} />
    </div>
  );
}

function BusinessScene() {
  return <PipelineTile title="Pipeline" stages={PIPELINE} total={420000} weighted={312000} count={18} format={eurK} labels={{ total: 'Total', weighted: 'Pondéré', count: 'Opportunités' }} tone="soft" />;
}

function RecruitingScene() {
  return <StaffingTile title="Disponibilités" rows={STAFF.slice(0, 4)} cta={{ label: 'Ouvrir le staffing' }} tone="ivory" emptyLabel="Aucun consultant" />;
}

function FinanceScene() {
  return (
    <TodoTile
      title="À traiter · finance"
      tone="peach"
      emptyLabel="Rien à traiter"
      items={[
        { id: 'f1', label: 'CRA à valider', detail: 'Octobre · 4 consultants', count: 4 },
        { id: 'f2', label: 'Préfactures prêtes', detail: '6 missions · CRA validés', count: 6 },
        { id: 'f3', label: 'CRA manquant', detail: 'Léa D. · septembre' },
      ]}
    />
  );
}

function ConsultantScene() {
  return (
    <div className="rounded-card bg-white p-5 text-ink-app ring-1 ring-black/[0.05]">
      <div className="text-[13px] font-medium text-[#827A75]">Espace consultant</div>
      <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">Bonjour Camille</div>
      <div className="mt-4 rounded-2xl bg-terra p-4 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">CRA · octobre</div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[28px] font-semibold leading-none">21 j</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold">À soumettre</span>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-[14px]">
        {['Contrat de mission', 'Ordre de mission'].map((d) => (
          <div key={d} className="flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2.5">
            <FileText className="h-4 w-4 text-terra" /> {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientScene() {
  return (
    <div className="rounded-card bg-white p-5 text-ink-app ring-1 ring-black/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-[#827A75]">Espace client · Varenne Énergie</div>
          <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">Vos missions</div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-terra px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white">
          <Plus className="h-3.5 w-3.5" /> Nouveau besoin
        </span>
      </div>
      <div className="mt-4 space-y-2 text-[14px]">
        {[
          { t: 'Data engineer · Inès M.', s: 'CRA à approuver' },
          { t: 'Product owner · Léa D.', s: 'En cours' },
        ].map((m) => (
          <div key={m.t} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
            <span className="font-medium">{m.t}</span>
            <span className="text-[12px] text-[#827A75]">{m.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PERSONAS: Persona[] = [
  {
    id: 'direction',
    label: 'Direction',
    title: [['La marge.'], ['Pas l’', { em: 'intuition.' }]],
    text: 'CA signé, marge, occupation et pipeline pondéré, calculés sur les missions et les CRA réels.',
    points: ['Tableau de bord sur douze mois', 'Analytics : occupation, CA par consultant, motifs de perte'],
    Scene: DirectionScene,
  },
  {
    id: 'business-managers',
    label: 'Business managers',
    title: [['Vos affaires.'], ['Vos ', { em: 'consultants.' }]],
    text: 'Le pipeline, les consultants compatibles et les échéances de vos missions, au même endroit.',
    points: ['Opportunités par étape, devis sur vos modèles', 'Matching explicable sur chaque besoin'],
    Scene: BusinessScene,
  },
  {
    id: 'recrutement',
    label: 'Recrutement',
    title: [['Le bon profil,'], ['au bon ', { em: 'moment.' }]],
    text: 'Les disponibilités à venir et les besoins ouverts se croisent avant que la question ne se pose.',
    points: ['Fiches consultants : compétences, séniorité, CV', 'Intercontrat et fins de mission visibles'],
    Scene: RecruitingScene,
  },
  {
    id: 'finance',
    label: 'ADV & finance',
    title: [['Du CRA'], ['à la ', { em: 'préfacture.' }]],
    text: 'Les jours validés alimentent la préfacturation de chaque mission, sans ressaisie.',
    points: ['CRA à valider et CRA manquants signalés', 'Préfactures calculées sur les jours validés'],
    Scene: FinanceScene,
  },
  {
    id: 'consultants',
    label: 'Consultants',
    title: [['Son CRA.'], ['Ses ', { em: 'documents.' }]],
    text: 'Un portail simple, sans licence : sa mission, son CRA et ses documents, rien de plus.',
    points: ['Saisie du CRA et du télétravail', 'Contrats et documents partagés'],
    Scene: ConsultantScene,
  },
  {
    id: 'clients',
    label: 'Clients',
    title: [['Votre client,'], ['partie ', { em: 'prenante.' }]],
    text: 'Il suit ses missions, approuve les CRA et dépose ses nouveaux besoins depuis son espace.',
    points: ['Missions, CRA, devis et documents', 'Un nouveau besoin devient une opportunité dans votre CRM'],
    Scene: ClientScene,
  },
];

const IDS = PERSONAS.map((p) => p.id);

/**
 * Par fonction : un sélecteur de rôle plutôt que six sections empilées.
 * `/plateforme#direction` (lien du pied de page) ouvre directement le rôle.
 */
export function Roles() {
  const [active, setActive] = useState(IDS[0]!);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const persona = PERSONAS.find((p) => p.id === active)!;

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (IDS.includes(id)) setActive(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  function onKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + IDS.length) % IDS.length;
    setActive(IDS[next]!);
    tabs.current[next]?.focus();
  }

  return (
    <Section tone="warm" id="roles" aria-label="Par fonction" className="relative py-24 md:py-36">
      {/* Ancres des liens « /plateforme#direction »… : la section défile, le rôle s'ouvre. */}
      {IDS.map((id) => (
        <span key={id} id={id} aria-hidden className="absolute top-0" />
      ))}
      <Wide>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Kicker>Par fonction</Kicker>
            <Title size="lg" className="mt-6" lines={[['Un rôle.'], ['Une ', { em: 'réponse.' }]]} />
          </div>
          <Lead className="lg:justify-self-end">Direction, commerce, recrutement, finance, consultants et clients travaillent sur les mêmes données. Chacun n’en voit que ce qui le concerne.</Lead>
        </div>

        <div role="tablist" aria-label="Rôles" className="mt-14 flex flex-wrap gap-2">
          {PERSONAS.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`role-tab-${p.id}`}
              aria-selected={active === p.id}
              aria-controls="role-panel"
              tabIndex={active === p.id ? 0 : -1}
              onClick={() => setActive(p.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'rounded-full border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra',
                active === p.id ? 'border-terra bg-terra text-white' : 'border-ink/15 hover:border-ink/40',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${active}`} className="mt-12 min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-20"
            >
              <div>
                <Title as="h3" size="md" className="text-[clamp(2rem,4vw,4.4rem)]" lines={persona.title} />
                <Lead className="mt-6">{persona.text}</Lead>
                <ul className="mt-8 space-y-3">
                  {persona.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-[16px]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-terra" /> {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="rounded-[32px] bg-ink/[0.03] p-4 ring-1 ring-ink/[0.05] sm:p-6">
                  <persona.Scene />
                </div>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Wide>
    </Section>
  );
}
