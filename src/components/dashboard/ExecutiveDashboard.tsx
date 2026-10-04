'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, EyeOff, LayoutGrid, Plus, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import {
  ActivityFeedTile,
  ActivityTile,
  KpiTile,
  MissionsTile,
  PipelineTile,
  StaffingTile,
  TodoTile,
  TopClientsTile,
  type KpiData,
} from '@/components/bento/widgets';
import { Tile } from '@/components/bento/Tile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/app/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { PIPELINE_STAGES } from '@/lib/crm/pipeline';
import { formatDate, formatEurCompact, formatPct, monthLabel } from '@/lib/format';
import {
  DASHBOARD_VIEWS,
  DEFAULT_LAYOUTS,
  WIDGETS,
  resolveLayout,
  widgetAllowed,
  type DashboardView,
  type LayoutItem,
  type WidgetId,
  type WidgetSize,
} from '@/lib/dashboard/widgets';
import type { ExecutiveDashboard as Exec } from '@/lib/dashboard/types';
import type { ActionKind } from '@/lib/pilotage/load-dashboard';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en';

const VIEW_LABEL: Record<DashboardView, { fr: string; en: string }> = {
  direction: { fr: 'Direction', en: 'Leadership' },
  commercial: { fr: 'Commercial', en: 'Sales' },
  staffing: { fr: 'Staffing', en: 'Staffing' },
  finance: { fr: 'Finance', en: 'Finance' },
};

/** Actions « à traiter » pertinentes pour chaque vue. */
const VIEW_ACTIONS: Record<DashboardView, ActionKind[] | null> = {
  direction: null,
  commercial: ['opportunity_stale', 'quote_expiring', 'client_request', 'consultant_match'],
  staffing: ['missions_ending', 'consultants_soon', 'consultant_match', 'timesheets_pending'],
  finance: ['timesheets_pending', 'prefacture_pending', 'quote_expiring'],
};

const SPAN: Record<WidgetSize, string> = {
  sm: 'md:col-span-1 xl:col-span-4',
  md: 'md:col-span-2 xl:col-span-6',
  lg: 'md:col-span-2 xl:col-span-8',
  full: 'md:col-span-2 xl:col-span-12',
};

const VIEW_KEY = 'centrium-dashboard-view:';

async function fetchDashboard(): Promise<Exec> {
  const res = await fetch('/api/dashboard', { cache: 'no-store' });
  if (!res.ok) throw new Error(`dashboard_${res.status}`);
  return ((await res.json()) as { data: Exec }).data;
}

function ago(at: string, lang: Lang): string {
  const diff = Math.max(0, Date.now() - new Date(at).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 60) return lang === 'fr' ? `il y a ${Math.max(1, min)} min` : `${Math.max(1, min)} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return lang === 'fr' ? `il y a ${h} h` : `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return lang === 'fr' ? 'hier' : 'yesterday';
  return lang === 'fr' ? `il y a ${d} j` : `${d} d ago`;
}

