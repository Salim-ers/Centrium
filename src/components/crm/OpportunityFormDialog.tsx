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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
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
  const [saving, setSaving] = useState(false);
  const isEdit = !!opportunity;

  const {
    register,
    handleSubmit,
    reset,
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
        toast.error('Erreur : ' + res.error.message);
        return;
      }
      toast.success(isEdit ? 'Opportunité mise à jour' : 'Opportunité créée');
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Éditer l\'opportunité' : 'Nouvelle opportunité'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifie les informations de cette opportunité'
              : 'Ajoute une opportunité au pipeline commercial'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label>Titre *</Label>
            <Input {...register('title')} placeholder="ex: BNP Paribas – QA Automation" />
            {errors.title && (
              <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut</Label>
              <Select {...register('status')}>
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="discussion">En discussion</option>
                <option value="cv_sent">CV envoyé</option>
                <option value="client_interview">Entretien client</option>
                <option value="negotiation">Négociation</option>
                <option value="won">Gagné</option>
                <option value="lost">Perdu</option>
                <option value="on_hold">En veille</option>
              </Select>
            </div>
            <div>
              <Label>Priorité</Label>
              <Select {...register('priority')}>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>TJM visé (€)</Label>
              <Input type="number" min="0" step="1" {...register('daily_rate_eur')} placeholder="550" />
            </div>
            <div>
              <Label>Durée mission (mois)</Label>
              <Input type="number" min="0" step="1" {...register('duration_months')} placeholder="6" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CA prévisionnel (€)</Label>
              <Input type="number" min="0" step="1000" {...register('expected_revenue')} />
            </div>
            <div>
              <Label>Probabilité (%)</Label>
              <Input type="number" min="0" max="100" {...register('probability')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de closing prévue</Label>
              <Input type="date" {...register('expected_close')} />
            </div>
            <div>
              <Label>Prochaine relance</Label>
              <Input type="date" {...register('next_follow_up')} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
