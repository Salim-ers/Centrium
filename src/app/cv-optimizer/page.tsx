'use client';

import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Download,
  FileDown,
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Target,
  FileText,
  Info,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  HelpCircle,
  MinusCircle,
  Pencil,
  RotateCcw,
  MousePointerClick,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, AppCard } from '@/components/app';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import { Badge } from '@/components/ui/badge';
import { ConsultantCombobox } from '@/components/ui/ConsultantCombobox';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';

import { CVRenderer } from '@/components/cv/CVRenderer';
import { CVPreviewBoundary } from '@/components/cv/CVPreviewBoundary';
import { consultantService } from '@/lib/services/consultant.service';
import { jobOfferService } from '@/lib/services';
import { generateCVContent } from '@/lib/ai/cv-generator';
import { generateCVDocx } from '@/lib/cv/export-docx';
import { exportCVToPdf } from '@/lib/cv/export-pdf';
import { applyOverrides, type CVOverrides } from '@/lib/cv/overrides';
import { resolveBrand } from '@/lib/cv/branding';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  CVContent,
  CVTemplateId,
  JobOffer,
} from '@/types';
import { CV_TEMPLATE_LABEL } from '@/constants';

type LoadedConsultant = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

export default function CVOptimizerPage() {
  return (
    <Suspense fallback={null}>
      <CVOptimizerPageInner />
    </Suspense>
  );
}

