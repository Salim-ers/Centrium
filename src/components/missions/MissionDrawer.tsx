'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompaniesLite, useConsultantsLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { missionSchema, REMOTE_POLICIES, REMOTE_POLICY_LABEL, type MissionInput } from '@/lib/validators/v2';
import { businessDaysBetween } from '@/lib/utils/business-days';
import { formatEur, formatPct } from '@/lib/format';
import { RENEWAL_STATUS, MISSION_STATUS } from '@/lib/status';
import type { Mission } from '@/types';

export type MissionDraft = Partial<MissionInput>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function toValues(m: (Mission & { daily_cost_eur?: number | null }) | null | undefined, draft?: MissionDraft): MissionInput {
  if (!m) {
    return {
      title: '',
      consultant_id: '',
      daily_rate_eur: 0,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
      renewal_status: 'unknown',
      ...draft,
    } as MissionInput;
  }
  return {
    title: m.title,
    consultant_id: m.consultant_id,
    company_id: m.company_id,
    opportunity_id: m.opportunity_id,
    owner_id: m.owner_id ?? null,
    daily_rate_eur: Number(m.daily_rate_eur),
    start_date: m.start_date,
    end_date: m.end_date,
    planned_days: m.planned_days ?? null,
    status: m.status,
    renewal_status: m.renewal_status ?? 'unknown',
    location: m.location ?? '',
    remote_policy: (m.remote_policy as MissionInput['remote_policy']) ?? null,
    contract_number: m.contract_number ?? '',
    daily_cost_eur: m.daily_cost_eur ?? null,
  };
}

