'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpRight, Download, FileDown, FolderOpen, Loader2, Pencil, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { SectionTabs } from '@/components/layout/SectionTabs';
import { PageHeader } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/Combobox';
import { ConsultantCombobox } from '@/components/ui/ConsultantCombobox';
import { showBrandToast } from '@/components/ui/BrandToast';
import { CVRenderer } from '@/components/cv/CVRenderer';
import { ContentPanel } from '@/components/cv/studio/ContentPanel';
import { DossierCanvas } from '@/components/cv/studio/DossierCanvas';
import { FitPanel } from '@/components/cv/studio/FitPanel';
import { MissingSkillsAssistant } from '@/components/cv/studio/MissingSkillsAssistant';
import { StylePanel } from '@/components/cv/studio/StylePanel';
import { VersionsPanel } from '@/components/cv/studio/VersionsPanel';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { createClient } from '@/lib/supabase/client';
import { consultantService } from '@/lib/services/consultant.service';
import { cvService } from '@/lib/services/cv.service';
import { jobOfferService } from '@/lib/services';
import { generateCVContent } from '@/lib/ai/cv-generator';
import { exportCVToPdf } from '@/lib/cv/export-pdf';
import { applyOverrides, type CVOverrides } from '@/lib/cv/overrides';
import { resolveBrand } from '@/lib/cv/branding';
import { DEFAULT_LAYOUT, applyLayout, materialize, normalizeOrder, type DossierLayout } from '@/lib/cv/layout';
import { analyzeDossierFit } from '@/lib/cv/fit';
import { dossierTemplate, isDossierTemplateId, type DossierTemplateId } from '@/lib/cv/templates';
import { needFromJobOffer, profileFromConsultant } from '@/lib/matching/needs';
import { opportunityToOffer } from '@/lib/matching/opportunity-offer';
import type { ProfileMission } from '@/lib/matching/engine';
import { isOpenOpportunity } from '@/lib/pilotage/metrics';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Certification, Consultant, ConsultantEducation, ConsultantExperience, ConsultantSkill, CVContent, CVVersion, JobOffer, Opportunity } from '@/types';

type LoadedConsultant = {
  consultant: Consultant & { certifications?: Certification[] | null };
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

type Source = 'none' | 'opportunity' | 'offer' | 'manual';
type Panel = 'need' | 'content' | 'style' | 'versions';

const TEMPLATE_LS_KEY = 'qc-cv-optimizer-template';
const CONFIDENTIAL_LS_KEY = 'centrium-dossier-confidential';
const layoutKey = (org: string | null | undefined, consultant: string) => `centrium-dossier-layout:${org ?? 'none'}:${consultant}`;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // quota, navigation privée : confort seulement
  }
}

/** Fiche besoin ad hoc à partir de la saisie libre (intitulé, compétences, description). */
function manualOffer(title: string, skills: string, description: string): JobOffer | null {
  if (!title && !description && !skills) return null;
  return {
    id: 'temp-offer',
    organization_id: '',
    company_id: null,
    contact_id: null,
    owner_id: null,
    title: title || 'Besoin',
    description,
    required_skills: skills.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean),
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
    // Dates stables : une date dynamique régénérerait le dossier à chaque rendu.
    created_at: '1970-01-01T00:00:00.000Z',
    updated_at: '1970-01-01T00:00:00.000Z',
  };
}

