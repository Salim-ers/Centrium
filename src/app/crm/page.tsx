'use client';

import { useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useOpportunityStatusLabels } from '@/lib/i18n/useBadges';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/app';

import { opportunityService } from '@/lib/services';
import { OpportunityFormDialog } from '@/components/crm/OpportunityFormDialog';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCrmRealtime, type PeerDrag } from '@/hooks/useCrmRealtime';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';
import type { Opportunity, OpportunityStatus } from '@/types';
import { OPPORTUNITY_STATUS_LABEL } from '@/constants';
import { relativeDate, cn } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';

// Colonnes du Kanban : uniquement les statuts du pipeline actif.
// won / lost / on_hold sont des statuts TERMINAUX → regroupés dans
// une carte récap "Terminées" en bas du tableau pour éviter d'avoir
// 3 colonnes vides qui prennent de la place visuelle.
const PIPELINE_STATUSES: OpportunityStatus[] = [
  'new',
  'contacted',
  'discussion',
  'cv_sent',
  'client_interview',
  'negotiation',
];

const CLOSED_STATUSES: OpportunityStatus[] = ['won', 'lost', 'on_hold'];

const COLUMN_DOT: Record<OpportunityStatus, string> = {
  new: 'bg-slate-400',
  contacted: 'bg-sky-400',
  discussion: 'bg-blue-400',
  cv_sent: 'bg-violet-400',
  client_interview: 'bg-fuchsia-400',
  negotiation: 'bg-amber-400',
  won: 'bg-emerald-400',
  lost: 'bg-red-400',
  on_hold: 'bg-slate-500',
};

/** Type MIME utilisé pour le drag&drop des cartes. */
const DRAG_MIME = 'application/x-opportunity-id';