/** Tableau de bord exécutif : vues, grille Bento, personnalisation. */
export function ExecutiveDashboard() {
  const { activeOrgId, user } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang: Lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';

  // ── Données (un appel serveur) ──────────────────────────────────────────
  const { data, loading, refreshing, error, reload } = useCachedQuery<Exec>(`exec-dashboard:${activeOrgId ?? 'none'}`, fetchDashboard, {
    enabled: !!activeOrgId && ready,
  });
  useRealtimeReload(['missions', 'timesheets', 'opportunities', 'consultants', 'invoices'], () => void reload(), {
    debounceMs: 1500,
    enabled: !!activeOrgId,
  });

  // ── Vue active (mémorisée sur l'appareil) ───────────────────────────────
  const viewKey = `${VIEW_KEY}${user?.id ?? 'anon'}`;
  const [view, setView] = useState<DashboardView>('direction');
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(viewKey);
      if (v && (DASHBOARD_VIEWS as readonly string[]).includes(v)) setView(v as DashboardView);
    } catch {
      /* stockage indisponible */
    }
  }, [viewKey]);
  const chooseView = (v: DashboardView) => {
    setView(v);
    try {
      window.localStorage.setItem(viewKey, v);
    } catch {
      /* ignore */
    }
  };

  // ── Dispositions personnelles (serveur) ─────────────────────────────────
  const [layouts, setLayouts] = useState<Partial<Record<DashboardView, LayoutItem[]>>>({});
  const [storageReady, setStorageReady] = useState(true);
  useEffect(() => {
    if (!activeOrgId) return;
    let cancelled = false;
    fetch('/api/dashboard/layout', { cache: 'no-store' })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 204) {
          setStorageReady(false);
          return;
        }
        if (r.ok) setLayouts(((await r.json()) as { data: Partial<Record<DashboardView, LayoutItem[]>> }).data ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  const layout = useMemo(() => resolveLayout(view, layouts[view]), [view, layouts]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (v: DashboardView, next: LayoutItem[]) => {
      setLayouts((prev) => ({ ...prev, [v]: next }));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch('/api/dashboard/layout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ view: v, widgets: next }),
        })
          .then((r) => {
            if (!r.ok) {
              setStorageReady(false);
              toast.error(fr ? 'Disposition non enregistrée : elle sera perdue au rechargement.' : 'Layout not saved: it will be lost on reload.');
            }
          })
          .catch(() => toast.error(fr ? 'Disposition non enregistrée.' : 'Layout not saved.'));
      }, 400);
    },
    [fr],
  );
  const resetView = () => {
    setLayouts((prev) => {
      const next = { ...prev };
      delete next[view];
      return next;
    });
    void fetch(`/api/dashboard/layout?view=${view}`, { method: 'DELETE' });
  };

  // ── Personnalisation ────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const allowed = (id: WidgetId) => widgetAllowed(WIDGETS[id], can);
  const visible = layout.filter((i) => !i.hidden && allowed(i.id));
  const addable = layout.filter((i) => i.hidden && allowed(i.id));

  function move(id: WidgetId, dir: -1 | 1) {
    const order = visible.map((i) => i.id);
    const idx = order.indexOf(id);
    const swap = order[idx + dir];
    if (swap == null) return;
    const next = [...layout];
    const a = next.findIndex((i) => i.id === id);
    const b = next.findIndex((i) => i.id === swap);
    [next[a], next[b]] = [next[b]!, next[a]!];
    persist(view, next);
  }
  function setHidden(id: WidgetId, hidden: boolean) {
    const next = layout.map((i) => (i.id === id ? { ...i, hidden } : i));
    if (!hidden) {
      // Un widget ajouté se place en fin de grille.
      const item = next.find((i) => i.id === id)!;
      persist(view, [...next.filter((i) => i.id !== id), item]);
    } else {
      persist(view, next);
    }
  }

  // ── Rendu des widgets ───────────────────────────────────────────────────
  const k = data?.summary.kpis;
  const series = useMemo(
    () => (data?.series ?? []).map((p) => ({ label: monthLabel(p.key, lang), revenue: p.realized, margin: p.margin, forecast: p.forecast })),
    [data?.series, lang],
  );
  const eur = (n: number) => formatEurCompact(n, lang);

  function kpi(id: WidgetId): KpiData | null {
    if (!data || !k) return null;
    switch (id) {
      case 'revenue':
        return {
          label: fr ? 'CA signé' : 'Booked revenue',
          value: formatEurCompact(k.bookedRevenue, lang),
          spark: data.series.filter((p) => p.realized != null).slice(-7).map((p) => p.realized ?? 0),
          foot: fr ? 'Carnet de commandes · missions actives' : 'Order book · active missions',
          href: '/finance',
        };
      case 'margin': {
        const spark = data.series
          .filter((p) => p.realized && p.margin != null)
          .slice(-7)
          .map((p) => Math.round(((p.margin ?? 0) / (p.realized || 1)) * 1000) / 10);
        return {
          label: fr ? 'Marge' : 'Margin',
          value: formatPct(k.marginPct, lang),
          spark,
          foot:
            k.marginTotal > 0
              ? fr
                ? `${k.marginCovered} mission${k.marginCovered > 1 ? 's' : ''} sur ${k.marginTotal} avec coût connu`
                : `${k.marginCovered} of ${k.marginTotal} missions with a known cost`
              : fr
                ? 'Aucune mission active'
                : 'No active mission',
          href: '/finance',
        };
      }
      case 'occupancy': {
        const pts = data.occupancy.map((o) => o.rate).filter((r): r is number => r != null);
        const delta = pts.length >= 2 ? Math.round((pts[pts.length - 1]! - pts[pts.length - 2]!) * 10) / 10 : null;
        return {
          label: fr ? 'Taux d’occupation' : 'Utilisation',
          value: formatPct(k.occupancyRate, lang),
          delta,
          deltaSuffix: ' pt',
          spark: pts,
          progress: k.occupancyRate,
          foot: fr ? `${k.staffed} sur ${k.capacity} consultants en mission` : `${k.staffed} of ${k.capacity} consultants staffed`,
          href: '/staffing',
        };
      }
      case 'pipeline-kpi':
        return {
          label: fr ? 'Pipeline pondéré' : 'Weighted pipeline',
          value: formatEurCompact(k.weightedPipeline, lang),
          foot: fr ? `${k.openOpportunities} opportunité${k.openOpportunities > 1 ? 's' : ''} ouverte${k.openOpportunities > 1 ? 's' : ''}` : `${k.openOpportunities} open opportunities`,
          href: '/crm',
        };
      case 'ending': {
        const b = data.summary.endingBuckets;
        return {
          label: fr ? 'Fins de mission · 30 j' : 'Missions ending · 30 d',
          value: String(k.missionsEnding30),
          foot: fr ? `15 j : ${b[15]} · 60 j : ${b[60]} · 90 j : ${b[90]}` : `15 d: ${b[15]} · 60 d: ${b[60]} · 90 d: ${b[90]}`,
          href: '/missions?ending=30',
        };
      }
      default:
        return null;
    }
  }

  const TONE: Partial<Record<WidgetId, 'white' | 'terra' | 'ivory' | 'soft' | 'peach' | 'deep'>> = {
    revenue: 'white',
    margin: 'terra',
    occupancy: 'ivory',
    'pipeline-kpi': 'soft',
    ending: 'deep',
  };

  function renderWidget(id: WidgetId, index: number): React.ReactNode {
    if (!data) return null;
    const kd = kpi(id);
    if (kd) return <KpiTile data={kd} tone={TONE[id] ?? 'white'} index={index} className="h-full" />;
    switch (id) {
      case 'todo': {
        const kinds = VIEW_ACTIONS[view];
        const items = data.summary.actions
          .filter((a) => !kinds || kinds.includes(a.kind))
          // Le titre porte déjà le nombre : pas de compteur en double.
          .map((a) => ({ id: a.id, label: a.title[lang], detail: a.detail?.[lang], href: a.href }));
        return (
          <TodoTile
            title={fr ? 'À traiter' : 'To handle'}
            items={items}
            tone="peach"
            index={index}
            storageKey={`centrium-todo:${user?.id ?? 'anon'}:${activeOrgId ?? ''}`}
            emptyLabel={fr ? 'Rien à traiter aujourd’hui.' : 'Nothing to handle today.'}
            className="h-full"
          />
        );
      }
      case 'activity': {
        if (!data.visibility.revenue) return null;
        const cur = data.series.find((p) => p.forecast != null);
        return (
          <ActivityTile
            title={fr ? 'Activité & marge' : 'Activity & margin'}
            series={series}
            format={eur}
            labels={{ revenue: fr ? 'CA validé' : 'Approved revenue', margin: fr ? 'Marge' : 'Margin', forecast: fr ? 'Prévision' : 'Forecast' }}
            index={index}
            height={260}
            fill
            className="h-full"
            summary={
              cur ? (
                <div className="mt-1 text-[22px] font-semibold tracking-[-0.02em] tabular-nums">
                  {formatEurCompact(cur.forecast, lang)}
                  <span className="ml-2 text-[12.5px] font-normal text-muted-foreground">{fr ? 'prévus ce mois-ci' : 'forecast this month'}</span>
                </div>
              ) : undefined
            }
          />
        );
      }
      case 'staffing':
        return (
          <StaffingTile
            title={fr ? 'Staffing' : 'Staffing'}
            rows={data.staffing.slice(0, 6).map((r) => ({ ...r, detail: r.detail[lang], href: `/consultants/${r.id}` }))}
            cta={{ label: fr ? 'Ouvrir le staffing' : 'Open staffing', href: '/staffing' }}
            tone="ivory"
            index={index}
            emptyLabel={fr ? 'Aucun consultant dans l’effectif.' : 'No consultant yet.'}
            className="h-full"
          />
        );
      case 'missions':
        return (
          <MissionsTile
            title={fr ? 'Missions' : 'Missions'}
            rows={data.missions.slice(0, 5).map((m) => ({ ...m, end: m.end ? formatDate(m.end, lang, 'short') : null, href: `/missions/${m.id}` }))}
            cta={{ label: fr ? 'Toutes' : 'All', href: '/missions' }}
            index={index}
            emptyLabel={fr ? 'Aucune mission active.' : 'No active mission.'}
            className="h-full"
          />
        );
      case 'pipeline': {
        const stages = data.summary.stages.map((s) => ({
          key: s.stage,
          label: PIPELINE_STAGES.find((p) => p.id === s.stage)?.label[lang] ?? s.stage,
          amount: s.amount,
          count: s.count,
        }));
        return (
          <PipelineTile
            title={fr ? 'Pipeline' : 'Pipeline'}
            stages={stages}
            total={stages.reduce((t, s) => t + s.amount, 0)}
            weighted={data.summary.kpis.weightedPipeline}
            count={data.summary.kpis.openOpportunities}
            format={eur}
            labels={{ total: fr ? 'Total' : 'Total', weighted: fr ? 'Pondéré' : 'Weighted', count: fr ? 'Ouvertes' : 'Open' }}
            index={index}
            href="/crm"
            className="h-full"
          />
        );
      }
      case 'clients':
        return (
          <TopClientsTile
            title={fr ? 'Top clients · 12 mois' : 'Top clients · 12 months'}
            rows={data.clients.map((c) => ({ ...c, href: `/clients/${c.id}` }))}
            format={eur}
            index={index}
            emptyLabel={fr ? 'Aucun CRA validé sur 12 mois.' : 'No approved timesheet over 12 months.'}
            labels={{ share: fr ? 'Part du CA' : 'Share of revenue', margin: fr ? 'Marge' : 'Margin', consultants: fr ? 'consultants' : 'consultants' }}
            className="h-full"
          />
        );
      case 'feed':
        return (
          <ActivityFeedTile
            title={fr ? 'Activité récente' : 'Recent activity'}
            rows={data.activity.map((a) => ({ id: a.id, label: a.label[lang], detail: a.detail ?? undefined, when: ago(a.at, lang), href: a.href }))}
            index={index}
            emptyLabel={fr ? 'Aucune activité ces dernières semaines.' : 'No activity in recent weeks.'}
          />
        );
      default:
        return null;
    }
  }

  const today = new Date();
  const nothingYet =
    !!k && k.activeConsultants === 0 && k.openOpportunities === 0 && (data?.series ?? []).every((p) => !p.forecast && !p.realized);

  return (
    <div className="mx-auto w-full max-w-[1480px]">
      {/* Barre de vue : Direction / Commercial / Staffing / Finance */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <p className="text-[13px] text-muted-foreground">{formatDate(today.toISOString().slice(0, 10), lang, 'long')}</p>
          <div role="tablist" aria-label={fr ? 'Vue du tableau de bord' : 'Dashboard view'} className="no-scrollbar mt-2 inline-flex max-w-full overflow-x-auto rounded-xl bg-black/[0.04] p-1">
            {DASHBOARD_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => chooseView(v)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-focus',
                  view === v ? 'bg-ink-app text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {VIEW_LABEL[v][lang]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setAdding(true)} disabled={addable.length === 0}>
                <Plus />
                {fr ? 'Ajouter un widget' : 'Add a widget'}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetView}>
                <RotateCcw />
                {fr ? 'Réinitialiser' : 'Reset'}
              </Button>
              <Button size="sm" onClick={() => setEditing(false)}>
                {fr ? 'Terminer' : 'Done'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => void reload()} disabled={refreshing} aria-label={fr ? 'Actualiser' : 'Refresh'}>
                <RefreshCw className={cn(refreshing && 'animate-spin')} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <SlidersHorizontal />
                {fr ? 'Personnaliser' : 'Customise'}
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && !storageReady && (
        <p className="mb-4 rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          {fr
            ? 'L’enregistrement des dispositions n’est pas encore activé sur cet environnement : vos changements ne seront pas conservés.'
            : 'Layout storage is not enabled on this environment yet: your changes will not be kept.'}
        </p>
      )}

      {error && !data ? (
        <EmptyState
          icon={LayoutGrid}
          title={fr ? 'Tableau de bord indisponible' : 'Dashboard unavailable'}
          description={fr ? 'Les indicateurs n’ont pas pu être chargés.' : 'Metrics could not be loaded.'}
          action={
            <Button size="sm" onClick={() => void reload()}>
              {fr ? 'Réessayer' : 'Retry'}
            </Button>
          }
        />
      ) : loading && !data ? (
        <DashboardSkeleton view={view} />
      ) : (
        <>
          {nothingYet && (
            <Tile tone="ivory" className="mb-4">
              <p className="text-[15px] font-semibold">{fr ? 'Votre cockpit se remplira avec vos données.' : 'Your cockpit fills up with your data.'}</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                {fr
                  ? 'Ajoutez vos consultants, vos clients et vos premières opportunités : chaque indicateur est calculé à partir de ce que vous saisissez.'
                  : 'Add your consultants, clients and first opportunities: every metric is computed from what you enter.'}
              </p>
            </Tile>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 [grid-auto-flow:dense]">
            {visible.map((item, i) => {
              const node = renderWidget(item.id, i);
              if (!node) return null;
              const def = WIDGETS[item.id];
              return (
                <div key={item.id} className={cn('relative min-w-0', SPAN[def.size], def.tall && 'xl:row-span-2', editing && 'rounded-card outline-dashed outline-2 outline-offset-4 outline-terra/40')}>
                  {node}
                  {editing && (
                    <div className="absolute -top-4 right-4 z-10 flex items-center gap-1 rounded-xl bg-white p-1 shadow-md ring-1 ring-black/[0.06]">
                      <button type="button" onClick={() => move(item.id, -1)} disabled={i === 0} aria-label={fr ? `Monter ${def.label.fr}` : `Move ${def.label.en} up`} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-app hover:bg-black/[0.05] disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => move(item.id, 1)} disabled={i === visible.length - 1} aria-label={fr ? `Descendre ${def.label.fr}` : `Move ${def.label.en} down`} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-app hover:bg-black/[0.05] disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setHidden(item.id, true)} aria-label={fr ? `Masquer ${def.label.fr}` : `Hide ${def.label.en}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-app hover:bg-black/[0.05]">
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{fr ? 'Ajouter un widget' : 'Add a widget'}</DialogTitle>
            <DialogDescription>
              {fr ? `Vue ${VIEW_LABEL[view].fr} · les widgets s’ajoutent en fin de grille.` : `${VIEW_LABEL[view].en} view · widgets are added at the end.`}
            </DialogDescription>
          </DialogHeader>
          {addable.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">{fr ? 'Tous les widgets disponibles sont affichés.' : 'All available widgets are shown.'}</p>
          ) : (
            <ul className="space-y-2">
              {addable.map((item) => {
                const def = WIDGETS[item.id];
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{def.label[lang]}</div>
                      <div className="text-[13px] text-muted-foreground">{def.description[lang]}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setHidden(item.id, false);
                        if (addable.length <= 1) setAdding(false);
                      }}
                    >
                      <Plus />
                      {fr ? 'Ajouter' : 'Add'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Squelette fidèle à la grille de la vue (pas de saut de mise en page). */
function DashboardSkeleton({ view }: { view: DashboardView }) {
  const items = DEFAULT_LAYOUTS[view].filter((i) => !i.hidden);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 [grid-auto-flow:dense]" aria-busy="true">
      {items.map((item) => {
        const def = WIDGETS[item.id];
        return (
          <div key={item.id} className={cn(SPAN[def.size], def.tall && 'xl:row-span-2')}>
            <Skeleton className={cn('w-full rounded-card', def.tall ? 'h-[420px]' : def.size === 'full' ? 'h-48' : 'h-[200px]')} />
          </div>
        );
      })}
    </div>
  );
}
