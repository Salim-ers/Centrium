'use client';

import { Calendar, Check, Mail, Phone, Plus, Users } from 'lucide-react';

import { Sparkline } from '@/components/bento/charts';
import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL } from '../demo-data';

// Scènes du récit « Un flux » : un même dossier fictif (Nordal Assurances,
// Camille R.) suivi du premier contact à la marge. Taille de dessin fixe,
// affichées dans un <ScaleFrame>.
export const SCENE_W = 640;
export const SCENE_H = 520;

const card = 'rounded-[20px] bg-white ring-1 ring-black/[0.05] shadow-[0_24px_48px_-32px_rgba(25,22,20,.35)]';
const muted = 'text-[#827A75]';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col rounded-[28px] bg-dune p-7 text-ink-app">
      <div className="mb-5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-deep">
        <span>{title}</span>
        <span className={cn('normal-case tracking-normal', muted)}>{EXAMPLE_LABEL}</span>
      </div>
      {children}
    </div>
  );
}

export function ProspectScene() {
  const events = [
    { icon: Phone, label: 'Appel de découverte', when: '12 sept.' },
    { icon: Mail, label: 'Email : besoin d’un lead dev Java', when: '19 sept.' },
    { icon: Calendar, label: 'Rendez-vous de qualification', when: '26 sept.' },
  ];
  return (
    <Frame title="Contact">
      <div className={cn(card, 'p-6')}>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terra-blush text-[17px] font-semibold text-terra-deep">SB</span>
          <div>
            <div className="text-[20px] font-semibold tracking-[-0.01em]">Sophie B.</div>
            <div className={cn('text-[14px]', muted)}>DSI · Nordal Assurances</div>
          </div>
          <span className="ml-auto rounded-full bg-terra-blush px-3 py-1 text-[12px] font-semibold text-terra-deep">Décideur</span>
        </div>
        <ol className="mt-6 space-y-3">
          {events.map((e) => (
            <li key={e.label} className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3 text-[14px]">
              <e.icon className="h-4 w-4 text-terra" />
              <span className="font-medium">{e.label}</span>
              <span className={cn('ml-auto text-[12.5px]', muted)}>{e.when}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-auto flex items-center gap-3">
        {['Client', 'Assurance', 'Paris'].map((t) => (
          <span key={t} className="rounded-full bg-white/70 px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-black/[0.05]">
            {t}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-terra px-4 py-2.5 text-[13.5px] font-semibold text-white">
          <Plus className="h-4 w-4" /> Créer l’opportunité
        </span>
      </div>
    </Frame>
  );
}

export function OpportunityScene() {
  const stages = ['Qualification', 'Proposition', 'Négociation', 'Gagné'];
  const current = 1;
  return (
    <Frame title="Opportunité">
      <div className={cn(card, 'p-6')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[20px] font-semibold tracking-[-0.01em]">Lead dev Java</div>
            <div className={cn('text-[14px]', muted)}>Nordal Assurances · 3 mois</div>
          </div>
          <div className="text-right">
            <div className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">78 000 €</div>
            <div className={cn('text-[12.5px]', muted)}>Probabilité 60 %</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {stages.map((s, i) => (
            <div key={s}>
              <div className={cn('h-1.5 rounded-full', i <= current ? 'bg-terra' : 'bg-black/[0.07]')} />
              <div className={cn('mt-2 text-[12px] font-medium', i === current ? 'text-terra-deep' : muted)}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(card, 'mt-4 p-5')}>
        <div className={cn('mb-3 flex items-center gap-2 text-[13px] font-medium', muted)}>
          <Users className="h-4 w-4" /> Consultants compatibles
        </div>
        {[
          { n: 'Camille R.', r: 'Lead dev · 8 ans', s: 92 },
          { n: 'Thomas G.', r: 'Dev Java · 5 ans', s: 81 },
        ].map((c) => (
          <div key={c.n} className="flex items-center gap-3 border-t border-black/[0.05] py-3 first:border-0 first:pt-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-[12px] font-semibold">{c.n.slice(0, 1)}</span>
            <div>
              <div className="text-[14px] font-semibold">{c.n}</div>
              <div className={cn('text-[12.5px]', muted)}>{c.r}</div>
            </div>
            <span className="ml-auto rounded-full bg-terra-blush px-2.5 py-1 text-[13px] font-semibold tabular-nums text-terra-deep">{c.s} %</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function MissionScene() {
  return (
    <Frame title="Mission">
      <div className={cn(card, 'p-6')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[20px] font-semibold tracking-[-0.01em]">Lead dev Java</div>
            <div className={cn('text-[14px]', muted)}>Nordal Assurances · Camille R.</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[12px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
          </span>
        </div>
        <div className="mt-6 flex items-center justify-between text-[13px] font-medium">
          <span>4 nov.</span>
          <span className={muted}>3 mois</span>
          <span>3 févr.</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full w-[12%] rounded-full bg-terra" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { l: 'TJM de vente', v: '650 €' },
          { l: 'Coût / jour', v: '430 €' },
          { l: 'Marge / jour', v: '220 €', strong: true },
        ].map((s) => (
          <div key={s.l} className={cn('rounded-[20px] p-5', s.strong ? 'bg-terra text-white' : card)}>
            <div className={cn('text-[12.5px] font-medium', s.strong ? 'text-white/75' : muted)}>{s.l}</div>
            <div className="mt-2 text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{s.v}</div>
          </div>
        ))}
      </div>
      <div className={cn('mt-auto text-[13px]', muted)}>Créée depuis l’opportunité gagnée : client, besoin et montant repris.</div>
    </Frame>
  );
}

// Novembre 2026 : le 1er est un dimanche, le 11 est férié. Mission
// démarrée le 4 → 18 jours travaillés.
const NOV_START = 6; // colonnes vides avant le 1er (semaine du lundi)
export function CraScene({ fill = 1 }: { fill?: number }) {
  const cells = Array.from({ length: NOV_START + 30 }, (_, i) => (i < NOV_START ? null : i - NOV_START + 1));
  const worked = (d: number) => {
    const dow = (NOV_START + d - 1) % 7; // 0 = lundi
    return d >= 4 && dow < 5 && d !== 11;
  };
  const workedDays = cells.filter((d): d is number => d != null && worked(d));
  const shown = Math.round(workedDays.length * fill);
  return (
    <Frame title="CRA · Novembre">
      <div className={cn(card, 'p-5')}>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className={cn('pb-1 text-[11px] font-semibold', muted)}>
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <div key={i} />;
            const on = worked(d) && workedDays.indexOf(d) < shown;
            const weekend = (NOV_START + d - 1) % 7 >= 5;
            return (
              <div
                key={i}
                className={cn(
                  'flex h-[46px] flex-col items-center justify-center rounded-lg text-[12px] transition-colors duration-300',
                  on ? 'bg-terra text-white' : weekend ? 'bg-black/[0.025] text-[#B5ADA8]' : d === 11 ? 'bg-terra-blush/60 text-terra-deep' : 'bg-canvas',
                )}
              >
                <span className="font-semibold">{d}</span>
                <span className="text-[9.5px] opacity-80">{on ? '1 j' : d === 11 ? 'Férié' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 text-[12.5px] font-semibold">
        {['Saisi', 'Soumis', 'Validé'].map((s, i) => (
          <span key={s} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5', i === 2 ? 'bg-success-soft text-success' : 'bg-white ring-1 ring-black/[0.05]')}>
            {i === 2 && <Check className="h-3.5 w-3.5" />}
            {s}
          </span>
        ))}
        <span className="ml-auto text-[22px] font-semibold tabular-nums tracking-[-0.02em]">18 jours</span>
      </div>
    </Frame>
  );
}

export function MarginScene() {
  const rows = [
    { l: 'CA du mois', v: '11 700 €', w: 100, c: 'bg-ink-app' },
    { l: 'Coût consultant', v: '7 740 €', w: 66, c: 'bg-black/[0.15]' },
    { l: 'Marge', v: '3 960 €', w: 34, c: 'bg-terra' },
  ];
  return (
    <Frame title="Rentabilité · Novembre">
      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <div className="rounded-[20px] bg-terra p-6 text-white">
          <div className="text-[13px] font-medium text-white/75">Marge de la mission</div>
          <div className="mt-2 text-[44px] font-semibold tabular-nums leading-none tracking-[-0.03em]">33,8 %</div>
          <Sparkline values={[29, 31, 30.5, 32, 33, 32.6, 33.8]} color="#FFFFFF" className="mt-5 h-12" />
        </div>
        <div className={cn(card, 'flex flex-col justify-center p-6')}>
          <div className={cn('text-[13px] font-medium', muted)}>18 jours × 650 €</div>
          <div className="mt-1 text-[30px] font-semibold tabular-nums tracking-[-0.02em]">11 700 €</div>
          <div className={cn('mt-3 text-[13px]', muted)}>Prêt pour la préfacturation</div>
        </div>
      </div>
      <div className={cn(card, 'mt-4 space-y-4 p-6')}>
        {rows.map((r) => (
          <div key={r.l}>
            <div className="mb-1.5 flex justify-between text-[13.5px]">
              <span className="font-medium">{r.l}</span>
              <span className="font-semibold tabular-nums">{r.v}</span>
            </div>
            <div className="h-2 rounded-full bg-black/[0.05]">
              <div className={cn('h-full rounded-full', r.c)} style={{ width: `${r.w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
