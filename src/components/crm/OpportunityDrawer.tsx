'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { TagInput } from '@/components/ui/tag-input';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useCompaniesLite, useContactsLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { crmService } from '@/lib/services/crm.service';
import { opportunityV2Schema, REMOTE_POLICIES, REMOTE_POLICY_LABEL, type OpportunityV2Input } from '@/lib/validators/v2';
import { PIPELINE_STAGES, STAGE_BY_ID, stageOf, type PipelineStageId } from '@/lib/crm/pipeline';
import { formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Opportunity } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  opportunity?: Opportunity | null;
  /** Valeurs initiales pour une création (ex. client ou étape présélectionnés). */
  defaults?: Partial<OpportunityV2Input>;
  onSaved?: (o: Opportunity) => void;
};

/** Champs rangés sous « Plus de détails ». */
const DETAIL_FIELDS = [
  'contact_id',
  'description',
  'required_skills',
  'start_date',
  'duration_months',
  'location',
  'remote_policy',
  'daily_rate_eur',
  'budget_eur',
  'probability',
  'notes',
] as const satisfies ReadonlyArray<keyof OpportunityV2Input>;

function toValues(o: Opportunity | null | undefined, defaults?: Partial<OpportunityV2Input>): OpportunityV2Input {
  if (!o) {
    return {
      title: '',
      status: 'new',
      priority: 'medium',
      probability: 10,
      required_skills: [],
      ...defaults,
    };
  }
  return {
    title: o.title,
    company_id: o.company_id,
    contact_id: o.contact_id,
    owner_id: o.owner_id,
    job_offer_id: o.job_offer_id,
    status: o.status,
    priority: o.priority,
    description: o.description ?? '',
    budget_eur: o.budget_eur ?? null,
    daily_rate_eur: o.daily_rate_eur ?? null,
    expected_revenue: o.expected_revenue ?? null,
    probability: o.probability ?? null,
    start_date: o.start_date ?? null,
    duration_months: o.duration_months ?? null,
    location: o.location ?? '',
    remote_policy: (o.remote_policy as OpportunityV2Input['remote_policy']) ?? null,
    required_skills: o.required_skills ?? [],
    next_action: o.next_action ?? '',
    next_follow_up: o.next_follow_up ?? null,
    expected_close: o.expected_close ?? null,
    notes: o.notes ?? '',
    lost_reason: o.lost_reason ?? '',
  };
}

/** Une fiche existante ouvre ses détails s'ils sont renseignés. */
function hasDetails(o: Opportunity | null | undefined): boolean {
  if (!o) return false;
  return !!(
    o.contact_id ||
    o.description ||
    (o.required_skills ?? []).length ||
    o.start_date ||
    o.duration_months ||
    o.location ||
    o.remote_policy ||
    o.daily_rate_eur ||
    o.budget_eur ||
    o.notes
  );
}

/**
 * Création / modification d'une opportunité. L'essentiel d'abord (intitulé,
 * client, étape, montant, prochaine relance) ; le reste sous « Plus de
 * détails », replié à la création.
 */