/**
 * CV Optimizer — atelier du dossier de compétences : un consultant, un
 * besoin (opportunité, fiche de poste ou saisie libre), un score objectif
 * de pertinence, puis un dossier composé bloc par bloc (sections, ordre,
 * expériences, compétences, certifications), retouché sur place, aux
 * couleurs de l'organisation, exporté en PDF ou Word, enregistré en
 * version. Rien n'est inventé : on choisit, on ordonne, on reformule.
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
  const initialOpportunityId = params?.get('opportunityId') ?? '';
  const initialOfferId = params?.get('offerId') ?? '';
  const { branding, activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const brand = useMemo(() => resolveBrand(branding), [branding]);
  const showRates = can('consultants.financials') || can('finance.view');
  const canSave = can('consultants.edit');
  const { byId: companies } = useCompaniesLite();

  // ── Consultant ───────────────────────────────────────────────────────
  const { data: consultantsData } = useCachedQuery<Consultant[]>(
    `cv-optimizer:consultants:${activeOrgId ?? 'none'}`,
    async () => (await consultantService.list({ is_prospect: 'all' })).data ?? [],
    { enabled: !!activeOrgId && !lockedConsultantId },
  );
  const [selectedId, setSelectedId] = useState<string>(lockedConsultantId ?? params?.get('consultantId') ?? '');
  const [loaded, setLoaded] = useState<LoadedConsultant | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [missions, setMissions] = useState<ProfileMission[] | null>(null);

  function reloadConsultant(id = selectedId) {
    if (!id) {
      setLoaded(null);
      return;
    }
    setLoadingData(true);
    consultantService.getById(id).then((res) => {
      if (res.data) setLoaded(res.data as LoadedConsultant);
      else toast.error(fr ? 'Impossible de charger ce consultant' : 'Could not load this consultant');
      setLoadingData(false);
    });
  }
  useEffect(() => {
    reloadConsultant(selectedId);
    setMissions(null);
    if (!selectedId) return;
    // Missions du consultant : clients déjà servis (bonus « mission similaire »).
    void createClient()
      .from('missions')
      .select('company_id, title, start_date, end_date, status')
      .eq('consultant_id', selectedId)
      .then(({ data, error }) => setMissions(error ? [] : ((data ?? []) as ProfileMission[])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Besoin ───────────────────────────────────────────────────────────
  const { data: offersData } = useCachedQuery<JobOffer[]>(
    `cv-optimizer:offers:${activeOrgId ?? 'none'}`,
    async () => (await jobOfferService.list('open')).data ?? [],
    { enabled: !!activeOrgId },
  );
  const offers = useMemo(() => offersData ?? [], [offersData]);
  const { data: oppsData } = useCachedQuery<Opportunity[]>(
    `cv-optimizer:opps:${activeOrgId ?? 'none'}`,
    async () => {
      const { data } = await createClient().from('opportunities').select('*').eq('organization_id', activeOrgId!).order('updated_at', { ascending: false }).limit(500);
      return ((data ?? []) as Opportunity[]).filter((o) => isOpenOpportunity(o) || o.id === initialOpportunityId);
    },
    { enabled: !!activeOrgId },
  );
  const opps = useMemo(() => oppsData ?? [], [oppsData]);
  const [source, setSource] = useState<Source>(initialOpportunityId ? 'opportunity' : initialOfferId ? 'offer' : 'none');
  const [oppId, setOppId] = useState(initialOpportunityId);
  const [offerId, setOfferId] = useState(initialOfferId);
  const [manual, setManual] = useState({ title: '', skills: '', description: '' });

  const selectedOpp = opps.find((o) => o.id === oppId) ?? null;
  const selectedOffer = offers.find((o) => o.id === offerId) ?? null;
  const jobOffer: JobOffer | null = useMemo(() => {
    if (source === 'opportunity' && selectedOpp) return opportunityToOffer(selectedOpp, selectedOpp.job_offer_id ? (offers.find((x) => x.id === selectedOpp.job_offer_id) ?? null) : null);
    if (source === 'offer') return selectedOffer;
    if (source === 'manual') return manualOffer(manual.title, manual.skills, manual.description);
    return null;
  }, [source, selectedOpp, selectedOffer, offers, manual]);
  const companyId = source === 'opportunity' ? (selectedOpp?.company_id ?? null) : source === 'offer' ? (selectedOffer?.company_id ?? null) : null;
  const companyName = companyId ? (companies.get(companyId)?.name ?? null) : null;
  const need = useMemo(() => (jobOffer ? needFromJobOffer(jobOffer, companyName) : null), [jobOffer, companyName]);
  const jobOfferId = source === 'offer' ? offerId || null : source === 'opportunity' ? (selectedOpp?.job_offer_id ?? null) : null;

  // ── Modèle, mentions ─────────────────────────────────────────────────
  const [templateId, setTemplateId] = useState<DossierTemplateId>('standard');
  const templateTouched = useRef(false);
  const [showConfidential, setShowConfidential] = useState(true);
  useEffect(() => {
    const stored = readStorage(TEMPLATE_LS_KEY);
    if (isDossierTemplateId(stored)) {
      templateTouched.current = true;
      setTemplateId(stored);
    }
    if (readStorage(CONFIDENTIAL_LS_KEY) === '0') setShowConfidential(false);
  }, []);
  useEffect(() => {
    if (templateTouched.current) return;
    const pref = branding?.defaultCvTemplate;
    if (pref && pref !== templateId) setTemplateId(pref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding?.defaultCvTemplate]);
  function chooseTemplate(id: DossierTemplateId) {
    templateTouched.current = true;
    setTemplateId(id);
    writeStorage(TEMPLATE_LS_KEY, id);
  }
  function chooseConfidential(v: boolean) {
    setShowConfidential(v);
    writeStorage(CONFIDENTIAL_LS_KEY, v ? '1' : '0');
  }

  // ── Génération ───────────────────────────────────────────────────────
  const [generated, setGenerated] = useState<CVContent | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState<{ noInvention: boolean; flaggedClaims: string[] } | null>(null);
  useEffect(() => {
    if (!loaded) {
      setGenerated(null);
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
          jobOffer,
          // Le contenu ne dépend pas de la mise en page ; Minimal partage celui de Consulting.
          templateId: templateId === 'minimal' ? 'standard' : templateId,
        });
        if (cancelled) return;
        setGenerated(result.content);
        setWarnings(result.warnings);
        setGuardrails(result.guardrails);
      } catch (e) {
        if (!cancelled) toast.error(fr ? 'Erreur de génération' : 'Generation error');
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, jobOffer, templateId]);

  // ── Retouches de texte ───────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<CVOverrides>({});
  const hasOverrides = Object.keys(overrides).length > 0;
  // Autre consultant, modèle ou besoin : les retouches précédentes ne correspondent plus.
  const needKey = `${jobOffer?.title ?? ''}|${(jobOffer?.required_skills ?? []).join('|')}`;
  useEffect(() => {
    setOverrides({});
  }, [selectedId, templateId, needKey]);
  function resetOverrides() {
    if (!hasOverrides) return;
    if (!window.confirm(fr ? 'Annuler toutes les retouches de texte de ce dossier ?' : 'Undo all text edits on this dossier?')) return;
    setOverrides({});
  }

  // ── Mise en page (par consultant, mémorisée sur l'appareil) ──────────
  const [layout, setLayoutState] = useState<DossierLayout>(DEFAULT_LAYOUT);
  const [layoutFor, setLayoutFor] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    const raw = readStorage(layoutKey(activeOrgId, selectedId));
    let next = DEFAULT_LAYOUT;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<DossierLayout>;
        next = { ...DEFAULT_LAYOUT, ...parsed, order: normalizeOrder(parsed.order ?? DEFAULT_LAYOUT.order) };
      } catch {
        next = DEFAULT_LAYOUT;
      }
    }
    setLayoutState(next);
    setLayoutFor(selectedId);
  }, [selectedId, activeOrgId]);
  function setLayout(next: DossierLayout) {
    setLayoutState(next);
    if (selectedId && layoutFor === selectedId) writeStorage(layoutKey(activeOrgId, selectedId), JSON.stringify(next));
  }

  function handleEdit(path: string, value: string) {
    // Titres de section : mise en page ; le reste : retouche du texte.
    if (path.startsWith('title.')) {
      const id = path.slice(6) as keyof DossierLayout['titles'];
      const titles = { ...layout.titles };
      if (value.trim()) titles[id] = value;
      else delete titles[id];
      setLayout({ ...layout, titles });
      return;
    }
    setOverrides((prev) => {
      if (value === '') {
        const next = { ...prev };
        delete next[path];
        return next;
      }
      return { ...prev, [path]: value };
    });
  }

  // ── Versions ─────────────────────────────────────────────────────────
  const [version, setVersion] = useState<CVVersion | null>(null);
  useEffect(() => setVersion(null), [selectedId]);
  function openVersion(v: CVVersion) {
    setVersion(v);
    setOverrides({});
    if (isDossierTemplateId(v.content?.template)) setTemplateId(v.content.template);
    showBrandToast('info', fr ? 'Version ouverte' : 'Version opened', { description: v.version_label ?? undefined });
  }

  // ── Contenu affiché ──────────────────────────────────────────────────
  const certifications = useMemo(() => (Array.isArray(loaded?.consultant.certifications) ? loaded!.consultant.certifications!.filter((c) => c?.name) : []), [loaded]);
  const displayed = useMemo(() => {
    const base = version ? version.content : generated;
    if (!base || !loaded) return null;
    const edited = applyOverrides(base, overrides);
    // Une version est déjà mise en page : on l'affiche telle qu'enregistrée.
    return version ? edited : applyLayout(edited, layout, { certifications, firstName: loaded.consultant.first_name, lastName: loaded.consultant.last_name });
  }, [version, generated, overrides, layout, certifications, loaded]);

  const profile = useMemo(
    () =>
      loaded
        ? profileFromConsultant(loaded.consultant, loaded.skills, {
            experiences: loaded.experiences.map((e) => ({ client_name: e.client_name, role: e.role, start_date: e.start_date, end_date: e.end_date, environment: e.environment })),
            missions: missions ?? [],
            certifications,
          })
        : null,
    [loaded, missions, certifications],
  );
  const fit = useMemo(
    () => (need && profile && displayed && generated ? analyzeDossierFit({ need, description: jobOffer?.description ?? '', profile, experiences: generated.experiences, content: displayed }) : null),
    [need, profile, displayed, generated, jobOffer?.description],
  );
  const relevantIds = useMemo(() => new Set((fit?.relevant ?? []).map((r) => r.id)), [fit]);

  function relevantFirst() {
    if (!fit || !generated) return;
    const ids = fit.relevant.map((r) => r.id);
    const current = layout.experienceIds ?? generated.experiences.map((e) => e.id);
    setLayout({ ...layout, experienceIds: [...ids.filter((id) => current.includes(id) || !layout.experienceIds), ...current.filter((id) => !ids.includes(id))] });
    showBrandToast('success', fr ? 'Expériences pertinentes en premier' : 'Relevant experience first');
  }
  function keepRelevant() {
    if (!fit) return;
    setLayout({ ...layout, experienceIds: fit.relevant.map((r) => r.id) });
    showBrandToast('success', fr ? `${fit.relevant.length} expérience(s) retenue(s)` : `${fit.relevant.length} experience(s) kept`);
  }

  // ── QR vCard (réservé au compte éditeur, jamais sur les dossiers clients) ─
  const [isFounder, setIsFounder] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/founder-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => !cancelled && setIsFounder(!!b?.data?.isFounder))
      .catch(() => !cancelled && setIsFounder(false));
    return () => {
      cancelled = true;
    };
  }, []);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isFounder || !brand.qrCodeUrl) {
      setQrSrc(null);
      return;
    }
    let cancelled = false;
    fetch(new URL(brand.qrCodeUrl, window.location.origin).toString(), { cache: 'force-cache' })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const reader = new FileReader();
        reader.onload = () => !cancelled && setQrSrc(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => !cancelled && setQrSrc(null));
    return () => {
      cancelled = true;
    };
  }, [brand.qrCodeUrl, isFounder]);

  // ── Exports et enregistrement ────────────────────────────────────────
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const fileBase = () => {
    const c = loaded?.consultant;
    const safeName = `${c?.first_name ?? ''}_${c?.last_name ?? ''}`.replace(/[^a-zA-Z0-9_-]/g, '') || 'consultant';
    const brandSlug = (brand.brandName || 'Dossier').replace(/[^a-zA-Z0-9_-]/g, '') || 'Dossier';
    return `CV_${brandSlug}_${safeName}`;
  };
  async function downloadPdf() {
    if (!displayed) return;
    setExporting('pdf');
    try {
      await exportCVToPdf(displayed, { filename: fileBase(), templateId, logoSrc: brand.logoUrl ?? undefined, brand, qrSrc: qrSrc ?? undefined, showConfidential });
      showBrandToast('success', fr ? 'PDF téléchargé' : 'PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error((fr ? 'Export PDF impossible : ' : 'PDF export failed: ') + (e instanceof Error ? e.message : ''));
    } finally {
      setExporting(null);
    }
  }
  async function downloadDocx() {
    if (!displayed) return;
    setExporting('docx');
    try {
      const { generateCVDocx } = await import('@/lib/cv/export-docx');
      const blob = await generateCVDocx(displayed, { brand, showConfidential });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showBrandToast('success', fr ? 'Word téléchargé' : 'Word file downloaded');
    } catch (e) {
      console.error(e);
      toast.error(fr ? 'Export Word impossible' : 'Word export failed');
    } finally {
      setExporting(null);
    }
  }
  async function saveVersion(label: string): Promise<CVVersion | null> {
    if (!displayed || !loaded || !activeOrgId) return null;
    const res = await cvService.saveVersion({
      organizationId: activeOrgId,
      consultantId: loaded.consultant.id,
      templateId,
      jobOfferId,
      label,
      content: materialize(displayed),
      score: fit?.match.score ?? null,
      matchedSkills: fit?.match.matchedSkills ?? [],
      missingSkills: fit?.match.missingSkills ?? [],
      warnings,
    });
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? (fr ? 'Enregistrement impossible' : 'Could not save'));
      return null;
    }
    showBrandToast('success', fr ? 'Version enregistrée' : 'Version saved', { description: label });
    return res.data;
  }

  const defaultLabel = need
    ? fr
      ? `Pour « ${need.title} »${companyName ? ` — ${companyName}` : ''}`
      : `For “${need.title}”${companyName ? ` — ${companyName}` : ''}`
    : `${dossierTemplate(templateId).name} — ${formatDate(new Date().toISOString(), lang, 'short')}`;

  // ── Rendu ────────────────────────────────────────────────────────────
  const [panel, setPanel] = useState<Panel>('need');
  const incomplete = loaded && (loaded.skills.length === 0 || loaded.experiences.length === 0 || !loaded.consultant.summary);
  const panels: Array<{ id: Panel; label: string }> = [
    { id: 'need', label: fr ? 'Besoin' : 'Need' },
    { id: 'content', label: fr ? 'Contenu' : 'Content' },
    { id: 'style', label: fr ? 'Style' : 'Style' },
    { id: 'versions', label: 'Versions' },
  ];
  const sources: Array<{ id: Source; label: string }> = [
    { id: 'none', label: fr ? 'Aucun' : 'None' },
    { id: 'opportunity', label: fr ? 'Opportunité' : 'Opportunity' },
    { id: 'offer', label: fr ? 'Fiche de poste' : 'Job description' },
    { id: 'manual', label: fr ? 'Saisie libre' : 'Free text' },
  ];

  return (
    <AppShell fill>
      <div className="no-print flex min-h-0 flex-1 flex-col">
        <PageHeader
          backHref={lockedConsultantId ? `/consultants/${lockedConsultantId}` : undefined}
          backLabel={lockedConsultantId && loaded ? `${loaded.consultant.first_name} ${loaded.consultant.last_name}` : undefined}
          title="CV Optimizer"
          description={fr ? 'Dossier de compétences adapté au besoin. Rien n’est inventé.' : 'Skills dossier tailored to the need. Nothing is invented.'}
          tabs={!lockedConsultantId ? <SectionTabs section="talents" /> : undefined}
          actions={
            <>
              <Button onClick={() => setEditMode((v) => !v)} disabled={!displayed} variant={editMode ? 'primary' : 'secondary'}>
                <Pencil />
                {editMode ? (fr ? 'Terminer' : 'Done') : fr ? 'Retoucher' : 'Edit'}
              </Button>
              {hasOverrides && (
                <Button variant="ghost" onClick={resetOverrides}>
                  <RotateCcw />
                  {fr ? 'Annuler les retouches' : 'Undo edits'}
                </Button>
              )}
              <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
              <Button variant="secondary" onClick={() => void downloadDocx()} disabled={!displayed || exporting !== null}>
                {exporting === 'docx' ? <Loader2 className="animate-spin" /> : <FileDown />}
                Word
              </Button>
              <Button onClick={() => void downloadPdf()} disabled={!displayed || exporting !== null}>
                {exporting === 'pdf' ? <Loader2 className="animate-spin" /> : <Download />}
                {fr ? 'Exporter en PDF' : 'Export PDF'}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[23rem_minmax(0,1fr)] xl:grid-cols-[25rem_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
            {!lockedConsultantId && (
              <section className="tile-surface shrink-0 space-y-2.5 p-4">
                <Label className="text-[12.5px] font-semibold">{fr ? 'Consultant' : 'Consultant'}</Label>
                <ConsultantCombobox consultants={consultantsData ?? []} value={selectedId} onChange={setSelectedId} placeholder="— —" ariaLabel={fr ? 'Consultant' : 'Consultant'} minPanelWidth={480} />
                {loadingData && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {fr ? 'Chargement…' : 'Loading…'}
                  </p>
                )}
                {loaded && !loadingData && (
                  <p className="text-[11.5px] text-muted-foreground">
                    {fr
                      ? `${loaded.skills.length} compétences · ${loaded.experiences.length} expériences · ${loaded.educations.length} formations · ${certifications.length} certifications`
                      : `${loaded.skills.length} skills · ${loaded.experiences.length} experiences · ${loaded.educations.length} education · ${certifications.length} certifications`}
                  </p>
                )}
              </section>
            )}

            <section className="tile-surface flex min-h-0 flex-1 flex-col overflow-hidden">
              <div role="tablist" aria-label={fr ? 'Réglages du dossier' : 'Dossier settings'} className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
                {panels.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={panel === p.id}
                    onClick={() => setPanel(p.id)}
                    className={cn(
                      '-mb-px border-b-2 px-2.5 pb-2 pt-1 text-[13px] font-semibold transition-colors',
                      panel === p.id ? 'border-app-terra text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {p.label}
                    {p.id === 'need' && fit && <span className="num ml-1.5 rounded-full bg-app-peach-light px-1.5 text-[11px] text-app-terra-dark">{fit.match.score}</span>}
                  </button>
                ))}
              </div>
              <div role="tabpanel" className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                {!loaded ? (
                  <p className="text-[12.5px] text-muted-foreground">{fr ? 'Choisissez un consultant pour composer son dossier.' : 'Choose a consultant to build the dossier.'}</p>
                ) : panel === 'need' ? (
                  <div className="space-y-5">
                    <div className="space-y-2.5">
                      <p className="text-[12.5px] font-semibold">{fr ? 'Besoin client (facultatif)' : 'Client need (optional)'}</p>
                      <div role="radiogroup" aria-label={fr ? 'Source du besoin' : 'Need source'} className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
                        {sources.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={source === s.id}
                            onClick={() => setSource(s.id)}
                            className={cn('h-8 rounded-lg px-1 text-[11.5px] font-semibold transition-colors', source === s.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {source === 'opportunity' && (
                        <>
                          <Combobox
                            ariaLabel={fr ? 'Opportunité' : 'Opportunity'}
                            value={oppId}
                            onChange={setOppId}
                            placeholder={fr ? 'Choisir une opportunité ouverte' : 'Choose an open opportunity'}
                            minPanelWidth={420}
                            options={opps.map((o) => ({
                              value: o.id,
                              label: o.title,
                              sublabel: [o.company_id ? companies.get(o.company_id)?.name : null, (o.required_skills ?? []).length ? (o.required_skills ?? []).slice(0, 3).join(', ') : fr ? 'sans compétences' : 'no skills'].filter(Boolean).join(' · '),
                            }))}
                          />
                          {selectedOpp && (
                            <Link href={`/matching?opportunity=${selectedOpp.id}`} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-app-terra-dark hover:underline">
                              <Sparkles className="h-3 w-3" />
                              {fr ? 'Comparer avec les autres profils (Matching IA)' : 'Compare with other profiles (AI matching)'}
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          )}
                        </>
                      )}
                      {source === 'offer' && (
                        <Combobox
                          ariaLabel={fr ? 'Fiche de poste' : 'Job description'}
                          value={offerId}
                          onChange={setOfferId}
                          placeholder={fr ? 'Choisir une fiche de poste' : 'Choose a job description'}
                          minPanelWidth={420}
                          options={offers.map((o) => ({ value: o.id, label: o.title, sublabel: (o.required_skills ?? []).slice(0, 3).join(', ') || undefined }))}
                        />
                      )}
                      {source === 'manual' && (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">{fr ? 'Intitulé' : 'Title'}</Label>
                            <Input className="mt-1" value={manual.title} onChange={(e) => setManual((m) => ({ ...m, title: e.target.value }))} placeholder={fr ? 'ex. QA Automation senior' : 'e.g. Senior QA Automation'} />
                          </div>
                          <div>
                            <Label className="text-xs">{fr ? 'Compétences recherchées' : 'Required skills'}</Label>
                            <Textarea className="mt-1 min-h-[60px] text-xs" value={manual.skills} onChange={(e) => setManual((m) => ({ ...m, skills: e.target.value }))} placeholder="Playwright, TypeScript, Postman, SQL" />
                          </div>
                          <div>
                            <Label className="text-xs">{fr ? 'Description (facultatif)' : 'Description (optional)'}</Label>
                            <Textarea className="mt-1 min-h-[80px] text-xs" value={manual.description} onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))} placeholder="…" />
                          </div>
                        </div>
                      )}
                    </div>

                    {need && fit ? (
                      <FitPanel
                        fit={fit}
                        need={need}
                        lang={lang}
                        showRates={showRates}
                        onRelevantFirst={relevantFirst}
                        onKeepRelevant={keepRelevant}
                        assistant={
                          <MissingSkillsAssistant
                            consultantId={loaded.consultant.id}
                            missingSkills={fit.match.missingSkills}
                            offerContext={[jobOffer?.title, jobOffer?.description].filter(Boolean).join('\n\n')}
                            profileSkillNames={new Set(loaded.skills.map((s) => (s.name ?? '').trim().toLowerCase()))}
                            lang={lang}
                            onProfileChanged={() => reloadConsultant()}
                          />
                        }
                      />
                    ) : (
                      <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] leading-snug text-muted-foreground">
                        {fr
                          ? 'Choisissez un besoin : Centrium calcule un score objectif (le même que le Matching IA), repère les expériences pertinentes et vérifie les mots-clés du dossier.'
                          : 'Choose a need: Centrium computes an objective score (the same as AI matching), finds relevant experience and checks the dossier keywords.'}
                      </p>
                    )}

                    {guardrails && (
                      <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px]', guardrails.noInvention ? 'border-success/25 bg-success-soft/40' : 'border-destructive/30 bg-danger-soft/40')}>
                        {guardrails.noInvention ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                        <div>
                          <p className="font-semibold">{guardrails.noInvention ? (fr ? 'Aucune invention détectée' : 'No fabrication detected') : fr ? 'Élément non étayé détecté' : 'Unsupported claim detected'}</p>
                          <p className="text-muted-foreground">{fr ? 'Expériences, clients, dates et compétences viennent du profil.' : 'Experience, clients, dates and skills come from the profile.'}</p>
                          {!guardrails.noInvention && (
                            <ul className="mt-1 space-y-0.5 text-destructive">
                              {guardrails.flaggedClaims.map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                    {warnings.length > 0 && (
                      <ul className="space-y-1 rounded-xl bg-warning-soft/60 px-3 py-2.5 text-[12px] text-warning">
                        {warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : panel === 'content' ? (
                  version ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">
                      {fr ? 'Une version enregistrée est ouverte : elle s’affiche telle qu’envoyée. Revenez au dossier généré pour en modifier la composition.' : 'A saved version is open and shown as sent. Go back to the generated dossier to change its content.'}
                    </p>
                  ) : generated ? (
                    <ContentPanel layout={layout} onChange={setLayout} generated={applyOverrides(generated, overrides)} certifications={certifications} relevantIds={relevantIds} consultantId={loaded.consultant.id} lang={lang} />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )
                ) : panel === 'style' ? (
                  <StylePanel templateId={templateId} onTemplate={chooseTemplate} brand={brand} showConfidential={showConfidential} onShowConfidential={chooseConfidential} lang={lang} />
                ) : (
                  <VersionsPanel consultantId={loaded.consultant.id} lang={lang} canSave={canSave && !!displayed} defaultLabel={defaultLabel} activeId={version?.id ?? null} onSave={saveVersion} onOpen={openVersion} onClose={() => setVersion(null)} />
                )}
              </div>
            </section>
          </aside>

          <DossierCanvas
            content={displayed}
            templateId={templateId}
            brand={brand}
            qrSrc={qrSrc}
            showConfidential={showConfidential}
            editable={editMode}
            onEdit={handleEdit}
            onResetEdits={() => setOverrides({})}
            lang={lang}
            empty={!selectedId ? { title: fr ? 'Choisissez un consultant' : 'Choose a consultant', description: fr ? 'Le dossier se compose à partir de son profil, et s’adapte au besoin choisi.' : 'The dossier is built from the profile and adapts to the chosen need.' } : null}
            notice={
              incomplete && !version
                ? [
                    loaded!.skills.length === 0 ? (fr ? 'Aucune compétence renseignée.' : 'No skill filled in.') : null,
                    loaded!.experiences.length === 0 ? (fr ? 'Aucune expérience renseignée.' : 'No experience filled in.') : null,
                    !loaded!.consultant.summary ? (fr ? 'Aucun résumé.' : 'No summary.') : null,
                    fr ? 'Complétez la fiche consultant pour un dossier complet.' : 'Complete the consultant record for a full dossier.',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : undefined
            }
            badge={
              version && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-app px-2.5 py-1 text-[12px] font-medium text-white">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span className="max-w-[16rem] truncate">{version.version_label ?? (fr ? 'Version' : 'Version')}</span>
                  <button type="button" onClick={() => setVersion(null)} aria-label={fr ? 'Fermer la version' : 'Close the version'} className="rounded p-0.5 hover:bg-white/15">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            }
          />
        </div>
      </div>

      {/* Version imprimable plein écran (Ctrl+P natif ; l'export PDF passe par React-PDF). */}
      <div className="print-only hidden print:block">{displayed && <CVRenderer content={displayed} templateId={templateId} qrSrc={qrSrc} brand={brand} showConfidential={showConfidential} />}</div>
    </AppShell>
  );
}

