'use client';

import { useState } from 'react';
import { Plus, TrendingUp, Trash2, Pencil, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { opportunityService } from '@/lib/services';
import { OpportunityFormDialog } from '@/components/crm/OpportunityFormDialog';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { Opportunity, OpportunityStatus } from '@/types';
import { OPPORTUNITY_STATUS_LABEL } from '@/constants';
import { formatCurrency, relativeDate, cn } from '@/lib/utils';

const PIPELINE_STATUSES: OpportunityStatus[] = [
  'new',
  'contacted',
  'discussion',
  'cv_sent',
  'client_interview',
  'negotiation',
  'won',
  'lost',
  'on_hold',
];

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
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  // États drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
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

  const totalPipeline = opportunities
    .filter((o) => !['won', 'lost', 'on_hold'].includes(o.status))
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
      toast.error('Erreur lors de la mise à jour');
      setOpportunities(prev ?? []);
      return;
    }
    toast.success(`Déplacé vers ${OPPORTUNITY_STATUS_LABEL[newStatus]}`);
  }

  async function deleteOpportunity(id: string, title: string) {
    if (!confirm(`Supprimer l'opportunité "${title}" ? Cette action est irréversible.`)) return;
    const res = await opportunityService.delete(id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setOpportunities((prev) => (prev ?? []).filter((o) => o.id !== id));
    toast.success('Opportunité supprimée');
  }

  // ============ Handlers Drag & Drop ============
  function onDragStartCard(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEndCard() {
    setDraggingId(null);
    setDragOverStatus(null);
  }

  function onDragOverColumn(e: React.DragEvent, status: OpportunityStatus) {
    // Indispensable : sans preventDefault sur dragover, onDrop ne tire pas.
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) setDragOverStatus(status);
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
    if (id) void moveOpportunity(id, status);
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-violet-glow" />
            Suivi prospect
          </h1>
          <p className="text-muted-foreground mt-1">
            Pipeline prévisionnel : {formatCurrency(totalPipeline)} ·{' '}
            <span className="text-[11px] text-muted-foreground/80">
              Glisse une carte d&apos;une colonne à l&apos;autre pour changer son statut.
            </span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle opportunité
        </Button>
      </div>

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
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {byStatus.map((col) => {
            const isTarget = dragOverStatus === col.status && draggingId !== null;
            const isSource =
              !!draggingId &&
              opportunities.find((o) => o.id === draggingId)?.status === col.status;
            return (
              <div
                key={col.status}
                onDragOver={(e) => onDragOverColumn(e, col.status)}
                onDragLeave={(e) => onDragLeaveColumn(e, col.status)}
                onDrop={(e) => onDropColumn(e, col.status)}
                className={cn(
                  'rounded-xl border p-3 flex flex-col min-h-[220px] transition-all duration-200',
                  isTarget
                    ? 'border-violet-glow/70 bg-violet-glow/[0.06] shadow-[0_0_30px_-12px_rgba(168,85,247,0.65)] scale-[1.01]'
                    : isSource
                      ? 'border-hairline bg-white/[0.015] opacity-70'
                      : 'border-hairline bg-white/[0.015]',
                )}
              >
                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', COLUMN_DOT[col.status])} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                    {OPPORTUNITY_STATUS_LABEL[col.status]}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 font-mono ml-auto">
                    {col.items.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {col.items.length === 0 ? (
                    <div
                      className={cn(
                        'rounded-md border border-dashed py-10 text-center text-[11px] transition-all duration-200',
                        isTarget
                          ? 'border-violet-glow/60 text-violet-glow bg-violet-glow/[0.04]'
                          : 'border-hairline text-muted-foreground/60',
                      )}
                    >
                      {isTarget ? 'Déposer ici' : '—'}
                    </div>
                  ) : (
                    col.items.map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        isDragging={draggingId === opp.id}
                        onDragStart={(e) => onDragStartCard(e, opp.id)}
                        onDragEnd={onDragEndCard}
                        onDelete={() => deleteOpportunity(opp.id, opp.title)}
                        onEdit={() => openEdit(opp)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function OpportunityCard({
  opportunity,
  isDragging,
  onDragStart,
  onDragEnd,
  onDelete,
  onEdit,
}: {
  opportunity: Opportunity;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'qc-card-hover group relative select-none transition-all duration-200',
        // Curseur main "grab/grabbing" pour signaler le drag.
        isDragging ? 'cursor-grabbing opacity-50 rotate-2 scale-95' : 'cursor-grab',
        'active:cursor-grabbing',
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 min-w-0">
            <GripVertical
              className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition shrink-0 mt-0.5"
              aria-hidden
            />
            <h3 className="text-sm font-semibold line-clamp-2 leading-snug">
              {opportunity.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                'h-2 w-2 rounded-full mt-1',
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
              title="Éditer l'opportunité"
              aria-label="Éditer"
            >
              <Pencil className="h-3.5 w-3.5 text-violet-glow" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
              title="Supprimer l'opportunité"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {opportunity.expected_revenue ? (
          <p className="text-xs font-semibold qc-gradient-text pl-[22px]">
            {formatCurrency(Number(opportunity.expected_revenue))}
            {opportunity.probability && (
              <span className="text-muted-foreground ml-1 font-normal">
                · {opportunity.probability}%
              </span>
            )}
          </p>
        ) : null}

        {(opportunity.daily_rate_eur || opportunity.duration_months) && (
          <div className="text-[11px] text-muted-foreground pl-[22px]">
            {opportunity.daily_rate_eur && (
              <>TJM {formatCurrency(Number(opportunity.daily_rate_eur))}</>
            )}
            {opportunity.daily_rate_eur && opportunity.duration_months && ' · '}
            {opportunity.duration_months && <>{opportunity.duration_months} mois</>}
          </div>
        )}

        {opportunity.next_follow_up && (
          <p className="text-[11px] text-muted-foreground pl-[22px]">
            ⏰ {relativeDate(opportunity.next_follow_up)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