export function OpportunityDrawer({ open, onOpenChange, organizationId, opportunity, defaults, onSaved }: Props) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const isEdit = !!opportunity;
  const { options: companyOptions } = useCompaniesLite();
  const { optionsFor: contactOptionsFor } = useContactsLite();
  const { options: memberOptions } = useTeamMembers();
  const [more, setMore] = useState(false);

  const form = useForm<OpportunityV2Input>({
    resolver: zodResolver(opportunityV2Schema),
    defaultValues: toValues(opportunity, defaults),
  });
  const { register, control, handleSubmit, reset, watch, setValue, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(toValues(opportunity, defaults));
    setMore(hasDetails(opportunity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunity]);

  const companyId = watch('company_id');
  const status = watch('status');
  const rate = watch('daily_rate_eur');
  const duration = watch('duration_months');
  const amount = watch('expected_revenue');
  const probability = watch('probability');

  const estimated = useMemo(() => {
    const r = Number(rate) || 0;
    const d = Number(duration) || 0;
    return r && d ? r * d * 20 : null;
  }, [rate, duration]);

  const stage = (status ? stageOf(status as Opportunity['status']) : null) ?? 'prospect';

  async function onSubmit(values: OpportunityV2Input) {
    const res = await crmService.saveOpportunity(values, organizationId, opportunity?.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(isEdit ? (fr ? 'Opportunité mise à jour' : 'Opportunity updated') : fr ? 'Opportunité créée' : 'Opportunity created');
    onSaved?.(res.data);
    onOpenChange(false);
  }

  // Une erreur dans un champ replié : on déplie pour la montrer.
  function onInvalid(errors: Partial<Record<keyof OpportunityV2Input, unknown>>) {
    if (DETAIL_FIELDS.some((f) => f in errors)) setMore(true);
  }

  const err = (name: keyof OpportunityV2Input) => formState.errors[name]?.message as string | undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="sm:max-w-xl" onInteractOutside={(e) => formState.isDirty && e.preventDefault()}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex h-full flex-col" noValidate>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? (fr ? 'Modifier l’opportunité' : 'Edit opportunity') : fr ? 'Nouvelle opportunité' : 'New opportunity'}</DrawerTitle>
            <DrawerDescription>
              {fr ? 'Seul l’intitulé est obligatoire. Vous compléterez le reste plus tard.' : 'Only the title is required. You can fill in the rest later.'}
            </DrawerDescription>
          </DrawerHeader>

          <DrawerBody className="space-y-4">
            <Field label={fr ? 'Intitulé' : 'Title'} htmlFor="opp-title" required error={err('title')}>
              <Input
                id="opp-title"
                autoFocus
                {...register('title')}
                aria-invalid={!!err('title')}
                placeholder={fr ? 'ex. Data engineer senior — plateforme data' : 'e.g. Senior data engineer — data platform'}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? 'Client' : 'Client'} htmlFor="opp-company">
                <Controller
                  control={control}
                  name="company_id"
                  render={({ field }) => (
                    <Combobox
                      id="opp-company"
                      options={companyOptions}
                      value={field.value ?? ''}
                      onChange={(v) => {
                        field.onChange(v || null);
                        setValue('contact_id', null);
                      }}
                      placeholder={fr ? 'Choisir un client' : 'Choose a client'}
                      clearable
                    />
                  )}
                />
              </Field>
              <Field label={fr ? 'Étape' : 'Stage'} htmlFor="opp-stage">
                <Select
                  id="opp-stage"
                  value={status === 'on_hold' ? 'on_hold' : stage}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'on_hold') {
                      setValue('status', 'on_hold', { shouldDirty: true });
                      return;
                    }
                    const s = STAGE_BY_ID.get(v as PipelineStageId)!;
                    setValue('status', s.canonical, { shouldDirty: true });
                    if (v === 'won') setValue('probability', 100, { shouldDirty: true });
                    else if (v === 'lost') setValue('probability', 0, { shouldDirty: true });
                    else if (!probability) setValue('probability', s.defaultProbability, { shouldDirty: true });
                  }}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label[lang]} — {s.hint[lang].toLowerCase()}
                    </option>
                  ))}
                  <option value="on_hold">{fr ? 'En veille' : 'On hold'}</option>
                </Select>
              </Field>
            </div>

            <Field
              label={fr ? 'Montant estimé (€ HT)' : 'Estimated amount (€)'}
              htmlFor="opp-amount"
              hint={
                estimated && !amount
                  ? fr
                    ? `Estimation TJM × durée × 20 j : ${formatEur(estimated, lang)}`
                    : `Estimate day rate × duration × 20 d: ${formatEur(estimated, lang)}`
                  : undefined
              }
            >
              <div className="flex gap-2">
                <Input id="opp-amount" type="number" min={0} inputMode="decimal" {...register('expected_revenue')} />
                {estimated && !amount && (
                  <Button type="button" variant="secondary" onClick={() => setValue('expected_revenue', estimated, { shouldDirty: true })}>
                    {fr ? 'Utiliser' : 'Use'}
                  </Button>
                )}
              </div>
            </Field>

            {status === 'lost' && (
              <Field label={fr ? 'Raison de la perte' : 'Loss reason'} htmlFor="opp-lost">
                <Input id="opp-lost" {...register('lost_reason')} />
              </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={fr ? 'Prochaine action' : 'Next action'} htmlFor="opp-next">
                <Input id="opp-next" {...register('next_action')} placeholder={fr ? 'ex. Relancer le client' : 'e.g. Follow up with the client'} />
              </Field>
              <Field label={fr ? 'À faire le' : 'Due on'} htmlFor="opp-next-date">
                <Controller
                  control={control}
                  name="next_follow_up"
                  render={({ field }) => <DatePicker id="opp-next-date" value={field.value ?? null} onChange={field.onChange} />}
                />
              </Field>
            </div>

            <Field label={fr ? 'Responsable' : 'Owner'} htmlFor="opp-owner">
              <Controller
                control={control}
                name="owner_id"
                render={({ field }) => (
                  <Combobox
                    id="opp-owner"
                    options={memberOptions}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || null)}
                    placeholder={fr ? 'Qui suit cette opportunité ?' : 'Who follows this opportunity?'}
                    clearable
                  />
                )}
              />
            </Field>

            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setMore((v) => !v)}
                aria-expanded={more}
                aria-controls="opp-details"
                className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-foreground hover:text-primary-deep focus-visible:outline-none focus-visible:shadow-focus"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', more && 'rotate-180')} />
                {fr ? 'Plus de détails' : 'More details'}
                {!more && (
                  <span className="font-normal text-muted-foreground">
                    {fr ? '· besoin, compétences, TJM, contact, notes' : '· requirement, skills, day rate, contact, notes'}
                  </span>
                )}
              </button>
            </div>

            <div id="opp-details" hidden={!more} className="space-y-4">
              <Field label={fr ? 'Contact chez le client' : 'Client contact'} htmlFor="opp-contact">
                <Controller
                  control={control}
                  name="contact_id"
                  render={({ field }) => (
                    <Combobox
                      id="opp-contact"
                      options={contactOptionsFor(companyId)}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v || null)}
                      placeholder={companyId ? (fr ? 'Choisir un contact' : 'Choose a contact') : fr ? 'Choisissez d’abord un client' : 'Choose a client first'}
                      disabled={!companyId}
                      clearable
                    />
                  )}
                />
              </Field>
              <Field label={fr ? 'Description du besoin' : 'Requirement'} htmlFor="opp-desc">
                <Textarea id="opp-desc" rows={4} maxLength={8000} {...register('description')} placeholder={fr ? 'Contexte, enjeux, livrables…' : 'Context, goals, deliverables…'} />
              </Field>
              <Field
                label={fr ? 'Compétences recherchées' : 'Required skills'}
                htmlFor="opp-skills"
                hint={fr ? 'Entrée ou virgule pour ajouter. Elles servent au matching.' : 'Press Enter or comma to add. Used for matching.'}
              >
                <Controller
                  control={control}
                  name="required_skills"
                  render={({ field }) => <TagInput id="opp-skills" value={field.value ?? []} onChange={field.onChange} placeholder="React, AWS, Kafka…" />}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'Date de début' : 'Start date'} htmlFor="opp-start">
                  <Controller
                    control={control}
                    name="start_date"
                    render={({ field }) => <DatePicker id="opp-start" value={field.value ?? null} onChange={field.onChange} />}
                  />
                </Field>
                <Field label={fr ? 'Durée (mois)' : 'Duration (months)'} htmlFor="opp-duration">
                  <Input id="opp-duration" type="number" min={0} max={120} inputMode="numeric" {...register('duration_months')} />
                </Field>
                <Field label={fr ? 'Localisation' : 'Location'} htmlFor="opp-location">
                  <Input id="opp-location" {...register('location')} placeholder={fr ? 'ex. Paris 9e' : 'e.g. Paris'} />
                </Field>
                <Field label={fr ? 'Télétravail' : 'Remote work'} htmlFor="opp-remote">
                  <Select id="opp-remote" {...register('remote_policy', { setValueAs: (v) => v || null })}>
                    <option value="">{fr ? 'Non précisé' : 'Not specified'}</option>
                    {REMOTE_POLICIES.map((p) => (
                      <option key={p} value={p}>
                        {REMOTE_POLICY_LABEL[p][lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={fr ? 'TJM cible (€ HT)' : 'Target day rate (€)'} htmlFor="opp-rate">
                  <Input id="opp-rate" type="number" min={0} inputMode="decimal" {...register('daily_rate_eur')} />
                </Field>
                <Field label={fr ? 'Budget client (€ HT)' : 'Client budget (€)'} htmlFor="opp-budget">
                  <Input id="opp-budget" type="number" min={0} inputMode="decimal" {...register('budget_eur')} />
                </Field>
              </div>
              <Field
                label={fr ? 'Chances de gagner (%)' : 'Chance of winning (%)'}
                htmlFor="opp-prob"
                error={err('probability')}
                hint={fr ? 'Proposée selon l’étape, ajustable.' : 'Suggested from the stage, adjustable.'}
              >
                <Input id="opp-prob" type="number" min={0} max={100} inputMode="numeric" {...register('probability')} className="sm:w-32" />
              </Field>
              <Field label={fr ? 'Notes' : 'Notes'} htmlFor="opp-notes">
                <Textarea id="opp-notes" rows={3} maxLength={5000} {...register('notes')} />
              </Field>
            </div>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {isEdit ? (fr ? 'Enregistrer' : 'Save') : fr ? 'Créer l’opportunité' : 'Create opportunity'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
