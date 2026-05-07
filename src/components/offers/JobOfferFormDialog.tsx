'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, X, Sparkles, ImageUp, CheckCircle2 } from 'lucide-react';

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
import { parseOfferImage } from '@/lib/offers/parse-offer-image';
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
      tasks: [],
      tech_stack: [],
      working_conditions: [],
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
    context: o.context ?? '',
    mission_purpose: o.mission_purpose ?? '',
    tasks: o.tasks ?? [],
    tech_stack: o.tech_stack ?? [],
    working_conditions: o.working_conditions ?? [],
    contract_kind: o.contract_kind ?? '',
  };
}

/** Convertit un textarea ligne-par-ligne en tableau de strings non vides. */
function linesToArray(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Inverse : array → texte ligne-par-ligne pour le textarea. */
function arrayToLines(items: string[] | undefined): string {
  return (items ?? []).join('\n');
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
  const [parsingImage, setParsingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  // Fiche de poste — champs texte multi-lignes (1 ligne = 1 puce).
  const [tasksText, setTasksText] = useState('');
  const [techStackText, setTechStackText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [showFiche, setShowFiche] = useState(false);
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
      setParsingImage(false);
      setImageFileName(null);
      setTasksText(arrayToLines(values.tasks));
      setTechStackText(arrayToLines(values.tech_stack));
      setConditionsText(arrayToLines(values.working_conditions));
      // Auto-déplie la section "Fiche de poste" si l'AO a déjà des
      // données fiche, ou laisse repliée pour ne pas effrayer
      // le user à la création.
      const hasFicheData =
        !!(values.context ||
          values.mission_purpose ||
          values.contract_kind ||
          (values.tasks && values.tasks.length) ||
          (values.tech_stack && values.tech_stack.length) ||
          (values.working_conditions && values.working_conditions.length));
      setShowFiche(hasFicheData);
    }
  }, [open, offer, reset]);

  async function handleImageFile(file: File) {
    setParsingImage(true);
    try {
      const { parsed } = await parseOfferImage(file);
      const dedupe = (xs: string[]) =>
        Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean)));
      const required = dedupe(parsed.required_skills);
      const nice = dedupe(parsed.nice_to_have);
      reset({
        title: parsed.title ?? '',
        description: parsed.description ?? '',
        required_skills: required,
        nice_to_have: nice,
        seniority: parsed.seniority ?? undefined,
        daily_rate_min: parsed.daily_rate_min ?? undefined,
        daily_rate_max: parsed.daily_rate_max ?? undefined,
        location: parsed.location ?? '',
        remote_days: parsed.remote_days ?? 0,
        start_date: parsed.start_date ?? '',
        duration_months: parsed.duration_months ?? undefined,
        deadline: parsed.deadline ?? '',
      });
      setRequiredSkills(required);
      setNiceToHave(nice);
      setImageFileName(file.name);
      toast.success('Offre extraite — vérifie et valide pour créer.');
    } catch (e) {
      toast.error(
        `Lecture de l'offre échouée${e instanceof Error ? ` : ${e.message}` : ''}.`,
      );
    } finally {
      setParsingImage(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  }

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
      const payload = {
        ...values,
        required_skills: requiredSkills,
        nice_to_have: niceToHave,
        tasks: linesToArray(tasksText),
        tech_stack: linesToArray(techStackText),
        working_conditions: linesToArray(conditionsText),
      };
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
          {!isEdit && (
            <div className="rounded-lg border border-violet-brand/25 bg-violet-brand/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-violet-brand/15 p-1.5">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Importer une capture d&apos;écran d&apos;AO
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPEG ou WebP. L&apos;IA extrait intitulé, description, compétences,
                    TJM, lieu, durée et dates.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer text-sm transition ${
                    parsingImage
                      ? 'border-white/10 bg-white/5 text-white/40 cursor-wait'
                      : 'border-violet-brand/40 bg-violet-brand/10 text-violet-100 hover:bg-violet-brand/20'
                  }`}
                >
                  {parsingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="h-4 w-4" />
                  )}
                  {parsingImage ? 'Analyse en cours…' : 'Choisir une capture'}
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={parsingImage}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageFile(f);
                    }}
                  />
                </label>
                {imageFileName && !parsingImage && (
                  <div className="text-xs text-white/70 truncate flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{imageFileName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* ============ FICHE DE POSTE (PDF envoyé au consultant) ============ */}
          <div className="rounded-lg border border-violet-brand/25 bg-violet-brand/[0.04]">
            <button
              type="button"
              onClick={() => setShowFiche((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-violet-brand/[0.02] transition"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <div>
                  <div className="text-sm font-medium">Fiche de poste (PDF)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Champs détaillés pour le PDF envoyé aux consultants : contexte,
                    finalité, missions, stack, conditions.
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {showFiche ? '— Replier' : '+ Déplier'}
              </span>
            </button>

            {showFiche && (
              <div className="border-t border-violet-brand/15 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type de mission</Label>
                    <Input
                      {...register('contract_kind')}
                      placeholder="Mission Freelance, CDI, Portage…"
                    />
                  </div>
                </div>

                <div>
                  <Label>Contexte (section 01)</Label>
                  <Textarea
                    {...register('context')}
                    rows={4}
                    placeholder="Présentation de l'entreprise, de la DSI, de l'équipe…"
                  />
                </div>

                <div>
                  <Label>Finalité de la mission (section 02)</Label>
                  <Textarea
                    {...register('mission_purpose')}
                    rows={2}
                    placeholder="Objectif synthétique en 1-2 phrases — affiché dans le bloc accent."
                  />
                </div>

                <div>
                  <Label>Missions principales — 1 par ligne</Label>
                  <Textarea
                    rows={6}
                    value={tasksText}
                    onChange={(e) => setTasksText(e.target.value)}
                    placeholder={'Assurer le MCO des infrastructures réseaux N2\nTraiter et résoudre les incidents\nAdministrer les équipements LAN, WAN et Wifi'}
                  />
                </div>

                <div>
                  <Label>Environnement technique — 1 techno par ligne</Label>
                  <Textarea
                    rows={3}
                    value={techStackText}
                    onChange={(e) => setTechStackText(e.target.value)}
                    placeholder={'Cisco\nAruba\nPalo Alto\nFortinet'}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Affichées en tags violets sur la fiche. Si vide, on retombe sur les
                    compétences requises.
                  </p>
                </div>

                <div>
                  <Label>Conditions d&apos;exercice — 1 par ligne</Label>
                  <Textarea
                    rows={3}
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder={'Poste basé à Lyon — Télétravail 2j/sem.\nMission de 6 mois — Prestation\nInterventions ponctuelles en HNO'}
                  />
                </div>
              </div>
            )}
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