export default function CRMPage() {
  const { activeOrgId, user } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  const oppLabels = useOpportunityStatusLabels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  // États drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Ref synchrone pour savoir si onDropColumn a réussi AVANT que onDragEnd
  // ne lise draggingId via une closure stale. Voir onDragEndCard pour
  // l'explication détaillée du bug "broadcastCancel après drop réussi".
  const dropSucceededRef = useRef(false);
  const [dragOverStatus, setDragOverStatus] = useState<OpportunityStatus | null>(null);

  const {
    data: opportunitiesData,
    loading,
    reload,
    setData: setOpportunities,
  } = useCachedQuery<Opportunity[]>(
    `opportunities:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await opportunityService.list();
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const opportunities = opportunitiesData ?? [];

  // Temps réel : les déplacements faits par les collègues atterrissent dans
  // notre liste sans refresh, et leurs drag-states en cours s'affichent en
  // direct (peerByOpp / peerByColumn). onPeerDrop applique l'optimistic
  // move dès qu'un collègue dépose, pour ne pas attendre postgres_changes.
  const { broadcastDrag, broadcastDrop, broadcastCancel, peerByOpp, peerByColumn } = useCrmRealtime({
    onDataChange: () => reload(),
    onPeerDrop: (oppId, toStatus) => {
      setOpportunities((list) =>
        (list ?? []).map((o) => (o.id === oppId ? { ...o, status: toStatus } : o)),
      );
    },
  });

  function openEdit(opp: Opportunity) {
    setEditingOpp(opp);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingOpp(null);
    setDialogOpen(true);
  }

  const byStatus = PIPELINE_STATUSES.map((status) => ({
    status,
    items: opportunities.filter((o) => o.status === status),
  }));

  // Opportunités terminées (gagné/perdu/veille) — regroupées dans une seule
  // carte récap en bas, avec liste dépliable et drop target qui passe en
  // 'won' par défaut.
  const closedByStatus = {
    won: opportunities.filter((o) => o.status === 'won'),
    lost: opportunities.filter((o) => o.status === 'lost'),
    on_hold: opportunities.filter((o) => o.status === 'on_hold'),
  };
  const closedTotal =
    closedByStatus.won.length + closedByStatus.lost.length + closedByStatus.on_hold.length;
  const [closedOpen, setClosedOpen] = useState(false);
  const [closedFilter, setClosedFilter] = useState<OpportunityStatus | 'all'>('all');
  const [closedDragOver, setClosedDragOver] = useState(false);
  // Quand on drop sur la zone "Terminées", on demande quel statut (Gagné/Perdu/Veille)
  const [pendingClosure, setPendingClosure] = useState<{ id: string; title: string } | null>(null);

  const totalPipeline = opportunities
    .filter((o) => !CLOSED_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + (Number(o.expected_revenue) || 0), 0);

  async function moveOpportunity(id: string, newStatus: OpportunityStatus) {
    const current = opportunities.find((o) => o.id === id);
    if (!current || current.status === newStatus) return;

    // Optimistic update : la carte glisse vers la nouvelle colonne avant
    // l'aller-retour serveur. Si l'API rejette on rollback.
    const prev = opportunitiesData;
    setOpportunities((list) =>
      (list ?? []).map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
    );

    const res = await opportunityService.updateStatus(id, newStatus);
    if (res.error) {
      toast.error(t.pages.crm.err_update);
      setOpportunities(prev ?? []);
      return;
    }
    // Toast "Déplacé vers ..." retiré sur demande utilisateur — le
    // changement de colonne est visuellement évident, pas besoin de
    // notification redondante en haut à droite à chaque drop.
    // Notifie les collègues : "Salim a déplacé Mission Acme"
    void broadcastOrgActivity(
      activeOrgId,
      user?.id,
      'opportunity_moved',
      `${current.title} → ${OPPORTUNITY_STATUS_LABEL[newStatus]}`,
      '/crm',
    );
  }

  async function deleteOpportunity(id: string, title: string) {
    if (!confirm(`${t.pages.crm.confirm_delete_prefix} "${title}" ?`)) return;
    const res = await opportunityService.delete(id);
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    setOpportunities((prev) => (prev ?? []).filter((o) => o.id !== id));
    toast.success(t.forms.opportunity.deleted);
    void broadcastOrgActivity(activeOrgId, user?.id, 'opportunity_deleted', title, '/crm');
  }

  // ============ Handlers Drag & Drop ============
  function onDragStartCard(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
    // Diffuse à toute l'organisation : "je viens d'attraper cette carte".
    const current = opportunities.find((o) => o.id === id);
    broadcastDrag(id, current?.status ?? null);
  }

  function onDragEndCard() {
    // Note : onDragEnd fire SYSTEMATIQUEMENT après onDrop (HTML5 spec). On
    // ne broadcast `cancel` que si aucun drop n'a eu lieu — sinon on
    // détruirait l'indicateur peer juste après l'avoir mis à jour via drop.
    //
    // BUG FIX : avant on lisait `!draggingId`, mais la closure capture la
    // valeur du state AVANT le re-render. Le setDraggingId(null) du
    // onDropColumn n'est visible qu'au prochain render — onDragEnd fire
    // entre les deux → on voyait toujours draggingId === id → wasDropped
    // === false → broadcastCancel TOUJOURS appelé, même après un drop
    // réussi → désync peers (peer voit cancel juste après drop).
    // Solution : flag synchrone via useRef set dans onDropColumn.
    const wasDropped = dropSucceededRef.current;
    dropSucceededRef.current = false; // reset pour la prochaine séquence
    setDraggingId(null);
    setDragOverStatus(null);
    if (!wasDropped) broadcastCancel();
  }

  function onDragOverColumn(e: React.DragEvent, status: OpportunityStatus) {
    // Indispensable : sans preventDefault sur dragover, onDrop ne tire pas.
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
      if (draggingId) broadcastDrag(draggingId, status);
    }
  }

  function onDragLeaveColumn(e: React.DragEvent, status: OpportunityStatus) {
    // On ne reset que si on quitte VRAIMENT la colonne (pas si on entre
    // dans une carte enfant). relatedTarget=null → on a quitté la fenêtre.
    const next = e.relatedTarget as Node | null;
    if (next && (e.currentTarget as Node).contains(next)) return;
    if (dragOverStatus === status) setDragOverStatus(null);
  }

  function onDropColumn(e: React.DragEvent, status: OpportunityStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    setDragOverStatus(null);
    setDraggingId(null);
    if (id) {
      // Marque le drop comme réussi de manière SYNCHRONE — onDragEnd va lire
      // ce flag (au lieu de draggingId qui est en attente de re-render).
      dropSucceededRef.current = true;
      // Broadcast SYNCHRONE le drop final pour que les peers appliquent
      // l'optimistic move immédiatement (avant postgres_changes).
      broadcastDrop(id, status);
      void moveOpportunity(id, status);
    } else {
      broadcastCancel();
    }
  }

  return (
    <AppShell wide>
      <PageHeader
        eyebrow={t.pages.crm.eyebrow}
        title={
          <>
            {t.pages.crm.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.crm.title_b}</span>
          </>
        }
        description={
          <>
            {t.pages.crm.pipeline_value} : <span className="text-foreground font-medium">{formatCurrency(totalPipeline)}</span>{' '}
            · {t.pages.crm.description}
          </>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t.pages.crm.new_opp}
          </Button>
        }
      />

      <OpportunityFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingOpp(null);
        }}
        organizationId={activeOrgId ?? ''}
        opportunity={editingOpp}
        onSaved={() => reload()}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[220px] rounded-xl surface-1 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : (
        <LayoutGroup>
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {byStatus.map((col, colIdx) => {
            const isTarget = dragOverStatus === col.status && draggingId !== null;
            const isSource =
              !!draggingId &&
              opportunities.find((o) => o.id === draggingId)?.status === col.status;
            // Quelqu'un d'autre survole cette colonne avec une carte attrapée.
            const peerHover = peerByColumn.get(col.status);
            return (
              <motion.div
                key={col.status}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: colIdx * 0.05, ease: 'easeOut' }}
              >
              <div
                onDragOver={(e) => onDragOverColumn(e, col.status)}
                onDragLeave={(e) => onDragLeaveColumn(e, col.status)}
                onDrop={(e) => onDropColumn(e, col.status)}
                style={
                  peerHover && !isTarget
                    ? {
                        boxShadow: `0 0 30px -12px ${peerHover.user.color.glow}`,
                      }
                    : undefined
                }
                className={cn(
                  'rounded-xl border p-3 flex flex-col min-h-[220px] transition-all duration-200',
                  isTarget
                    ? 'border-violet-glow/70 bg-violet-glow/[0.08] shadow-[0_0_30px_-12px_rgba(168,85,247,0.65)] scale-[1.01]'
                    : peerHover
                      ? cn('bg-card/60 scale-[1.005]', peerHover.user.color.border)
                      : isSource
                        ? 'border-hairline bg-card/40 opacity-70'
                        : 'border-hairline bg-card/40',
                )}
              >
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', COLUMN_DOT[col.status])} />
                  <span className="text-[11px] uppercase tracking-wider text-foreground/70 font-semibold">
                    {(oppLabels[col.status as keyof typeof oppLabels] ?? OPPORTUNITY_STATUS_LABEL[col.status])}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto tabular-nums">
                    {col.items.length}
                  </span>
                  {peerHover && (
                    <PeerBadge peer={peerHover} label={t.pages.crm.peer_aim_label} />
                  )}
                </div>

                <div className="space-y-2.5 flex-1">
                  {col.items.length === 0 ? (
                    <div
                      className={cn(
                        'rounded-md border border-dashed py-10 text-center text-[11px] transition-all duration-200',
                        isTarget
                          ? 'border-violet-glow/60 text-violet-glow bg-violet-glow/[0.06]'
                          : peerHover
                            ? cn('bg-card/60', peerHover.user.color.border)
                            : 'border-hairline text-muted-foreground/70 bg-card/20',
                      )}
                    >
                      {isTarget
                        ? t.pages.crm.drop_here
                        : peerHover
                          ? `${peerHover.user.displayName} ${t.pages.crm.drop_here_peer}`
                          : '—'}
                    </div>
                  ) : (
                    col.items.map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        isDragging={draggingId === opp.id}
                        peer={peerByOpp.get(opp.id) ?? null}
                        onDragStart={(e) => onDragStartCard(e, opp.id)}
                        onDragEnd={onDragEndCard}
                        onDelete={() => deleteOpportunity(opp.id, opp.title)}
                        onEdit={() => openEdit(opp)}
                      />
                    ))
                  )}
                </div>
              </div>
              </motion.div>
            );
          })}
        </div>

        {/* === Carte récap "Terminées" (won + lost + on_hold regroupés) === */}
        <div
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setClosedDragOver(true);
          }}
          onDragLeave={(e) => {
            const next = e.relatedTarget as Node | null;
            if (next && (e.currentTarget as Node).contains(next)) return;
            setClosedDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData(DRAG_MIME);
            setClosedDragOver(false);
            setDraggingId(null);
            if (id) {
              // Drop sur la carte Terminées → on ouvre un dialog qui demande
              // explicitement le statut (Gagné / Perdu / En veille).
              const opp = opportunities.find((o) => o.id === id);
              if (opp) {
                setPendingClosure({ id, title: opp.title });
              }
            } else {
              broadcastCancel();
            }
          }}
          className={cn(
            'mt-6 rounded-xl border p-4 transition-all',
            closedDragOver
              ? 'border-magenta/60 bg-magenta/[0.06] shadow-[0_0_30px_-12px_rgba(225,29,116,0.55)]'
              : 'border-hairline bg-card/40',
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/70 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {t.pages.crm.closed_opps}
                <span className="text-muted-foreground font-mono tabular-nums">({closedTotal})</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <ClosedStat
                  label={t.pages.crm.closed_won}
                  count={closedByStatus.won.length}
                  dotClass="bg-emerald-500"
                  onClick={() => {
                    setClosedFilter('won');
                    setClosedOpen(true);
                  }}
                />
                <ClosedStat
                  label={t.pages.crm.closed_lost}
                  count={closedByStatus.lost.length}
                  dotClass="bg-red-500"
                  onClick={() => {
                    setClosedFilter('lost');
                    setClosedOpen(true);
                  }}
                />
                <ClosedStat
                  label={t.pages.crm.closed_on_hold}
                  count={closedByStatus.on_hold.length}
                  dotClass="bg-slate-500"
                  onClick={() => {
                    setClosedFilter('on_hold');
                    setClosedOpen(true);
                  }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setClosedFilter('all');
                setClosedOpen(true);
              }}
              disabled={closedTotal === 0}
            >
              {t.pages.crm.see_list}
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t.pages.crm.drop_hint}
          </p>
        </div>

        {/* Dialog de choix après drop sur "Terminées" */}
        <Dialog
          open={pendingClosure !== null}
          onOpenChange={(open) => {
            if (!open) setPendingClosure(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.pages.crm.closure_title}</DialogTitle>
              <DialogDescription>
                {pendingClosure ? (
                  <>
                    {t.pages.crm.closure_question_prefix} <strong>« {pendingClosure.title} »</strong> ?
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingClosure) {
                    broadcastDrop(pendingClosure.id, 'won');
                    void moveOpportunity(pendingClosure.id, 'won');
                  }
                  setPendingClosure(null);
                }}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-card/40 hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] p-4 text-left transition"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{t.pages.crm.closure_won_title}</div>
                  <div className="text-xs text-muted-foreground">{t.pages.crm.closure_won_description}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingClosure) {
                    broadcastDrop(pendingClosure.id, 'lost');
                    void moveOpportunity(pendingClosure.id, 'lost');
                  }
                  setPendingClosure(null);
                }}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-card/40 hover:border-red-500/40 hover:bg-red-500/[0.06] p-4 text-left transition"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{t.pages.crm.closure_lost_title}</div>
                  <div className="text-xs text-muted-foreground">{t.pages.crm.closure_lost_description}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingClosure) {
                    broadcastDrop(pendingClosure.id, 'on_hold');
                    void moveOpportunity(pendingClosure.id, 'on_hold');
                  }
                  setPendingClosure(null);
                }}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-card/40 hover:border-slate-400/40 hover:bg-slate-400/[0.06] p-4 text-left transition"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{t.pages.crm.closure_on_hold_title}</div>
                  <div className="text-xs text-muted-foreground">{t.pages.crm.closure_on_hold_description}</div>
                </div>
              </button>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingClosure(null)}
              >
                {t.pages.crm.closure_cancel}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* === Dialog des opportunités terminées === */}
        <ClosedOpportunitiesDialogInline
          open={closedOpen}
          onOpenChange={setClosedOpen}
          opportunities={opportunities.filter((o) => CLOSED_STATUSES.includes(o.status))}
          filter={closedFilter}
          onFilterChange={setClosedFilter}
          onEdit={openEdit}
          onMove={moveOpportunity}
          onDelete={deleteOpportunity}
        />
        </>
        </LayoutGroup>
      )}
    </AppShell>
  );
}

function ClosedStat({
  label,
  count,
  dotClass,
  onClick,
}: {
  label: string;
  count: number;
  dotClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-hairline bg-card/60 px-2.5 py-1.5 transition',
        count > 0
          ? 'hover-surface hover:border-magenta/40 cursor-pointer'
          : 'opacity-50 cursor-default',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}

function ClosedOpportunitiesDialogInline({
  open,
  onOpenChange,
  opportunities,
  filter,
  onFilterChange,
  onEdit,
  onMove,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunities: Opportunity[];
  filter: OpportunityStatus | 'all';
  onFilterChange: (f: OpportunityStatus | 'all') => void;
  onEdit: (o: Opportunity) => void;
  onMove: (id: string, s: OpportunityStatus) => Promise<void>;
  onDelete: (id: string, title: string) => Promise<void>;
}) {
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  const oppLabels = useOpportunityStatusLabels();
  const filtered =
    filter === 'all' ? opportunities : opportunities.filter((o) => o.status === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.pages.crm.closed_dialog_title}</DialogTitle>
          <DialogDescription>
            {t.pages.crm.closed_dialog_description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {(['all', 'won', 'lost', 'on_hold'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                filter === f
                  ? 'border-violet-glow/60 bg-violet-glow/10 text-violet-glow'
                  : 'border-hairline text-muted-foreground hover:text-foreground hover-surface',
              )}
            >
              {f === 'all' ? t.pages.crm.closed_filter_all : (oppLabels[f as keyof typeof oppLabels] ?? OPPORTUNITY_STATUS_LABEL[f])}
              <span className="ml-1.5 text-[10px] tabular-nums opacity-70">
                ({f === 'all' ? opportunities.length : opportunities.filter((o) => o.status === f).length})
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed border-hairline py-8 text-center text-sm text-muted-foreground">
              {t.pages.crm.closed_empty}
            </div>
          ) : (
            filtered.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center gap-3 rounded-md border border-hairline bg-card/40 px-3 py-2.5"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', COLUMN_DOT[opp.status])} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{opp.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {OPPORTUNITY_STATUS_LABEL[opp.status]}
                    {opp.expected_revenue ? ` · ${formatCurrency(Number(opp.expected_revenue))}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onEdit(opp)}>
                    {t.pages.crm.closed_open}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onMove(opp.id, 'negotiation')}
                    title="Réouvrir cette opportunité"
                  >
                    {t.pages.crm.closed_reopen}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => void onDelete(opp.id, opp.title)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PeerBadge({ peer, label }: { peer: PeerDrag; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 ml-auto rounded-full px-1.5 py-0.5',
        'text-[9px] font-bold tracking-wide animate-pulse',
        peer.user.color.bg,
        peer.user.color.text,
      )}
      style={{ boxShadow: `0 0 12px -2px ${peer.user.color.glow}` }}
      title={`${peer.user.displayName} est en train de glisser une carte`}
    >
      <span className="h-1 w-1 rounded-full bg-white/90" />
      {peer.user.initials}
      {label && <span className="font-medium opacity-90 normal-case">{label}</span>}
    </span>
  );
}

