'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Kanban, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/app/EmptyState';
import { CrmTabs } from '@/components/crm/CrmTabs';
import { OpportunityCard } from '@/components/crm/OpportunityCard';
import { OpportunityDrawer } from '@/components/crm/OpportunityDrawer';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCrmRealtime } from '@/hooks/useCrmRealtime';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { crmService } from '@/lib/services/crm.service';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';
import { PIPELINE_STAGES, STAGE_BY_ID, probabilityForMove, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { isOpenOpportunity, opportunityAmount, weightedPipeline } from '@/lib/pilotage/metrics';
import { formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/types';

const DRAG_MIME = 'application/x-opportunity-id';
/** Colonnes terminales : on n'affiche que les cartes récentes. */
const CLOSED_VISIBLE_DAYS = 60;

export default function CrmPipelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrgId, user } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('crm.edit') || can('opportunities.edit');
  const { byId: companies } = useCompaniesLite();
  const { byId: members, options: memberOptions } = useTeamMembers();

  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState<string>('all');
  const [showOnHold, setShowOnHold] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; opp: Opportunity | null }>({ open: params.get('new') === '1', opp: null });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStageId | null>(null);
  const dropped = useRef(false);
  const highlightStage = params.get('stage') as PipelineStageId | null;

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

  const { data: proposalCounts } = useCachedQuery<Record<string, number>>(
    `crm-proposals:${activeOrgId ?? 'none'}`,
    async () => {
      const { data: rows } = await createClient().from('opportunity_consultants').select('opportunity_id').limit(10000);
      const out: Record<string, number> = {};
      for (const r of rows ?? []) out[r.opportunity_id as string] = (out[r.opportunity_id as string] ?? 0) + 1;
      return out;
    },
    { enabled: !!activeOrgId },
  );

  const { broadcastDrag, broadcastDrop, broadcastCancel, peerByOpp, peerByColumn } = useCrmRealtime({
    onDataChange: () => void reload(),
    onPeerDrop: (oppId, toStatus) =>
      setData((list) => (list ?? []).map((o) => (o.id === oppId ? { ...o, status: toStatus } : o))),
  });

  const opps = data ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opps.filter((o) => {
      if (owner === 'mine' && o.owner_id !== user?.id) return false;
      if (owner !== 'all' && owner !== 'mine' && o.owner_id !== owner) return false;
      if (!q) return true;
      const client = o.company_id ? (companies.get(o.company_id)?.name ?? '') : '';
      return `${o.title} ${client}`.toLowerCase().includes(q);
    });
  }, [opps, query, owner, user?.id, companies]);

  const cutoff = new Date(Date.now() - CLOSED_VISIBLE_DAYS * 86_400_000).toISOString();
  const columns = PIPELINE_STAGES.map((stage) => {
    let items = filtered.filter((o) => stageOf(o.status) === stage.id);
    const total = items.length;
    if (stage.id === 'won' || stage.id === 'lost') items = items.filter((o) => o.updated_at >= cutoff);
    return {
      stage,
      items,
      total,
      amount: items.reduce((s, o) => s + opportunityAmount(o), 0),
    };
  });
  const onHold = filtered.filter((o) => o.status === 'on_hold');
  const open = filtered.filter(isOpenOpportunity);

  async function move(oppId: string, to: PipelineStageId) {
    const opp = opps.find((o) => o.id === oppId);
    if (!opp || stageOf(opp.status) === to) return;
    const stage = STAGE_BY_ID.get(to)!;
    const probability = probabilityForMove(opp.probability, to);
    const prev = data;
    setData((list) => (list ?? []).map((o) => (o.id === oppId ? { ...o, status: stage.canonical, probability } : o)));
    const res = await crmService.moveOpportunity(opp, stage.canonical, probability);
    if (res.error) {
      setData(prev ?? []);
      toast.error(fr ? 'Déplacement impossible' : 'Could not move the opportunity');
      return;
    }
    void broadcastOrgActivity(activeOrgId, user?.id, 'opportunity_moved', `${opp.title} → ${stage.label[lang]}`, `/opportunities/${opp.id}`);
    if (to === 'won') {
      toast.success(fr ? 'Opportunité gagnée' : 'Opportunity won', {
        description: fr ? 'Créez la mission associée depuis la fiche.' : 'Create the related mission from the opportunity page.',
        action: { label: fr ? 'Ouvrir' : 'Open', onClick: () => router.push(`/opportunities/${opp.id}?tab=mission`) },
      });
    }
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

  function onDrop(e: React.DragEvent, stage: PipelineStageId) {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_MIME);
    setOverStage(null);
    setDraggingId(null);
    if (!id) {
      broadcastCancel();
      return;
    }
    dropped.current = true;
    broadcastDrop(id, STAGE_BY_ID.get(stage)!.canonical);
    void move(id, stage);
  }

  return (
    <AppShell wide>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title="CRM"
        description={
          fr
            ? `${open.length} opportunités ouvertes · ${formatEurCompact(open.reduce((s, o) => s + opportunityAmount(o), 0), lang)} en jeu · ${formatEurCompact(weightedPipeline(open), lang)} pondérés`
            : `${open.length} open opportunities · ${formatEurCompact(open.reduce((s, o) => s + opportunityAmount(o), 0), lang)} at stake · ${formatEurCompact(weightedPipeline(open), lang)} weighted`
        }
        actions={
          canEdit && (
            <Button onClick={() => setDrawer({ open: true, opp: null })}>
              <Plus />
              {fr ? 'Nouvelle opportunité' : 'New opportunity'}
            </Button>
          )
        }
      >
        <CrmTabs />
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fr ? 'Filtrer par intitulé ou client' : 'Filter by title or client'}
            className="pl-9"
            aria-label={fr ? 'Filtrer les opportunités' : 'Filter opportunities'}
          />
        </div>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="sm:w-56" aria-label="Business Manager">
          <option value="all">{fr ? 'Tous les Business Managers' : 'All business managers'}</option>
          <option value="mine">{fr ? 'Mes opportunités' : 'My opportunities'}</option>
          {memberOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <label className="inline-flex items-center gap-2 text-[13px] text-muted-foreground sm:ml-auto">
          <Switch checked={showOnHold} onCheckedChange={setShowOnHold} aria-label={fr ? 'Afficher les opportunités en veille' : 'Show on-hold opportunities'} />
          {fr ? `En veille (${onHold.length})` : `On hold (${onHold.length})`}
        </label>
      </div>

      {loading && !data ? (
        <div className="flex gap-3 overflow-hidden">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.id} className="skeleton h-80 w-72 shrink-0 rounded-xl" />
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
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8" role="region" aria-label={fr ? 'Pipeline commercial' : 'Sales pipeline'}>
          <div className="flex min-w-max gap-3">
            {columns.map(({ stage, items, total, amount }) => {
              const isOver = overStage === stage.id && draggingId !== null;
              const peer = peerByColumn.get(stage.canonical);
              const terminal = stage.id === 'won' || stage.id === 'lost';
              return (
                <section
                  key={stage.id}
                  aria-label={stage.label[lang]}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (overStage !== stage.id) {
                      setOverStage(stage.id);
                      if (draggingId) broadcastDrag(draggingId, stage.canonical);
                    }
                  }}
                  onDragLeave={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (next && (e.currentTarget as Node).contains(next)) return;
                    if (overStage === stage.id) setOverStage(null);
                  }}
                  onDrop={(e) => onDrop(e, stage.id)}
                  className={cn(
                    'flex w-[17.5rem] shrink-0 flex-col rounded-xl border bg-sidebar/60 transition-colors',
                    terminal && 'w-[15rem]',
                    isOver ? 'border-primary bg-brand-50/60' : 'border-border',
                    highlightStage === stage.id && !isOver && 'border-primary/50',
                    peer && !isOver && 'border-dashed',
                  )}
                  style={peer && !isOver ? { borderColor: peer.user.color.hex } : undefined}
                >
                  <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          stage.tone === 'success'
                            ? 'bg-success'
                            : stage.tone === 'danger'
                              ? 'bg-destructive'
                              : stage.tone === 'warning'
                                ? 'bg-warning'
                                : stage.tone === 'brand'
                                  ? 'bg-primary'
                                  : stage.tone === 'info'
                                    ? 'bg-info'
                                    : 'bg-muted-foreground/60',
                        )}
                      />
                      <h2 className="truncate text-[13px] font-semibold text-foreground">{stage.label[lang]}</h2>
                      <span className="num text-xs text-muted-foreground">{total}</span>
                    </div>
                    <span className="num text-xs text-muted-foreground">{amount > 0 ? formatEurCompact(amount, lang) : ''}</span>
                  </header>
                  <div className="flex min-h-[8rem] flex-1 flex-col gap-2 px-2 pb-2">
                    {items.map((o) => {
                      const p = peerByOpp.get(o.id);
                      return (
                        <OpportunityCard
                          key={o.id}
                          opp={o}
                          lang={lang}
                          clientName={o.company_id ? companies.get(o.company_id)?.name : null}
                          ownerName={o.owner_id ? members.get(o.owner_id)?.name : null}
                          proposals={proposalCounts?.[o.id] ?? 0}
                          canEdit={canEdit}
                          dragging={draggingId === o.id}
                          peer={p ? { name: p.user.displayName, color: p.user.color.hex } : null}
                          onDragStart={(e) => {
                            setDraggingId(o.id);
                            e.dataTransfer.setData(DRAG_MIME, o.id);
                            e.dataTransfer.effectAllowed = 'move';
                            broadcastDrag(o.id, o.status);
                          }}
                          onDragEnd={() => {
                            const wasDropped = dropped.current;
                            dropped.current = false;
                            setDraggingId(null);
                            setOverStage(null);
                            if (!wasDropped) broadcastCancel();
                          }}
                          onMove={(to) => void move(o.id, to)}
                          onEdit={() => setDrawer({ open: true, opp: o })}
                          onDelete={() => void remove(o)}
                        />
                      );
                    })}
                    {items.length === 0 && (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                        {canEdit ? (fr ? 'Déposez une opportunité ici' : 'Drop an opportunity here') : fr ? 'Aucune opportunité' : 'No opportunity'}
                      </div>
                    )}
                    {terminal && total > items.length && (
                      <a
                        href={`/opportunities?stage=${stage.id}`}
                        className="rounded-md px-2 py-1.5 text-center text-xs font-medium text-primary hover:bg-brand-50"
                      >
                        {fr ? `Voir les ${total} (plus de ${CLOSED_VISIBLE_DAYS} j inclus)` : `View all ${total}`}
                      </a>
                    )}
                  </div>
                </section>
              );
            })}
            {showOnHold && (
              <section className="flex w-[15rem] shrink-0 flex-col rounded-xl border border-dashed border-border bg-card/60">
                <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <h2 className="text-[13px] font-semibold">{fr ? 'En veille' : 'On hold'}</h2>
                  <span className="num text-xs text-muted-foreground">{onHold.length}</span>
                </header>
                <div className="flex flex-col gap-2 px-2 pb-2">
                  {onHold.map((o) => (
                    <OpportunityCard
                      key={o.id}
                      opp={o}
                      lang={lang}
                      clientName={o.company_id ? companies.get(o.company_id)?.name : null}
                      ownerName={o.owner_id ? members.get(o.owner_id)?.name : null}
                      canEdit={canEdit}
                      onMove={(to) => void move(o.id, to)}
                      onEdit={() => setDrawer({ open: true, opp: o })}
                      onDelete={() => void remove(o)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {activeOrgId && (
        <OpportunityDrawer
          open={drawer.open}
          onOpenChange={(v) => setDrawer((d) => ({ ...d, open: v }))}
          organizationId={activeOrgId}
          opportunity={drawer.opp}
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