export function MissionDrawer({
  open,
  onOpenChange,
  mission,
  draft,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mission?: (Mission & { daily_cost_eur?: number | null }) | null;
  /** Pré-remplissage (depuis une opportunité gagnée, par exemple). */
  draft?: MissionDraft;
  onSaved?: (m: Mission) => void;
}) {
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { can } = usePermissions();
  const canFinance = can('consultants.financials');
  const { options: consultantOptions } = useConsultantsLite();
  const { options: companyOptions } = useCompaniesLite();
  const { options: memberOptions } = useTeamMembers();
  const isEdit = !!mission;

  const { register, control, handleSubmit, reset, watch, setValue, formState } = useForm<MissionInput>({
    resolver: zodResolver(missionSchema),
    defaultValues: toValues(mission, draft),
  });

  useEffect(() => {
    if (open) reset(toValues(mission, draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mission, draft]);

  const start = watch('start_date');
  const end = watch('end_date');
  const rate = Number(watch('daily_rate_eur')) || 0;
  const cost = Number(watch('daily_cost_eur')) || 0;
  const plannedDays = watch('planned_days');
  const suggestedDays = useMemo(() => (start && end && end >= start ? businessDaysBetween(start, end) : null), [start, end]);
  const marginPct = rate > 0 && cost > 0 ? ((rate - cost) / rate) * 100 : null;
  const days = Number(plannedDays) || suggestedDays || 0;

  async function onSubmit(values: MissionInput) {
    const parsed = missionSchema.parse(values);
    const body: Record<string, unknown> = { ...parsed };
    if (!canFinance) delete body.daily_cost_eur;
    if (isEdit) {
      delete body.consultant_id;
      delete body.opportunity_id;
    }
    const res = await fetch(isEdit ? `/api/missions/${mission!.id}` : '/api/missions', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Enregistrement impossible' : 'Could not save'));
      return;
    }
    toast.success(isEdit ? (fr ? 'Mission mise à jour' : 'Mission updated') : fr ? 'Mission créée' : 'Mission created');
    onSaved?.((json.data ?? mission) as Mission);
    onOpenChange(false);
  }

  const err = (k: keyof MissionInput) => formState.errors[k]?.message as string | undefined;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="sm:max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col" noValidate>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? (fr ? 'Modifier la mission' : 'Edit mission') : fr ? 'Nouvelle mission' : 'New mission'}</DrawerTitle>
            <DrawerDescription>
              {fr ? 'Le CJM reste interne : il n’est jamais visible du consultant ni du client.' : 'The daily cost stays internal: never shown to the consultant or the client.'}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-6">
            <Section title={fr ? 'Affectation' : 'Assignment'}>
              <Field label={fr ? 'Intitulé' : 'Title'} htmlFor="ms-title" required error={err('title')}>
                <Input id="ms-title" autoFocus {...register('title')} aria-invalid={!!err('title')} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Consultant" htmlFor="ms-consultant" required error={err('consultant_id')}>
                  <Controller
                    control={control}
                    name="consultant_id"
                    render={({ field }) => (
                      <Combobox
                        id="ms-consultant"
                        options={consultantOptions}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder={fr ? 'Choisir' : 'Choose'}
                        disabled={isEdit}
                      />
                    )}
                  />
                </Field>
                <Field label={fr ? 'Client' : 'Client'} htmlFor="ms-company">
                  <Controller
                    control={control}
                    name="company_id"
                    render={({ field }) => (
                      <Combobox id="ms-company" options={companyOptions} value={field.value ?? ''} onChange={(v) => field.onChange(v || null)} clearable placeholder={fr ? 'Choisir' : 'Choose'} />
                    )}
                  />
                </Field>
              </div>
              <Field label="Business Manager" htmlFor="ms-owner">
                <Controller
                  control={control}
                  name="owner_id"
                  render={({ field }) => (
                    <Combobox id="ms-owner" options={memberOptions} value={field.value ?? ''} onChange={(v) => field.onChange(v || null)} clearable placeholder={fr ? 'Responsable' : 'Owner'} />
                  )}
                />
              </Field>
            </Section>

            <Section title={fr ? 'Période' : 'Period'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'Début' : 'Start'} htmlFor="ms-start" required error={err('start_date')}>
                  <Controller
                    control={control}
                    name="start_date"
                    render={({ field }) => <DatePicker id="ms-start" value={field.value} onChange={(v) => field.onChange(v ?? '')} clearable={false} />}
                  />
                </Field>
                <Field label={fr ? 'Fin' : 'End'} htmlFor="ms-end" error={err('end_date')}>
                  <Controller
                    control={control}
                    name="end_date"
                    render={({ field }) => <DatePicker id="ms-end" value={field.value ?? null} onChange={field.onChange} min={start} />}
                  />
                </Field>
                <Field
                  label={fr ? 'Jours prévisionnels' : 'Planned days'}
                  htmlFor="ms-days"
                  hint={suggestedDays != null && !plannedDays ? (fr ? `${suggestedDays} jours ouvrés sur la période` : `${suggestedDays} business days in the period`) : undefined}
                >
                  <div className="flex gap-2">
                    <Input id="ms-days" type="number" min={0} step={0.5} inputMode="decimal" {...register('planned_days')} />
                    {suggestedDays != null && !plannedDays && (
                      <Button type="button" variant="secondary" onClick={() => setValue('planned_days', suggestedDays, { shouldDirty: true })}>
                        {fr ? 'Utiliser' : 'Use'}
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label={fr ? 'Statut' : 'Status'} htmlFor="ms-status">
                  <Select id="ms-status" {...register('status')}>
                    {Object.entries(MISSION_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label[lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={fr ? 'Renouvellement' : 'Renewal'} htmlFor="ms-renewal">
                <Select id="ms-renewal" {...register('renewal_status')}>
                  {Object.entries(RENEWAL_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label[lang]}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title={fr ? 'Conditions' : 'Terms'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fr ? 'TJM vente (€ HT)' : 'Day rate (€)'} htmlFor="ms-rate" required error={err('daily_rate_eur')}>
                  <Input id="ms-rate" type="number" min={0} step={1} inputMode="decimal" {...register('daily_rate_eur')} />
                </Field>
                {canFinance && (
                  <Field
                    label={fr ? 'CJM (€ HT)' : 'Daily cost (€)'}
                    htmlFor="ms-cost"
                    hint={marginPct != null ? `${fr ? 'Marge' : 'Margin'} : ${formatPct(marginPct, lang)} · ${formatEur((rate - cost) * days, lang)} ${fr ? 'sur la période' : 'over the period'}` : undefined}
                  >
                    <Input id="ms-cost" type="number" min={0} step={1} inputMode="decimal" {...register('daily_cost_eur')} />
                  </Field>
                )}
                <Field label={fr ? 'Lieu' : 'Location'} htmlFor="ms-loc">
                  <Input id="ms-loc" {...register('location')} />
                </Field>
                <Field label={fr ? 'Télétravail' : 'Remote work'} htmlFor="ms-remote">
                  <Select id="ms-remote" {...register('remote_policy', { setValueAs: (v) => v || null })}>
                    <option value="">{fr ? 'Non précisé' : 'Not specified'}</option>
                    {REMOTE_POLICIES.map((p) => (
                      <option key={p} value={p}>
                        {REMOTE_POLICY_LABEL[p][lang]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={fr ? 'N° de contrat / bon de commande' : 'Contract / PO number'} htmlFor="ms-contract">
                <Input id="ms-contract" {...register('contract_number')} />
              </Field>
              {rate > 0 && days > 0 && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {fr ? 'CA prévisionnel' : 'Forecast revenue'} : <span className="num font-medium text-foreground">{formatEur(rate * days, lang)}</span> ({days} j × {formatEur(rate, lang)})
                </p>
              )}
            </Section>
          </DrawerBody>
          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              {isEdit ? (fr ? 'Enregistrer' : 'Save') : fr ? 'Créer la mission' : 'Create mission'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
