'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Plus } from 'lucide-react';

import { KpiTile, PipelineTile, StaffingTile, TodoTile } from '@/components/bento/widgets';
import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL, KPIS, PIPELINE, STAFF, eurK } from '../demo-data';
import { Appear, Cta, Kicker, Lead, Section, Title, Wide, type SectionTone, type TitleLine } from '../kit';

type Persona = {
  id: string;
  label: string;
  tone: SectionTone;
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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium text-[#827A75]">Espace client · Varenne Énergie</div>
          <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">Vos missions</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-terra px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white">
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

const PERSONAS: Persona[] = [
  {
    id: 'direction',
    label: 'Direction',
    tone: 'ivory',
    title: [['La marge.'], ['Pas l’', { em: 'intuition.' }]],
    text: 'CA signé, marge, occupation et pipeline pondéré, calculés sur les missions et les CRA réels.',
    points: ['Tableau de bord sur douze mois', 'Analytics : occupation, CA par consultant, motifs de perte', 'Rôles et permissions de chaque équipe'],
    Scene: DirectionScene,
  },
  {
    id: 'business-managers',
    label: 'Business managers',
    tone: 'warm',
    title: [['Vos affaires.'], ['Vos ', { em: 'consultants.' }]],
    text: 'Le pipeline, les consultants compatibles et les échéances de vos missions, au même endroit.',
    points: ['Opportunités par étape, devis sur vos modèles', 'Matching explicable sur chaque besoin', 'Relances et fins de mission signalées'],
    Scene: BusinessScene,
  },
  {
    id: 'recrutement',
    label: 'Recrutement',
    tone: 'dune',
    title: [['Le bon profil,'], ['au bon ', { em: 'moment.' }]],
    text: 'Les disponibilités à venir et les besoins ouverts se croisent avant que la question ne se pose.',
    points: ['Fiches consultants : compétences, séniorité, CV', 'Intercontrat et fins de mission visibles', 'Opportunités compatibles quand un consultant se libère'],
    Scene: RecruitingScene,
  },
  {
    id: 'finance',
    label: 'ADV & finance',
    tone: 'ivory',
    title: [['Du CRA'], ['à la ', { em: 'préfacture.' }]],
    text: 'Les jours validés alimentent la préfacturation de chaque mission, sans ressaisie.',
    points: ['CRA à valider et CRA manquants signalés', 'Préfactures calculées sur les jours validés', 'Marge par mission et par client'],
    Scene: FinanceScene,
  },
  {
    id: 'consultants',
    label: 'Consultants',
    tone: 'warm',
    title: [['Son CRA.'], ['Ses ', { em: 'documents.' }]],
    text: 'Un portail simple, sans licence : sa mission, son CRA et ses documents, rien de plus.',
    points: ['Saisie du CRA et du télétravail', 'Contrats et documents partagés', 'Ni TJM de vente, ni marge, ni notes internes'],
    Scene: ConsultantScene,
  },
  {
    id: 'clients',
    label: 'Clients',
    tone: 'dune',
    title: [['Votre client,'], ['partie ', { em: 'prenante.' }]],
    text: 'Il suit ses missions, approuve les CRA et dépose ses nouveaux besoins depuis son espace.',
    points: ['Missions, CRA, devis et documents', 'Nouveau besoin → opportunité dans votre CRM', 'Accès révocable à tout moment'],
    Scene: ClientScene,
  },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]!);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const IDS = PERSONAS.map((p) => p.id);

/** Page Solutions : un rôle, une réponse. */
export function Solutions() {
  const active = useActiveSection(IDS);
  return (
    <>
      <Section tone="terra" aria-label="Solutions" className="overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
        <Wide>
          <Kicker n="01">Solutions</Kicker>
          <Title as="h1" size="hero" immediate className="mt-8 text-[clamp(2.8rem,8vw,9.5rem)]" lines={[['Un rôle.'], ['Une ', { em: 'réponse.' }]]} />
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Lead className="text-ivory/85">Direction, commerce, recrutement, finance, consultants et clients travaillent sur les mêmes données. Chacun n’en voit que ce qui le concerne.</Lead>
            <Cta href="/demo" variant="ivory">
              Demander une démo
            </Cta>
          </div>
          <nav aria-label="Rôles" className="mt-16 flex flex-wrap gap-2">
            {PERSONAS.map((p, i) => (
              <a key={p.id} href={`#${p.id}`} className="rounded-full border border-ivory/30 px-4 py-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-ivory hover:text-ink">
                <span className="mr-2 tabular-nums opacity-60">0{i + 1}</span>
                {p.label}
              </a>
            ))}
          </nav>
        </Wide>
      </Section>

      <div className="relative">
        <aside aria-label="Rôles" className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[240px] 2xl:block">
          <ol className="pointer-events-auto sticky top-28 ml-12 space-y-2">
            {PERSONAS.map((p, i) => (
              <li key={p.id}>
                <a href={`#${p.id}`} aria-current={active === p.id ? 'true' : undefined} className={cn('flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] transition-opacity', active === p.id ? 'opacity-100' : 'opacity-40 hover:opacity-80')}>
                  <span className={cn('h-px transition-all duration-500', active === p.id ? 'w-8 bg-terra' : 'w-4 bg-ink')} />
                  <span className="tabular-nums">0{i + 1}</span> {p.label}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {PERSONAS.map((p, i) => (
          <Section key={p.id} tone={p.tone} id={p.id} aria-label={p.label} className="py-24 md:py-32">
            <Wide className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-20 2xl:pl-[300px]">
              <div>
                <Kicker n={`0${i + 1}`}>{p.label}</Kicker>
                <Title size="lg" className="mt-6 text-[clamp(2.1rem,4.4vw,5rem)]" lines={p.title} />
                <Lead className="mt-6">{p.text}</Lead>
                <ul className="mt-8 space-y-3">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-[16px]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-terra" /> {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <Appear>
                <div className="rounded-[32px] bg-ink/[0.03] p-4 ring-1 ring-ink/[0.05] sm:p-6">
                  <p.Scene />
                </div>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.2em] text-taupe">{EXAMPLE_LABEL}</p>
              </Appear>
            </Wide>
          </Section>
        ))}
      </div>
    </>
  );
}
