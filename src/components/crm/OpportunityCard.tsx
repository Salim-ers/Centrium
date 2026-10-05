'use client';

import Link from 'next/link';
import { ArrowRight, BellRing, CalendarClock, CheckCircle2, MoreHorizontal, Pencil, Target, Trash2, XCircle } from 'lucide-react';
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
import { followUpState } from '@/lib/crm/summary';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { formatEurCompact, formatDate } from '@/lib/format';
import type { Opportunity } from '@/types';

type Props = {
  opp: Opportunity;
  lang: 'fr' | 'en';
  clientName?: string | null;
  ownerName?: string | null;
  canEdit: boolean;
  /** Date du jour (AAAA-MM-JJ), pour signaler les relances en retard. */
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
};

/**
 * Carte d'opportunité : intitulé, client, montant et prochaine relance.
 * Glisser-déposer à la souris ; au clavier et au tactile, le menu « … »
 * fait passer à l'étape suivante ou marque l'opportunité gagnée / perdue.
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
}: Props) {
  const fr = lang === 'fr';
  const amount = opportunityAmount(opp);
  const current = stageOf(opp.status);
  const next = nextStage(current);
  const follow = followUpState(opp.next_follow_up, today);

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
      <div className="flex items-start gap-2">
        <Link
          href={`/opportunities/${opp.id}`}
          onClick={(e) => {
            // Clic simple : aperçu ; Ctrl / Cmd + clic : fiche dans un nouvel onglet.
            if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onOpen();
          }}
          className="min-w-0 flex-1 text-[13px] font-semibold leading-[18px] text-foreground outline-none hover:text-primary-deep focus-visible:underline"
          draggable={false}
        >
          {opp.title}
        </Link>
        {ownerName && (
          <span title={ownerName} className="shrink-0">
            <Avatar name={ownerName} size="xs" />
          </span>
        )}
      </div>
      {clientName && <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{clientName}</div>}

      <div className="mt-1.5 flex h-6 items-center justify-between gap-2">
        <span className="num min-w-0 truncate text-[13px] font-semibold text-foreground">
          {amount > 0 ? formatEurCompact(amount, lang) : '—'}
          {opp.probability != null && <span className="ml-1.5 text-[11.5px] font-medium text-muted-foreground">· {opp.probability} %</span>}
        </span>
        {canEdit && next && (
          <button
            type="button"
            onClick={() => onMove(next.id)}
            title={fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
            aria-label={fr ? `Passer ${opp.title} à « ${next.label.fr} »` : `Move ${opp.title} to “${next.label.en}”`}
            className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-app-terra opacity-0 transition hover:bg-app-peach-light focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-50 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={fr ? `Actions pour ${opp.title}` : `Actions for ${opp.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {next && (
                <DropdownMenuItem onSelect={() => onMove(next.id)}>
                  <ArrowRight />
                  {fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
                </DropdownMenuItem>
              )}
              {current !== 'won' && (
                <DropdownMenuItem onSelect={() => onMove('won')}>
                  <CheckCircle2 />
                  {fr ? 'Marquer gagnée' : 'Mark as won'}
                </DropdownMenuItem>
              )}
              {current !== 'lost' && (
                <DropdownMenuItem onSelect={() => onMove('lost')}>
                  <XCircle />
                  {fr ? 'Marquer perdue' : 'Mark as lost'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/opportunities/${opp.id}?tab=matching`}>
                  <Target />
                  {fr ? 'Positionner un profil' : 'Position a profile'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/opportunities/${opp.id}?tab=tasks`}>
                  <BellRing />
                  {fr ? 'Relancer' : 'Follow up'}
                </Link>
              </DropdownMenuItem>
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

      {follow && (
        <div
          className={cn(
            'mt-1 flex min-w-0 items-center gap-1 text-[11.5px]',
            follow === 'late' ? 'font-medium text-destructive' : follow === 'today' ? 'font-medium text-warning' : 'text-muted-foreground',
          )}
          title={opp.next_action ?? undefined}
        >
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {follow === 'late'
              ? fr
                ? 'En retard'
                : 'Overdue'
              : follow === 'today'
                ? fr
                  ? 'Aujourd’hui'
                  : 'Today'
                : formatDate(opp.next_follow_up, lang, 'short')}
            {opp.next_action ? ` · ${opp.next_action}` : ''}
          </span>
        </div>
      )}
    </article>
  );
}
