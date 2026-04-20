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
import { consultantSchema, type ConsultantInput } from '@/lib/validators';
import { consultantService } from '@/lib/services/consultant.service';
import type { Consultant } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (c: Consultant) => void;
  /** Si fourni, le dialog passe en mode édition */
  consultant?: Consultant | null;
};

function toFormValues(c: Consultant | null | undefined): Partial<ConsultantInput> {
  if (!c) {
    return {
      seniority: 'confirmed',
      status: 'available',
      country: 'FR',
      years_experience: 3,
    };
  }
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    job_title: c.job_title,
    sub_title: c.sub_title ?? '',
    seniority: c.seniority,
    years_experience: c.years_experience,
    daily_rate_eur: c.daily_rate_eur ?? undefined,
    city: c.city ?? '',
    country: c.country ?? 'FR',
    status: c.status,
    available_from: c.available_from ?? '',
    summary: c.summary ?? '',
  } as Partial<ConsultantInput>;
}

export function ConsultantFormDialog({
  open,
  onOpenChange,
  organizationId,
  onSaved,
  consultant,
}: Props) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!consultant;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsultantInput>({
    resolver: zodResolver(consultantSchema),
    defaultValues: toFormValues(consultant),
  });

  useEffect(() => {
    if (open) reset(toFormValues(consultant));
  }, [open, consultant, reset]);

  async function onSubmit(values: ConsultantInput) {
    setSaving(true);
    try {
      const res = isEdit
        ? await consultantService.update(consultant!.id, values)
        : await consultantService.create(values, organizationId);
      if (res.error) {
        toast.error('Erreur : ' + res.error.message);
        return;
      }
      toast.success(isEdit ? 'Consultant mis à jour' : 'Consultant créé');
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Éditer le consultant' : 'Nouveau consultant'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifie les informations du consultant'
              : 'Ajoute un consultant à ta bibliothèque'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prénom *</Label>
              <Input {...register('first_name')} />
              {errors.first_name && (
                <p className="text-xs text-red-400 mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label>Nom *</Label>
              <Input {...register('last_name')} />
              {errors.last_name && (
                <p className="text-xs text-red-400 mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Intitulé de poste *</Label>
            <Input {...register('job_title')} placeholder="ex: QA Automation Confirmé" />
          </div>

          <div>
            <Label>Sous-titre</Label>
            <Input {...register('sub_title')} placeholder="Playwright / TypeScript / SQL" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Séniorité</Label>
              <Select {...register('seniority')}>
                <option value="junior">Junior</option>
                <option value="confirmed">Confirmé</option>
                <option value="senior">Senior</option>
                <option value="expert">Expert</option>
                <option value="lead">Lead</option>
                <option value="architect">Architecte</option>
              </Select>
            </div>
            <div>
              <Label>Années d'exp.</Label>
              <Input type="number" min="0" max="50" {...register('years_experience')} />
            </div>
            <div>
              <Label>TJM (€)</Label>
              <Input type="number" min="0" step="10" {...register('daily_rate_eur')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ville</Label>
              <Input {...register('city')} placeholder="Paris" />
            </div>
            <div>
              <Label>Statut</Label>
              <Select {...register('status')}>
                <option value="available">Disponible</option>
                <option value="soon_available">Bientôt disponible</option>
                <option value="on_mission">En mission</option>
                <option value="unavailable">Indisponible</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Disponible à partir du</Label>
            <Input type="date" {...register('available_from')} />
          </div>

          <div>
            <Label>Résumé exécutif</Label>
            <Textarea {...register('summary')} rows={3} placeholder="Résumé court du profil..." />
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