function OpportunityCard({
  opportunity,
  isDragging,
  peer,
  onDragStart,
  onDragEnd,
  onDelete,
  onEdit,
}: {
  opportunity: Opportunity;
  isDragging: boolean;
  peer: PeerDrag | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  // Si un collègue est en train de glisser cette carte, on bloque le drag
  // local (sinon conflit de mises à jour) et on affiche son indicateur.
  const lockedByPeer = !!peer;
  return (
    // Wrapper motion SANS gestion de drag framer : le drag HTML5 reste sur la
    // Card. layoutId fait glisser la carte en douceur d'une colonne à l'autre
    // (drop local, move d'un collègue, réouverture depuis "Terminées").
    <motion.div
      layout
      layoutId={`opp-${opportunity.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
    >
    <Card
      draggable={!lockedByPeer}
      onDragStart={(e) => {
        if (lockedByPeer) {
          e.preventDefault();
          return;
        }
        onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      style={
        peer
          ? {
              boxShadow: `0 0 24px -6px ${peer.user.color.glow}`,
            }
          : undefined
      }
      className={cn(
        'qc-card-hover group relative select-none transition-all duration-200',
        // Curseur main "grab/grabbing" pour signaler le drag.
        isDragging ? 'cursor-grabbing opacity-50 rotate-2 scale-95' : '',
        lockedByPeer
          ? cn('cursor-not-allowed ring-2', peer.user.color.ring, peer.user.color.border)
          : 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Grip handle déplacé en absolute (apparaît au hover seulement) pour libérer
          de la place horizontale au titre — colonnes étroites obligent. */}
      <GripVertical
        className="absolute left-1.5 top-3 h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition pointer-events-none"
        aria-hidden
      />
      <CardContent className="p-3 space-y-1.5">
        {peer && (
          <div className="flex items-center justify-end">
            <PeerBadge peer={peer} label={t.pages.crm.peer_move_label} />
          </div>
        )}
        <div className="flex items-start justify-between gap-1.5">
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 flex-1 min-w-0"
            title={opportunity.title}
          >
            {opportunity.title}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className={cn(
                'h-2 w-2 rounded-full mt-1.5 mr-0.5',
                opportunity.priority === 'critical'
                  ? 'bg-red-400'
                  : opportunity.priority === 'high'
                    ? 'bg-amber-400'
                    : opportunity.priority === 'medium'
                      ? 'bg-blue-400'
                      : 'bg-slate-500',
              )}
              title={opportunity.priority}
            />
            <button
              type="button"
              // empêche le drag de démarrer quand on clique sur le bouton
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-violet-glow/15 flex items-center justify-center cursor-pointer"
              title={t.pages.crm.card_edit_title}
              aria-label="Éditer"
            >
              <Pencil className="h-3.5 w-3.5 text-violet-glow" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
              title={t.pages.crm.card_delete_title}
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {opportunity.expected_revenue ? (
          <p className="text-xs font-semibold qc-gradient-text">
            {formatCurrency(Number(opportunity.expected_revenue))}
            {opportunity.probability && (
              <span className="text-muted-foreground ml-1 font-normal">
                · {opportunity.probability}%
              </span>
            )}
          </p>
        ) : null}

        {(opportunity.daily_rate_eur || opportunity.duration_months) && (
          <div className="text-[11px] text-muted-foreground">
            {opportunity.daily_rate_eur && (
              <>TJM {formatCurrency(Number(opportunity.daily_rate_eur))}</>
            )}
            {opportunity.daily_rate_eur && opportunity.duration_months && ' · '}
            {opportunity.duration_months && <>{opportunity.duration_months} mois</>}
          </div>
        )}

        {opportunity.next_follow_up && (
          <p className="text-[11px] text-muted-foreground">
            ⏰ {relativeDate(opportunity.next_follow_up)}
          </p>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
