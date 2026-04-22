'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { jobOfferSchema, type JobOfferInput } from '@/lib/validators';
import { jobOfferService } from '@/lib/services';
import type { JobOffer } from '@/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conservé pour compat ascendante — non utilisé (route serveur lit l'org depuis la session). */
  organizationId?: string;
  onSaved?: (o: JobOffer) => void;
  offer?: JobOffer | null;
};

function toFormValues(o: JobOffer | null | undefined): Partial<JobOfferInput> {
  if (!o) {
    return {
      required_skills: [],
      nice_to_have: [],
      remote_days: 0,
    };
  }
  return {
    title: o.title,
    description: o.description ?? '',
    required_skills: o.required_skills ?? [],
    nice_to_have: o.nice_to_have ?? [],
    seniority: o.seniority ?? undefined,
    daily_rate_min: o.daily_rate_min ?? undefined,
    daily_rate_max: o.daily_rate_max ?? undefined,
    location: o.location ?? '',
    remote_days: o.remote_days ?? 0,
    start_date: o.start_date ?? '',
    duration_months: o.duration_months ?? undefined,
    deadline: o.deadline ?? '',
  };
}

export function JobOfferFormDialog({
  open,
  onOpenChange,
  organizationId: _organizationId,
  onSaved,
  offer,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [niceInput, setNiceInput] = useState('');
  const isEdit = !!offer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<JobOfferInput>({
    resolver: zodResolver(jobOfferSchema),
    defaultValues: toFormValues(offer),
  });

  useEffect(() => {
    if (open) {
      const values = toFormValues(offer);
      reset(values);
      setRequiredSkills(values.required_skills ?? []);
      setNiceToHave(values.nice_to_have ?? []);
      setSkillInput('');
      setNiceInput('');
    }
  }, [open, offer, reset]);

  function addSkill(kind: 'required' | 'nice') {
    const input = kind === 'required' ? skillInput : niceInput;
    const trimmed = input.trim();
    if (!trimmed) return;
    if (kind === 'required') {
      const next = Array.from(new Set([...requiredSkills, trimmed]));
      setRequiredSkills(next);
      setValue('required_skills', next, { shouldValidate: true });
      setSkillInput('');
    } else {
      const next = Array.from(new Set([...niceToHave, trimmed]));
      setNiceToHave(next);
      setValue('nice_to_have', next, { shouldValidate: true });
      setNiceInput('');
    }
  }

  function removeSkill(kind: 'required' | 'nice', skill: string) {
    if (kind === 'required') {
      const next = requiredSkills.filter((s) => s !== skill);
      setRequiredSkills(next);
      setValue('required_skills', next);
    } else {
      const next = niceToHave.filter((s) => s !== skill);
      setNiceToHave(next);
      setValue('nice_to_have', next);
    }
  }

  async function onSubmit(values: JobOfferInput) {
    setSaving(true);
    try {
      const payload = { ...values, required_skills: requiredSkills, nice_to_have: niceToHave };
      const res = isEdit
        ? await jobOfferService.update(offer!.id, payload)
        : await jobOfferService.create(payload);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(isEdit ? 'Offre mise à jour' : 'Offre créée');
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erreur inattendue — regarde la console');
      console.error('[JobOfferFormDialog] submit error', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Éditer l\'offre' : 'Nouvelle offre / mission'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifie les informations de l\'offre'
              : 'Décris la mission pour ensuite matcher les meilleurs consultants'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label>Intitulé de la mission *</Label>
            <Input {...register('title')} placeholder="ex: Lead Dev Backend — Banque de détail" />
            {errors.title && (
              <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              {...register('description')}
              rows={4}
              placeholder="Contexte, stack, objectifs, équipe, méthodo…"
            />
          </div>

          {/* Compétences requises */}
          <div>
            <Label>Compétences requises *</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill('required');
                  }
                }}
                placeholder="ex: React, PostgreSQL, AWS… (Entrée pour ajouter)"
              />
              <Button type="button" variant="outline" onClick={() => addSkill('required')}>
                Ajouter
              </Button>
            </div>
            {requiredSkills.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {requiredSkills.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="pr-1 gap-1 border-violet-brand/40 bg-violet-brand/10"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill('required', s)}
                      className="ml-0.5 rounded-sm hover:bg-white/10 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Compétences bonus */}
          <div>
            <Label>Compétences bonus (nice-to-have)</Label>
            <div className="flex gap-2">
              <Input
                value={niceInput}
                onChange={(e) => setNiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill('nice');
                  }
                }}
                placeholder="ex: Kubernetes, Terraform…"
              />
              <Button type="button" variant="outline" onClick={() => addSkill('nice')}>
                Ajouter
              </Button>
            </div>
            {niceToHave.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {niceToHave.map((s) => (
                  <Badge key={s} variant="outline" className="pr-1 gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill('nice', s)}
                      className="ml-0.5 rounded-sm hover:bg-white/10 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Séniorité</Label>
              <Select {...register('seniority')} defaultValue="">
                <option value="">—</option>
                <option value="junior">Junior</option>
                <option value="confirmed">Confirmé</option>
                <option value="senior">Senior</option>
                <option value="expert">Expert</option>
                <option value="lead">Lead</option>
                <option value="architect">Architecte</option>
              </Select>
            </div>
            <div>
              <Label>TJM min (€)</Label>
              <Input type="number" min="0" step="10" {...register('daily_rate_min')} />
            </div>
            <div>
              <Label>TJM max (€)</Label>
              <Input type="number" min="0" step="10" {...register('daily_rate_max')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lieu</Label>
              <Input {...register('location')} placeholder="Paris" />
            </div>
            <div>
              <Label>Télétravail (jours/sem.)</Label>
              <Input type="number" min="0" max="5" {...register('remote_days')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Début souhaité</Label>
              <Input type="date" {...register('start_date')} />
            </div>
            <div>
              <Label>Durée (mois)</Label>
              <Input type="number" min="0" max="60" {...register('duration_months')} />
            </div>
            <div>
              <Label>Deadline candidature</Label>
              <Input type="date" {...register('deadline')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer l\'offre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
