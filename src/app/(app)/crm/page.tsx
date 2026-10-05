'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Kanban, PauseCircle, Plus, XCircle, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/EmptyState';
import { showBrandToast } from '@/components/ui/BrandToast';
import { CrmStats } from '@/components/crm/CrmStats';
import { CrmTabs } from '@/components/crm/CrmTabs';
import { CrmToolbar } from '@/components/crm/CrmToolbar';
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
import { OPEN_STAGES, STAGE_BY_ID, probabilityForMove, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity, OpportunityStatus } from '@/types';

const DRAG_MIME = 'application/x-opportunity-id';

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
  const { byId: companies } = useCompaniesLite();
  const { byId: members, options: memberOptions } = useTeamMembers();

  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState<string>('all');
  const [drawer, setDrawer] = useState<{ open: boolean; opp: Opportunity | null; stage?: PipelineStageId }>({
    open: params.get('new') === '1',
    opp: null,
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [over, setOver] = useState<Target | null>(null);
  const dropped = useRef(false);
  const highlightStage = params.get('stage') as PipelineStageId | null;
  const today = new Date().toISOString().slice(0, 10);

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

  const columns = OPEN_STAGES.map((stage) => {
    const items = filtered.filter((o) => stageOf(o.status) === stage.id);
    return { stage, items, amount: items.reduce((s, o) => s + opportunityAmount(o), 0) };
  });
  const outcomeCount = (id: 'won' | 'lost' | 'on_hold') =>
    filtered.filter((o) => (id === 'on_hold' ? o.status === 'on_hold' : stageOf(o.status) === id)).length;

  async function setStatus(opp: Opportunity, status: OpportunityStatus, probability: number) {
    setData((list) => (list ?? []).map((o) => (o.id === opp.id ? { ...o, status, probability } : o)));
    const res = await crmService.moveOpportunity(opp, status, probability);
    if (res.error) {
      setData((list) => (list ?? []).map((o) => (o.id === opp.id ? opp : o)));
      toast.error(fr ? 'Déplacement impossible' : 'Could not move the opportunity');
      return false;
    }
    return true;
  }

  async function move(oppId: string, to: Target) {
    const opp = opps.find((o) => o.id === oppId);
    if (!opp) return;
    const status = statusFor(to);
    if (to === 'on_hold' ? opp.status === 'on_hold' : stageOf(opp.status) === to) return;
    const probability = to === 'on_hold' ? (opp.probability ?? 0) : probabilityForMove(opp.probability, to);
    if (!(await setStatus(opp, status, probability))) return;

    const label = to === 'on_hold' ? (fr ? 'En veille' : 'On hold') : STAGE_BY_ID.get(to)!.label[lang];
    void broadcastOrgActivity(activeOrgId, user?.id, 'opportunity_moved', `${opp.title} → ${label}`, `/opportunities/${opp.id}`);
    // Une carte qui quitte le tableau peut être remise à sa place.
    const undo = { label: fr ? 'Annuler' : 'Undo', onClick: () => void setStatus({ ...opp, status }, opp.status, opp.probability ?? 0) };
    if (to === 'won') {
      showBrandToast('celebration', fr ? 'Opportunité gagnée' : 'Opportunity won', {
        description: fr ? `« ${opp.title} » — prochaine étape : la mission.` : `“${opp.title}” — next step: the mission.`,
        actions: [
          { label: fr ? 'Créer la mission' : 'Create the mission', onClick: () => router.push(`/opportunities/${opp.id}?tab=mission`) },
          undo,
        ],
      });
    } else if (to === 'lost' || to === 'on_hold') {
      showBrandToast('milestone', fr ? `« ${opp.title} » : ${label.toLowerCase()}` : `“${opp.title}”: ${label.toLowerCase()}`, { actions: [undo] });
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
    };
  };

  const newStage = drawer.stage ? STAGE_BY_ID.get(drawer.stage) : undefined;

  return (
    <AppShell wide>
      <PageHeader
        eyebrow={fr ? 'Activité commerciale' : 'Sales'}
        title="CRM"
        description={fr ? 'Suivez chaque opportunité, du premier contact à la signature.' : 'Follow every opportunity, from first contact to signature.'}
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

      {opps.length > 0 && <CrmStats opps={filtered} today={today} lang={lang} />}

      <CrmToolbar lang={lang} view="board" query={query} onQuery={setQuery} owner={owner} onOwner={setOwner} members={memberOptions} />

      {loading && !data ? (
        <div className="grid min-w-0 grid-cols-5 gap-3 overflow-hidden">
          {OPEN_STAGES.map((s) => (
            <div key={s.id} className="skeleton h-80 rounded-2xl" />
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
        <>
          {/* Issues : liens vers la liste filtrée, et cibles de dépôt pendant un glisser. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {OUTCOMES.map((o) => {
              const isOver = over === o.id && draggingId !== null;
              return (
                <Link
                  key={o.id}
                  href={`/opportunities?stage=${o.id}`}
                  draggable={false}
                  onDragOver={(e) => canEdit && dragOver(e, o.id)}
                  onDragLeave={(e) => dragLeave(e, o.id)}
                  onDrop={(e) => canEdit && onDrop(e, o.id)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] transition-colors',
                    isOver ? o.overClass : 'border-border bg-card hover:border-sand-300',
                    draggingId && !isOver && 'border-dashed',
                  )}
                >
                  <o.icon className={cn('h-4 w-4', o.iconClass)} />
                  <span className="font-medium">{draggingId ? o.drop[lang] : o.label[lang]}</span>
                  {!draggingId && <span className="num text-muted-foreground">{outcomeCount(o.id)}</span>}
                </Link>
              );
            })}
            {/* Le glisser-déposer suppose une souris : au doigt, le menu « … » des cartes. */}
            <span className="hidden text-xs text-muted-foreground [@media(pointer:fine)]:inline">
              {draggingId
                ? fr
                  ? 'Déposez la carte sur une étape ou une issue.'
                  : 'Drop the card on a stage or an outcome.'
                : fr
                  ? 'Glissez une carte d’une étape à l’autre pour la faire avancer.'
                  : 'Drag a card from one stage to the next to move it forward.'}
            </span>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8" role="region" aria-label={fr ? 'Pipeline commercial' : 'Sales pipeline'}>
            <div className="grid min-w-[1040px] grid-cols-5 gap-3">
              {columns.map(({ stage, items, amount }) => {
                const isOver = over === stage.id && draggingId !== null;
                const peer = peerByColumn.get(stage.canonical);
                return (
                  <section
                    key={stage.id}
                    aria-label={stage.label[lang]}
                    onDragOver={(e) => dragOver(e, stage.id)}
                    onDragLeave={(e) => dragLeave(e, stage.id)}
                    onDrop={(e) => onDrop(e, stage.id)}
                    className={cn(
                      'flex min-w-0 flex-col rounded-2xl border bg-sidebar/60 transition-colors',
                      isOver ? 'border-primary bg-brand-50/60' : 'border-border',
                      highlightStage === stage.id && !isOver && 'border-primary/50',
                      peer && !isOver && 'border-dashed',
                    )}
                    style={peer && !isOver ? { borderColor: peer.user.color.hex } : undefined}
                  >
                    <header className="px-3 pb-2 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', DOT[stage.tone])} />
                          <h2 className="truncate text-[13px] font-semibold text-foreground">{stage.label[lang]}</h2>
                          <span className="num text-xs text-muted-foreground">{items.length}</span>
                        </div>
                        <span className="num shrink-0 text-xs text-muted-foreground">{amount > 0 ? formatEurCompact(amount, lang) : ''}</span>
                      </div>
                      <p className="mt-0.5 truncate pl-4 text-[11.5px] text-muted-foreground">{stage.hint[lang]}</p>
                    </header>
                    <div className="flex min-h-[7rem] flex-1 flex-col gap-2 px-2 pb-2">
                      {items.map((o) => (
                        <OpportunityCard key={o.id} {...cardProps(o)} />
                      ))}
                      {items.length === 0 && (
                        <p className="px-2 py-5 text-center text-xs text-muted-foreground">
                          {draggingId ? (fr ? 'Déposer ici' : 'Drop here') : fr ? 'Aucune opportunité' : 'No opportunity'}
                        </p>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setDrawer({ open: true, opp: null, stage: stage.id })}
                          className="mt-auto inline-flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus"
                          aria-label={fr ? `Ajouter une opportunité en « ${stage.label.fr} »` : `Add an opportunity to “${stage.label.en}”`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {fr ? 'Ajouter' : 'Add'}
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </>
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
