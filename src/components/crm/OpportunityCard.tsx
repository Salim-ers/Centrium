'use client';

import Link from 'next/link';
import { CalendarClock, MoreHorizontal, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PIPELINE_STAGES, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { formatEurCompact, formatDate, relativeDays } from '@/lib/format';
import type { Opportunity } from '@/types';

type Props = {
  opp: Opportunity;
  lang: 'fr' | 'en';
  clientName?: string | null;
  ownerName?: string | null;
  proposals?: number;
  canEdit: boolean;
  dragging?: boolean;
  peer?: { name: string; color: string } | null;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onMove: (to: PipelineStageId) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Carte d'opportunité du pipeline. Glisser-déposer à la souris, et menu
 * « Déplacer vers… » pour le clavier, le tactile et les lecteurs d'écran.
 */
export function OpportunityCard({
  opp,
  lang,
  clientName,
  ownerName,
  proposals = 0,
  canEdit,
  dragging,
  peer,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
  onDelete,
}: Props) {
  const fr = lang === 'fr';
  const amount = opportunityAmount(opp);
  const current = stageOf(opp.status);
  const followUp = opp.next_follow_up;
  const overdue = !!followUp && followUp < new Date().toISOString().slice(0, 10);

  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={opp.title}
      className={cn(
        'group relative rounded-lg border border-border bg-card p-3 shadow-xs transition-[box-shadow,border-color,opacity,transform] duration-150',
        canEdit && 'cursor-grab active:cursor-grabbing',
        'hover:border-sand-300 hover:shadow-md',
        dragging && 'rotate-[0.5deg] opacity-50',
        peer && 'ring-2 ring-offset-1',
      )}
      style={peer ? ({ '--tw-ring-color': peer.color } as React.CSSProperties) : undefined}
    >
      {peer && (
        <span
          className="absolute -top-2 right-2 rounded-full px-1.5 py-px text-[10px] font-medium text-white"
          style={{ backgroundColor: peer.color }}
        >
          {peer.name}
        </span>
      )}
      <div className="flex items-start gap-2">
        <Link
          href={`/opportunities/${opp.id}`}
          className="min-w-0 flex-1 text-[13.5px] font-medium leading-5 text-foreground outline-none hover:text-primary-deep focus-visible:underline"
          draggable={false}
        >
          {opp.title}
        </Link>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="-mr-1 -mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={fr ? `Actions pour ${opp.title}` : `Actions for ${opp.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <ArrowRightLeft className="h-3 w-3" />
                {fr ? 'Déplacer vers' : 'Move to'}
              </DropdownMenuLabel>
              {PIPELINE_STAGES.filter((s) => s.id !== current).map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => onMove(s.id)}>
                  {s.label[lang]}
                </DropdownMenuItem>
              ))}
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
      {clientName && <div className="mt-0.5 truncate text-xs text-muted-foreground">{clientName}</div>}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="num text-[13px] font-semibold text-foreground">{amount > 0 ? formatEurCompact(amount, lang) : '—'}</div>
        {opp.probability != null && (
          <span className="num rounded bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
            {opp.probability} %
          </span>
        )}
      </div>

      {(followUp || ownerName || proposals > 0) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
          {followUp ? (
            <span
              className={cn('inline-flex min-w-0 items-center gap-1 text-[11px]', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}
              title={opp.next_action ?? undefined}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {overdue ? relativeDays(followUp, lang) : formatDate(followUp, lang, 'short')}
                {opp.next_action ? ` · ${opp.next_action}` : ''}
              </span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {proposals > 0 ? (fr ? `${proposals} profil${proposals > 1 ? 's' : ''} proposé${proposals > 1 ? 's' : ''}` : `${proposals} profile${proposals > 1 ? 's' : ''} sent`) : ''}
            </span>
          )}
          {ownerName && <Avatar name={ownerName} size="xs" />}
        </div>
      )}
    </article>
  );
}
