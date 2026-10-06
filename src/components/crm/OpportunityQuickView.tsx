'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Briefcase, CheckCircle2, Flame, Pencil, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { DetailDrawer } from '@/components/app/DetailDrawer';
import { InlineField } from '@/components/app/InlineField';
import { NotesPanel } from '@/components/app/NotesPanel';
import { ActivityTimeline } from '@/components/app/ActivityTimeline';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import type { ComboboxOption } from '@/components/ui/Combobox';
import { FollowUpComposer } from '@/components/crm/FollowUpComposer';
import { TaskList } from '@/components/crm/TaskList';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useContactsLite } from '@/hooks/useOrgDirectory';
import { nextStage, stageLabel, stageOf, stageTone, type PipelineStageId } from '@/lib/crm/pipeline';
import { LOST_REASONS, dealHealth, healthLabel, isHighPriority, weightedAmount } from '@/lib/crm/deal-health';
import { opportunityAmount } from '@/lib/pilotage/metrics';
import { REMOTE_POLICIES, REMOTE_POLICY_LABEL, type OpportunityV2Input, type RemotePolicy } from '@/lib/validators/v2';
import { formatDate, formatEur, formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertPriority, Opportunity } from '@/types';

const PRIORITY_LABEL: Record<AlertPriority, { fr: string; en: string }> = {
  low: { fr: 'Basse', en: 'Low' },
  medium: { fr: 'Normale', en: 'Normal' },
  high: { fr: 'Haute', en: 'High' },
  critical: { fr: 'Critique', en: 'Critical' },
};

export type QuickViewMode = 'follow_up' | 'lost' | null;

type Props = {
  opp: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: 'fr' | 'en';
  organizationId: string;
  clientName?: string | null;
  ownerName?: string | null;
  members: ComboboxOption[];
  canEdit: boolean;
  /** Droit de créer une mission (conversion). */
  canConvert: boolean;
  today: string;
  /** Ouvre le tiroir sur la relance ou sur la raison de perte. */
  mode?: QuickViewMode;
  onEdit: (o: Opportunity) => void;
  onMove: (o: Opportunity, to: PipelineStageId | 'on_hold', extra?: { lost_reason?: string | null }) => void;
  /** Édition rapide d'un champ ; false si l'enregistrement a échoué. */
  onPatch: (o: Opportunity, patch: Partial<OpportunityV2Input>) => Promise<boolean>;
  /** Affaire relue après une relance (planifiée ou faite). */
  onChange: (o: Opportunity) => void;
  /** Gagner (si besoin) puis créer la mission depuis l'affaire. */
  onConvert: (o: Opportunity) => void;
};

/** Montant saisi (« 84 000 », « 84000,50 ») → nombre ; null si vide, NaN si invalide. */
function parseAmount(v: string | null): number | null {
  if (v == null) return null;
  return Number(v.replace(/[\s€%]/g, '').replace(',', '.'));
}

/**
 * Aperçu d'une opportunité dans un tiroir : on agit sans quitter le kanban.
 * Prochaine action et relance en tête, champs modifiables sur place, étape,
 * gagnée / perdue (avec la raison), conversion en mission, profils, tâches,
 * notes et historique.
 */