function CVOptimizerPageInner() {
  const params = useSearchParams();
  const initialId = params?.get('consultantId') ?? '';
  const initialOfferId = params?.get('offerId') ?? '';
  const { branding, activeOrgId } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const brand = useMemo(() => resolveBrand(branding), [branding]);

  // Consultants + offres via cache SWR : affichage INSTANTANÉ depuis le cache
  // au retour sur la page, revalidation en fond, et surtout stale-on-empty
  // avec retry → si le fetch part avant que la session/org soit prête (au
  // remount après navigation) et revient vide, on GARDE l'affichage et on
  // retente au lieu de montrer « Aucun résultat ». Gated sur activeOrgId pour
  // ne pas fetcher avant que l'org soit connue.
  const { data: consultantsData } = useCachedQuery<Consultant[]>(
    `cv-optimizer:consultants:${activeOrgId ?? 'none'}`,
    async () => (await consultantService.list({ is_prospect: 'all' })).data ?? [],
    { enabled: !!activeOrgId },
  );
  const consultants = consultantsData ?? [];
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [loaded, setLoaded] = useState<LoadedConsultant | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const { data: offersData } = useCachedQuery<JobOffer[]>(
    `cv-optimizer:offers:${activeOrgId ?? 'none'}`,
    async () => (await jobOfferService.list('open')).data ?? [],
    { enabled: !!activeOrgId },
  );
  const offers = offersData ?? [];
  const [selectedOfferId, setSelectedOfferId] = useState<string>(initialOfferId);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerSkills, setOfferSkills] = useState('');

  const [templateId, setTemplateId] = useState<CVTemplateId>('standard');
  // Tant que l'utilisateur n'a pas explicitement changé le template, on suit le
  // défaut configuré par l'organisation dans /settings/branding.
  // Choix manuel persisté en localStorage pour survivre aux F5.
  const TEMPLATE_LS_KEY = 'qc-cv-optimizer-template';
  const templateTouchedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(TEMPLATE_LS_KEY) as CVTemplateId | null;
    if (stored && ['standard', 'dense', 'executive'].includes(stored)) {
      templateTouchedRef.current = true;
      setTemplateId(stored);
    }
  }, []);
  useEffect(() => {
    if (templateTouchedRef.current) return;
    const pref = branding?.defaultCvTemplate;
    if (pref && pref !== templateId) setTemplateId(pref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding?.defaultCvTemplate]);
  const handleTemplateChange = (value: CVTemplateId) => {
    templateTouchedRef.current = true;
    setTemplateId(value);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(TEMPLATE_LS_KEY, value); } catch { /* quota */ }
    }
  };
  const [generated, setGenerated] = useState<CVContent | null>(null);
  const [matching, setMatching] = useState<{
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
  } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState<{
    noInvention: boolean;
    flaggedClaims: string[];
  } | null>(null);
  const [confidence, setConfidence] = useState<{
    overall: number;
    perDimension: { sourceQuality: number; offerMatch: number; noInvention: number };
    reasoning: string;
  } | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  // === Édition inline "à la Canva" sur le preview ===
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<CVOverrides>({});
  const displayed = useMemo(
    () => (generated ? applyOverrides(generated, overrides) : null),
    [generated, overrides],
  );
  const hasOverrides = Object.keys(overrides).length > 0;

  function handleInlineEdit(path: string, value: string) {
    setOverrides((prev) => {
      // Si l'utilisateur vide un champ → on retire l'override pour revert
      // à la valeur d'origine du CV généré (sinon le champ resterait vide
      // pour de bon en cas de clic + Tab accidentel).
      if (value === '') {
        const next = { ...prev };
        delete next[path];
        return next;
      }
      return { ...prev, [path]: value };
    });
  }
  function resetOverrides() {
    if (!hasOverrides) return;
    const ok = confirm(
      isEn ? 'Cancel all manual edits on this CV?' : 'Annuler toutes les modifications manuelles sur ce CV ?',
    );
    if (!ok) return;
    setOverrides({});
  }

  // === Suggestions IA pour skills manquantes ===
  type SkillSuggestion = {
    skill: string;
    verdict: 'strong' | 'plausible' | 'unsupported';
    reasoning: string;
    evidence: string[];
    suggested_category: string;
  };
  const [suggestions, setSuggestions] = useState<SkillSuggestion[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ignoredSkills, setIgnoredSkills] = useState<Set<string>>(new Set());
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  // Set des noms de skills (lowercased) présents dans le profil consultant,
  // utilisé pour afficher "Retirer" au lieu de "Ajouter" sur les suggestions
  // déjà ajoutées.
  const profileSkillNames = useMemo(
    () =>
      new Set(
        (loaded?.skills ?? []).map((s) => (s.name ?? '').trim().toLowerCase()),
      ),
    [loaded],
  );

  // (Consultants & offres sont chargés plus haut via useCachedQuery — SWR
  //  avec cache instantané, garde org, stale-on-empty + retry.)

  // Quand on sélectionne une offre existante, on pré-remplit les 3 champs
  function pickOffer(id: string) {
    setSelectedOfferId(id);
    if (!id) {
      setOfferTitle('');
      setOfferSkills('');
      setOfferDescription('');
      return;
    }
    const o = offers.find((x) => x.id === id);
    if (!o) return;
    setOfferTitle(o.title ?? '');
    const skills = [...(o.required_skills ?? []), ...(o.nice_to_have ?? [])];
    setOfferSkills(skills.join(', '));
    setOfferDescription(o.description ?? '');
  }

  // Auto-remplissage si ?offerId=... et que les offres sont chargées
  useEffect(() => {
    if (initialOfferId && offers.length > 0 && !offerTitle) {
      pickOffer(initialOfferId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers, initialOfferId]);

  useEffect(() => {
    if (!selectedId) {
      setLoaded(null);
      return;
    }
    setLoadingData(true);
    consultantService.getById(selectedId).then((res) => {
      if (res.data) setLoaded(res.data);
      else toast.error(isEn ? 'Could not load this consultant' : 'Impossible de charger ce consultant');
      setLoadingData(false);
    });
  }, [selectedId]);

  // QR code "carte de visite" de l'org. On précharge l'image en data URL :
  //   - si elle existe (file présent dans /public/brand/) → on l'affiche
  //     dans le preview ET on l'embarque dans le PDF sans aller-retour
  //     réseau côté react-pdf.
  //   - si 404 → on passe simplement undefined, aucun crash, pas de QR.
  // Le QR "carte de visite" est RÉSERVÉ à QuadCore (les comptes fondateurs).
  // Sur instruction : on ne le met PAS sur les CV des organisations clientes.
  // Statut vérifié côté serveur (getSuperAdminContext) via founder-status.
  const [isFounder, setIsFounder] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/founder-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!cancelled) setIsFounder(!!b?.data?.isFounder);
      })
      .catch(() => {
        if (!cancelled) setIsFounder(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [qrSrc, setQrSrc] = useState<string | null>(null);
  useEffect(() => {
    // Non-fondateur → jamais de QR (ni preview, ni PDF).
    if (!isFounder || !brand.qrCodeUrl || typeof window === 'undefined') {
      setQrSrc(null);
      return;
    }
    let cancelled = false;
    const url = new URL(brand.qrCodeUrl, window.location.origin).toString();
    fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled) setQrSrc(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        if (!cancelled) setQrSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [brand.qrCodeUrl, isFounder]);

  const parsedOffer: JobOffer | null = useMemo(() => {
    if (!offerTitle && !offerDescription && !offerSkills) return null;
    const skills = offerSkills
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: 'temp-offer',
      organization_id: '',
      company_id: null,
      contact_id: null,
      owner_id: null,
      title: offerTitle || 'Offre ad-hoc',
      description: offerDescription,
      required_skills: skills,
      nice_to_have: [],
      seniority: null,
      daily_rate_min: null,
      daily_rate_max: null,
      location: null,
      remote_days: null,
      start_date: null,
      duration_months: null,
      deadline: null,
      status: 'open',
      source_kind: null,
      source: null,
      context: null,
      mission_purpose: null,
      tasks: [],
      tech_stack: [],
      profile_requirements: [],
      working_conditions: [],
      contract_kind: null,
      show_rate: null,
      work_mode: null,
      work_mode_detail: null,
      start_type: null,
      start_label: null,
      experience_label: null,
      // Dates "epoch" stables : utilisées nulle part dans la logique de matching/
      // génération CV, mais le type JobOffer les requiert. Une vraie date
      // dynamique ferait regen le CV à chaque render.
      created_at: '1970-01-01T00:00:00.000Z',
      updated_at: '1970-01-01T00:00:00.000Z',
    };
  }, [offerTitle, offerDescription, offerSkills]);

  // Reset suggestions dès que consultant ou offre change (le contexte n'est plus valable)
  useEffect(() => {
    setSuggestions(null);
    setIgnoredSkills(new Set());
  }, [selectedId, offerTitle, offerDescription, offerSkills]);

  async function analyzeMissingSkills() {
    if (!loaded || !matching || matching.missingSkills.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/cv/skills/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: loaded.consultant.id,
          missingSkills: matching.missingSkills,
          offerContext: [offerTitle, offerDescription].filter(Boolean).join('\n\n'),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          toast.error(isEn ? 'AI service temporarily unavailable. Try again shortly.' : 'Service IA temporairement indisponible. Réessaie dans un instant.');
        } else if (res.status === 429) {
          toast.error(isEn ? 'Too many AI requests. Wait a few seconds before retrying.' : 'Trop de requêtes IA. Attends quelques secondes avant de relancer.');
        } else if (res.status === 401 || res.status === 403) {
          toast.error(isEn ? 'AI access denied. Check your connection or contact support.' : 'Accès IA refusé. Vérifie ta connexion ou contacte le support.');
        } else {
          const msg = body?.message ?? (isEn ? `Error ${res.status}` : `Erreur ${res.status}`);
          toast.error((isEn ? 'Analysis failed: ' : 'Analyse impossible : ') + msg);
        }
        return;
      }
      const data = (await res.json()) as { suggestions: SkillSuggestion[] };
      setSuggestions(data.suggestions);
      toast.success(isEn ? `🤖 ${data.suggestions.length} skills analyzed` : `🤖 ${data.suggestions.length} compétences analysées`);
    } catch (e) {
      toast.error((isEn ? 'AI analysis failed: ' : 'Analyse IA échouée : ') + (e instanceof Error ? e.message : isEn ? 'network error' : 'erreur réseau'));
    } finally {
      setAnalyzing(false);
    }
  }

  async function addSuggestedSkill(s: SkillSuggestion, force = false) {
    if (!loaded) {
      toast.error(isEn ? 'Select a consultant first' : 'Sélectionne d\'abord un consultant');
      return;
    }
    if (s.verdict === 'unsupported' && !force) {
      const ok = confirm(
        isEn
          ? `"${s.skill}" is not supported by any element of the profile.\nAdd it anyway (forced add)?`
          : `"${s.skill}" n'est étayée par aucun élément du profil.\nVeux-tu quand même l'ajouter (ajout forcé) ?`,
      );
      if (!ok) return;
    }
    setAddingSkill(s.skill);
    try {
      const res = await consultantService.addSkills(loaded.consultant.id, [
        {
          category: s.suggested_category || 'tools',
          name: s.skill,
          is_highlighted: false,
        },
      ]);
      if (res.error) {
        console.error('[addSuggestedSkill] addSkills error', res.error);
        toast.error((isEn ? 'Error: ' : 'Erreur : ') + (res.error.message ?? (isEn ? 'add failed' : 'ajout impossible')));
        return;
      }
      if (res.data === 0) {
        toast.info(isEn ? 'This skill is already in the profile.' : 'Cette compétence est déjà dans le profil.');
      } else {
        toast.success(isEn ? `✓ "${s.skill}" added to the consultant profile` : `✓ "${s.skill}" ajoutée au profil consultant`);
      }
      // Recharge le profil → le matching se recalcule automatiquement
      // et la suggestion bascule en "Retirer".
      const reload = await consultantService.getById(loaded.consultant.id);
      if (reload.data) setLoaded(reload.data);
    } catch (e) {
      console.error('[addSuggestedSkill] unexpected error', e);
      toast.error(
        (isEn ? 'Add failed: ' : 'Ajout impossible : ') + (e instanceof Error ? e.message : isEn ? 'unknown error' : 'erreur inconnue'),
      );
    } finally {
      setAddingSkill(null);
    }
  }

  async function removeSuggestedSkill(s: SkillSuggestion) {
    if (!loaded) return;
    setRemovingSkill(s.skill);
    try {
      const res = await consultantService.removeSkillByName(loaded.consultant.id, {
        name: s.skill,
        category: s.suggested_category || undefined,
      });
      if (res.error) {
        console.error('[removeSuggestedSkill] error', res.error);
        toast.error((isEn ? 'Error: ' : 'Erreur : ') + (res.error.message ?? (isEn ? 'remove failed' : 'suppression impossible')));
        return;
      }
      if ((res.data ?? 0) === 0) {
        toast.info(isEn ? 'No skill to remove (already absent from the profile).' : 'Aucune compétence à retirer (déjà absente du profil).');
      } else {
        toast.success(isEn ? `✓ "${s.skill}" removed from the consultant profile` : `✓ "${s.skill}" retirée du profil consultant`);
      }
      const reload = await consultantService.getById(loaded.consultant.id);
      if (reload.data) setLoaded(reload.data);
    } catch (e) {
      console.error('[removeSuggestedSkill] unexpected error', e);
      toast.error(
        (isEn ? 'Remove failed: ' : 'Suppression impossible : ') + (e instanceof Error ? e.message : isEn ? 'unknown error' : 'erreur inconnue'),
      );
    } finally {
      setRemovingSkill(null);
    }
  }

  function ignoreSuggestion(skill: string) {
    setIgnoredSkills((prev) => new Set(prev).add(skill));
  }

  // Dès que le consultant, l'offre ou le template change, les overrides
  // manuels précédents ne sont plus cohérents (ids d'expériences, textes
  // régénérés…). On les efface pour repartir propre.
  useEffect(() => {
    setOverrides({});
  }, [selectedId, templateId, parsedOffer?.title, parsedOffer?.required_skills?.join('|')]);

  // Auto-preview : dès que consultant chargé + template changent
  useEffect(() => {
    if (!loaded) {
      setGenerated(null);
      setMatching(null);
      setWarnings([]);
      setGuardrails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await generateCVContent({
          consultant: loaded.consultant,
          skills: loaded.skills,
          experiences: loaded.experiences,
          educations: loaded.educations,
          jobOffer: parsedOffer,
          templateId,
        });
        if (cancelled) return;
        setGenerated(result.content);
        setMatching(result.matching);
        setWarnings(result.warnings);
        setGuardrails(result.guardrails);
        setConfidence(result.confidence);
      } catch (e) {
        if (!cancelled) toast.error(isEn ? 'Generation error' : 'Erreur de génération');
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, parsedOffer, templateId]);

  async function handleDownloadPDF() {
    if (!displayed || !loaded) {
      toast.error(isEn ? 'No CV to export' : 'Aucun CV à exporter');
      return;
    }
    setExporting('pdf');
    try {
      const fn = loaded.consultant.first_name ?? '';
      const ln = loaded.consultant.last_name ?? '';
      const safeName = `${fn}_${ln}`.replace(/[^a-zA-Z0-9_-]/g, '') || 'consultant';
      const logoSrc = brand?.logoUrl ?? `${window.location.origin}/brand/quadcore-logo-dark.png`;
      const brandSlug = (brand?.brandName ?? 'CV').replace(/[^a-zA-Z0-9_-]/g, '') || 'CV';
      await exportCVToPdf(displayed, {
        filename: `CV_${brandSlug}_${safeName}`,
        templateId,
        logoSrc,
        brand,
        qrSrc: qrSrc ?? undefined,
      });
      toast.success(isEn ? 'PDF downloaded' : 'PDF téléchargé');
    } catch (e) {
      console.error(e);
      toast.error(
        (isEn ? 'PDF export error: ' : 'Erreur export PDF : ') + (e instanceof Error ? e.message : isEn ? 'unknown' : 'inconnue'),
      );
    } finally {
      setExporting(null);
    }
  }

  async function handleDownloadDOCX() {
    if (!displayed || !loaded) {
      toast.error(isEn ? 'No CV to export' : 'Aucun CV à exporter');
      return;
    }
    setExporting('docx');
    try {
      const blob = await generateCVDocx(displayed, { brand });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fn = loaded.consultant.first_name ?? '';
      const ln = loaded.consultant.last_name ?? '';
      const safeName = `${fn}_${ln}`.replace(/[^a-zA-Z0-9_-]/g, '') || 'consultant';
      const brandSlug = (brand?.brandName ?? 'CV').replace(/[^a-zA-Z0-9]/g, '') || 'CV';
      a.download = `CV_${brandSlug}_${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(isEn ? 'DOCX downloaded' : 'DOCX téléchargé');
    } catch (e) {
      console.error(e);
      toast.error(isEn ? 'DOCX export error' : 'Erreur export DOCX');
    } finally {
      setExporting(null);
    }
  }

  const hasIncompleteData =
    loaded &&
    (loaded.skills.length === 0 ||
      loaded.experiences.length === 0 ||
      !loaded.consultant.summary);

  return (
    <AppShell>
      <div className="no-print">
        <PageHeader
          eyebrow={t.pages.cv_optimizer.eyebrow}
          title={
            <>
              {t.pages.cv_optimizer.title_a}{' '}
              <span className="qc-italic-accent font-editorial italic">{t.pages.cv_optimizer.title_b}</span>
            </>
          }
          description={t.pages.cv_optimizer.description}
          actions={
            <>
              <Button
                onClick={() => setEditMode((v) => !v)}
                disabled={!generated}
                title={editMode ? t.pages.cv_optimizer.stop_editing : t.pages.cv_optimizer.edit_cv}
                className={
                  editMode
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_-6px_rgba(16,185,129,0.7)]'
                    : 'bg-gradient-to-r from-violet-glow to-magenta text-white shadow-[0_0_20px_-6px_rgba(225,29,116,0.55)] hover:brightness-110'
                }
              >
                <Pencil className="h-4 w-4" />
                {editMode ? `✓ ${t.pages.cv_optimizer.stop_editing}` : t.pages.cv_optimizer.edit_cv}
              </Button>
              {hasOverrides && (
                <Button variant="outline" onClick={resetOverrides} title={t.actions.cancel}>
                  <RotateCcw className="h-4 w-4" />
                  {t.actions.cancel}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDownloadDOCX}
                disabled={!generated || exporting !== null}
              >
                {exporting === 'docx' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {t.pages.cv_optimizer.export_word}
              </Button>
              <Button onClick={handleDownloadPDF} disabled={!generated || exporting !== null}>
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t.pages.cv_optimizer.export_pdf}
              </Button>
            </>
          }
        />
      </div>

      {editMode && hasOverrides && (() => {
        const n = Object.keys(overrides).length;
        const plural = n > 1;
        return (
          <div className="no-print mb-3 text-[11px] text-violet-600 dark:text-violet-300/80">
            {isEn
              ? `${n} manual edit${plural ? 's' : ''} applied — ${plural ? 'they' : 'it'} will be included in the export.`
              : `${n} modification${plural ? 's' : ''} manuelle${plural ? 's' : ''} appliquée${plural ? 's' : ''} — elle${plural ? 's' : ''} ser${plural ? 'ont' : 'a'} incluse${plural ? 's' : ''} dans l'export.`}
          </div>
        );
      })()}

      <div className="no-print grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        {/* Sidebar config */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-4"
        >
          <AppCard variant="luminous" tone="magenta">
            <div className="p-5 space-y-3">
              <div className="text-base font-display tracking-tight flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-magenta/20 text-magenta-neon text-xs font-bold">
                  1
                </span>
                {t.pages.cv_optimizer.consultant_label}
              </div>
              <ConsultantCombobox
                consultants={consultants}
                value={selectedId}
                onChange={setSelectedId}
                placeholder="— —"
                ariaLabel={t.pages.cv_optimizer.consultant_label}
                minPanelWidth={560}
              />

              {loadingData && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t.actions.loading}
                </p>
              )}

              {loaded && !loadingData && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Skills" value={loaded.skills.length} />
                  <Stat label="XP" value={loaded.experiences.length} />
                  <Stat label="Education" value={loaded.educations.length} />
                </div>
              )}
            </div>
          </AppCard>

          <Card className="qc-premium rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-glow/30 bg-violet-glow/15 text-violet-glow text-xs font-bold">
                  2
                </span>
                {t.pages.cv_optimizer.template_label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Combobox
                ariaLabel={isEn ? 'CV template' : 'Modèle de CV'}
                value={templateId}
                onChange={(v) => handleTemplateChange(v as CVTemplateId)}
                options={[
                  { value: 'standard', label: CV_TEMPLATE_LABEL.standard },
                  { value: 'dense', label: CV_TEMPLATE_LABEL.dense },
                  { value: 'executive', label: CV_TEMPLATE_LABEL.executive },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="qc-premium rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-glow/30 bg-violet-glow/15 text-violet-glow text-xs font-bold">
                  3
                </span>
                {t.pages.cv_optimizer.offer_label}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.pages.cv_optimizer.offer_hint}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t.pages.cv_optimizer.pick_existing}</Label>
                <Combobox
                  ariaLabel={t.pages.cv_optimizer.pick_existing}
                  value={selectedOfferId}
                  onChange={(v) => pickOffer(v)}
                  className="mt-1"
                  placeholder={t.pages.cv_optimizer.manual_entry}
                  minPanelWidth={560}
                  options={[
                    { value: '', label: t.pages.cv_optimizer.manual_entry },
                    ...offers.map((o) => ({
                      value: o.id,
                      label: o.title,
                      sublabel:
                        o.required_skills?.length > 0
                          ? `${o.required_skills.slice(0, 3).join(', ')}${o.required_skills.length > 3 ? '…' : ''}`
                          : undefined,
                    })),
                  ]}
                />
              </div>

              <div>
                <Label className="text-xs">{t.pages.cv_optimizer.job_title}</Label>
                <input
                  className="flex h-9 w-full rounded-md border border-hairline surface-1 px-3 py-2 text-sm mt-1"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder={isEn ? 'e.g. QA Automation Senior' : 'ex: QA Automation Senior'}
                />
              </div>
              <div>
                <Label className="text-xs">{t.pages.cv_optimizer.required_skills}</Label>
                <Textarea
                  className="mt-1 min-h-[70px] text-xs"
                  value={offerSkills}
                  onChange={(e) => setOfferSkills(e.target.value)}
                  placeholder="Playwright, TypeScript, Postman, SQL"
                />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  + {t.pages.cv_optimizer.full_description}
                </summary>
                <Textarea
                  className="mt-2 min-h-[90px] text-xs"
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  placeholder="…"
                />
              </details>
            </CardContent>
          </Card>

          {matching && parsedOffer && (
            <Card className="qc-premium rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-magenta/30 bg-magenta/10 text-magenta-neon">
                    <Target className="h-3.5 w-3.5" />
                  </span>
                  Matching
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-display qc-gradient-text">
                    <AnimatedNumber value={matching.score} />
                  </span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
                {/* Jauge de score animée — lecture immédiate du niveau de match. */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
                  <motion.div
                    className="h-full rounded-full bg-magenta dark:bg-gradient-to-r dark:from-violet-glow dark:to-magenta-neon"
                    initial={false}
                    animate={{ width: `${matching.score}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                  />
                </div>
                {matching.matchedSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      {isEn ? 'Matched' : 'Matchées'} ({matching.matchedSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {matching.matchedSkills.map((s) => (
                        <Badge key={s} variant="success" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {matching.missingSkills.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {isEn ? 'Missing' : 'Manquantes'} ({matching.missingSkills.length})
                      </p>
                      {!suggestions && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={analyzeMissingSkills}
                          disabled={analyzing || !loaded}
                          title={isEn ? 'The AI examines the profile to see if these skills are plausibly held' : "L'IA examine le profil pour voir si ces compétences sont plausiblement détenues"}
                        >
                          {analyzing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {analyzing ? (isEn ? 'Analyzing…' : 'Analyse…') : isEn ? 'Analyze with AI' : 'Analyser avec l\'IA'}
                        </Button>
                      )}
                    </div>

                    {!suggestions ? (
                      <div className="flex flex-wrap gap-1">
                        {matching.missingSkills.map((s) => (
                          <Badge key={s} variant="warning" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {suggestions
                          .filter((s) => !ignoredSkills.has(s.skill))
                          .map((s) => {
                            const verdictStyle =
                              s.verdict === 'strong'
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : s.verdict === 'plausible'
                                  ? 'border-amber-500/30 bg-amber-500/5'
                                  : 'border-slate-500/30 bg-slate-500/5';
                            const VerdictIcon =
                              s.verdict === 'strong'
                                ? CheckCircle2
                                : s.verdict === 'plausible'
                                  ? HelpCircle
                                  : MinusCircle;
                            const verdictColor =
                              s.verdict === 'strong'
                                ? 'text-emerald-400'
                                : s.verdict === 'plausible'
                                  ? 'text-amber-400'
                                  : 'text-slate-400';
                            const verdictLabel =
                              s.verdict === 'strong'
                                ? isEn ? 'Strong' : 'Fort'
                                : s.verdict === 'plausible'
                                  ? 'Plausible'
                                  : isEn ? 'Unsupported' : 'Non étayé';
                            return (
                              <div
                                key={s.skill}
                                className={`rounded-md border p-2 text-xs ${verdictStyle}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <VerdictIcon className={`h-3.5 w-3.5 shrink-0 ${verdictColor}`} />
                                    <span className="font-semibold truncate">{s.skill}</span>
                                    <span
                                      className={`text-[9px] uppercase tracking-wider ${verdictColor}`}
                                    >
                                      {verdictLabel}
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                                  {s.reasoning}
                                </p>
                                {s.evidence.length > 0 && (
                                  <ul className="mt-1 text-[10px] text-muted-foreground/80 space-y-0.5">
                                    {s.evidence.slice(0, 3).map((ev, i) => (
                                      <li key={i} className="pl-2 border-l border-hairline">
                                        {ev}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <div className="mt-2 flex gap-1 flex-wrap">
                                  {profileSkillNames.has(s.skill.trim().toLowerCase()) ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] px-2 border-red-500/40 text-red-300 hover:bg-red-500/10"
                                      onClick={() => removeSuggestedSkill(s)}
                                      disabled={removingSkill === s.skill}
                                      title={isEn ? 'Remove this skill from the consultant profile' : 'Retirer cette compétence du profil consultant'}
                                    >
                                      {removingSkill === s.skill ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      {isEn ? 'Remove from profile' : 'Retirer du profil'}
                                    </Button>
                                  ) : s.verdict !== 'unsupported' ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] px-2"
                                      onClick={() => addSuggestedSkill(s)}
                                      disabled={addingSkill === s.skill}
                                    >
                                      {addingSkill === s.skill ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Plus className="h-3 w-3" />
                                      )}
                                      {isEn ? 'Add to profile' : 'Ajouter au profil'}
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] px-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                      onClick={() => addSuggestedSkill(s, true)}
                                      disabled={addingSkill === s.skill}
                                      title={isEn ? 'Add despite the lack of evidence in the profile' : "Ajouter malgré l'absence d'évidence dans le profil"}
                                    >
                                      {addingSkill === s.skill ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Plus className="h-3 w-3" />
                                      )}
                                      {isEn ? 'Force add' : 'Forcer l\'ajout'}
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 text-muted-foreground"
                                    onClick={() => ignoreSuggestion(s.skill)}
                                  >
                                    <X className="h-3 w-3" />
                                    {isEn ? 'Ignore' : 'Ignorer'}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        {suggestions.filter((s) => !ignoredSkills.has(s.skill)).length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic">
                            {isEn ? 'All suggestions have been handled.' : 'Toutes les suggestions ont été traitées.'}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2 w-full text-muted-foreground"
                          onClick={() => {
                            setSuggestions(null);
                            setIgnoredSkills(new Set());
                          }}
                        >
                          {isEn ? 'Reset' : 'Réinitialiser'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {confidence && generated && (
            <Card className="border-violet-glow/30 bg-gradient-to-br from-violet-glow/5 to-magenta/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-violet-300 font-semibold">
                      {isEn ? 'AI confidence level' : 'Niveau de confiance IA'}
                    </div>
                    <div className="font-display text-3xl font-bold qc-gradient-text">
                      {confidence.overall}%
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                    {isEn ? 'Draft' : 'Brouillon'}
                  </span>
                </div>
                <div className="space-y-2 mb-3">
                  {[
                    { label: isEn ? 'Source quality' : 'Qualité de la source', value: confidence.perDimension.sourceQuality },
                    { label: isEn ? 'Match with the offer' : 'Match avec l’offre', value: confidence.perDimension.offerMatch },
                    { label: isEn ? 'No fabrication' : 'Aucune invention', value: confidence.perDimension.noInvention },
                  ].map((d) => (
                    <div key={d.label}>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-0.5">
                        <span>{d.label}</span>
                        <span className="font-mono">{d.value}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-foreground/[0.07] overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-violet-glow to-magenta"
                          initial={{ width: 0 }}
                          animate={{ width: `${d.value}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  {confidence.reasoning}
                </p>
              </CardContent>
            </Card>
          )}

          {guardrails && generated && (
            <Card className={guardrails.noInvention ? '' : 'border-red-500/30'}>
              <CardContent className="p-3 flex items-start gap-2">
                {guardrails.noInvention ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-xs">
                  <p className="font-semibold">
                    {guardrails.noInvention
                      ? isEn ? 'No fabrication detected' : 'Aucune invention détectée'
                      : isEn ? 'Fabrication detected' : 'Invention détectée'}
                  </p>
                  {!guardrails.noInvention && (
                    <ul className="mt-1 space-y-0.5 text-red-300">
                      {guardrails.flaggedClaims.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {warnings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-400" /> {isEn ? 'Warnings' : 'Avertissements'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                {warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.aside>

        {/* Preview CV */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
        >
          {!loaded ? (
            <Card>
              <CardContent className="py-24 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">{t.pages.cv_optimizer.empty_title}</p>
                <p className="text-xs mt-1">{t.pages.cv_optimizer.empty_description}</p>
              </CardContent>
            </Card>
          ) : hasIncompleteData && generated ? (
            <>
              <Card className="mb-4 border-amber-500/30">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">{isEn ? 'Incomplete data for this consultant' : 'Données incomplètes pour ce consultant'}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {loaded.skills.length === 0 && (isEn ? '• No skill filled in. ' : '• Aucune compétence renseignée. ')}
                      {loaded.experiences.length === 0 && (isEn ? '• No experience filled in. ' : '• Aucune expérience renseignée. ')}
                      {!loaded.consultant.summary && (isEn ? '• No executive summary. ' : '• Aucun résumé exécutif. ')}
                      {isEn
                        ? 'The CV will look minimal. Complete the consultant record for a full rendering.'
                        : 'Le CV apparaîtra minimal. Complète la fiche consultant pour un rendu complet.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <EditModeBanner editMode={editMode} setEditMode={setEditMode} />
              <div className="overflow-auto bg-neutral-200 dark:bg-neutral-800 p-6 rounded-2xl border border-hairline">
                <CVPreviewBoundary onReset={resetOverrides}>
                  <CVRenderer
                    content={displayed ?? generated}
                    templateId={templateId}
                    editable={editMode}
                    onEdit={handleInlineEdit}
                    qrSrc={qrSrc}
                  />
                </CVPreviewBoundary>
              </div>
            </>
          ) : generated ? (
            <>
              <EditModeBanner editMode={editMode} setEditMode={setEditMode} />
              <div className="overflow-auto bg-neutral-200 dark:bg-neutral-800 p-6 rounded-2xl border border-hairline">
                <CVPreviewBoundary onReset={resetOverrides}>
                  <CVRenderer
                    content={displayed ?? generated}
                    templateId={templateId}
                    editable={editMode}
                    onEdit={handleInlineEdit}
                    qrSrc={qrSrc}
                  />
                </CVPreviewBoundary>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </CardContent>
            </Card>
          )}
        </motion.section>
      </div>

      {/* Version imprimable plein écran (Ctrl+P natif, export via React-PDF). */}
      <div className="print-only hidden print:block">
        {displayed && (
          <CVRenderer content={displayed} templateId={templateId} qrSrc={qrSrc} />
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={`rounded-lg border border-hairline surface-1 px-2 py-1.5 ${
        value === 0 ? 'border-amber-500/30' : ''
      }`}
    >
      <div className="text-base font-display font-semibold">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function EditModeBanner({
  editMode,
  setEditMode,
}: {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  if (editMode) {
    return (
      <div className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] px-4 py-3">
        <MousePointerClick className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <div className="font-semibold text-emerald-200">{isEn ? 'Edit mode enabled' : 'Mode édition activé'}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? 'Click any text in the CV to edit it directly (title, summary, experiences, skills). Press Enter to confirm, or click elsewhere. Your changes are saved automatically.'
              : "Clique sur n'importe quel texte du CV pour le modifier directement (titre, résumé, expériences, compétences). Tape Entrée pour valider, ou clique ailleurs. Tes modifications sont sauvegardées automatiquement."}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditMode(false)}
          className="shrink-0"
        >
          {isEn ? 'Exit' : 'Sortir'}
        </Button>
      </div>
    );
  }
  return (
    <div className="mb-3 flex items-start gap-3 rounded-lg border border-violet-glow/30 bg-violet-glow/[0.06] px-4 py-3">
      <Sparkles className="h-4 w-4 text-violet-glow shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-semibold">{isEn ? 'Edit your CV like in Canva' : 'Modifie ton CV comme dans Canva'}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEn
            ? 'Enable edit mode to click directly on the CV text and edit it inline. Ideal to tweak a title, reword a mission or rework a summary without going back to the consultant record.'
            : 'Active le mode édition pour cliquer directement sur le texte du CV et le modifier inline. Idéal pour ajuster un titre, reformuler une mission ou retravailler un résumé sans repasser par la fiche consultant.'}
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => setEditMode(true)}
        className="shrink-0 bg-gradient-to-r from-violet-glow to-magenta text-white shadow-[0_0_18px_-6px_rgba(225,29,116,0.55)] hover:brightness-110"
      >
        <Pencil className="h-3.5 w-3.5" />
        {isEn ? 'Enable' : 'Activer'}
      </Button>
    </div>
  );
}
