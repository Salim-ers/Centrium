'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FormDialogContent } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import { opportunitySchema, type OpportunityInput } from '@/lib/validators';
import { opportunityService } from '@/lib/services';
import type { Opportunity } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (o: Opportunity) => void;
  /** Si fourni, le dialog passe en mode édition */
  opportunity?: Opportunity | null;
};

function toFormValues(o: Opportunity | null | undefined): Partial<OpportunityInput> {
  if (!o) {
    return { status: 'new', priority: 'medium', probability: 30 };
  }
  return {
    title: o.title,
    status: o.status,
    priority: o.priority,
    expected_revenue: o.expected_revenue ?? undefined,
    probability: o.probability ?? undefined,
    daily_rate_eur: o.daily_rate_eur ?? undefined,
    duration_months: o.duration_months ?? undefined,
    expected_close: o.expected_close ?? '',
    next_follow_up: o.next_follow_up ?? '',
    notes: o.notes ?? '',
  } as Partial<OpportunityInput>;
}

export function OpportunityFormDialog({
  open,
  onOpenChange,
  organizationId,
  onSaved,
  opportunity,
}: Props) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [saving, setSaving] = useState(false);
  const isEdit = !!opportunity;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OpportunityInput>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: toFormValues(opportunity),
  });

  useEffect(() => {
    if (open) reset(toFormValues(opportunity));
  }, [open, opportunity, reset]);

  async function onSubmit(values: OpportunityInput) {
    setSaving(true);
    try {
      const res = isEdit
        ? await opportunityService.update(opportunity!.id, values)
        : await opportunityService.create(values, organizationId);
      if (res.error) {
        toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
        return;
      }
      toast.success(isEdit ? t.forms.opportunity.updated : t.forms.opportunity.created);
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.forms.opportunity.title_edit : t.forms.opportunity.title_create}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label>{isEn ? 'Title *' : 'Titre *'}</Label>
            <Input
              {...register('title')}
              placeholder={
                isEn ? 'e.g. BNP Paribas – QA Automation' : 'ex: BNP Paribas – QA Automation'
              }
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.opportunity.status}</Label>
              <Combobox
                ariaLabel={t.forms.opportunity.status}
                value={watch('status') ?? 'new'}
                onChange={(v) =>
                  setValue('status', v as OpportunityInput['status'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'new', label: t.badges.opportunity_status.new },
                  { value: 'contacted', label: t.badges.opportunity_status.contacted },
                  { value: 'discussion', label: t.badges.opportunity_status.discussion },
                  { value: 'cv_sent', label: t.badges.opportunity_status.cv_sent },
                  { value: 'client_interview', label: t.badges.opportunity_status.client_interview },
                  { value: 'negotiation', label: t.badges.opportunity_status.negotiation },
                  { value: 'won', label: t.badges.opportunity_status.won },
                  { value: 'lost', label: t.badges.opportunity_status.lost },
                  { value: 'on_hold', label: t.badges.opportunity_status.on_hold },
                ]}
              />
            </div>
            <div>
              <Label>{t.forms.opportunity.priority}</Label>
              <Combobox
                ariaLabel={t.forms.opportunity.priority}
                value={watch('priority') ?? 'medium'}
                onChange={(v) =>
                  setValue('priority', v as OpportunityInput['priority'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'low', label: isEn ? 'Low' : 'Faible' },
                  { value: 'medium', label: isEn ? 'Medium' : 'Moyenne' },
                  { value: 'high', label: isEn ? 'High' : 'Haute' },
                  { value: 'critical', label: isEn ? 'Critical' : 'Critique' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.opportunity.daily_rate}</Label>
              <Input type="number" min="0" step="1" {...register('daily_rate_eur')} placeholder="550" />
            </div>
            <div>
              <Label>{t.forms.opportunity.duration_months}</Label>
              <Input type="number" min="0" step="1" {...register('duration_months')} placeholder="6" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.opportunity.expected_revenue}</Label>
              <Input type="number" min="0" step="1000" {...register('expected_revenue')} />
            </div>
            <div>
              <Label>{t.forms.opportunity.probability}</Label>
              <Input type="number" min="0" max="100" {...register('probability')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.opportunity.expected_close}</Label>
              <Input type="date" {...register('expected_close')} />
            </div>
            <div>
              <Label>{t.forms.opportunity.next_follow_up}</Label>
              <Input type="date" {...register('next_follow_up')} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t.actions.save : t.actions.create}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
