'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, UserPlus, Mail, Lock, FileUp, Sparkles, CheckCircle2 } from 'lucide-react';

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
import { extractTextSmart } from '@/lib/cv/extract-text';
import { parseCVSmart } from '@/lib/cv/parse-cv-llm';
import { applyParsedCV } from '@/lib/cv/apply-parsed-cv';
import { extractIdentityFromText } from '@/lib/cv/extract-identity';
import type { ParsedCV } from '@/lib/cv/parse-cv';
import type { Consultant } from '@/types';

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
  const [saving, setSaving] = useState(false);
  const [createPortal, setCreatePortal] = useState(false);
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
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
      setPortalPassword('');
      setParsingCV(false);
      setCvFileName(null);
      setParsedPreview(null);
      parsedRef.current = null;
    }
  }, [open, consultant, reset]);

  async function handleCVFile(file: File) {
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
        `Lecture du fichier impossible : ${e instanceof Error ? e.message : 'format non supporté'}`,
      );
      setParsingCV(false);
      return;
    }

    if (!text || text.trim().length < 100) {
      toast.error('CV trop court ou illisible. Vérifie le fichier.');
      setParsingCV(false);
      return;
    }

    // Étape 2 : parse structuré (IA si dispo, sinon heuristique — jamais bloquant)
    let parsed: ParsedCV | null = null;
    let mode: 'llm' | 'heuristic' = 'heuristic';
    let warnings: string[] = [];
    try {
      const result = await parseCVSmart(text);
      parsed = result.parsed ?? null;
      mode = result.mode;
      warnings = result.warnings ?? [];
    } catch (e) {
      console.error('[handleCVFile] parseCVSmart failed', e);
      warnings = [`Parse échoué : ${e instanceof Error ? e.message : 'erreur'}`];
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
      linkedin_url: mergedIdentity.linkedin_url ?? '',
    } as Partial<ConsultantInput>);

    warnings.forEach((w) => toast.warning(w, { duration: 6000 }));
    toast.success(
      `CV analysé (${mode === 'llm' ? 'IA' : 'heuristique'}) — vérifie et valide pour créer.`,
    );
    setParsingCV(false);
  }

  async function onSubmit(values: ConsultantInput) {
    // Validation accès portail (créé only)
    if (!isEdit && createPortal) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalEmail)) {
        toast.error('Email du portail invalide');
        return;
      }
      if (portalPassword.length < 8) {
        toast.error('Le mot de passe doit faire au moins 8 caractères');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        const res = await consultantService.update(consultant!.id, values);
        if (res.error) {
          toast.error('Erreur : ' + res.error.message);
          return;
        }
        toast.success('Consultant mis à jour');
        onSaved?.(res.data);
      } else {
        // Création via API — gère optionnellement la création du compte portail
        const body = {
          ...values,
          ...(createPortal && {
            portal_access: { email: portalEmail, password: portalPassword },
          }),
          ...(isProspect && { is_prospect: true }),
        };
        const res = await fetch('/api/consultants/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(payload.message ?? payload.error ?? 'Création impossible');
          return;
        }
        // Si un CV a été pré-parsé, on applique skills / expériences / formations
        let applied: { skillsAdded: number; experiencesAdded: number; educationsAdded: number } | null = null;
        if (parsedRef.current && payload.data?.id) {
          try {
            const r = await applyParsedCV(payload.data.id, parsedRef.current);
            applied = {
              skillsAdded: r.skillsAdded,
              experiencesAdded: r.experiencesAdded,
              educationsAdded: r.educationsAdded,
            };
            for (const w of r.warnings) {
              toast.warning(w, { duration: 8000 });
            }
          } catch (e) {
            toast.warning(
              `Fiche créée mais l'import CV a partiellement échoué : ${e instanceof Error ? e.message : 'erreur'}.`,
              { duration: 6000 },
            );
          }
        }

        const baseMsg = createPortal
          ? `Consultant créé — accès portail envoyé à ${portalEmail}`
          : isProspect
            ? 'Prospect ajouté au vivier'
            : 'Consultant créé';
        const cvMsg = applied
          ? ` · CV importé : ${applied.skillsAdded} compétences, ${applied.experiencesAdded} expériences, ${applied.educationsAdded} formations`
          : '';
        toast.success(baseMsg + cvMsg);
        onSaved?.(payload.data);
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'Éditer le consultant'
              : isProspect
                ? 'Nouveau prospect'
                : 'Nouveau consultant'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifie les informations du consultant'
              : isProspect
                ? 'Ajoute un profil à ton vivier. Il ne compte pas dans l\'effectif tant que tu ne le promeus pas.'
                : 'Ajoute un consultant à ta bibliothèque'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Import CV — uniquement en création */}
          {!isEdit && (
            <div className="rounded-lg border border-violet-brand/25 bg-violet-brand/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-violet-brand/15 p-1.5">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Importer un CV pour pré-remplir</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    PDF, DOCX ou TXT. L&apos;IA extrait identité, compétences, expériences, formations et langues.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer text-sm transition ${
                    parsingCV
                      ? 'border-white/10 bg-white/5 text-white/40 cursor-wait'
                      : 'border-violet-brand/40 bg-violet-brand/10 text-violet-100 hover:bg-violet-brand/20'
                  }`}
                >
                  {parsingCV ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  {parsingCV ? 'Analyse en cours…' : 'Choisir un CV'}
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
                    Compétences : <strong className="text-white/90">{parsedPreview.skills}</strong>
                  </span>
                  <span>
                    Expériences :{' '}
                    <strong className="text-white/90">{parsedPreview.experiences}</strong>
                  </span>
                  <span>
                    Formations :{' '}
                    <strong className="text-white/90">{parsedPreview.educations}</strong>
                  </span>
                  <span className="text-white/40">
                    · appliquées à la fiche après création
                  </span>
                </div>
              )}
            </div>
          )}

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
                    Créer un accès portail consultant
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Le consultant pourra se connecter à <code className="text-violet-300">/login</code> avec ces identifiants pour accéder à son portail (CRA, profil, documents).
                  </div>
                </div>
              </label>

              {createPortal && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <Label>Email du portail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                      <Input
                        type="email"
                        value={portalEmail}
                        onChange={(e) => setPortalEmail(e.target.value)}
                        placeholder="prenom.nom@example.com"
                        className="pl-9"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Mot de passe * (8+ car.)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                      <Input
                        type="text"
                        value={portalPassword}
                        onChange={(e) => setPortalPassword(e.target.value)}
                        placeholder="Mot de passe temporaire"
                        className="pl-9 font-mono text-xs"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <p className="col-span-2 text-[11px] text-amber-300/80">
                    ⚠ Communique ce mot de passe au consultant. Il pourra le changer après connexion.
                  </p>
                </div>
              )}
            </div>
          )}

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
