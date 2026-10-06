'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlarmClock, AlertTriangle, CheckCircle2, Kanban, PauseCircle, Plus, Trophy, Wallet, X, XCircle, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/app/EmptyState';
import { showBrandToast } from '@/components/ui/BrandToast';
import { StatStrip } from '@/components/app/StatStrip';
import { OpportunityQuickView, type QuickViewMode } from '@/components/crm/OpportunityQuickView';
import { CrmToolbar } from '@/components/crm/CrmToolbar';
import { OpportunityCard } from '@/components/crm/OpportunityCard';
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCrmRealtime } from '@/hooks/useCrmRealtime';
import { useIsoLayoutEffect } from '@/hooks/useIsoLayoutEffect';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { crmService } from '@/lib/services/crm.service';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';
import { OPEN_STAGES, STAGE_BY_ID, probabilityForMove, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { FOCUS_LABEL, compareDeals, dealUrgency, focusCounts, isDealFocus, matchesFocus, weightedAmount, type DealSort } from '@/lib/crm/deal-health';
import { opportunityAmount, weightedPipeline } from '@/lib/pilotage/metrics';
import { summarizePipeline } from '@/lib/crm/summary';
import type { OpportunityV2Input } from '@/lib/validators/v2';
import { formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity, OpportunityStatus } from '@/types';
import { SectionTabs } from '@/components/layout/SectionTabs';

const DRAG_MIME = 'application/x-opportunity-id';
const SORT_KEY = 'centrium-crm-sort';

/** Colonne du tableau, ou issue (gagnée, perdue, en veille). */
type Target = PipelineStageId | 'on_hold';

const DOT: Record<string, string> = {
  success: 'bg-success',
  danger: 'bg-destructive',
  warning: 'bg-warning',
  brand: 'bg-primary',
  info: 'bg-info',
  neutral: 'bg-muted-foreground/60',
};

const SORTS: Array<{ id: DealSort; label: { fr: string; en: string } }> = [
  { id: 'urgency', label: { fr: 'Urgence d’abord', en: 'Most urgent first' } },
  { id: 'amount', label: { fr: 'Montant', en: 'Amount' } },
  { id: 'close', label: { fr: 'Clôture prévue', en: 'Expected close' } },
  { id: 'recent', label: { fr: 'Activité récente', en: 'Recent activity' } },
];

/** Issues : hors colonnes, résumées au-dessus du tableau et cibles de dépôt. */
const OUTCOMES: Array<{
  id: 'won' | 'lost' | 'on_hold';
  icon: LucideIcon;
  label: { fr: string; en: string };
  drop: { fr: string; en: string };
  iconClass: string;
  overClass: string;
}> = [
  { id: 'won', icon: CheckCircle2, label: { fr: 'Gagnées', en: 'Won' }, drop: { fr: 'Gagnée', en: 'Won' }, iconClass: 'text-success', overClass: 'border-success bg-success-soft' },
  { id: 'lost', icon: XCircle, label: { fr: 'Perdues', en: 'Lost' }, drop: { fr: 'Perdue', en: 'Lost' }, iconClass: 'text-destructive', overClass: 'border-destructive bg-danger-soft' },
  { id: 'on_hold', icon: PauseCircle, label: { fr: 'En veille', en: 'On hold' }, drop: { fr: 'En veille', en: 'On hold' }, iconClass: 'text-muted-foreground', overClass: 'border-foreground/40 bg-muted' },
];

function statusFor(target: Target): OpportunityStatus {
  return target === 'on_hold' ? 'on_hold' : STAGE_BY_ID.get(target)!.canonical;
}

/**
 * CRM — tableau des opportunités : une colonne par étape de travail, de
 * « Prospect » à « Négociation ». Gagnées, perdues et en veille sortent du
 * tableau : on y dépose une carte, et le lien ouvre la liste filtrée.
 * Les indicateurs servent aussi de filtres rapides (`?focus=`).
 */
export default function CrmPipelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrgId, user } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('crm.edit') || can('opportunities.edit');
  const canConvert = canEdit && can('missions.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: members, options: memberOptions } = useTeamMembers();

  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState<string>('all');
  const [sort, setSortState] = useState<DealSort>('urgency');
  const [drawer, setDrawer] = useState<{ open: boolean; opp: Opportunity | null; stage?: PipelineStageId }>({
    open: params.get('new') === '1',
    opp: null,
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Aperçu dans un tiroir : on garde le kanban derrière.
  const [quick, setQuick] = useState<{ id: string; mode: QuickViewMode } | null>(null);
  const [over, setOver] = useState<Target | null>(null);
  const dropped = useRef(false);
  const highlightStage = params.get('stage') as PipelineStageId | null;
  const focusParam = params.get('focus');
  const focus = isDealFocus(focusParam) ? focusParam : 'all';
  const today = new Date().toISOString().slice(0, 10);

  // Tri mémorisé sur l'appareil (appliqué après le premier rendu).
  useIsoLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(SORT_KEY);
      if (saved && SORTS.some((s) => s.id === saved)) setSortState(saved as DealSort);
    } catch {
      // stockage indisponible : tri par défaut
    }
  }, []);
  function setSort(next: DealSort) {
    setSortState(next);
    try {
      window.localStorage.setItem(SORT_KEY, next);
    } catch {
      // stockage indisponible
    }
  }

  const { data, loading, reload, setData } = useCachedQuery<Opportunity[]>(
    `crm-opps:${activeOrgId ?? 'none'}`,
    async () => {
      const { data: rows } = await createClient()
        .from('opportunities')
        .select('*')
        .eq('organization_id', activeOrgId!)
        .order('updated_at', { ascending: false })
        .limit(3000);
      return ((rows ?? []) as Opportunity[]).filter((o) => !o.archived);
    },
    { enabled: !!activeOrgId },
  );

  const { broadcastDrag, broadcastDrop, broadcastCancel, peerByOpp, peerByColumn } = useCrmRealtime({
    onDataChange: () => void reload(),
    onPeerDrop: (oppId, toStatus) =>
      setData((list) => (list ?? []).map((o) => (o.id === oppId ? { ...o, status: toStatus } : o))),
  });

  const opps = useMemo(() => data ?? [], [data]);
  // Recherche et responsable : base des indicateurs et des compteurs de filtres.
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opps.filter((o) => {
      if (owner === 'mine' && o.owner_id !== user?.id) return false;
      if (owner !== 'all' && owner !== 'mine' && o.owner_id !== owner) return false;
      if (!q) return true;
      const client = o.company_id ? (companies.get(o.company_id)?.name ?? '') : '';
      return `${o.title} ${client} ${o.next_action ?? ''}`.toLowerCase().includes(q);
    });
  }, [opps, query, owner, user?.id, companies]);
  const filtered = useMemo(() => scoped.filter((o) => matchesFocus(o, focus, today)), [scoped, focus, today]);
  const counts = useMemo(() => focusCounts(scoped, today), [scoped, today]);

  const compare = compareDeals(sort, today);
  const openTotal = scoped.filter((o) => OPEN_STAGES.some((s) => s.id === stageOf(o.status))).reduce((s, o) => s + opportunityAmount(o), 0);
  const columns = OPEN_STAGES.map((stage) => {
    const items = filtered.filter((o) => stageOf(o.status) === stage.id).sort(compare);
    return {
      stage,
      items,
      amount: items.reduce((s, o) => s + opportunityAmount(o), 0),
      weighted: items.reduce((s, o) => s + weightedAmount(o), 0),
      late: items.filter((o) => dealUrgency(o, today).level === 'late').length,
    };
  });
  const outcomeCount = (id: 'won' | 'lost' | 'on_hold') =>
    scoped.filter((o) => (id === 'on_hold' ? o.status === 'on_hold' : stageOf(o.status) === id)).length;

  async function setStatus(opp: Opportunity, status: OpportunityStatus, probability: number, extra: { lost_reason?: string | null } = {}) {
    setData((list) => (list ?? []).map((o) => (o.id === opp.id ? { ...o, status, probability, ...extra } : o)));
    const res = await crmService.moveOpportunity(opp, status, probability, extra);
    if (res.error) {
      setData((list) => (list ?? []).map((o) => (o.id === opp.id ? opp : o)));
      toast.error(fr ? 'Déplacement impossible' : 'Could not move the opportunity');
      return false;
    }
    return true;
  }

  async function move(oppId: string, to: Target, extra: { lost_reason?: string | null } = {}, opts: { quiet?: boolean } = {}) {
    const opp = opps.find((o) => o.id === oppId);
    if (!opp) return false;
    const status = statusFor(to);
    if (to === 'on_hold' ? opp.status === 'on_hold' : stageOf(opp.status) === to) return true;
    const probability = to === 'on_hold' ? (opp.probability ?? 0) : probabilityForMove(opp.probability, to);
    if (!(await setStatus(opp, status, probability, extra))) return false;

    const label = to === 'on_hold' ? (fr ? 'En veille' : 'On hold') : STAGE_BY_ID.get(to)!.label[lang];
    void broadcastOrgActivity(activeOrgId, user?.id, 'opportunity_moved', `${opp.title} → ${label}`, `/opportunities/${opp.id}`);
    if (opts.quiet) return true;
    // Une carte qui quitte le tableau peut être remise à sa place.
    const undo = {
      label: fr ? 'Annuler' : 'Undo',
      onClick: () => void setStatus({ ...opp, status }, opp.status, opp.probability ?? 0, 'lost_reason' in extra ? { lost_reason: opp.lost_reason } : {}),
    };
    if (to === 'won') {
      showBrandToast('celebration', fr ? 'Opportunité gagnée' : 'Opportunity won', {
        description: fr ? `« ${opp.title} » — prochaine étape : la mission.` : `“${opp.title}” — next step: the mission.`,
        actions: canConvert ? [{ label: fr ? 'Créer la mission' : 'Create the mission', onClick: () => router.push(`/missions?new=1&opportunity=${opp.id}`) }, undo] : [undo],
      });
    } else if (to === 'lost' || to === 'on_hold') {
      showBrandToast('milestone', fr ? `« ${opp.title} » : ${label.toLowerCase()}` : `“${opp.title}”: ${label.toLowerCase()}`, {
        description: extra.lost_reason ?? undefined,
        actions: [undo],
      });
    }
    return true;
  }

  /** Gagner l'affaire si besoin, puis ouvrir la création de mission pré-remplie. */
  async function convert(opp: Opportunity) {
    if (stageOf(opp.status) !== 'won' && !(await move(opp.id, 'won', {}, { quiet: true }))) return;
    router.push(`/missions?new=1&opportunity=${opp.id}`);
  }

  /** Édition rapide depuis le tiroir : affichage immédiat, retour arrière si refus. */
  async function patch(opp: Opportunity, values: Partial<OpportunityV2Input>) {
    setData((list) => (list ?? []).map((o) => (o.id === opp.id ? ({ ...o, ...values } as Opportunity) : o)));
    const res = await crmService.patchOpportunity(opp, values);
    if (res.error || !res.data) {
      setData((list) => (list ?? []).map((o) => (o.id === opp.id ? opp : o)));
      toast.error(res.error?.message ?? (fr ? 'Modification impossible' : 'Could not save'));
      return false;
    }
    replace(res.data);
    return true;
  }

  function replace(updated: Opportunity) {
    setData((list) => (list ?? []).map((o) => (o.id === updated.id ? updated : o)));
  }

  async function remove(opp: Opportunity) {
    if (!window.confirm(fr ? `Supprimer « ${opp.title} » ? Cette action est définitive.` : `Delete “${opp.title}”? This cannot be undone.`)) return;
    const res = await crmService.deleteOpportunity(opp.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => (list ?? []).filter((o) => o.id !== opp.id));
    toast.success(fr ? 'Opportunité supprimée' : 'Opportunity deleted');
  }

  function dragOver(e: React.DragEvent, target: Target) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (over !== target) {
      setOver(target);
      if (draggingId) broadcastDrag(draggingId, statusFor(target));
    }
  }

  function dragLeave(e: React.DragEvent, target: Target) {
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as Node).contains(next)) return;
    if (over === target) setOver(null);
  }

  function onDrop(e: React.DragEvent, target: Target) {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    setOver(null);
    setDraggingId(null);
    if (!id) {
      broadcastCancel();
      return;
    }
    dropped.current = true;
    broadcastDrop(id, statusFor(target));
    void move(id, target);
  }

  const cardProps = (o: Opportunity): React.ComponentProps<typeof OpportunityCard> => {
    const p = peerByOpp.get(o.id);
    return {
      opp: o,
      lang,
      today,
      clientName: o.company_id ? companies.get(o.company_id)?.name : null,
      ownerName: o.owner_id ? members.get(o.owner_id)?.name : null,
      canEdit,
      dragging: draggingId === o.id,
      peer: p ? { name: p.user.displayName, color: p.user.color.hex } : null,
      onDragStart: (e: React.DragEvent) => {
        setDraggingId(o.id);
        e.dataTransfer.setData(DRAG_MIME, o.id);
        e.dataTransfer.effectAllowed = 'move';
        broadcastDrag(o.id, o.status);
      },
      onDragEnd: () => {
        const wasDropped = dropped.current;
        dropped.current = false;
        setDraggingId(null);
        setOver(null);
        if (!wasDropped) broadcastCancel();
      },
      onMove: (to: PipelineStageId) => void move(o.id, to),
      onEdit: () => setDrawer({ open: true, opp: o }),
      onDelete: () => void remove(o),
      onOpen: () => setQuick({ id: o.id, mode: null }),
      onFollowUp: () => setQuick({ id: o.id, mode: 'follow_up' }),
      onLose: () => setQuick({ id: o.id, mode: 'lost' }),
      onConvert: canConvert ? () => void convert(o) : undefined,
    };
  };

  const newStage = drawer.stage ? STAGE_BY_ID.get(drawer.stage) : undefined;
  const quickOpp = quick ? (opps.find((o) => o.id === quick.id) ?? null) : null;
  const summary = summarizePipeline(scoped, today);
  const weighted = weightedPipeline(scoped);
  const won = outcomeCount('won');
  const lost = outcomeCount('lost');
  const focusHref = (f: 'follow_up' | 'no_action') => (focus === f ? '/crm' : `/crm?focus=${f}`);

  return (
    <AppShell fill>
      <PageHeader
        title="CRM"
        description={fr ? 'Chaque opportunité, du premier contact à la signature.' : 'Every opportunity, from first contact to signature.'}
        actions={
          canEdit && (
            <Button onClick={() => setDrawer({ open: true, opp: null })}>
              <Plus />
              {fr ? 'Nouvelle opportunité' : 'New opportunity'}
            </Button>
          )
        }
        tabs={<SectionTabs section="crm" />}
      />

      {opps.length > 0 && (
        <StatStrip
          className="mb-3"
          scrollOnMobile
          items={[
            { label: fr ? 'opportunités en cours' : 'open opportunities', value: summary.open, tone: 'terra', icon: Kanban, href: focus !== 'all' ? '/crm' : undefined },
            {
              label: fr ? `en jeu · ${formatEurCompact(weighted, lang)} pondéré` : `at stake · ${formatEurCompact(weighted, lang)} weighted`,
              value: formatEurCompact(summary.amount, lang),
              tone: 'white',
              icon: Wallet,
              title: fr ? 'Pondéré : montant × chances de gagner' : 'Weighted: amount × chance of winning',
            },
            {
              label: fr ? 'à relancer' : 'to follow up',
              value: counts.follow_up,
              tone: focus === 'follow_up' ? 'ink' : counts.follow_up ? 'peach' : 'ivory',
              icon: AlarmClock,
              href: focusHref('follow_up'),
              title: fr ? `${summary.overdue} en retard, les autres prévues aujourd’hui` : `${summary.overdue} overdue, the others due today`,
            },
            {
              label: fr ? 'sans prochaine action' : 'without a next step',
              value: counts.no_action,
              tone: focus === 'no_action' ? 'ink' : 'ivory',
              icon: AlertTriangle,
              href: focusHref('no_action'),
            },
            {
              label: fr ? 'taux de gain' : 'win rate',
              value: won + lost ? `${Math.round((won / (won + lost)) * 100)} %` : '—',
              tone: 'soft',
              icon: Trophy,
              title: fr ? `${won} gagnée(s) sur ${won + lost} conclue(s)` : `${won} won of ${won + lost} closed`,
            },
          ]}
        />
      )}

      <div className="shrink-0">
        <CrmToolbar lang={lang} view="board" query={query} onQuery={setQuery} owner={owner} onOwner={setOwner} members={memberOptions}>
          <Select value={sort} onChange={(e) => setSort(e.target.value as DealSort)} className="sm:w-40" aria-label={fr ? 'Trier les cartes' : 'Sort cards'}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label[lang]}
              </option>
            ))}
          </Select>
          {/* Mobile : filtre actif et issues sur une rangée qui défile ; desktop : dans la ligne. */}
          <div className="no-scrollbar col-span-2 -mx-4 flex gap-2 overflow-x-auto px-4 sm:contents">
            {focus !== 'all' && (
              <Link
                href="/crm"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-ink-app px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                aria-label={fr ? `Retirer le filtre « ${FOCUS_LABEL[focus].fr} »` : `Clear the “${FOCUS_LABEL[focus].en}” filter`}
              >
                {FOCUS_LABEL[focus][lang]}
                <span className="num text-white/70">{filtered.length}</span>
                <X className="h-3.5 w-3.5" />
              </Link>
            )}
            {opps.length > 0 &&
              OUTCOMES.map((o) => {
                const isOver = over === o.id && draggingId !== null;
                return (
                  <Link
                    key={o.id}
                    href={`/opportunities?stage=${o.id}`}
                    draggable={false}
                    title={fr ? 'Déposez une carte ici, ou ouvrez la liste' : 'Drop a card here, or open the list'}
                    onDragOver={(e) => canEdit && dragOver(e, o.id)}
                    onDragLeave={(e) => dragLeave(e, o.id)}
                    onDrop={(e) => canEdit && onDrop(e, o.id)}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] transition-colors',
                      isOver ? o.overClass : 'border-border bg-card hover:border-sand-300',
                      draggingId && !isOver && 'border-dashed border-app-terra/50',
                    )}
                  >
                    <o.icon className={cn('h-4 w-4', o.iconClass)} />
                    <span className="font-medium">{draggingId ? o.drop[lang] : o.label[lang]}</span>
                    {!draggingId && <span className="num text-muted-foreground">{outcomeCount(o.id)}</span>}
                  </Link>
                );
              })}
          </div>
        </CrmToolbar>
      </div>

      {loading && !data ? (
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-3 overflow-hidden">
          {OPEN_STAGES.map((st) => (
            <div key={st.id} className="skeleton rounded-2xl" />
          ))}
        </div>
      ) : opps.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title={fr ? 'Votre pipeline est vide' : 'Your pipeline is empty'}
          description={
            fr
              ? 'Créez une première opportunité, ou laissez vos clients déposer leurs besoins depuis le portail client.'
              : 'Create a first opportunity, or let clients submit needs from the client portal.'
          }
          action={
            canEdit && (
              <Button onClick={() => setDrawer({ open: true, opp: null })}>
                <Plus />
                {fr ? 'Nouvelle opportunité' : 'New opportunity'}
              </Button>
            )
          }
        />
      ) : (
        // Le kanban occupe toute la hauteur restante ; chaque colonne défile seule.
        // Mobile : une colonne par écran, on glisse de l'une à l'autre.
        <div className="-mx-4 min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 md:-mx-6 md:snap-none md:px-6" role="region" aria-label={fr ? 'Pipeline commercial' : 'Sales pipeline'}>
          <div className="grid h-full min-h-[360px] auto-cols-[minmax(260px,84vw)] grid-flow-col gap-3 sm:auto-cols-[300px] lg:min-w-[1040px] lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-5">
            {columns.map(({ stage, items, amount, weighted: colWeighted, late }) => {
              const isOver = over === stage.id && draggingId !== null;
              const peer = peerByColumn.get(stage.canonical);
              const share = openTotal > 0 ? Math.round((amount / openTotal) * 100) : 0;
              return (
                <section
                  key={stage.id}
                  aria-label={stage.label[lang]}
                  onDragOver={(e) => dragOver(e, stage.id)}
                  onDragLeave={(e) => dragLeave(e, stage.id)}
                  onDrop={(e) => onDrop(e, stage.id)}
                  className={cn(
                    'flex min-h-0 min-w-0 snap-start flex-col rounded-2xl border bg-app-sand/45 transition-colors',
                    isOver ? 'border-app-terra bg-app-peach-light' : 'border-black/[0.05]',
                    highlightStage === stage.id && !isOver && 'border-app-terra/50',
                    peer && !isOver && 'border-dashed',
                  )}
                  style={peer && !isOver ? { borderColor: peer.user.color.hex } : undefined}
                >
                  <header className="shrink-0 px-3 pb-2.5 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2" title={stage.hint[lang]}>
                        <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', DOT[stage.tone])} />
                        <h2 className="truncate text-[13px] font-semibold text-foreground">{stage.label[lang]}</h2>
                        <span className="num rounded-full bg-white/80 px-1.5 text-[11px] font-semibold text-muted-foreground">{items.length}</span>
                      </div>
                      {late > 0 && (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-danger-soft px-1.5 py-px text-[11px] font-semibold text-destructive"
                          title={fr ? `${late} relance(s) en retard` : `${late} overdue follow-up(s)`}
                        >
                          <AlarmClock className="h-3 w-3" />
                          {late}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-2 pl-4 text-[11.5px]">
                      <span className="num font-semibold text-foreground">{amount > 0 ? formatEurCompact(amount, lang) : '—'}</span>
                      {colWeighted > 0 && (
                        <span className="num truncate text-muted-foreground" title={fr ? 'Montant pondéré par les chances de gagner' : 'Amount weighted by the chance of winning'}>
                          {fr ? 'pondéré' : 'weighted'} {formatEurCompact(colWeighted, lang)}
                        </span>
                      )}
                    </div>
                    <div className="ml-4 mt-1.5 h-1 overflow-hidden rounded-full bg-white/80" title={fr ? `${share} % du montant en jeu` : `${share}% of the amount at stake`}>
                      <div className={cn('h-full rounded-full transition-[width] duration-500', DOT[stage.tone])} style={{ width: `${share}%` }} />
                    </div>
                  </header>
                  <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                    {items.map((o) => (
                      <OpportunityCard key={o.id} {...cardProps(o)} />
                    ))}
                    {items.length === 0 && (
                      <p className={cn('mx-1 rounded-xl border border-dashed px-2 py-5 text-center text-xs text-muted-foreground', draggingId ? 'border-app-terra/50 bg-white/60' : 'border-black/[0.08]')}>
                        {draggingId ? (fr ? 'Déposer ici' : 'Drop here') : focus !== 'all' ? (fr ? 'Rien pour ce filtre' : 'Nothing for this filter') : stage.hint[lang]}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, opp: null, stage: stage.id })}
                      className="mx-2 mb-2 inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus"
                      aria-label={fr ? `Ajouter une opportunité en « ${stage.label.fr} »` : `Add an opportunity to “${stage.label.en}”`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {fr ? 'Ajouter' : 'Add'}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {activeOrgId && (
        <OpportunityQuickView
          opp={quickOpp}
          open={!!quickOpp}
          onOpenChange={(v) => {
            if (!v) setQuick(null);
          }}
          lang={lang}
          organizationId={activeOrgId}
          clientName={quickOpp?.company_id ? companies.get(quickOpp.company_id)?.name : null}
          ownerName={quickOpp?.owner_id ? members.get(quickOpp.owner_id)?.name : null}
          members={memberOptions}
          canEdit={canEdit}
          canConvert={canConvert}
          today={today}
          mode={quick?.mode ?? null}
          onEdit={(o) => setDrawer({ open: true, opp: o })}
          onMove={(o, to, extra) => void move(o.id, to, extra)}
          onPatch={patch}
          onChange={replace}
          onConvert={(o) => void convert(o)}
        />
      )}

      {activeOrgId && (
        <OpportunityDrawer
          open={drawer.open}
          onOpenChange={(v) => setDrawer((d) => ({ ...d, open: v }))}
          organizationId={activeOrgId}
          opportunity={drawer.opp}
          defaults={{
            owner_id: user?.id ?? null,
            ...(newStage ? { status: newStage.canonical, probability: newStage.defaultProbability } : {}),
          }}
          onSaved={(o) => {
            setData((list) => {
              const rest = (list ?? []).filter((x) => x.id !== o.id);
              return [o, ...rest];
            });
          }}
        />
      )}
    </AppShell>
  );
}
