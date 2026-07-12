'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { notifyCreated, notifyError } from '@/lib/notify';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { Loader2, UserPlus, Mail, FileUp, Sparkles, CheckCircle2 } from 'lucide-react';

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
import { Combobox } from '@/components/ui/Combobox';
import { consultantSchema, type ConsultantInput } from '@/lib/validators';
import { extractTextSmart } from '@/lib/cv/extract-text';
import { parseCVSmart } from '@/lib/cv/parse-cv-llm';
import { applyParsedCV } from '@/lib/cv/apply-parsed-cv';
import { extractIdentityFromText } from '@/lib/cv/extract-identity';
import type { ParsedCV } from '@/lib/cv/parse-cv';
import type { Consultant } from '@/types';
import { PlanLimitDialog, type PlanLimitPayload } from '@/components/billing/PlanLimitDialog';
import { AvailableFromField } from '@/components/consultants/AvailableFromField';
import { broadcastOrgActivity } from '@/lib/realtime/org-activity';
import { useOrganizationSafe } from '@/lib/auth/context';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSaved?: (c: Consultant) => void;
  /** Si fourni, le dialog passe en mode édition */
  consultant?: Consultant | null;
  /** À la création : true = vivier de prospection (hors effectif) */
  isProspect?: boolean;
};

