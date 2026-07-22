'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Loader2,
  X,
  Sparkles,
  ImageUp,
  CheckCircle2,
  ClipboardPaste,
  Wand2,
} from 'lucide-react';

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
      profile_requirements: [],
      working_conditions: [],
      remote_days: 0,
      source_kind: 'client',
      show_rate: false,
    };
  }
  // TJM unique : on lit max en priorité, fallback min, fallback eur si présent.
  const tjm = o.daily_rate_max ?? o.daily_rate_min ?? null;
  return {
    title: o.title,
    description: o.description ?? '',
    required_skills: o.required_skills ?? [],
    nice_to_have: o.nice_to_have ?? [],
    seniority: o.seniority ?? undefined,
    daily_rate_eur: tjm ?? undefined,
    location: o.location ?? '',
    remote_days: o.remote_days ?? 0,
    start_date: o.start_date ?? '',
    duration_months: o.duration_months ?? undefined,
    deadline: o.deadline ?? '',
    source_kind: o.source_kind ?? 'client',
    source: o.source ?? '',
    context: o.context ?? '',
    mission_purpose: o.mission_purpose ?? '',
    tasks: o.tasks ?? [],
    tech_stack: o.tech_stack ?? [],
    profile_requirements: o.profile_requirements ?? [],
    working_conditions: o.working_conditions ?? [],
    contract_kind: o.contract_kind ?? '',
    // Fiche de poste v2 (fallbacks pour anciennes fiches sans ces colonnes).
    show_rate: o.show_rate ?? false,
    work_mode: o.work_mode ?? undefined,
    work_mode_detail: o.work_mode_detail ?? '',
    start_type: o.start_type ?? undefined,
    start_label: o.start_label ?? '',
    experience_label: o.experience_label ?? '',
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
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [saving, setSaving] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [niceInput, setNiceInput] = useState('');
  const [parsingImage, setParsingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  // Source d'import : capture d'écran ou texte brut (paste de l'annonce).
  const [importMode, setImportMode] = useState<'image' | 'text'>('image');
  const [importText, setImportText] = useState('');
  // Fiche de poste — champs texte multi-lignes (1 ligne = 1 puce).
  const [tasksText, setTasksText] = useState('');
  const [techStackText, setTechStackText] = useState('');
  const [profileText, setProfileText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [showFiche, setShowFiche] = useState(false);
  const isEdit = !!offer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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
      setImportMode('image');
      setImportText('');
      setTasksText(arrayToLines(values.tasks));
      setTechStackText(arrayToLines(values.tech_stack));
      setProfileText(arrayToLines(values.profile_requirements));
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
          (values.profile_requirements && values.profile_requirements.length) ||
          (values.working_conditions && values.working_conditions.length));
      setShowFiche(hasFicheData);
    }
  }, [open, offer, reset]);

  async function runParse(opts: { file?: File; text?: string }) {
    setParsingImage(true);
    try {
      const { parsed } = await parseOfferImage(opts);
      const dedupe = (xs: string[]) =>
        Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean)));
      const required = dedupe(parsed.required_skills);
      const nice = dedupe(parsed.nice_to_have);
      const tasks = dedupe(parsed.tasks ?? []);
      const tech = dedupe(parsed.tech_stack ?? []);
      const profile = dedupe(parsed.profile_requirements ?? []);
      const conditions = dedupe(parsed.working_conditions ?? []);

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
        context: parsed.context ?? '',
        mission_purpose: parsed.mission_purpose ?? '',
        tasks,
        tech_stack: tech,
        profile_requirements: profile,
        working_conditions: conditions,
        contract_kind: parsed.contract_kind ?? '',
        work_mode: parsed.work_mode ?? undefined,
        start_type: parsed.start_type ?? undefined,
        experience_label: parsed.experience_label ?? '',
        show_rate: false,
      });
      setRequiredSkills(required);
      setNiceToHave(nice);
      setTasksText(arrayToLines(tasks));
      setTechStackText(arrayToLines(tech));
      setProfileText(arrayToLines(profile));
      setConditionsText(arrayToLines(conditions));
      setImageFileName(opts.file?.name ?? null);

      const hasFiche =
        !!(parsed.context ||
          parsed.mission_purpose ||
          parsed.contract_kind ||
          tasks.length ||
          tech.length ||
          profile.length ||
          conditions.length);
      if (hasFiche) setShowFiche(true);

      toast.success(
        isEn
          ? 'Listing extracted — review and confirm to create.'
          : 'Annonce extraite — vérifie et valide pour créer.',
      );
    } catch (e) {
      const base = isEn ? 'Listing parse failed' : "Lecture de l'annonce échouée";
      toast.error(
        `${base}${e instanceof Error ? ` : ${e.message}` : ''}.`,
      );
    } finally {
      setParsingImage(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  }

  function handleImageFile(file: File) {
    void runParse({ file });
  }

  function handleParseText() {
    const trimmed = importText.trim();
    if (trimmed.length < 30) {
      toast.error(
        isEn
          ? 'Paste at least a few lines of the listing.'
          : "Colle au moins quelques lignes de l'annonce.",
      );
      return;
    }
    void runParse({ text: trimmed });
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
    // Garde-fou : sans compétences requises, le matching ne peut pas scorer
    // l'offre. On bloque la création silencieusement plutôt que de produire
    // des matches faussement à 50% pour tous les consultants.
    if (requiredSkills.length === 0) {
      toast.error(
        isEn
          ? 'Add at least 1 required skill — AI matching needs it to score profiles.'
          : 'Ajoute au moins 1 compétence requise — le matching IA en a besoin pour scorer les profils.',
      );
      return;
    }
    setSaving(true);
    try {
      // TJM unique : on aligne min = max = TJM saisi pour rester compatible
      // avec le matching / la fiche de poste qui lisent encore la plage.
      // `daily_rate_eur` n'existe pas en DB — on l'extrait du payload.
      const { daily_rate_eur: tjmInput, ...rest } = values;
      const tjm = tjmInput ?? null;
      const payload = {
        ...rest,
        required_skills: requiredSkills,
        nice_to_have: niceToHave,
        tasks: linesToArray(tasksText),
        tech_stack: linesToArray(techStackText),
        profile_requirements: linesToArray(profileText),
        working_conditions: linesToArray(conditionsText),
        daily_rate_min: tjm,
        daily_rate_max: tjm,
      };
      const res = isEdit
        ? await jobOfferService.update(offer!.id, payload)
        : await jobOfferService.create(payload);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(isEdit ? t.forms.job_offer.updated : t.forms.job_offer.created);
      onSaved?.(res.data);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        isEn
          ? 'Unexpected error — check the console'
          : 'Erreur inattendue — regarde la console',
      );
      console.error('[JobOfferFormDialog] submit error', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.forms.job_offer.title_edit : t.forms.job_offer.title_create}</DialogTitle>
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
                    {isEn ? 'Generate from a listing' : 'Générer la fiche depuis une annonce'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? (
                      <>
                        AI extracts <strong>title, skills, day rate, location, dates</strong> and
                        rewrites <strong>context, purpose, missions, stack, profile and
                        conditions</strong> for the PDF job poster.
                      </>
                    ) : (
                      <>
                        L&apos;IA extrait <strong>intitulé, skills, TJM, lieu, dates</strong> et
                        reformule <strong>contexte, finalité, missions, stack, profil et
                        conditions</strong> pour la fiche de poste PDF.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle Image / Texte */}
              <div className="inline-flex rounded-md border border-violet-brand/30 bg-violet-brand/5 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('image')}
                  className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition ${
                    importMode === 'image'
                      ? 'bg-violet-brand/30 text-violet-50'
                      : 'text-muted-foreground hover:text-violet-100'
                  }`}
                >
                  <ImageUp className="h-3.5 w-3.5" />
                  {isEn ? 'Screenshot' : 'Capture'}
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('text')}
                  className={`px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition ${
                    importMode === 'text'
                      ? 'bg-violet-brand/30 text-violet-50'
                      : 'text-muted-foreground hover:text-violet-100'
                  }`}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {isEn ? 'Pasted text' : 'Texte collé'}
                </button>
              </div>

              {importMode === 'image' ? (
                <div className="flex items-center gap-3">
                  <label
                    className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer text-sm transition ${
                      parsingImage
                        ? 'border-hairline bg-white/5 text-white/40 cursor-wait'
                        : 'border-violet-brand/40 bg-violet-brand/10 text-violet-100 hover:bg-violet-brand/20'
                    }`}
                  >
                    {parsingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageUp className="h-4 w-4" />
                    )}
                    {parsingImage
                      ? (isEn ? 'Analysing…' : 'Analyse en cours…')
                      : (isEn ? 'Choose a screenshot' : 'Choisir une capture')}
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
              ) : (
                <div className="space-y-2">
                  <Textarea
                    rows={6}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    disabled={parsingImage}
                    placeholder={
                      isEn
                        ? 'Paste the entire offer here — description, requirements, conditions…'
                        : "Colle ici l'intégralité de l'annonce de mission — descriptif, exigences, conditions…"
                    }
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {importText.trim().length}{' '}
                      {isEn ? 'character' : 'caractère'}
                      {importText.trim().length > 1 ? 's' : ''}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleParseText}
                      disabled={parsingImage || importText.trim().length < 30}
                    >
                      {parsingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      {isEn ? 'Generate' : 'Générer la fiche'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>{t.forms.job_offer.title_field} *</Label>
            <Input
              {...register('title')}
              placeholder={
                isEn
                  ? 'e.g. Lead Backend Dev — Retail bank'
                  : 'ex: Lead Dev Backend — Banque de détail'
              }
            />
            {errors.title && (
              <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label>{t.forms.job_offer.description}</Label>
            <Textarea
              {...register('description')}
              rows={4}
              placeholder={
                isEn
                  ? 'Context, stack, goals, team, methodology…'
                  : 'Contexte, stack, objectifs, équipe, méthodo…'
              }
            />
          </div>

          {/* Compétences requises */}
          <div>
            <Label>{t.forms.job_offer.required_skills} *</Label>
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
                placeholder={
                  isEn
                    ? 'e.g. React, PostgreSQL, AWS… (Enter to add)'
                    : 'ex: React, PostgreSQL, AWS… (Entrée pour ajouter)'
                }
              />
              <Button type="button" variant="outline" onClick={() => addSkill('required')}>
                {isEn ? 'Add' : 'Ajouter'}
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
            <Label>{isEn ? 'Bonus skills (nice-to-have)' : 'Compétences bonus (nice-to-have)'}</Label>
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
                placeholder={isEn ? 'e.g. Kubernetes, Terraform…' : 'ex: Kubernetes, Terraform…'}
              />
              <Button type="button" variant="outline" onClick={() => addSkill('nice')}>
                {isEn ? 'Add' : 'Ajouter'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.job_offer.seniority}</Label>
              <Combobox
                ariaLabel={t.forms.job_offer.seniority}
                value={watch('seniority') ?? ''}
                onChange={(v) =>
                  setValue('seniority', v as JobOfferInput['seniority'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: '', label: '—' },
                  { value: 'junior', label: t.seniority.junior },
                  { value: 'confirmed', label: t.seniority.confirmed },
                  { value: 'senior', label: t.seniority.senior },
                  { value: 'expert', label: t.seniority.expert },
                ]}
              />
            </div>
            <div>
              <Label>{isEn ? 'Day rate (€)' : 'TJM (€)'}</Label>
              <Input type="number" min="0" step="1" {...register('daily_rate_eur')} />
            </div>
          </div>

          {/* Source de l'offre — client final vs ESN partenaire qui sous-traite */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{isEn ? 'Source type' : "Type d'origine"}</Label>
              <Combobox
                ariaLabel={isEn ? 'Source type' : "Type d'origine"}
                value={watch('source_kind') ?? 'client'}
                onChange={(v) =>
                  setValue('source_kind', v as JobOfferInput['source_kind'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'client', label: isEn ? 'Direct client' : 'Client direct' },
                  { value: 'esn', label: isEn ? 'Partner ESN' : 'ESN partenaire' },
                ]}
              />
            </div>
            <div className="col-span-2">
              <Label>{isEn ? 'Client / ESN name' : 'Nom du client / ESN'}</Label>
              <Input
                {...register('source')}
                placeholder={
                  isEn
                    ? 'e.g. Banque Postale, Hays, Open…'
                    : 'ex: Banque Postale, Hays, Open…'
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Location' : 'Lieu'}</Label>
              <Input {...register('location')} placeholder="Paris" />
            </div>
            <div>
              <Label>{isEn ? 'Remote (days/wk)' : 'Télétravail (jours/sem.)'}</Label>
              <Input type="number" min="0" max="5" {...register('remote_days')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{isEn ? 'Desired start' : 'Début souhaité'}</Label>
              <Input type="date" {...register('start_date')} />
            </div>
            <div>
              <Label>{isEn ? 'Duration (months)' : 'Durée (mois)'}</Label>
              <Input type="number" min="0" max="60" {...register('duration_months')} />
            </div>
            <div>
              <Label>{isEn ? 'Application deadline' : 'Deadline candidature'}</Label>
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
                  <div className="text-sm font-medium">
                    {isEn ? 'Job poster (PDF)' : 'Fiche de poste (PDF)'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {isEn
                      ? 'Detailed fields for the PDF sent to consultants: context, purpose, missions, stack, conditions.'
                      : 'Champs détaillés pour le PDF envoyé aux consultants : contexte, finalité, missions, stack, conditions.'}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {showFiche
                  ? (isEn ? '— Collapse' : '— Replier')
                  : (isEn ? '+ Expand' : '+ Déplier')}
              </span>
            </button>

            {showFiche && (
              <div className="border-t border-violet-brand/15 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{isEn ? 'Mission type' : 'Type de mission'}</Label>
                    <Input
                      {...register('contract_kind')}
                      placeholder={
                        isEn
                          ? 'Freelance, FTE, Umbrella…'
                          : 'Mission Freelance, CDI, Portage…'
                      }
                    />
                  </div>
                  <div>
                    <Label>{isEn ? 'Experience (free text)' : 'Expérience (texte libre)'}</Label>
                    <Input
                      {...register('experience_label')}
                      placeholder={isEn ? 'e.g. 6–9 yrs, Senior…' : 'ex : 6–9 ans, Senior…'}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isEn
                        ? 'Overrides the seniority level on the poster. Leave empty to derive from seniority.'
                        : 'Prioritaire sur la séniorité sur la fiche. Vide = dérivé de la séniorité.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{isEn ? 'Work mode' : 'Mode de travail'}</Label>
                    <Combobox
                      ariaLabel={isEn ? 'Work mode' : 'Mode de travail'}
                      value={watch('work_mode') ?? ''}
                      onChange={(val) =>
                        setValue('work_mode', (val || null) as JobOfferInput['work_mode'], {
                          shouldDirty: true,
                        })
                      }
                      options={[
                        { value: '', label: isEn ? '— Auto (from remote days)' : '— Auto (selon jours télétravail)' },
                        { value: 'onsite', label: isEn ? 'On-site' : 'Sur site' },
                        { value: 'hybrid', label: isEn ? 'Hybrid' : 'Hybride' },
                        { value: 'remote', label: isEn ? 'Full remote' : 'Full remote' },
                        { value: 'custom', label: isEn ? 'Custom…' : 'Personnalisé…' },
                      ]}
                    />
                    {watch('work_mode') === 'custom' && (
                      <Input
                        className="mt-2"
                        {...register('work_mode_detail')}
                        placeholder={isEn ? 'e.g. 2 remote days / week' : 'ex : 2j télétravail / sem.'}
                      />
                    )}
                  </div>
                  <div>
                    <Label>{isEn ? 'Start' : 'Démarrage'}</Label>
                    <Combobox
                      ariaLabel={isEn ? 'Start' : 'Démarrage'}
                      value={watch('start_type') ?? ''}
                      onChange={(val) =>
                        setValue('start_type', (val || null) as JobOfferInput['start_type'], {
                          shouldDirty: true,
                        })
                      }
                      options={[
                        { value: '', label: isEn ? '— Auto (from start date)' : '— Auto (selon date de début)' },
                        { value: 'date', label: isEn ? 'Exact date' : 'Date précise' },
                        { value: 'asap', label: 'ASAP' },
                        { value: 'immediate', label: isEn ? 'Immediate' : 'Immédiat' },
                        { value: 'tbd', label: isEn ? 'To be agreed' : 'À convenir' },
                        { value: 'custom', label: isEn ? 'Custom…' : 'Personnalisé…' },
                      ]}
                    />
                    {watch('start_type') === 'custom' && (
                      <Input
                        className="mt-2"
                        {...register('start_label')}
                        placeholder={isEn ? 'e.g. September 2026' : 'ex : Septembre 2026'}
                      />
                    )}
                    {watch('start_type') === 'date' && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {isEn
                          ? 'Uses the “Desired start” date above.'
                          : 'Utilise la date « Début souhaité » ci-dessus.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Afficher le TJM sur la fiche — masqué par défaut */}
                <button
                  type="button"
                  onClick={() =>
                    setValue('show_rate', !watch('show_rate'), { shouldDirty: true })
                  }
                  className="flex items-center justify-between w-full rounded-lg border border-hairline bg-card/40 px-3.5 py-2.5 text-left hover:bg-card/70 transition"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {isEn ? 'Show day rate on the poster' : 'Afficher le TJM sur la fiche'}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {isEn
                        ? 'Off by default — the day rate line is fully hidden when disabled.'
                        : 'Masqué par défaut — la ligne TJM est totalement retirée si désactivé.'}
                    </div>
                  </div>
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                      watch('show_rate') ? 'bg-violet-brand' : 'bg-foreground/20'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        watch('show_rate') ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>

                <div>
                  <Label>{isEn ? 'Context (section 01)' : 'Contexte (section 01)'}</Label>
                  <Textarea
                    {...register('context')}
                    rows={4}
                    placeholder={
                      isEn
                        ? 'Company, IT dept, team description…'
                        : "Présentation de l'entreprise, de la DSI, de l'équipe…"
                    }
                  />
                </div>

                <div>
                  <Label>
                    {isEn ? 'Mission purpose (section 02)' : 'Finalité de la mission (section 02)'}
                  </Label>
                  <Textarea
                    {...register('mission_purpose')}
                    rows={2}
                    placeholder={
                      isEn
                        ? '1-2 sentence summary — shown in the accent block.'
                        : 'Objectif synthétique en 1-2 phrases — affiché dans le bloc accent.'
                    }
                  />
                </div>

                <div>
                  <Label>
                    {isEn ? 'Main missions — 1 per line' : 'Missions principales — 1 par ligne'}
                  </Label>
                  <Textarea
                    rows={6}
                    value={tasksText}
                    onChange={(e) => setTasksText(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Ensure level-2 network infra MCO\nTriage and resolve incidents\nAdminister LAN, WAN and Wifi equipment'
                        : 'Assurer le MCO des infrastructures réseaux N2\nTraiter et résoudre les incidents\nAdministrer les équipements LAN, WAN et Wifi'
                    }
                  />
                </div>

                <div>
                  <Label>
                    {isEn
                      ? 'Tech environment — 1 per line'
                      : 'Environnement technique — 1 techno par ligne'}
                  </Label>
                  <Textarea
                    rows={3}
                    value={techStackText}
                    onChange={(e) => setTechStackText(e.target.value)}
                    placeholder={'Cisco\nAruba\nPalo Alto\nFortinet'}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isEn
                      ? 'Shown as violet tags. If empty, falls back to required skills.'
                      : 'Affichées en tags violets sur la fiche. Si vide, on retombe sur les compétences requises.'}
                  </p>
                </div>

                <div>
                  <Label>
                    {isEn
                      ? 'Profile — 1 requirement per line'
                      : 'Profil recherché — 1 exigence par ligne'}
                  </Label>
                  <Textarea
                    rows={4}
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder={
                      isEn
                        ? '8+ years of network infrastructure experience\nCisco CCNP certification mandatory\nFluent English (written + spoken)\nBanking / insurance experience'
                        : "8+ ans d'expérience en infrastructure réseau\nCertification Cisco CCNP impérative\nAnglais courant (écrit + oral)\nExpérience banque/assurance"
                    }
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isEn
                      ? 'Profile requirements (seniority, certs, languages, soft skills) — distinct from techs. Shown in the right column.'
                      : 'Exigences profil (séniorité, certifs, langues, soft skills) — distinct des technos. Affiché dans la colonne droite de la fiche.'}
                  </p>
                </div>

                <div>
                  <Label>
                    {isEn
                      ? 'Working conditions — 1 per line'
                      : "Conditions d'exercice — 1 par ligne"}
                  </Label>
                  <Textarea
                    rows={3}
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Lyon-based — 2 days remote/week\n6-month mission — Contract\nOccasional out-of-hours interventions'
                        : 'Poste basé à Lyon — Télétravail 2j/sem.\nMission de 6 mois — Prestation\nInterventions ponctuelles en HNO'
                    }
                  />
                </div>
              </div>
            )}
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
