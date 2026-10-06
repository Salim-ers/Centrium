'use client';

import { useEffect, useState } from 'react';
import { BellRing, CalendarClock, CalendarPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { showBrandToast } from '@/components/ui/BrandToast';
import { crmService } from '@/lib/services/crm.service';
import { dealUrgency, followUpPresets, urgencyLabel } from '@/lib/crm/deal-health';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/types';

const SUGGESTIONS: Array<{ fr: string; en: string }> = [
  { fr: 'Relancer par téléphone', en: 'Call back' },
  { fr: 'Envoyer les CV', en: 'Send the CVs' },
  { fr: 'Caler un rendez-vous', en: 'Book a meeting' },
  { fr: 'Envoyer la proposition', en: 'Send the proposal' },
];

type Props = {
  opp: Opportunity;
  lang: 'fr' | 'en';
  today: string;
  ownerName?: string | null;
  canEdit: boolean;
  /** Ouvre directement la saisie (bouton « Relancer » d'une carte). */
  autoOpen?: boolean;
  onChange: (opp: Opportunity) => void;
};

/**
 * Prochaine action d'une affaire : ce qui est prévu, son urgence, et la
 * relance en deux clics (action, date proposée, tâche pour le responsable).
 * « Fait » consigne l'action dans l'historique puis propose la suivante.
 */
export function FollowUpComposer({ opp, lang, today, ownerName, canEdit, autoOpen = false, onChange }: Props) {
  const fr = lang === 'fr';
  const presets = followUpPresets(today);
  const [open, setOpen] = useState(autoOpen);
  const [action, setAction] = useState(opp.next_action ?? '');
  const [date, setDate] = useState<string>(opp.next_follow_up ?? presets[1]?.date ?? today);
  const [withTask, setWithTask] = useState(true);
  const [busy, setBusy] = useState<'plan' | 'done' | null>(null);

  // Autre affaire ouverte dans le tiroir : on repart de son état.
  useEffect(() => {
    setOpen(autoOpen);
    setAction(opp.next_action ?? '');
    setDate(opp.next_follow_up ?? followUpPresets(today)[1]?.date ?? today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp.id, autoOpen]);

  const urgency = dealUrgency(opp, today);
  const hasAction = !!(opp.next_action?.trim() || opp.next_follow_up);
  const tone =
    urgency.level === 'late'
      ? 'bg-danger-soft text-destructive'
      : urgency.level === 'today'
        ? 'bg-warning-soft text-warning'
        : hasAction
          ? 'bg-app-peach-light text-app-terra-dark'
          : 'border border-dashed border-warning/50 bg-warning-soft/40 text-foreground';

  async function plan(e?: React.FormEvent) {
    e?.preventDefault();
    if (!action.trim()) {
      toast.error(fr ? 'Indiquez la prochaine action' : 'Enter the next step');
      return;
    }
    setBusy('plan');
    const res = await crmService.planFollowUp(opp, { action, date, createTask: withTask });
    setBusy(null);
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? (fr ? 'Relance impossible' : 'Could not plan the follow-up'));
      return;
    }
    onChange(res.data.opportunity);
    setOpen(false);
    if (res.data.taskFailed) {
      toast.error(fr ? 'Relance enregistrée, mais la tâche n’a pas pu être créée' : 'Follow-up saved, but the task could not be created');
      return;
    }
    const taskNote =
      res.data.taskAction === 'created' ? (fr ? ' · tâche créée' : ' · task created') : res.data.taskAction === 'updated' ? (fr ? ' · tâche déplacée' : ' · task moved') : '';
    showBrandToast('success', fr ? 'Relance planifiée' : 'Follow-up planned', {
      description: `${action.trim()} · ${formatDate(date, lang)}${taskNote}`,
    });
  }

  async function markDone() {
    setBusy('done');
    const res = await crmService.completeFollowUp(opp);
    setBusy(null);
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? (fr ? 'Action impossible' : 'Could not update'));
      return;
    }
    onChange(res.data);
    showBrandToast('success', fr ? 'Relance faite' : 'Follow-up done', {
      description: fr ? 'Consignée dans l’historique. Planifiez la suite.' : 'Logged in the history. Plan the next step.',
    });
    setAction('');
    setDate(presets[1]?.date ?? today);
    setOpen(true);
  }

  if (open && canEdit) {
    return (
      <form onSubmit={plan} className="space-y-3 rounded-xl border border-app-terra/25 bg-card p-3.5 shadow-[0_6px_18px_-14px_rgba(25,22,20,.4)]">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <BellRing className="h-4 w-4 text-app-terra" />
          {fr ? 'Planifier la relance' : 'Plan the follow-up'}
        </div>
        <div>
          <label htmlFor="follow-up-action" className="mb-1 block text-xs text-muted-foreground">
            {fr ? 'Prochaine action' : 'Next step'}
          </label>
          <Input
            id="follow-up-action"
            autoFocus
            value={action}
            maxLength={300}
            onChange={(e) => setAction(e.target.value)}
            placeholder={fr ? 'Ex. Rappeler le DSI pour son retour sur les CV' : 'e.g. Call the CIO about the CVs'}
          />
          {!action.trim() && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.fr}
                  type="button"
                  onClick={() => setAction(s[lang])}
                  className="rounded-full border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:border-app-terra/40 hover:text-foreground"
                >
                  {s[lang]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{fr ? 'Quand ?' : 'When?'}</div>
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={fr ? 'Date de relance' : 'Follow-up date'}>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={date === p.date}
                onClick={() => setDate(p.date)}
                title={formatDate(p.date, lang)}
                className={cn(
                  'h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors',
                  date === p.date ? 'border-app-terra bg-app-terra text-white' : 'border-border bg-card hover:border-app-terra/40',
                )}
              >
                {p.label[lang]}
              </button>
            ))}
            <label className="relative inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[12px] font-medium text-muted-foreground hover:border-app-terra/40">
              <CalendarPlus className="h-3.5 w-3.5" />
              {presets.some((p) => p.date === date) ? (fr ? 'Autre date' : 'Other date') : formatDate(date, lang)}
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                aria-label={fr ? 'Choisir une autre date' : 'Pick another date'}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <Checkbox checked={withTask} onCheckedChange={(v) => setWithTask(v === true)} />
          {fr ? 'Tâche de relance' : 'Follow-up task'}
          <span className="text-muted-foreground">
            {ownerName ? (fr ? `pour ${ownerName}` : `for ${ownerName}`) : ''}
            {fr ? ' · une seule, déplacée si vous replanifiez' : ' · just one, moved if you reschedule'}
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy !== null}>
            {fr ? 'Annuler' : 'Cancel'}
          </Button>
          <Button type="submit" size="sm" disabled={busy !== null}>
            {busy === 'plan' ? <Loader2 className="animate-spin" /> : <BellRing />}
            {fr ? 'Planifier' : 'Plan'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]', tone)}>
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {!hasAction
            ? fr
              ? 'Aucune prochaine action'
              : 'No next step'
            : urgency.level === 'late'
              ? fr
                ? `Relance en retard de ${urgency.days} j`
                : `Follow-up ${urgency.days} d overdue`
              : (urgencyLabel(urgency, lang) ?? (opp.next_follow_up ? formatDate(opp.next_follow_up, lang) : fr ? 'Sans date' : 'No date'))}
          {opp.next_follow_up && urgency.level !== 'later' && urgency.level !== 'none' && (
            <span className="font-normal opacity-80"> · {formatDate(opp.next_follow_up, lang)}</span>
          )}
        </div>
        <div className={cn('mt-0.5', hasAction ? 'opacity-90' : 'text-muted-foreground')}>
          {opp.next_action?.trim() ||
            (hasAction
              ? fr
                ? 'Action à préciser'
                : 'Step to be specified'
              : fr
                ? 'Planifiez la relance pour ne pas laisser l’affaire refroidir.'
                : 'Plan a follow-up so the deal does not go cold.')}
        </div>
        {canEdit && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {hasAction && (
              <Button size="sm" variant="secondary" onClick={() => void markDone()} disabled={busy !== null} className="h-7 bg-white/80 text-[12px]">
                {busy === 'done' ? <Loader2 className="animate-spin" /> : <Check />}
                {fr ? 'Fait' : 'Done'}
              </Button>
            )}
            <Button size="sm" variant={hasAction ? 'ghost' : 'default'} onClick={() => setOpen(true)} disabled={busy !== null} className="h-7 text-[12px]">
              <BellRing />
              {hasAction ? (fr ? 'Replanifier' : 'Reschedule') : fr ? 'Planifier la relance' : 'Plan a follow-up'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
