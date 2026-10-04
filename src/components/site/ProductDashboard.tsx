'use client';

import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarRange,
  Check,
  Clock3,
  FileText,
  Home,
  Plus,
  Receipt,
  Search,
  Send,
  Settings,
  Sparkles,
  Target,
  Upload,
  Users,
} from 'lucide-react';

import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { ActivityChart, Sparkline } from '@/components/bento/charts';
import { Delta, Tile } from '@/components/bento/Tile';
import { cn } from '@/lib/utils';

import { EXAMPLE_LABEL, SERIES, eurK } from './demo-data';

export const DASHBOARD_W = 1280;
export const DASHBOARD_H = 800;

/** Zones annotables de la scène (conservé pour compatibilité). */
export type DashboardZone = 'kpis' | 'todo' | 'activity' | 'staffing' | 'pipeline';

const NAV = [Home, Target, Building2, Users, CalendarRange, Briefcase, Clock3, Receipt, BarChart3];

const ROWS = [
  { icon: Clock3, color: 'bg-terra text-white', label: 'CRA · Camille R.', amount: '18 j', date: '30 oct.', note: 'Nordal Assurances', status: 'Validé', tone: 'ok' },
  { icon: FileText, color: 'bg-ink-app text-white', label: 'Devis D-2026-041', amount: '78 000 €', date: '28 oct.', note: 'Helio Retail · DevOps', status: 'Envoyé', tone: 'wait' },
  { icon: Briefcase, color: 'bg-terra-light text-white', label: 'Fin de mission · Inès M.', amount: 'J-27', date: '31 oct.', note: 'Proposer la suite', status: 'À traiter', tone: 'alert' },
  { icon: Receipt, color: 'bg-[#E9E1DB] text-ink-app', label: 'Préfacture P-0187', amount: '12 350 €', date: '02 nov.', note: 'Varenne Énergie', status: 'Prête', tone: 'ok' },
] as const;

const STATUS = {
  ok: 'bg-success-soft text-success',
  wait: 'bg-warning-soft text-warning',
  alert: 'bg-danger-soft text-destructive',
} as const;