function normalizeUrl(raw: string | null | undefined): string {
  if (!raw) return '';
  const v = raw.trim();
  if (!v) return '';
  // Déjà une URL valide
  try {
    const u = new URL(v);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    // pas une URL — on tente d'ajouter https://
  }
  // Cas "linkedin.com/in/..." ou "www.linkedin.com/in/..." → ajoute https://
  if (/^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) {
    try {
      const u = new URL(`https://${v}`);
      return u.toString();
    } catch {
      return '';
    }
  }
  // Tout le reste = ininterprétable, on jette plutôt que faire échouer le form
  return '';
}

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
  organizationId: _organizationId,
  onSaved,
  consultant,
  isProspect = false,
}: Props) {
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [saving, setSaving] = useState(false);
  const [planLimit, setPlanLimit] = useState<PlanLimitPayload | null>(null);
  const org = useOrganizationSafe();
  const [createPortal, setCreatePortal] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [parsingCV, setParsingCV] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    skills: number;
    experiences: number;
    educations: number;
  } | null>(null);
  const parsedRef = useRef<ParsedCV | null>(null);
  const isEdit = !!consultant;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConsultantInput>({
    resolver: zodResolver(consultantSchema),
    defaultValues: toFormValues(consultant),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(consultant));
      setCreatePortal(false);
      setPortalEmail('');
      setParsingCV(false);
      setCvFileName(null);
      setParsedPreview(null);
      parsedRef.current = null;
    }
  }, [open, consultant, reset]);

  async function handleCVFile(file: File) {
    // Garde-fou taille : 10 Mo max. Au-delà :
    //   - parsing trop long (timeout serveur quasi-garanti)
    //   - risque DoS (gros payload qui bloque le worker Vercel)
    //   - extraction texte qui swap en RAM
    // Garde-fou format : on rejette IMMÉDIATEMENT tout format non supporté
    // au lieu de lancer l'extraction (qui tournait dans le vide ~1 min sur un
    // .png/.doc avant d'échouer silencieusement). Le champ `accept` de l'input
    // n'est qu'une suggestion : rien n'empêche de choisir "tous les fichiers".
    const ALLOWED_EXT = ['pdf', 'docx', 'txt'];
    const ALLOWED_MIME = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(file.type)) {
      toast.error(
        isEn
          ? `Unsupported format (.${ext}). Only PDF, DOCX or TXT are accepted.`
          : `Format non supporté (.${ext}). Seuls PDF, DOCX ou TXT sont acceptés.`,
      );
      return;
    }

    const MAX_CV_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_CV_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      toast.error(
        isEn
          ? `File too large (${sizeMb} MB). The limit is 10 MB. Compress it or export as a lighter PDF.`
          : `Fichier trop volumineux (${sizeMb} Mo). La limite est de 10 Mo. Compresse-le ou exporte en PDF moins lourd.`,
      );
      return;
    }
    if (file.size === 0) {
      toast.error(isEn ? 'Empty file.' : 'Fichier vide.');
      return;
    }

    setParsingCV(true);
    setParsedPreview(null);
    parsedRef.current = null;

    // Étape 1 : extraction via serveur (unpdf — plus fiable que pdfjs côté navigateur),
    // avec repli client si la route n'est pas disponible.
    let text: string;
    try {
      text = await extractTextSmart(file);
    } catch (e) {
      console.error('[handleCVFile] extractTextSmart failed', e);
      toast.error(
        isEn
          ? `Unable to read file: ${e instanceof Error ? e.message : 'unsupported format'}`
          : `Lecture du fichier impossible : ${e instanceof Error ? e.message : 'format non supporté'}`,
      );
      setParsingCV(false);
      return;
    }

    if (!text || text.trim().length < 100) {
      toast.error(isEn ? 'CV too short or unreadable. Check the file.' : 'CV trop court ou illisible. Vérifie le fichier.');
      setParsingCV(false);
      return;
    }

    // Étape 2 : parse structuré (IA si dispo, sinon heuristique — jamais bloquant)
    let parsed: ParsedCV | null = null;
    let warnings: string[] = [];
    try {
      const result = await parseCVSmart(text);
      parsed = result.parsed ?? null;
      warnings = result.warnings ?? [];
    } catch (e) {
      console.error('[handleCVFile] parseCVSmart failed', e);
      warnings = [isEn ? `Parse failed: ${e instanceof Error ? e.message : 'error'}` : `Parse échoué : ${e instanceof Error ? e.message : 'erreur'}`];
    }

    // Étape 3 : identité — on prend celle du LLM en priorité, on complète
    // champ par champ avec l'extracteur heuristique client si le LLM a laissé null.
    const llmIdentity = parsed?.identity ?? null;
    const regexIdentity = extractIdentityFromText(text);
    const mergedIdentity: ParsedCV['identity'] = {
      first_name: llmIdentity?.first_name ?? regexIdentity?.first_name ?? null,
      last_name: llmIdentity?.last_name ?? regexIdentity?.last_name ?? null,
      job_title: llmIdentity?.job_title ?? regexIdentity?.job_title ?? null,
      sub_title: llmIdentity?.sub_title ?? regexIdentity?.sub_title ?? null,
      city: llmIdentity?.city ?? regexIdentity?.city ?? null,
      country: llmIdentity?.country ?? regexIdentity?.country ?? null,
      seniority: llmIdentity?.seniority ?? regexIdentity?.seniority ?? null,
      years_experience:
        llmIdentity?.years_experience ?? regexIdentity?.years_experience ?? null,
      email: llmIdentity?.email ?? regexIdentity?.email ?? null,
      phone: llmIdentity?.phone ?? regexIdentity?.phone ?? null,
      linkedin_url: llmIdentity?.linkedin_url ?? regexIdentity?.linkedin_url ?? null,
    };

    const safeParsed: ParsedCV = {
      identity: mergedIdentity,
      summary: parsed?.summary ?? null,
      skills: parsed?.skills ?? [],
      experiences: parsed?.experiences ?? [],
      educations: parsed?.educations ?? [],
      languages: parsed?.languages ?? [],
    };

    parsedRef.current = safeParsed;
    setCvFileName(file.name);
    setParsedPreview({
      skills: safeParsed.skills.length,
      experiences: safeParsed.experiences.length,
      educations: safeParsed.educations.length,
    });

    // Auto-remplissage : uniquement ce qui a été détecté. Les champs manquants
    // restent vides pour que l'utilisateur complète manuellement.
    // `seniority` et `status` doivent rester des enums valides (defaults si absent).
    reset({
      first_name: mergedIdentity.first_name ?? '',
      last_name: mergedIdentity.last_name ?? '',
      job_title: mergedIdentity.job_title ?? '',
      sub_title: mergedIdentity.sub_title ?? '',
      seniority: mergedIdentity.seniority ?? 'confirmed',
      years_experience: mergedIdentity.years_experience ?? undefined,
      city: mergedIdentity.city ?? '',
      country: mergedIdentity.country ?? 'FR',
      status: 'available',
      summary: safeParsed.summary ?? '',
      email: mergedIdentity.email ?? '',
      phone: mergedIdentity.phone ?? '',
      linkedin_url: normalizeUrl(mergedIdentity.linkedin_url),
    } as Partial<ConsultantInput>);

    warnings.forEach((w) => toast.warning(w, { duration: 6000 }));
    notifyCreated(
      isEn
        ? `CV imported — ${safeParsed.skills.length} skills, ${safeParsed.experiences.length} experiences detected. Review and confirm.`
        : `CV importé — ${safeParsed.skills.length} compétences, ${safeParsed.experiences.length} expériences détectées. Vérifie et valide.`,
    );
    setParsingCV(false);
  }

  async function onSubmit(values: ConsultantInput) {
    // Validation accès portail (créé only)
    if (!isEdit && createPortal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalEmail)) {
        notifyError(isEn ? 'Invalid portal email' : 'Email du portail invalide');
        return;
      }
    }

    // Supabase rejette '' pour les colonnes DATE/nullable ; normalise avant envoi.
    // 'unknown' est une sentinelle UI (bouton "On ne sait pas") qui mappe à NULL
    // côté DB — on conserve l'info "champ rempli explicitement" via la
    // sélection obligatoire d'un mode dans AvailableFromField.
    const normalized = Object.fromEntries(
      Object.entries(values).map(([k, v]) => {
        if (v === '' || (k === 'available_from' && v === 'unknown')) return [k, null];
        return [k, v];
      }),
    ) as Partial<ConsultantInput>;

    setSaving(true);
    try {
      if (isEdit) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        let res: Response;
        try {
          res = await fetch(`/api/consultants/${consultant!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalized),
            signal: controller.signal,
          });
        } catch (e) {
          if ((e as Error).name === 'AbortError') {
            notifyError(isEn ? 'Timeout — please try again' : 'Délai dépassé — réessaie dans un instant');
          } else {
            notifyError((isEn ? 'Network error: ' : 'Erreur réseau : ') + (e as Error).message);
          }
          return;
        } finally {
          clearTimeout(timeoutId);
        }
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          notifyError(payload.message ?? payload.error ?? (isEn ? 'Update failed' : 'Mise à jour impossible'));
          return;
        }
        void broadcastOrgActivity(
          org?.activeOrgId,
          org?.user?.id,
          'consultant_updated',
          `${values.first_name} ${values.last_name}`,
          '/consultants',
        );
        onSaved?.(payload.data as Consultant);
      } else {
        // Création via API — gère optionnellement la création du compte portail
        const body = {
          ...values,
          ...(createPortal && {
            portal_access: { email: portalEmail },
          }),
          ...(isProspect && { is_prospect: true }),
        };
        const res = await fetch('/api/consultants/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.status === 402 && payload?.error === 'plan_limit_reached') {
          setPlanLimit(payload as PlanLimitPayload);
          return;
        }
        if (!res.ok) {
          notifyError(payload.message ?? payload.error ?? (isEn ? 'Creation failed' : 'Création impossible'));
          return;
        }
        // Si un CV a été pré-parsé, on applique skills / expériences / formations
        if (parsedRef.current && payload.data?.id) {
          try {
            const r = await applyParsedCV(payload.data.id, parsedRef.current);
            for (const w of r.warnings) {
              toast.warning(w, { duration: 8000 });
            }
          } catch (e) {
            toast.warning(
              isEn
                ? `Profile created but CV import partially failed: ${e instanceof Error ? e.message : 'error'}.`
                : `Fiche créée mais l'import CV a partiellement échoué : ${e instanceof Error ? e.message : 'erreur'}.`,
              { duration: 6000 },
            );
          }
        }

        const fullName = `${values.first_name} ${values.last_name}`;
        // Cas spécifique : accès portail demandé MAIS l'email d'invitation
        // n'a pas pu être envoyé (rate-limit SMTP, redirect non whitelisté,
        // etc.). On déclenche le warning UNIQUEMENT sur invitation_sent===false
        // (la présence d'invite_url est optionnelle — sinon on demande à
        // l'admin de retry depuis la fiche).
        const portalEmailFailed =
          createPortal &&
          payload.portal &&
          payload.portal.invitation_sent === false;
        if (portalEmailFailed) {
          const inviteUrl: string | null =
            typeof payload.portal.invite_url === 'string'
              ? payload.portal.invite_url
              : null;
          if (inviteUrl) {
            try {
              await navigator.clipboard.writeText(inviteUrl);
            } catch {
              /* clipboard refused */
            }
          }
          // Code coarse renvoyé par le backend — on l'humanise pour l'UI.
          const errCode = payload.portal.email_error_code ?? 'smtp_failed';
          const errLabel = (() => {
            const map: Record<string, { fr: string; en: string }> = {
              rate_limited: { fr: 'limite SMTP atteinte', en: 'SMTP rate limit reached' },
              smtp_failed: { fr: 'erreur SMTP', en: 'SMTP error' },
              recipient_invalid: { fr: 'email destinataire invalide', en: 'invalid recipient email' },
              redirect_not_allowed: { fr: 'URL redirect non autorisée Supabase', en: 'redirect URL not allow-listed in Supabase' },
              auth_failed: { fr: 'erreur Supabase Auth', en: 'Supabase Auth error' },
              unknown: { fr: 'erreur inconnue', en: 'unknown error' },
            };
            return (map[errCode] ?? map.unknown)[isEn ? 'en' : 'fr'];
          })();
          toast.warning(
            inviteUrl
              ? isEn
                ? `${fullName} created, but the portal invite email could not be sent (${errLabel}). Invite link copied to clipboard — send it manually to ${portalEmail}.`
                : `${fullName} créé, mais l'email d'invitation portail n'a pas pu être envoyé (${errLabel}). Lien d'invitation copié dans le presse-papier — envoie-le manuellement à ${portalEmail}.`
              : isEn
                ? `${fullName} created, but the portal invite email could not be sent (${errLabel}) and no fallback link could be generated. Try again from the consultant card.`
                : `${fullName} créé, mais l'email d'invitation portail n'a pas pu être envoyé (${errLabel}) et aucun lien de secours n'a été généré. Réessaie depuis la fiche consultant.`,
            { duration: 12000 },
          );
        }
        void broadcastOrgActivity(
          org?.activeOrgId,
          org?.user?.id,
          'consultant_created',
          `${values.first_name} ${values.last_name}`,
          '/consultants',
        );
        onSaved?.(payload.data);
      }
      reset();
      onOpenChange(false);
    } catch {
      notifyError(isEn ? 'Network error' : 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <PlanLimitDialog
      payload={planLimit}
      onOpenChange={(o) => {
        if (!o) setPlanLimit(null);
      }}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t.forms.consultant.title_edit : t.forms.consultant.title_create}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, (errs) => {
            const first = Object.values(errs)[0] as { message?: string } | undefined;
            toast.error(first?.message ?? (isEn ? 'Invalid form — check the fields' : 'Formulaire invalide — vérifie les champs'));
          })}
          className="space-y-4 pt-2"
        >
          {/* Import CV — uniquement en création */}
          {!isEdit && (
            <div className="rounded-lg border border-violet-brand/25 bg-violet-brand/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-violet-brand/15 p-1.5">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{isEn ? 'Import a CV to pre-fill' : 'Importer un CV pour pré-remplir'}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? 'PDF, DOCX or TXT. AI extracts identity, skills, experiences, education and languages.'
                      : "PDF, DOCX ou TXT. L'IA extrait identité, compétences, expériences, formations et langues."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer text-sm transition ${
                    parsingCV
                      ? 'border-hairline bg-white/5 text-white/40 cursor-wait'
                      : 'border-violet-brand/40 bg-violet-brand/10 text-violet-100 hover:bg-violet-brand/20'
                  }`}
                >
                  {parsingCV ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  {parsingCV ? (isEn ? 'Analyzing…' : 'Analyse en cours…') : (isEn ? 'Choose a CV' : 'Choisir un CV')}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    disabled={parsingCV}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCVFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {cvFileName && !parsingCV && (
                  <div className="text-xs text-white/70 truncate flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{cvFileName}</span>
                  </div>
                )}
              </div>

              {parsedPreview && (
                <div className="text-[11px] text-white/60 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>
                    {isEn ? 'Skills' : 'Compétences'} : <strong className="text-white/90">{parsedPreview.skills}</strong>
                  </span>
                  <span>
                    {isEn ? 'Experiences' : 'Expériences'} :{' '}
                    <strong className="text-white/90">{parsedPreview.experiences}</strong>
                  </span>
                  <span>
                    {isEn ? 'Education' : 'Formations'} :{' '}
                    <strong className="text-white/90">{parsedPreview.educations}</strong>
                  </span>
                  <span className="text-white/40">
                    {isEn ? '· applied to the profile after creation' : '· appliquées à la fiche après création'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.consultant.first_name} *</Label>
              <Input {...register('first_name')} />
              {errors.first_name && (
                <p className="text-xs text-red-400 mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label>{t.forms.consultant.last_name} *</Label>
              <Input {...register('last_name')} />
              {errors.last_name && (
                <p className="text-xs text-red-400 mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t.forms.consultant.job_title} *</Label>
            <Input {...register('job_title')} placeholder={isEn ? 'e.g. QA Automation Engineer' : 'ex: QA Automation Confirmé'} />
          </div>

          <div>
            <Label>{t.forms.consultant.sub_title}</Label>
            <Input {...register('sub_title')} placeholder="Playwright / TypeScript / SQL" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t.forms.consultant.seniority}</Label>
              <Combobox
                ariaLabel={t.forms.consultant.seniority}
                value={watch('seniority') ?? 'junior'}
                onChange={(v) =>
                  setValue('seniority', v as ConsultantInput['seniority'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'junior', label: t.seniority.junior },
                  { value: 'confirmed', label: t.seniority.confirmed },
                  { value: 'senior', label: t.seniority.senior },
                  { value: 'expert', label: t.seniority.expert },
                ]}
              />
            </div>
            <div>
              <Label>{t.forms.consultant.years_xp}</Label>
              <Input type="number" min="0" max="50" {...register('years_experience')} />
            </div>
            <div>
              <Label>{t.forms.consultant.daily_rate}</Label>
              <Input type="number" min="0" step="1" {...register('daily_rate_eur')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.forms.consultant.city}</Label>
              <Input {...register('city')} placeholder="Paris" />
            </div>
            <div>
              <Label>{t.forms.opportunity.status}</Label>
              <Combobox
                ariaLabel={t.forms.opportunity.status}
                value={watch('status') ?? 'available'}
                onChange={(v) =>
                  setValue('status', v as ConsultantInput['status'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'available', label: t.consultant_status.available },
                  { value: 'soon_available', label: t.consultant_status.soon_available },
                  { value: 'on_mission', label: t.consultant_status.on_mission },
                  { value: 'unavailable', label: t.consultant_status.unavailable },
                ]}
              />
            </div>
          </div>

          <AvailableFromField
            value={watch('available_from') ?? ''}
            onChange={(v) => setValue('available_from', v as string, { shouldDirty: true })}
          />

          <input type="hidden" {...register('available_from')} />

          <div>
            <Label>{t.forms.consultant.summary}</Label>
            <Textarea {...register('summary')} rows={3} maxLength={2000} placeholder={t.forms.consultant.summary_placeholder} />
          </div>

          {/* Accès portail consultant — seulement en création d'un consultant actif */}
          {!isEdit && !isProspect && (
            <div className="rounded-lg border border-violet-brand/20 bg-violet-brand/5 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPortal}
                  onChange={(e) => setCreatePortal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 accent-violet-brand cursor-pointer"
                />
                <div>
                  <div className="text-sm font-medium inline-flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4 text-violet-300" />
                    {isEn ? 'Create a consultant portal access' : 'Créer un accès portail consultant'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? (
                      <>The consultant will be able to log in at <code className="text-violet-300">/login</code> with these credentials to access their portal (timesheets, profile, documents).</>
                    ) : (
                      <>Le consultant pourra se connecter à <code className="text-violet-300">/login</code> avec ces identifiants pour accéder à son portail (CRA, profil, documents).</>
                    )}
                  </div>
                </div>
              </label>

              {createPortal && (
                <div className="pt-2 border-t border-hairline space-y-1.5">
                  <Label>{isEn ? 'Portal email' : 'Email du portail'} *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                    <Input
                      type="email"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      placeholder={isEn ? 'firstname.lastname@example.com' : 'prenom.nom@example.com'}
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[11px] text-violet-300/80">
                    {isEn
                      ? "A Centrium email will be sent to this address with a link for the consultant to set their own password. No secret is stored on the admin side."
                      : "Un email Centrium sera envoyé à cette adresse avec un lien pour que le consultant définisse son propre mot de passe. Aucun secret n'est stocké côté admin."}
                  </p>
                </div>
              )}
            </div>
          )}

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
      </DialogContent>
    </Dialog>
    </>
  );
}
