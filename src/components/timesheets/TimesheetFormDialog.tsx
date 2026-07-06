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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import { timesheetSchema, type TimesheetInput } from '@/lib/validators';
import { timesheetService } from '@/lib/services';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types';

type MissionRow = {
  id: string;
  title: string;
  daily_rate_eur: number;
  consultant: { first_name: string; last_name: string } | null;
  company: { name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (ts: Timesheet) => void;
};

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function TimesheetFormDialog({ open, onOpenChange, organizationId, onSaved }: Props) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const months = isEn ? MONTHS_EN : MONTHS_FR;
  const [saving, setSaving] = useState(false);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const now = new Date();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TimesheetInput>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    },
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('missions')
        .select(
          'id, title, daily_rate_eur, consultant:consultants(first_name, last_name), company:companies(name)',
        )
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      setMissions((data ?? []) as unknown as MissionRow[]);
    })();
  }, [open]);

  async function onSubmit(values: TimesheetInput) {
    setSaving(true);
    try {
      const res = await timesheetService.create(values, organizationId);
      if (res.error) {
        toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
        return;
      }
      toast.success(t.forms.timesheet.created);
      onSaved?.(res.data);
      reset({
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.forms.timesheet.title_create}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label>{t.forms.timesheet.mission} *</Label>
            <Combobox
              ariaLabel={t.forms.timesheet.mission}
              value={watch('mission_id') ?? ''}
              onChange={(v) =>
                setValue('mission_id', v as TimesheetInput['mission_id'], {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              options={[
                { value: '', label: `— ${t.forms.timesheet.mission} —` },
                ...missions.map((m) => ({
                  value: m.id,
                  label: `${m.title}${m.company ? ` (${m.company.name})` : ''}`,
                  sublabel: m.consultant
                    ? `${m.consultant.first_name} ${m.consultant.last_name}`
                    : undefined,
                })),
              ]}
            />
            {errors.mission_id && (
              <p className="text-xs text-red-400 mt-1">
                {isEn ? 'Mission required' : 'Mission obligatoire'}
              </p>
            )}
            {missions.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                {isEn
                  ? 'No active mission. Create a mission first.'
                  : "Aucune mission active. Crée une mission d'abord."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Month *' : 'Mois *'}</Label>
              <Combobox
                ariaLabel={isEn ? 'Month' : 'Mois'}
                value={String(watch('period_month') ?? now.getMonth() + 1)}
                onChange={(v) =>
                  setValue('period_month', Number(v), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={months.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
            </div>
            <div>
              <Label>{isEn ? 'Year *' : 'Année *'}</Label>
              <Combobox
                ariaLabel={isEn ? 'Year' : 'Année'}
                value={String(watch('period_year') ?? now.getFullYear())}
                onChange={(v) =>
                  setValue('period_year', Number(v), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
              />
            </div>
          </div>

          <p className="text-[11px] text-violet-300/80 leading-relaxed">
            {isEn
              ? 'Business days of the month are pre-filled as worked. You can mark holidays and absences directly on the calendar after creation.'
              : 'Les jours ouvrés du mois sont pré-remplis automatiquement comme travaillés. Tu pourras marquer les jours fériés et les absences directement sur le calendrier après création.'}
          </p>

          <div>
            <Label>Notes</Label>
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder={isEn ? 'Specific context…' : 'Contexte particulier…'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={saving || missions.length === 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.actions.create}
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