export function OpportunityQuickView({
  opp,
  open,
  onOpenChange,
  lang,
  organizationId,
  clientName,
  ownerName,
  members,
  canEdit,
  canConvert,
  today,
  mode = null,
  onEdit,
  onMove,
  onPatch,
  onChange,
  onConvert,
}: Props) {
  const fr = lang === 'fr';
  const { byId: contacts } = useContactsLite();
  const [losing, setLosing] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setLosing(mode === 'lost');
    setReason('');
  }, [opp?.id, mode]);

  if (!opp) return null;
  const amount = opportunityAmount(opp);
  const current = stageOf(opp.status);
  const next = nextStage(current);
  const isOpen = current !== 'won' && current !== 'lost' && opp.status !== 'on_hold';
  const health = dealHealth(opp, today);
  const contact = opp.contact_id ? contacts.get(opp.contact_id) : null;

  const save = (patch: Partial<OpportunityV2Input>) => onPatch(opp, patch);
  const saveNumber = (key: 'expected_revenue' | 'daily_rate_eur' | 'budget_eur' | 'probability' | 'duration_months', max?: number) => async (v: string | null) => {
    const n = parseAmount(v);
    if (n != null && (!Number.isFinite(n) || n < 0 || (max != null && n > max))) {
      toast.error(fr ? 'Valeur invalide' : 'Invalid value');
      return false;
    }
    return save({ [key]: n == null ? null : key === 'probability' || key === 'duration_months' ? Math.round(n) : n });
  };

  function confirmLost() {
    onMove(opp!, 'lost', { lost_reason: reason.trim() || null });
    setLosing(false);
  }

  const lostPanel = losing && canEdit && (
    <div className="space-y-3 rounded-xl border border-destructive/25 bg-danger-soft/50 p-3.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-destructive">
        <XCircle className="h-4 w-4" />
        {fr ? 'Pourquoi l’affaire est-elle perdue ?' : 'Why was the deal lost?'}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LOST_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={reason === r.label[lang]}
            onClick={() => setReason(r.label[lang])}
            className={cn(
              'h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors',
              reason === r.label[lang] ? 'border-destructive bg-destructive text-white' : 'border-border bg-card hover:border-destructive/40',
            )}
          >
            {r.label[lang]}
          </button>
        ))}
      </div>
      <Input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder={fr ? 'Ou précisez (facultatif)' : 'Or give details (optional)'} aria-label={fr ? 'Raison de la perte' : 'Loss reason'} />
      <p className="text-xs text-muted-foreground">{fr ? 'La raison alimente l’analyse des pertes. Vous pourrez rouvrir l’affaire.' : 'The reason feeds the loss analysis. You can reopen the deal later.'}</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setLosing(false)}>
          {fr ? 'Annuler' : 'Cancel'}
        </Button>
        <Button size="sm" variant="destructive" onClick={confirmLost}>
          <XCircle />
          {fr ? 'Marquer perdue' : 'Mark as lost'}
        </Button>
      </div>
    </div>
  );

  const outcomeBanner =
    current === 'won' ? (
      <div className="flex items-start gap-3 rounded-xl bg-success-soft px-3.5 py-3 text-[13px] text-success">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{fr ? 'Affaire gagnée' : 'Deal won'}</div>
          <div className="text-foreground/80">{fr ? 'Prochaine étape : la mission (consultant, dates, TJM repris de l’affaire).' : 'Next step: the mission (consultant, dates and rate carried over).'}</div>
        </div>
      </div>
    ) : current === 'lost' ? (
      <div className="flex items-start gap-3 rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] text-destructive">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{fr ? 'Affaire perdue' : 'Deal lost'}</div>
          <div className="text-foreground/80">{opp.lost_reason ?? (fr ? 'Raison non renseignée.' : 'No reason given.')}</div>
        </div>
      </div>
    ) : null;

  const memberOptions = members.map((m) => ({ value: m.value, label: m.label }));

  const overview = (
    <div className="space-y-5">
      {lostPanel}
      {outcomeBanner}
      {isOpen && <FollowUpComposer opp={opp} lang={lang} today={today} ownerName={ownerName} canEdit={canEdit} autoOpen={mode === 'follow_up'} onChange={onChange} />}

      <section aria-label={fr ? 'Affaire' : 'Deal'}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">{fr ? 'Affaire' : 'Deal'}</h3>
          {canEdit && <span className="text-[11.5px] text-muted-foreground">{fr ? 'Cliquez une valeur pour la modifier' : 'Click a value to edit it'}</span>}
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <InlineField
            kind="number"
            label={fr ? 'Montant' : 'Amount'}
            value={opp.expected_revenue}
            display={amount ? <span className="num font-semibold">{formatEur(amount, lang)}</span> : null}
            hint={opp.expected_revenue == null && amount ? (fr ? 'Estimé : TJM × durée × 20 j' : 'Estimated: rate × duration × 20 d') : undefined}
            suffix="€"
            min={0}
            disabled={!canEdit}
            onSave={saveNumber('expected_revenue', 100_000_000)}
          />
          <InlineField
            kind="number"
            label={fr ? 'Chances de gagner' : 'Chance of winning'}
            value={opp.probability}
            display={opp.probability != null ? <span className="num">{opp.probability} %</span> : null}
            hint={amount && opp.probability != null ? (fr ? `Pondéré : ${formatEurCompact(weightedAmount(opp), lang)}` : `Weighted: ${formatEurCompact(weightedAmount(opp), lang)}`) : undefined}
            suffix="%"
            min={0}
            max={100}
            disabled={!canEdit}
            onSave={saveNumber('probability', 100)}
          />
          <InlineField
            kind="select"
            label={fr ? 'Responsable' : 'Owner'}
            value={opp.owner_id}
            display={
              ownerName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={ownerName} size="xs" />
                  {ownerName}
                </span>
              ) : null
            }
            options={memberOptions}
            emptyLabel={fr ? 'Non attribuée' : 'Unassigned'}
            disabled={!canEdit}
            onSave={(v) => save({ owner_id: v })}
          />
          <InlineField
            kind="select"
            label={fr ? 'Priorité' : 'Priority'}
            value={opp.priority}
            display={
              <span className={cn('inline-flex items-center gap-1', isHighPriority(opp) && 'font-medium text-destructive')}>
                {isHighPriority(opp) && <Flame className="h-3.5 w-3.5" />}
                {PRIORITY_LABEL[opp.priority]?.[lang] ?? opp.priority}
              </span>
            }
            options={(Object.keys(PRIORITY_LABEL) as AlertPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p][lang] }))}
            disabled={!canEdit}
            onSave={(v) => save({ priority: (v ?? 'medium') as AlertPriority })}
          />
          <InlineField
            kind="date"
            label={fr ? 'Clôture prévue' : 'Expected close'}
            value={opp.expected_close}
            display={opp.expected_close ? formatDate(opp.expected_close, lang) : null}
            disabled={!canEdit}
            onSave={(v) => save({ expected_close: v })}
          />
          <InlineField
            kind="date"
            label={fr ? 'Démarrage' : 'Start'}
            value={opp.start_date ?? null}
            display={opp.start_date ? formatDate(opp.start_date, lang) : null}
            disabled={!canEdit}
            onSave={(v) => save({ start_date: v })}
          />
          <InlineField
            kind="number"
            label={fr ? 'TJM cible' : 'Target day rate'}
            value={opp.daily_rate_eur}
            display={opp.daily_rate_eur ? formatEur(opp.daily_rate_eur, lang) : null}
            suffix="€"
            min={0}
            disabled={!canEdit}
            onSave={saveNumber('daily_rate_eur', 100_000)}
          />
          <InlineField
            kind="number"
            label={fr ? 'Durée' : 'Duration'}
            value={opp.duration_months}
            display={opp.duration_months ? `${opp.duration_months} ${fr ? 'mois' : 'months'}` : null}
            suffix={fr ? 'mois' : 'mo'}
            min={0}
            max={120}
            disabled={!canEdit}
            onSave={saveNumber('duration_months', 120)}
          />
          <InlineField
            kind="number"
            label={fr ? 'Budget client' : 'Client budget'}
            value={opp.budget_eur ?? null}
            display={opp.budget_eur ? formatEur(opp.budget_eur, lang) : null}
            suffix="€"
            min={0}
            disabled={!canEdit}
            onSave={saveNumber('budget_eur', 100_000_000)}
          />
          <InlineField
            kind="select"
            label={fr ? 'Télétravail' : 'Remote'}
            value={opp.remote_policy ?? null}
            display={opp.remote_policy ? REMOTE_POLICY_LABEL[opp.remote_policy as RemotePolicy]?.[lang] : null}
            options={REMOTE_POLICIES.map((p) => ({ value: p, label: REMOTE_POLICY_LABEL[p][lang] }))}
            emptyLabel={fr ? 'Non précisé' : 'Not specified'}
            disabled={!canEdit}
            onSave={(v) => save({ remote_policy: (v as RemotePolicy | null) ?? null })}
          />
          <div className="col-span-2">
            <InlineField
              kind="text"
              label={fr ? 'Lieu' : 'Location'}
              value={opp.location ?? null}
              display={opp.location}
              placeholder={fr ? 'Ex. Paris La Défense' : 'e.g. Paris'}
              disabled={!canEdit}
              onSave={(v) => save({ location: v })}
            />
          </div>
        </div>
      </section>

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
      <div>
        <div className="mb-1 text-xs text-muted-foreground">{fr ? 'Contact client' : 'Client contact'}</div>
        {contact ? (
          <div className="flex items-center gap-2 text-[13.5px]">
            <Avatar name={`${contact.first_name} ${contact.last_name}`} size="sm" />
            <span className="min-w-0">
              <span className="block truncate">
                {contact.first_name} {contact.last_name}
              </span>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                  {contact.email}
                </a>
              )}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );

  const hLabel = isOpen && health.state !== 'on_track' ? healthLabel(health, lang) : null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={opp.title}
      subtitle={clientName ?? (fr ? 'Sans client' : 'No client')}
      badges={
        <>
          <StatusPill tone={stageTone(opp.status)}>{stageLabel(opp.status, lang)}</StatusPill>
          {amount > 0 && (
            <span className="num rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold">
              {formatEurCompact(amount, lang)}
              {opp.probability != null && isOpen && <span className="font-medium text-muted-foreground"> · {opp.probability} %</span>}
            </span>
          )}
          {isOpen && isHighPriority(opp) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-medium text-destructive">
              <Flame className="h-3 w-3" />
              {PRIORITY_LABEL[opp.priority][lang]}
            </span>
          )}
          {hLabel && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-medium text-warning">{hLabel}</span>}
        </>
      }
      actions={
        canEdit && (
          <>
            {isOpen && next && (
              <Button size="sm" onClick={() => onMove(opp, next.id)}>
                <ArrowRight />
                {fr ? `Passer à « ${next.label.fr} »` : `Move to “${next.label.en}”`}
              </Button>
            )}
            {canConvert && (current === 'won' || (isOpen && !next)) && (
              <Button size="sm" onClick={() => onConvert(opp)} title={current === 'won' ? undefined : fr ? 'Marque l’affaire gagnée puis prépare la mission' : 'Marks the deal won, then prepares the mission'}>
                <Briefcase />
                {fr ? 'Convertir en mission' : 'Convert to mission'}
              </Button>
            )}
            {isOpen && (
              <Button size="sm" variant="secondary" onClick={() => onMove(opp, 'won')}>
                <CheckCircle2 className="text-success" />
                {fr ? 'Gagnée' : 'Won'}
              </Button>
            )}
            {current !== 'lost' && current !== 'won' && (
              <Button size="sm" variant="secondary" onClick={() => setLosing(true)} aria-expanded={losing}>
                <XCircle className="text-destructive" />
                {fr ? 'Perdue' : 'Lost'}
              </Button>
            )}
            {!isOpen && (
              <Button size="sm" variant="secondary" onClick={() => onMove(opp, 'prospect')}>
                <RotateCcw />
                {fr ? 'Rouvrir' : 'Reopen'}
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={() => onEdit(opp)} aria-label={fr ? 'Modifier toute la fiche' : 'Edit the full record'} title={fr ? 'Modifier toute la fiche' : 'Edit the full record'}>
              <Pencil />
            </Button>
          </>
        )
      }
      tabs={[
        { id: 'overview', label: fr ? 'Aperçu' : 'Overview', content: overview },
        { id: 'profiles', label: fr ? 'Profils' : 'Profiles', content: <OpportunityMatching opp={opp} offer={null} lang={lang} canEdit={canEdit} organizationId={organizationId} /> },
        { id: 'tasks', label: fr ? 'Tâches' : 'Tasks', content: <TaskList entityType="opportunity" entityId={opp.id} filter="all" compact /> },
        { id: 'notes', label: 'Notes', content: <NotesPanel entityType="opportunity" entityId={opp.id} canEdit={canEdit} /> },
        { id: 'history', label: fr ? 'Historique' : 'History', content: <ActivityTimeline entityType="opportunity" entityId={opp.id} /> },
      ]}
      footer={
        <Button asChild size="sm" variant="secondary">
          <Link href={`/opportunities/${opp.id}`}>
            {fr ? 'Ouvrir la fiche complète' : 'Open full record'}
            <ArrowUpRight />
          </Link>
        </Button>
      }
    />
  );
}