function Mini({ label, value, delta, spark, index }: { label: string; value: string; delta: number; spark: number[]; index: number }) {
  return (
    <Tile tone="white" index={index} className="col-span-3 h-[112px] p-4">
      <div className="flex items-center justify-between text-[12px] font-medium text-[#827A75]">
        {label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
      </div>
      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <div className="text-[24px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{value}</div>
          <div className="mt-1.5">
            <Delta value={delta} />
          </div>
        </div>
        <Sparkline values={spark} className="h-9 w-24" color="#C65F46" />
      </div>
    </Tile>
  );
}

/**
 * Le cockpit Centrium dans une mise en scène « Apple » : cartes en verre
 * dépoli, profondeur, onglets en pilule et dock flottant. Données
 * d'exemple. Taille fixe : à afficher dans un <ScaleFrame>.
 */
export function ProductDashboard(_props: { focus?: DashboardZone | null; markers?: boolean } = {}) {
  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-[30px] bg-gradient-to-b from-[#F9F7F4] to-[#F2EEEA] text-ink-app shadow-[0_60px_120px_-50px_rgba(113,52,40,0.55),0_0_0_1px_rgba(255,255,255,0.8)_inset] ring-1 ring-black/[0.06]">
      {/* Rail d'icônes */}
      <aside className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 border-r border-black/[0.05] bg-white/70 py-5 backdrop-blur">
        <CentriumLogo className="mb-4 h-9 w-9" />
        {NAV.map((Icon, i) => (
          <span key={i} className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', i === 0 ? 'bg-ink-app text-white shadow-[0_8px_18px_-8px_rgba(25,22,20,0.6)]' : 'text-[#9A918C]')}>
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </span>
        ))}
        <span className="mt-auto flex h-10 w-10 items-center justify-center text-[#9A918C]">
          <Settings className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </span>
        <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-terra-light to-terra text-[11px] font-semibold text-white">CL</span>
      </aside>

      <div className="relative min-w-0 flex-1 px-6 pt-5">
        {/* Onglets en pilule + actions rondes */}
        <header className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_16px_-10px_rgba(25,22,20,0.3)] ring-1 ring-black/[0.04]">
            {['Vue d’ensemble', 'Activité', 'Indicateurs', 'Rapports'].map((t, i) => (
              <span key={t} className={cn('rounded-full px-3.5 py-1.5', i === 0 ? 'bg-ink-app text-white' : 'text-[#827A75]')}>
                {t}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {[Search, Bell, Plus].map((Icon, i) => (
              <span key={i} className={cn('flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/[0.05]', i === 2 ? 'bg-terra text-white' : 'bg-white/90 text-[#5F5753]')}>
                <Icon className="h-4 w-4" />
              </span>
            ))}
            <span className="rounded-full bg-white/90 px-3 py-2 text-[11.5px] font-medium text-[#827A75] ring-1 ring-black/[0.05]">{EXAMPLE_LABEL}</span>
          </div>
        </header>

        <div className="mt-4 flex items-baseline gap-3">
          <h3 className="text-[22px] font-semibold tracking-[-0.025em]">Bonjour Claire</h3>
          <span className="text-[13px] text-[#827A75]">Tableau de bord · octobre</span>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-3">
          {/* Rangée 1 : trois indicateurs + objectif en dégradé */}
          <Mini label="CA signé" value="184,2 k€" delta={12.4} spark={[96, 104, 101, 118, 126, 131, 129, 142, 151, 163, 171, 184]} index={0} />
          <Mini label="Marge" value="31,8 %" delta={2.1} spark={[27, 28, 27.5, 29, 29.6, 30.1, 29.8, 30.6, 31, 31.4, 31.2, 31.8]} index={1} />
          <Mini label="Taux d’occupation" value="87 %" delta={-1.5} spark={[82, 84, 86, 88, 89, 88, 90, 89, 88, 87, 88, 87]} index={2} />
          <Tile tone="terra" index={3} className="col-span-3 h-[112px] p-4">
            <div className="flex items-center justify-between text-[12px] font-medium text-white/80">
              Objectif du trimestre
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">74 %</span>
            </div>
            <div className="mt-auto flex items-end justify-between">
              <span className="rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-terra-deep">Voir le détail</span>
              <div className="flex h-10 items-end gap-[3px]">
                {[30, 42, 38, 55, 48, 62, 58, 70, 66, 78, 74, 86].map((h, i) => (
                  <span key={i} className="w-[4px] rounded-full bg-white/80" style={{ height: `${h}%`, opacity: 0.45 + i * 0.045 }} />
                ))}
              </div>
            </div>
          </Tile>

          {/* Rangée 2 : mission, activité, pipeline */}
          <Tile tone="white" index={4} className="col-span-3 h-[262px] p-4">
            <div className="text-[12px] font-medium text-[#827A75]">Mission · Nordal Assurances</div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em]">
              650 € <span className="text-[13px] font-medium text-[#827A75]">/ jour</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-[12px]">
              {[
                ['Coût / jour', '430 €'],
                ['Marge / jour', '220 € · 33,8 %'],
                ['Période', '4 nov. → 3 févr.'],
                ['Consultant', 'Camille R.'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-[#9A918C]">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <span className="rounded-full bg-ink-app py-2 text-center text-[12px] font-semibold text-white">Prolonger</span>
              <span className="rounded-full bg-black/[0.05] py-2 text-center text-[12px] font-semibold">Ouvrir</span>
            </div>
          </Tile>

          <Tile tone="white" index={5} className="col-span-6 h-[262px] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">Activité & marge</div>
                <div className="text-[11.5px] text-[#9A918C]">CA validé, marge et prévision</div>
              </div>
              <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#827A75]">12 mois</span>
            </div>
            <div className="relative mt-1">
              <span className="absolute bottom-6 left-[68%] top-2 w-9 -translate-x-1/2 rounded-xl bg-gradient-to-b from-terra/25 to-terra/0" aria-hidden />
              <span className="absolute left-[68%] top-1 -translate-x-1/2 rounded-full bg-ink-app px-2 py-0.5 text-[10.5px] font-semibold text-white">158 k€</span>
              <ActivityChart data={SERIES.map((s) => ({ ...s, forecast: null }))} height={196} format={eurK} labels={{ revenue: 'CA', margin: 'Marge', forecast: 'Prévision' }} />
            </div>
          </Tile>

          <div className="col-span-3 flex h-[262px] flex-col gap-3">
            <Tile tone="white" index={6} className="flex-1 p-4">
              <div className="text-[12px] font-medium text-[#827A75]">Pipeline pondéré</div>
              <div className="mt-auto flex items-end justify-between">
                <span className="text-[22px] font-semibold tracking-[-0.025em] tabular-nums">312 k€</span>
                <Delta value={8.9} />
              </div>
            </Tile>
            <Tile tone="white" index={7} className="flex-1 p-4">
              <div className="text-[12px] font-medium text-[#827A75]">Taux de transformation</div>
              <div className="mt-auto flex items-end justify-between">
                <span className="text-[22px] font-semibold tracking-[-0.025em] tabular-nums">38 %</span>
                <span className="text-[11.5px] text-[#9A918C]">12 / 32</span>
              </div>
            </Tile>
          </div>

          {/* Rangée 3 : échéances + carte noire « à préfacturer » */}
          <Tile tone="white" index={8} className="col-span-9 h-[222px] p-4">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold">Échéances</div>
              <div className="flex gap-1.5 text-[11px] font-medium text-[#827A75]">
                <span className="rounded-full bg-black/[0.04] px-2.5 py-1">Cette semaine</span>
                <span className="rounded-full bg-black/[0.04] px-2.5 py-1">Filtrer</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[18px_minmax(0,2.2fr)_1fr_0.8fr_minmax(0,1.6fr)_auto] items-center gap-x-3 border-b border-black/[0.05] pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#9A918C]">
              <span />
              <span>Élément</span>
              <span>Montant</span>
              <span>Date</span>
              <span>Note</span>
              <span>Statut</span>
            </div>
            {ROWS.map((r, i) => (
              <div key={r.label} className="grid grid-cols-[18px_minmax(0,2.2fr)_1fr_0.8fr_minmax(0,1.6fr)_auto] items-center gap-x-3 border-b border-black/[0.04] py-[7px] text-[12px] last:border-0">
                <span className={cn('flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border', i === 0 ? 'border-ink-app bg-ink-app text-white' : 'border-black/20')}>{i === 0 && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span>
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg', r.color)}>
                    <r.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="font-semibold tabular-nums">{r.amount}</span>
                <span className="text-[#827A75]">{r.date}</span>
                <span className="truncate text-[#9A918C]">{r.note}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-semibold', STATUS[r.tone])}>{r.status}</span>
              </div>
            ))}
          </Tile>

          <Tile tone="ink" index={9} className="col-span-3 h-[222px] p-4">
            <svg viewBox="0 0 100 100" className="absolute -right-5 -top-5 h-28 w-28 text-white/[0.12]" aria-hidden>
              <path d="M50 4 L58 42 L96 50 L58 58 L50 96 L42 58 L4 50 L42 42 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M50 22 L54 46 L78 50 L54 54 L50 78 L46 54 L22 50 L46 46 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="text-[12px] font-medium text-white/60">À préfacturer · octobre</div>
            <div className="mt-1 text-[26px] font-semibold tracking-[-0.03em] tabular-nums">186 400 €</div>
            <div className="mt-auto grid grid-cols-3 gap-2 text-center text-[10.5px] text-white/70">
              {[
                [Receipt, 'Préfacturer'],
                [Upload, 'Exporter'],
                [Send, 'Relancer'],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Receipt;
                return (
                  <span key={label as string} className="flex flex-col items-center gap-1.5">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', i === 0 ? 'bg-terra text-white' : 'bg-white/10 text-white')}>
                      <I className="h-4 w-4" />
                    </span>
                    {label as string}
                  </span>
                );
              })}
            </div>
          </Tile>
        </div>

        {/* Dock flottant : vues du tableau de bord */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink-app/95 p-1 text-[11.5px] font-semibold text-white/60 shadow-[0_18px_40px_-14px_rgba(25,22,20,0.7)]">
          <Sparkles className="ml-2 mr-1 h-3.5 w-3.5 text-terra-light" />
          {['Direction', 'Commercial', 'Staffing', 'Finance'].map((t, i) => (
            <span key={t} className={cn('rounded-full px-3 py-1.5', i === 0 && 'bg-white text-ink-app')}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
