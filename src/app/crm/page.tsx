'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { opportunityService } from '@/lib/services';
import { OpportunityFormDialog } from '@/components/crm/OpportunityFormDialog';
import { Select } from '@/components/ui/select';
import type { Opportunity, OpportunityStatus } from '@/types';
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_ORDER } from '@/constants';
import { formatCurrency, relativeDate } from '@/lib/utils';

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

const ORG_ID = '11111111-1111-1111-1111-111111111111';

export default function CRMPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);

  async function reload() {
    const res = await opportunityService.list();
    if (res.data) setOpportunities(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

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
    const res = await opportunityService.updateStatus(id, newStatus);
    if (res.error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    toast.success('Statut mis à jour');
  }

  async function deleteOpportunity(id: string, title: string) {
    if (!confirm(`Supprimer l'opportunité "${title}" ? Cette action est irréversible.`)) return;
    const res = await opportunityService.delete(id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    toast.success('Opportunité supprimée');
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-violet-glow" />
            Suivi commercial
          </h1>
          <p className="text-muted-foreground mt-1">
            Pipeline prévisionnel : {formatCurrency(totalPipeline)}
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
        organizationId={ORG_ID}
        opportunity={editingOpp}
        onSaved={() => reload()}
      />

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {byStatus.map((col) => (
            <div
              key={col.status}
              className="rounded-xl border border-white/5 bg-white/[0.015] p-3 flex flex-col min-h-[220px]"
            >
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${COLUMN_DOT[col.status]}`}
                />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                  {OPPORTUNITY_STATUS_LABEL[col.status]}
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-mono ml-auto">
                  {col.items.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {col.items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/5 py-10 text-center text-[11px] text-muted-foreground/60">
                    —
                  </div>
                ) : (
                  col.items.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onMove={(ns) => moveOpportunity(opp.id, ns)}
                      onDelete={() => deleteOpportunity(opp.id, opp.title)}
                      onEdit={() => openEdit(opp)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

const ALL_STATUSES: OpportunityStatus[] = [
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

function OpportunityCard({
  opportunity,
  onMove,
  onDelete,
  onEdit,
}: {
  opportunity: Opportunity;
  onMove: (status: OpportunityStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const currentIdx = OPPORTUNITY_STATUS_ORDER.indexOf(opportunity.status);
  const nextStatus = OPPORTUNITY_STATUS_ORDER[currentIdx + 1];
  const canAdvance =
    nextStatus && !['won', 'lost', 'on_hold'].includes(opportunity.status);

  return (
    <Card className="qc-card-hover group relative">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`h-2 w-2 rounded-full mt-1 ${
                opportunity.priority === 'critical'
                  ? 'bg-red-400'
                  : opportunity.priority === 'high'
                    ? 'bg-amber-400'
                    : opportunity.priority === 'medium'
                      ? 'bg-blue-400'
                      : 'bg-slate-500'
              }`}
              title={opportunity.priority}
            />
            <button
              type="button"
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-violet-glow/15 flex items-center justify-center"
              title="Éditer l'opportunité"
              aria-label="Éditer"
            >
              <Pencil className="h-3.5 w-3.5 text-violet-glow" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-red-500/15 flex items-center justify-center"
              title="Supprimer l'opportunité"
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

        <div className="flex items-center gap-1.5 pt-1.5">
          <Select
            value={opportunity.status}
            onChange={(e) => onMove(e.target.value as OpportunityStatus)}
            className="h-7 text-[11px] px-1 py-0 w-1/2 min-w-0 text-center leading-none"
            aria-label="Déplacer vers un statut"
            title="Déplacer vers un statut (retour arrière possible)"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {OPPORTUNITY_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          {canAdvance && (
            <Button
              size="sm"
              variant="subtle"
              className="h-7 px-2 text-[11px] shrink-0"
              onClick={() => onMove(nextStatus)}
              title={`Passer à : ${OPPORTUNITY_STATUS_LABEL[nextStatus]}`}
            >
              → {OPPORTUNITY_STATUS_LABEL[nextStatus]}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
