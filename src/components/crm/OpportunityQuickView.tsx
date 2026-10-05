'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, Pencil, XCircle } from 'lucide-react';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { FactList } from '@/components/app/FactList';
import { NotesPanel } from '@/components/app/NotesPanel';
import { ActivityTimeline } from '@/components/app/ActivityTimeline';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { TaskList } from '@/components/crm/TaskList';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useContactsLite } from '@/hooks/useOrgDirectory';
import { nextStage, stageLabel, stageOf, stageTone, type PipelineStageId } from '@/lib/crm/pipeline';
import { followUpState } from '@/lib/crm/summary';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { REMOTE_POLICY_LABEL, type RemotePolicy } from '@/lib/validators/v2';
import { formatDate, formatEur, formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/types';

/**
 * Aperçu d'une opportunité dans un tiroir : on agit (étape, gagnée, perdue,
 * modifier, positionner des profils, notes, tâches) sans quitter le kanban.
 */
export function OpportunityQuickView({
  opp,
  open,
  onOpenChange,
  lang,
  organizationId,
  clientName,
  ownerName,
  canEdit,
  today,
  onEdit,
  onMove,
}: {
  opp: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: 'fr' | 'en';
  organizationId: string;
  clientName?: string | null;
  ownerName?: string | null;
  canEdit: boolean;
  today: string;
  onEdit: (o: Opportunity) => void;
  onMove: (o: Opportunity, to: PipelineStageId) => void;
}) {
  const fr = lang === 'fr';
  const { byId: contacts } = useContactsLite();
  if (!opp) return null;
  const amount = opportunityAmount(opp);
  const current = stageOf(opp.status);
  const next = nextStage(current);
  const follow = followUpState(opp.next_follow_up, today);
  const contact = opp.contact_id ? contacts.get(opp.contact_id) : null;

  const overview = (
    <div className="space-y-5">
      {(opp.next_action || opp.next_follow_up) && (
        <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]', follow === 'late' ? 'bg-danger-soft text-destructive' : follow === 'today' ? 'bg-warning-soft text-warning' : 'bg-app-peach-light text-app-terra-dark')}>
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">
              {follow === 'late' ? (fr ? 'Relance en retard' : 'Overdue follow-up') : follow === 'today' ? (fr ? 'À faire aujourd’hui' : 'Due today') : fr ? 'Prochaine action' : 'Next action'}
              {opp.next_follow_up && follow === 'upcoming' ? ` · ${formatDate(opp.next_follow_up, lang)}` : ''}
            </span>
            {opp.next_action && <span className="block opacity-90">{opp.next_action}</span>}
          </span>
        </div>
      )}
      <FactList
        columns={2}
        facts={[
          { label: fr ? 'Montant' : 'Amount', value: amount ? <span className="num font-semibold">{formatEur(amount, lang)}</span> : null, hint: opp.expected_revenue == null && amount ? (fr ? 'Estimé : TJM × durée × 20 j' : 'Estimated') : undefined },
          { label: fr ? 'Chances de gagner' : 'Chance of winning', value: opp.probability != null ? <span className="num">{opp.probability} %</span> : null },
          { label: fr ? 'TJM cible' : 'Target day rate', value: opp.daily_rate_eur ? formatEur(opp.daily_rate_eur, lang) : null },
          { label: fr ? 'Budget client' : 'Client budget', value: opp.budget_eur ? formatEur(opp.budget_eur, lang) : null },
          { label: fr ? 'Démarrage' : 'Start', value: opp.start_date ? formatDate(opp.start_date, lang) : null },
          { label: fr ? 'Durée' : 'Duration', value: opp.duration_months ? `${opp.duration_months} ${fr ? 'mois' : 'months'}` : null },
          { label: fr ? 'Lieu' : 'Location', value: opp.location },
          { label: fr ? 'Télétravail' : 'Remote', value: opp.remote_policy ? REMOTE_POLICY_LABEL[opp.remote_policy as RemotePolicy]?.[lang] : null },
        ]}
      />
      {(opp.required_skills ?? []).length > 0 && (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">{fr ? 'Compétences recherchées' : 'Required skills'}</div>
          <div className="flex flex-wrap gap-1.5">
            {(opp.required_skills ?? []).map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {opp.description && (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">{fr ? 'Besoin' : 'Requirement'}</div>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{opp.description}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{fr ? 'Responsable' : 'Owner'}</div>
          {ownerName ? (
            <div className="flex items-center gap-2 text-[13.5px]">
              <Avatar name={ownerName} size="sm" />
              {ownerName}
            </div>
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{fr ? 'Contact client' : 'Client contact'}</div>
          {contact ? (
            <div className="flex items-center gap-2 text-[13.5px]">
              <Avatar name={`${contact.first_name} ${contact.last_name}`} size="sm" />
              <span className="min-w-0">
                <span className="block truncate">
                  {contact.first_name} {contact.last_name}
                </span>
                {contact.email && <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>}
              </span>
            </div>
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={opp.title}
      subtitle={clientName ?? (fr ? 'Sans client' : 'No client')}
      badges={
        <>
          <StatusPill tone={stageTone(opp.status)}>{stageLabel(opp.status, lang)}</StatusPill>
          {amount > 0 && <span className="num rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold">{formatEurCompact(amount, lang)}</span>}
        </>
      }
      actions={
        <>
          {canEdit && next && (
            <Button size="sm" onClick={() => onMove(opp, next.id)}>
              <ArrowRight />
              {fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
            </Button>
          )}
          {canEdit && current !== 'won' && (
            <Button size="sm" variant="secondary" onClick={() => onMove(opp, 'won')}>
              <CheckCircle2 />
              {fr ? 'Gagnée' : 'Won'}
            </Button>
          )}
          {canEdit && current !== 'lost' && (
            <Button size="sm" variant="ghost" onClick={() => onMove(opp, 'lost')}>
              <XCircle />
              {fr ? 'Perdue' : 'Lost'}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(opp)}>
              <Pencil />
              {fr ? 'Modifier' : 'Edit'}
            </Button>
          )}
        </>
      }
      tabs={[
        { id: 'overview', label: fr ? 'Aperçu' : 'Overview', content: overview },
        { id: 'profiles', label: fr ? 'Profils' : 'Profiles', content: <OpportunityMatching opp={opp} offer={null} lang={lang} canEdit={canEdit} organizationId={organizationId} /> },
        { id: 'tasks', label: fr ? 'Tâches' : 'Tasks', content: <TaskList entityType="opportunity" entityId={opp.id} filter="all" compact /> },
        { id: 'notes', label: 'Notes', content: <NotesPanel entityType="opportunity" entityId={opp.id} canEdit={canEdit} /> },
        { id: 'history', label: fr ? 'Historique' : 'History', content: <ActivityTimeline entityType="opportunity" entityId={opp.id} /> },
      ]}
      footer={
        <>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/opportunities/${opp.id}`}>
              {fr ? 'Ouvrir la fiche complète' : 'Open full record'}
              <ArrowUpRight />
            </Link>
          </Button>
        </>
      }
    />
  );
}
