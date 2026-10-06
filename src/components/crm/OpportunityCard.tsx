'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Flame,
  MoreHorizontal,
  Pencil,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { nextStage, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { dealHealth, dealUrgency, healthLabel, isHighPriority, urgencyLabel } from '@/lib/crm/deal-health';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { formatEurCompact, formatDate } from '@/lib/format';
import type { Opportunity } from '@/types';

type Props = {
  opp: Opportunity;
  lang: 'fr' | 'en';
  clientName?: string | null;
  ownerName?: string | null;
  canEdit: boolean;
  /** Date du jour (AAAA-MM-JJ), pour l'urgence et l'état. */
  today: string;
  dragging?: boolean;
  peer?: { name: string; color: string } | null;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onMove: (to: PipelineStageId) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Ouvre l'aperçu (tiroir) ; sans lui, le titre mène à la fiche. */
  onOpen?: () => void;
  /** Ouvre le tiroir sur la relance. */
  onFollowUp?: () => void;
  /** Ouvre le tiroir sur la raison de perte. */
  onLose?: () => void;
  /** Gagner puis créer la mission. */
  onConvert?: () => void;
};

/**
 * Carte d'opportunité : client, intitulé, montant et chances, responsable,
 * prochaine action (colorée selon l'urgence) et état de l'affaire.
 * Glisser-déposer à la souris ; au clavier et au tactile, le menu « … »
 * change l'étape, relance, gagne, perd ou convertit en mission.
 */
export function OpportunityCard({
  opp,
  lang,
  clientName,
  ownerName,
  canEdit,
  today,
  dragging,
  peer,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
  onDelete,
  onOpen,
  onFollowUp,
  onLose,
  onConvert,
}: Props) {
  const fr = lang === 'fr';
  const amount = opportunityAmount(opp);
  const current = stageOf(opp.status);
  const next = nextStage(current);
  const urgency = dealUrgency(opp, today);
  const health = dealHealth(opp, today);
  const high = isHighPriority(opp);
  const action = opp.next_action?.trim() || null;
  const noAction = health.state === 'no_action';
  const firstName = ownerName?.split(/\s+/)[0] ?? null;

  const when =
    urgencyLabel(urgency, lang) ??
    (opp.next_follow_up ? formatDate(opp.next_follow_up, lang, 'short') : action ? (fr ? 'Sans date' : 'No date') : null);
  const actionTone =
    urgency.level === 'late'
      ? 'bg-danger-soft text-destructive'
      : urgency.level === 'today'
        ? 'bg-warning-soft text-warning'
        : urgency.level === 'soon'
          ? 'bg-app-peach-light text-app-terra-dark'
          : 'bg-muted/70 text-muted-foreground';

  const actionBody = noAction ? (
    <>
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{fr ? 'Sans prochaine action' : 'No next step'}</span>
        {canEdit && onFollowUp && <span className="block truncate underline-offset-2 opacity-90 group-hover/action:underline">{fr ? 'Planifier une relance' : 'Plan a follow-up'}</span>}
      </span>
    </>
  ) : (
    <>
      <CalendarClock className="mt-px h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{when}</span>
        {action && <span className="block truncate opacity-90">{action}</span>}
      </span>
    </>
  );

  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={opp.title}
      onClick={(e) => {
        // Un clic sur la carte ouvre l'aperçu, sauf sur un bouton ou un lien.
        if (!onOpen || (e.target as HTMLElement).closest('button, a, [role="menu"], [role="menuitem"]')) return;
        onOpen();
      }}
      className={cn(
        'group relative rounded-xl border border-black/[0.06] bg-card p-2.5 shadow-[0_1px_2px_rgba(25,22,20,.05)] transition-[box-shadow,border-color,opacity,transform] duration-150',
        onOpen && 'cursor-pointer',
        canEdit && 'cursor-grab active:cursor-grabbing',
        'hover:-translate-y-px hover:border-app-terra/25 hover:shadow-[0_10px_22px_-14px_rgba(25,22,20,.35)]',
        dragging && 'rotate-[0.5deg] opacity-50',
        peer && 'ring-2 ring-offset-1',
      )}
      style={peer ? ({ '--tw-ring-color': peer.color } as React.CSSProperties) : undefined}
    >
      {peer && (
        <span className="absolute -top-2 right-2 rounded-full px-1.5 py-px text-[10px] font-medium text-white" style={{ backgroundColor: peer.color }}>
          {peer.name}
        </span>
      )}

      <div className="flex h-5 items-center gap-1">
        <span className={cn('min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.04em]', clientName ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
          {clientName ?? (fr ? 'Sans client' : 'No client')}
        </span>
        {high && (
          <span title={opp.priority === 'critical' ? (fr ? 'Priorité critique' : 'Critical priority') : fr ? 'Priorité haute' : 'High priority'} className="shrink-0 text-destructive">
            <Flame className="h-3.5 w-3.5" aria-label={fr ? 'Prioritaire' : 'High priority'} />
          </span>
        )}
        {canEdit && next && (
          <button
            type="button"
            onClick={() => onMove(next.id)}
            title={fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
            aria-label={fr ? `Passer ${opp.title} à « ${next.label.fr} »` : `Move ${opp.title} to “${next.label.en}”`}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-app-terra opacity-0 transition hover:bg-app-peach-light focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={fr ? `Actions pour ${opp.title}` : `Actions for ${opp.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {next && (
                <DropdownMenuItem onSelect={() => onMove(next.id)}>
                  <ArrowRight />
                  {fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
                </DropdownMenuItem>
              )}
              {onFollowUp && (
                <DropdownMenuItem onSelect={onFollowUp}>
                  <BellRing />
                  {fr ? 'Relancer' : 'Follow up'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/opportunities/${opp.id}?tab=matching`}>
                  <Target />
                  {fr ? 'Positionner un profil' : 'Position a profile'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {current !== 'won' && (
                <DropdownMenuItem onSelect={() => onMove('won')}>
                  <CheckCircle2 />
                  {fr ? 'Marquer gagnée' : 'Mark as won'}
                </DropdownMenuItem>
              )}
              {onConvert && (
                <DropdownMenuItem onSelect={onConvert}>
                  <Briefcase />
                  {fr ? 'Convertir en mission' : 'Convert to mission'}
                </DropdownMenuItem>
              )}
              {current !== 'lost' && (
                <DropdownMenuItem onSelect={() => (onLose ? onLose() : onMove('lost'))}>
                  <XCircle />
                  {fr ? 'Marquer perdue…' : 'Mark as lost…'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                {fr ? 'Modifier' : 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash2 />
                {fr ? 'Supprimer' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Link
        href={`/opportunities/${opp.id}`}
        onClick={(e) => {
          // Clic simple : aperçu ; Ctrl / Cmd + clic : fiche dans un nouvel onglet.
          if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          onOpen();
        }}
        className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-[18px] text-foreground outline-none hover:text-primary-deep focus-visible:underline"
        draggable={false}
      >
        {opp.title}
      </Link>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="num truncate text-[15px] font-semibold leading-none text-foreground">{amount > 0 ? formatEurCompact(amount, lang) : '—'}</div>
          {opp.probability != null && (
            <div className="mt-1.5 flex items-center gap-1.5" title={fr ? 'Chances de gagner' : 'Chance of winning'}>
              <span className="block h-1 w-12 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-app-terra" style={{ width: `${Math.min(100, Math.max(0, opp.probability))}%` }} />
              </span>
              <span className="num text-[11px] font-medium text-muted-foreground">{opp.probability} %</span>
            </div>
          )}
        </div>
        {firstName ? (
          <span title={ownerName ?? undefined} className="inline-flex min-w-0 shrink items-center gap-1 text-[11.5px] text-muted-foreground">
            <Avatar name={ownerName} size="xs" />
            <span className="max-w-[76px] truncate">{firstName}</span>
          </span>
        ) : !opp.owner_id ? (
          <span className="shrink-0 text-[11px] italic text-muted-foreground/80">{fr ? 'Non attribuée' : 'Unassigned'}</span>
        ) : null}
      </div>

      {canEdit && onFollowUp ? (
        <button
          type="button"
          onClick={onFollowUp}
          title={action ?? undefined}
          aria-label={noAction ? (fr ? `Planifier une relance pour ${opp.title}` : `Plan a follow-up for ${opp.title}`) : fr ? `Relancer : ${action ?? when ?? ''}` : `Follow up: ${action ?? when ?? ''}`}
          className={cn(
            'group/action mt-2.5 flex w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11.5px] leading-[15px] transition-colors focus-visible:outline-none focus-visible:shadow-focus',
            noAction ? 'border border-dashed border-warning/50 text-warning hover:bg-warning-soft/60' : cn(actionTone, 'hover:brightness-[0.97]'),
          )}
        >
          {actionBody}
        </button>
      ) : (
        <div
          title={action ?? undefined}
          className={cn(
            'mt-2.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] leading-[15px]',
            noAction ? 'border border-dashed border-warning/50 text-warning' : actionTone,
          )}
        >
          {actionBody}
        </div>
      )}

      {health.state === 'stale' && (
        <div className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
          {healthLabel(health, lang)}
        </div>
      )}
    </article>
  );
}
