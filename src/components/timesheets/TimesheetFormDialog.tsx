'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Select } from '@/components/ui/select';
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

const MONTHS = [
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

export function TimesheetFormDialog({ open, onOpenChange, organizationId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const now = new Date();

  const {
    register,
    handleSubmit,
    reset,
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
        toast.error('Erreur : ' + res.error.message);
        return;
      }
      toast.success('CRA créé');
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
          <DialogTitle>Nouveau CRA</DialogTitle>
          <DialogDescription>
            Crée un compte rendu d&apos;activité mensuel lié à une mission active.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label>Mission *</Label>
            <Select {...register('mission_id')}>
              <option value="">— Choisir une mission —</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.consultant
                    ? `${m.consultant.first_name} ${m.consultant.last_name} — `
                    : ''}
                  {m.title}
                  {m.company ? ` (${m.company.name})` : ''}
                </option>
              ))}
            </Select>
            {errors.mission_id && (
              <p className="text-xs text-red-400 mt-1">Mission obligatoire</p>
            )}
            {missions.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                Aucune mission active. Crée une mission d&apos;abord.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mois *</Label>
              <Select {...register('period_month')}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Année *</Label>
              <Select {...register('period_year')}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-[11px] text-violet-300/80 leading-relaxed">
            Les jours ouvrés du mois sont pré-remplis automatiquement comme
            travaillés. Tu pourras marquer les jours fériés et les absences
            directement sur le calendrier après création.
          </p>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} placeholder="Contexte particulier…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || missions.length === 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le CRA
            </Button>
          </DialogFooter>
        </form>
      </FormDialogContent>
    </Dialog>
  );
}
