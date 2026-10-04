'use client';

import { BarChart3, Bell, Building2, CalendarRange, Clock3, FolderKanban, Home, Plus, Receipt, Search, Settings, Target, Users } from 'lucide-react';

import { CentriumLogo } from '@/components/brand/CentriumLogo';
import { ActivityTile, KpiTile, PipelineTile, StaffingTile, TodoTile, TopClientsTile } from '@/components/bento/widgets';
import { cn } from '@/lib/utils';

import { CLIENTS, EXAMPLE_LABEL, KPIS, PIPELINE, SERIES, STAFF, TODO, eurK } from './demo-data';

export const DASHBOARD_W = 1280;
export const DASHBOARD_H = 800;

/** Zones annotées dans la scène « Tout voir. Sans tout chercher. » */
export type DashboardZone = 'kpis' | 'todo' | 'activity' | 'staffing' | 'pipeline';

const NAV = [Home, Target, Building2, Users, CalendarRange, FolderKanban, Clock3, Receipt, BarChart3];

function Zone({ id, focus, className, children }: { id: DashboardZone; focus?: DashboardZone | null; className?: string; children: React.ReactNode }) {
  const dim = focus != null && focus !== id;
  return (
    <div data-zone={id} className={cn('relative min-w-0 transition-[opacity,filter] duration-500', dim && 'opacity-30 [filter:saturate(.4)]', className)}>
      {children}
    </div>
  );
}

/**
 * Le cockpit Centrium dessiné avec les widgets de l'application (mêmes
 * composants que le vrai tableau de bord), alimenté par des données
 * d'exemple. Taille fixe : à afficher dans un <ScaleFrame>.
 */
export function ProductDashboard({ focus = null, markers = false }: { focus?: DashboardZone | null; markers?: boolean }) {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-[22px] bg-canvas text-ink-app shadow-[0_40px_80px_-40px_rgba(25,22,20,.45)] ring-1 ring-black/[0.06]">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-black/[0.05] bg-white py-4">
        <CentriumLogo className="mb-4 h-8 w-8" />
        {NAV.map((Icon, i) => (
          <span key={i} className={cn('flex h-10 w-10 items-center justify-center rounded-xl', i === 0 ? 'bg-terra-blush text-terra-deep' : 'text-[#827A75]')}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
        ))}
        <span className="mt-auto flex h-10 w-10 items-center justify-center text-[#827A75]">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <span className="flex h-10 w-10 items-center justify-center text-[#827A75]">
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-app text-[11px] font-semibold text-white">CL</span>
      </aside>

      <div className="relative min-w-0 flex-1 px-6 pt-5">
        <header className="flex items-center gap-4">
          <div className="min-w-0">
            <div className="text-[12px] text-[#827A75]">Tableau de bord · Octobre</div>
            <div className="text-[22px] font-semibold tracking-[-0.02em]">Bonjour Claire</div>
          </div>
          <div className="ml-auto flex h-10 w-[300px] items-center gap-2 rounded-xl bg-white px-3 text-[13px] text-[#827A75] ring-1 ring-black/[0.05]">
            <Search className="h-4 w-4" />
            Rechercher un client, un consultant…
            <span className="ml-auto rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px]">⌘K</span>
          </div>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-terra px-4 text-[13px] font-semibold text-white">
            <Plus className="h-4 w-4" /> Créer
          </span>
          <span className="rounded-xl bg-white px-3 py-2 text-[12px] font-medium ring-1 ring-black/[0.05]">{EXAMPLE_LABEL}</span>
        </header>

        <div className="mt-4 flex gap-1 text-[11.5px] font-semibold tracking-[0.12em]">
          {['DIRECTION', 'COMMERCIAL', 'STAFFING', 'FINANCE'].map((t, i) => (
            <span key={t} className={cn('rounded-lg px-3 py-1.5', i === 0 ? 'bg-ink-app text-white' : 'text-[#827A75]')}>
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-12 gap-4">
          <Zone id="kpis" focus={focus} className="col-span-8 grid grid-cols-2 gap-4">
            <KpiTile data={KPIS[0]!} tone="white" index={0} className="h-[196px]" />
            <KpiTile data={KPIS[1]!} tone="terra" index={1} className="h-[196px]" />
            {markers && <Marker n="01" className="-left-2 -top-2" />}
          </Zone>
          <Zone id="todo" focus={focus} className="col-span-4">
            <TodoTile title="À traiter" items={TODO} tone="peach" index={2} emptyLabel="Rien à traiter" className="h-[196px]" />
            {markers && <Marker n="02" className="-right-2 -top-2" />}
          </Zone>

          <Zone id="activity" focus={focus} className="col-span-8">
            <ActivityTile title="Activité & marge" series={SERIES} format={eurK} labels={{ revenue: 'CA', margin: 'Marge', forecast: 'Prévision' }} tone="white" index={3} height={196} className="h-[318px]" />
            {markers && <Marker n="03" className="-left-2 -top-2" />}
          </Zone>
          <Zone id="staffing" focus={focus} className="col-span-4">
            <StaffingTile title="Staffing" rows={STAFF.slice(0, 4)} cta={{ label: 'Ouvrir le staffing' }} tone="ivory" index={4} emptyLabel="Aucun consultant" className="h-[318px]" />
            {markers && <Marker n="04" className="-right-2 -top-2" />}
          </Zone>

          <Zone id="pipeline" focus={focus} className="col-span-7">
            <PipelineTile title="Pipeline" stages={PIPELINE} total={420000} weighted={312000} count={18} format={eurK} labels={{ total: 'Total', weighted: 'Pondéré', count: 'Opportunités' }} tone="soft" index={5} />
            {markers && <Marker n="05" className="-left-2 -top-2" />}
          </Zone>
          <Zone id="pipeline" focus={focus} className="col-span-5">
            <TopClientsTile title="Top clients" rows={CLIENTS} format={eurK} emptyLabel="Aucun client" labels={{ share: 'Part du CA', margin: 'Marge', consultants: 'consultants' }} index={6} />
          </Zone>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" />
      </div>
    </div>
  );
}

function Marker({ n, className }: { n: string; className?: string }) {
  return <span className={cn('absolute z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-ivory ring-4 ring-canvas', className)}>{n}</span>;
}
