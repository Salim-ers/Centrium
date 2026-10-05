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
import { Segmented } from '@/components/app/Segmented';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/app';
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
import { DOSSIER_TEMPLATES, isDossierTemplateId, type DossierTemplateId } from '@/lib/cv/templates';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type {
  Consultant,
  ConsultantSkill,
  ConsultantExperience,
  ConsultantEducation,
  CVContent,
  JobOffer,
} from '@/types';

type Zoom = '50' | '75' | '100' | 'width' | 'page';

/** Page A4 à 96 ppp (210 × 297 mm). */
const PAGE_W = 793.7;
const PAGE_H = 1122.5;

type LoadedConsultant = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

/**
 * Atelier « Dossier de compétences » : génère, à partir des seules données
 * du profil, un dossier standard, dense, executive ou adapté à une
 * opportunité, avec export PDF et DOCX. Rien n'est inventé : le moteur
 * reformule et priorise, il n'ajoute ni expérience, ni compétence, ni date.
 */
export function SkillsDossierStudio({ lockedConsultantId }: { lockedConsultantId?: string }) {
  return (
    <Suspense fallback={null}>
      <SkillsDossierStudioInner lockedConsultantId={lockedConsultantId} />
    </Suspense>
  );
}

function SkillsDossierStudioInner({ lockedConsultantId }: { lockedConsultantId?: string }) {
  const params = useSearchParams();
  const initialId = lockedConsultantId ?? params?.get('consultantId') ?? '';
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

  const [templateId, setTemplateId] = useState<DossierTemplateId>('standard');
  // Tant que l'utilisateur n'a pas explicitement changé le template, on suit le
  // défaut configuré par l'organisation dans /settings/branding.
  // Choix manuel persisté en localStorage pour survivre aux F5.
  const TEMPLATE_LS_KEY = 'qc-cv-optimizer-template';
  const templateTouchedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(TEMPLATE_LS_KEY);
    if (isDossierTemplateId(stored)) {
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
  const handleTemplateChange = (value: DossierTemplateId) => {
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

  const [zoom, setZoom] = useState<Zoom>('width');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setCanvas({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
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
          // Le contenu ne dépend pas de la mise en page ; Minimal partage celui de Consulting.
          templateId: templateId === 'minimal' ? 'standard' : templateId,
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
      const logoSrc = brand.logoUrl ?? undefined;
      const brandSlug = (brand.brandName || 'Dossier').replace(/[^a-zA-Z0-9_-]/g, '') || 'Dossier';
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

  const zoomScale =
    zoom === 'width'
      ? Math.max(0.3, Math.min(1.5, (canvas.w - 48) / PAGE_W))
      : zoom === 'page'
        ? Math.max(0.2, Math.min((canvas.w - 48) / PAGE_W, (canvas.h - 48) / PAGE_H))
        : Number(zoom) / 100;
  const doc = displayed ?? generated;

  return (
    <AppShell fill>
      <div className="no-print flex min-h-0 flex-1 flex-col">
        <PageHeader
          backHref={lockedConsultantId ? `/consultants/${lockedConsultantId}` : undefined}
          backLabel={lockedConsultantId && loaded ? `${loaded.consultant.first_name} ${loaded.consultant.last_name}` : undefined}
          title={isEn ? 'Skills dossier' : 'Dossier de compétences'}
          description={
            isEn
              ? 'Consultant, template, optional client need, preview, export. Built only from the profile: nothing is invented.'
              : 'Consultant, modèle, besoin client si besoin, aperçu, export. Construit uniquement à partir du profil : rien n’est inventé.'
          }
          actions={
            <>
              <Button onClick={() => setEditMode((v) => !v)} disabled={!generated} variant={editMode ? 'primary' : 'secondary'}>
                <Pencil className="h-4 w-4" />
                {editMode ? (isEn ? 'Done' : 'Terminer') : isEn ? 'Edit text' : 'Retoucher'}
              </Button>
              {hasOverrides && (
                <Button variant="ghost" onClick={resetOverrides} title={t.actions.cancel}>
                  <RotateCcw className="h-4 w-4" />
                  {isEn ? 'Undo edits' : 'Annuler les retouches'}
                </Button>
              )}
              <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
              <Button variant="secondary" onClick={handleDownloadDOCX} disabled={!generated || exporting !== null}>
                {exporting === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Word
              </Button>
              <Button onClick={handleDownloadPDF} disabled={!generated || exporting !== null}>
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isEn ? 'Export PDF' : 'Exporter en PDF'}
              </Button>
            </>
          }
        />

        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
          {/* Réglages : consultant, modèle, besoin client, contrôles. */}
          <aside className="no-scrollbar space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pb-2">
            {!lockedConsultantId && (
              <section className="tile-surface space-y-3 p-4">
                <StepTitle n={1}>{t.pages.cv_optimizer.consultant_label}</StepTitle>
                <ConsultantCombobox consultants={consultants} value={selectedId} onChange={setSelectedId} placeholder="— —" ariaLabel={t.pages.cv_optimizer.consultant_label} minPanelWidth={480} />
                {loadingData && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t.actions.loading}
                  </p>
                )}
                {loaded && !loadingData && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat label={isEn ? 'Skills' : 'Compétences'} value={loaded.skills.length} />
                    <Stat label={isEn ? 'Missions' : 'Missions'} value={loaded.experiences.length} />
                    <Stat label={isEn ? 'Education' : 'Formation'} value={loaded.educations.length} />
                  </div>
                )}
              </section>
            )}

            <section className="tile-surface p-4">
              <StepTitle n={lockedConsultantId ? 1 : 2}>{isEn ? 'Template' : 'Modèle'}</StepTitle>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DOSSIER_TEMPLATES.map((tpl) => {
                  const on = tpl.id === templateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tpl.id)}
                      aria-pressed={on}
                      className={cn(
                        'rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50',
                        on ? 'border-app-terra bg-app-peach-light' : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <TemplateThumb id={tpl.id} color={brand.primary} />
                      <span className="mt-2 flex items-baseline gap-1.5">
                        <span className="num text-[10.5px] font-semibold text-muted-foreground">{tpl.number}</span>
                        <span className="text-[13px] font-semibold">{tpl.name}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{tpl.description[isEn ? 'en' : 'fr']}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="tile-surface space-y-3 p-4">
              <div>
                <StepTitle n={lockedConsultantId ? 2 : 3}>{isEn ? 'Client need (optional)' : 'Besoin client (optionnel)'}</StepTitle>
                <p className="mt-1 text-xs text-muted-foreground">{t.pages.cv_optimizer.offer_hint}</p>
              </div>
              <Combobox
                ariaLabel={t.pages.cv_optimizer.pick_existing}
                value={selectedOfferId}
                onChange={(v) => pickOffer(v)}
                placeholder={t.pages.cv_optimizer.manual_entry}
                minPanelWidth={480}
                options={[
                  { value: '', label: t.pages.cv_optimizer.manual_entry },
                  ...offers.map((o) => ({
                    value: o.id,
                    label: o.title,
                    sublabel: o.required_skills?.length > 0 ? `${o.required_skills.slice(0, 3).join(', ')}${o.required_skills.length > 3 ? '…' : ''}` : undefined,
                  })),
                ]}
              />
              <div>
                <Label className="text-xs">{t.pages.cv_optimizer.job_title}</Label>
                <Input className="mt-1" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder={isEn ? 'e.g. Senior QA Automation' : 'ex. QA Automation senior'} />
              </div>
              <div>
                <Label className="text-xs">{t.pages.cv_optimizer.required_skills}</Label>
                <Textarea className="mt-1 min-h-[64px] text-xs" value={offerSkills} onChange={(e) => setOfferSkills(e.target.value)} placeholder="Playwright, TypeScript, Postman, SQL" />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">+ {t.pages.cv_optimizer.full_description}</summary>
                <Textarea className="mt-2 min-h-[90px] text-xs" value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} placeholder="…" />
              </details>
            </section>

            {matching && parsedOffer && (
              <Card className="tile-surface rounded-[20px] border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                      <Target className="h-3.5 w-3.5" />
                    </span>
                    Matching
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold font-display text-primary">
                      <AnimatedNumber value={matching.score} />
                    </span>
                    <span className="text-muted-foreground">/ 100</span>
                  </div>
                  {/* Jauge de score animée — lecture immédiate du niveau de match. */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-primary "
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
                                  ? 'border-success/30 bg-success/5'
                                  : s.verdict === 'plausible'
                                    ? 'border-warning/30 bg-warning/5'
                                    : 'border-border bg-muted';
                              const VerdictIcon =
                                s.verdict === 'strong'
                                  ? CheckCircle2
                                  : s.verdict === 'plausible'
                                    ? HelpCircle
                                    : MinusCircle;
                              const verdictColor =
                                s.verdict === 'strong'
                                  ? 'text-success'
                                  : s.verdict === 'plausible'
                                    ? 'text-warning'
                                    : 'text-muted-foreground';
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
                                        className="h-6 text-[10px] px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
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
                                        className="h-6 text-[10px] px-2 border-warning/40 text-warning hover:bg-warning/10"
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
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                        {isEn ? 'AI confidence level' : 'Niveau de confiance IA'}
                      </div>
                      <div className="font-display text-3xl font-bold text-primary">
                        {confidence.overall}%
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-warning/30 bg-warning/10 text-[10px] uppercase tracking-wider text-warning font-semibold">
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
                            className="h-full bg-gradient-to-r from-primary to-primary"
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
              <Card className={guardrails.noInvention ? '' : 'border-destructive/30'}>
                <CardContent className="p-3 flex items-start gap-2">
                  {guardrails.noInvention ? (
                    <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <p className="font-semibold">
                      {guardrails.noInvention
                        ? isEn ? 'No fabrication detected' : 'Aucune invention détectée'
                        : isEn ? 'Fabrication detected' : 'Invention détectée'}
                    </p>
                    {!guardrails.noInvention && (
                      <ul className="mt-1 space-y-0.5 text-destructive">
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
                    <AlertTriangle className="h-3 w-3 text-warning" /> {isEn ? 'Warnings' : 'Avertissements'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  {warnings.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Aperçu zoomable : le document tient dans l'écran. */}
          <section className="tile-surface flex min-h-[70vh] flex-col overflow-hidden lg:min-h-0">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <StepTitle n={lockedConsultantId ? 3 : 4}>{isEn ? 'Preview' : 'Aperçu'}</StepTitle>
              <div className="flex flex-wrap items-center gap-2">
                {editMode && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-app-peach-light px-2.5 py-1 text-[12px] font-medium text-app-terra-dark">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {isEn ? 'Click a text to edit it' : 'Cliquez un texte pour le retoucher'}
                    {hasOverrides ? ` · ${Object.keys(overrides).length}` : ''}
                  </span>
                )}
                <Segmented<Zoom>
                  label={isEn ? 'Zoom' : 'Zoom'}
                  value={zoom}
                  onChange={setZoom}
                  options={[
                    { value: '50', label: '50 %' },
                    { value: '75', label: '75 %' },
                    { value: '100', label: '100 %' },
                    { value: 'width', label: isEn ? 'Fit width' : 'Largeur', title: isEn ? 'Fit to width' : 'Ajuster à la largeur' },
                    { value: 'page', label: isEn ? 'Fit page' : 'Page', title: isEn ? 'Whole page' : 'Page entière' },
                  ]}
                />
              </div>
            </div>
            <div ref={canvasRef} className="min-h-0 flex-1 overflow-auto bg-app-sand/50">
              {!loaded ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center text-muted-foreground">
                  <FileText className="mb-3 h-10 w-10 opacity-30" />
                  <p className="font-medium text-foreground">{t.pages.cv_optimizer.empty_title}</p>
                  <p className="mt-1 max-w-sm text-xs">{t.pages.cv_optimizer.empty_description}</p>
                </div>
              ) : !doc ? (
                <div className="flex h-full min-h-[320px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-6">
                  {hasIncompleteData && (
                    <p className="mx-auto mb-4 flex max-w-[700px] items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[12.5px] text-warning">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {loaded.skills.length === 0 && (isEn ? 'No skill filled in. ' : 'Aucune compétence renseignée. ')}
                        {loaded.experiences.length === 0 && (isEn ? 'No experience filled in. ' : 'Aucune expérience renseignée. ')}
                        {!loaded.consultant.summary && (isEn ? 'No summary. ' : 'Aucun résumé. ')}
                        {isEn ? 'Complete the consultant record for a full dossier.' : 'Complétez la fiche consultant pour un dossier complet.'}
                      </span>
                    </p>
                  )}
                  <div className="mx-auto w-fit" style={{ zoom: zoomScale }}>
                    <CVPreviewBoundary onReset={resetOverrides}>
                      <CVRenderer content={doc} templateId={templateId} editable={editMode} onEdit={handleInlineEdit} qrSrc={qrSrc} brand={brand} />
                    </CVPreviewBoundary>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Version imprimable plein écran (Ctrl+P natif ; l'export PDF passe par React-PDF). */}
      <div className="print-only hidden print:block">{displayed && <CVRenderer content={displayed} templateId={templateId} qrSrc={qrSrc} brand={brand} />}</div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={`rounded-lg border border-hairline surface-1 px-2 py-1.5 ${
        value === 0 ? 'border-warning/30' : ''
      }`}
    >
      <div className="text-base font-display font-semibold">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
      <span className="num inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-terra text-[11px] font-bold text-white">{n}</span>
      {children}
    </h2>
  );
}

/** Vignette schématique d'un modèle (structure seulement). */
function TemplateThumb({ id, color }: { id: DossierTemplateId; color: string }) {
  const line = (w: string, strong = false) => <span className={cn('block h-[3px] rounded-full', strong ? 'bg-foreground/40' : 'bg-foreground/15')} style={{ width: w }} />;
  return (
    <span className="flex h-14 overflow-hidden rounded-md border border-border bg-white p-1.5" aria-hidden>
      {id === 'standard' ? (
        <>
          <span className="mr-1.5 w-[34%] space-y-1 rounded-sm p-1" style={{ background: `${color}14` }}>
            {line('80%', true)}
            {line('60%')}
            {line('70%')}
          </span>
          <span className="flex-1 space-y-1 pt-1">
            {line('90%')}
            {line('75%')}
            {line('85%')}
            {line('60%')}
          </span>
        </>
      ) : id === 'executive' ? (
        <span className="flex-1 space-y-1">
          <span className="block h-[5px] w-[60%] rounded-full bg-foreground/45" />
          <span className="block h-[2px] w-[22%] rounded-full" style={{ background: color }} />
          {line('92%')}
          {line('85%')}
          {line('70%')}
        </span>
      ) : id === 'dense' ? (
        <span className="flex-1 space-y-[3px]">
          <span className="block h-[2px] w-full rounded-full" style={{ background: color }} />
          {line('95%', true)}
          {line('90%')}
          {line('92%')}
          {line('88%')}
          {line('94%')}
          {line('80%')}
        </span>
      ) : (
        <span className="flex-1 space-y-1.5 px-1">
          {line('45%', true)}
          {line('30%')}
          {line('80%')}
          {line('65%')}
        </span>
      )}
    </span>
  );
}
