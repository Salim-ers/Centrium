'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Send,
  Target,
  FileText,
  Sparkles,
  Loader2,
  Mail,
  Copy,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Info,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/Combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { CVRenderer } from '@/components/cv/CVRenderer';
import { createClient } from '@/lib/supabase/client';
import { consultantService } from '@/lib/services/consultant.service';
import { matchingService, type MatchResult } from '@/lib/services/matching.service';
import { generateCVContent } from '@/lib/ai/cv-generator';
import { generateCVDocx } from '@/lib/cv/export-docx';
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
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type LoadedConsultant = {
  consultant: Consultant;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  educations: ConsultantEducation[];
};

type EmailDraft = {
  subject: string;
  body: string;
  highlights: string[];
};

export default function ResponsesPage() {
  const { format: formatCurrency } = useCurrency();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  // === Step 1 : offres ===
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');

  // === Step 2 : matching consultants ===
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');

  // === Step 3 : CV + email ===
  const [loaded, setLoaded] = useState<LoadedConsultant | null>(null);
  const [templateId, setTemplateId] = useState<CVTemplateId>('standard');
  const [cvContent, setCvContent] = useState<CVContent | null>(null);
  const [cvWarnings, setCvWarnings] = useState<string[]>([]);

  const [email, setEmail] = useState<EmailDraft | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [tone, setTone] = useState<'sobre' | 'direct' | 'chaleureux'>('sobre');
  const [exporting, setExporting] = useState<'docx' | null>(null);

  // === Load offers on mount ===
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('job_offers')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOffers((data ?? []) as JobOffer[]);
        setLoadingOffers(false);
      });
  }, []);

  const selectedOffer = useMemo(
    () => offers.find((o) => o.id === selectedOfferId) ?? null,
    [offers, selectedOfferId],
  );

  // === Step 1 → Step 2 : run matching ===
  useEffect(() => {
    setMatches(null);
    setSelectedConsultantId('');
    setLoaded(null);
    setCvContent(null);
    setEmail(null);
    if (!selectedOfferId) return;
    setMatchingLoading(true);
    matchingService.matchConsultantsToOffer(selectedOfferId).then((res) => {
      if (res.data) setMatches(res.data);
      else toast.error((isEn ? 'Matching failed: ' : 'Matching échoué : ') + (res.error?.message ?? ''));
      setMatchingLoading(false);
    });
  }, [selectedOfferId]);

  // === Step 2 → Step 3 : load selected consultant ===
  useEffect(() => {
    setEmail(null);
    if (!selectedConsultantId) {
      setLoaded(null);
      setCvContent(null);
      return;
    }
    consultantService.getById(selectedConsultantId).then((res) => {
      if (res.data) setLoaded(res.data);
      else toast.error(isEn ? 'Could not load the consultant' : 'Impossible de charger le consultant');
    });
  }, [selectedConsultantId]);

  // === Auto-preview CV when consultant + offer + template ready ===
  useEffect(() => {
    if (!loaded) {
      setCvContent(null);
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
          jobOffer: selectedOffer,
          templateId,
        });
        if (cancelled) return;
        setCvContent(result.content);
        setCvWarnings(result.warnings);
      } catch (e) {
        if (!cancelled) toast.error(isEn ? 'CV generation error' : 'Erreur de génération CV');
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, selectedOffer, templateId]);

  async function generateEmail() {
    if (!selectedConsultantId || !selectedOfferId) return;
    setGeneratingEmail(true);
    try {
      const res = await fetch('/api/responses/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: selectedConsultantId,
          offerId: selectedOfferId,
          tone,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          toast.error(
            isEn
              ? 'Missing Anthropic API key. Add ANTHROPIC_API_KEY to .env.local.'
              : 'Clé API Anthropic manquante. Ajoute ANTHROPIC_API_KEY dans .env.local.',
          );
        } else {
          toast.error(
            (isEn ? 'Email generation failed: ' : 'Génération email impossible : ') +
              (body.message ?? `HTTP ${res.status}`),
          );
        }
        return;
      }
      const data = (await res.json()) as EmailDraft;
      setEmail({
        subject: data.subject,
        body: data.body,
        highlights: data.highlights ?? [],
      });
      toast.success(isEn ? '🤖 Email pitch generated' : '🤖 Pitch email généré');
    } catch (e) {
      toast.error(
        (isEn ? 'Network error: ' : 'Erreur réseau : ') +
          (e instanceof Error ? e.message : isEn ? 'unknown' : 'inconnue'),
      );
    } finally {
      setGeneratingEmail(false);
    }
  }

  function copyEmail() {
    if (!email) return;
    const full = `${isEn ? 'Subject' : 'Objet'}: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(full);
    toast.success(isEn ? 'Email copied' : 'Email copié');
  }

  function openMailto() {
    if (!email) return;
    const mailto = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = mailto;
  }

  async function downloadDocx() {
    if (!cvContent) {
      toast.error(isEn ? 'CV not ready' : 'CV non prêt');
      return;
    }
    setExporting('docx');
    try {
      const blob = await generateCVDocx(cvContent);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName =
        cvContent.header.displayName?.replace(/\s+/g, '_').replace(/[^\w\-]/g, '') ||
        'consultant';
      a.download = `CV_${safeName}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(isEn ? 'DOCX export failed' : 'Export DOCX échoué');
      console.error(e);
    } finally {
      setExporting(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Send className="h-7 w-7 text-primary" />
          {isEn ? 'RFP Responses' : 'Réponses AO'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEn
            ? 'Offer → best consultant → aligned CV → AI sales pitch'
            : 'Offre → meilleur consultant → CV aligné → pitch commercial IA'}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* ================= Col 1 : Offre ================= */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  1
                </span>
                {isEn ? 'Offer' : 'Offre'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isEn ? 'Select' : 'Sélectionner'}
                </Label>
                <Combobox
                  value={selectedOfferId}
                  onChange={(v) => setSelectedOfferId(v)}
                  disabled={loadingOffers}
                  options={[
                    {
                      value: '',
                      label: loadingOffers
                        ? isEn ? 'Loading…' : 'Chargement…'
                        : offers.length === 0
                          ? isEn ? 'No open offer' : 'Aucune offre ouverte'
                          : isEn ? 'Choose an open offer' : 'Choisir une offre ouverte',
                    },
                    ...offers.map((o) => ({ value: o.id, label: o.title })),
                  ]}
                />
              </div>

              {selectedOffer && (
                <div className="space-y-2 text-xs pt-2 border-t border-hairline">
                  {selectedOffer.seniority && (
                    <div>
                      <span className="text-muted-foreground">{isEn ? 'Seniority: ' : 'Séniorité : '}</span>
                      <span className="font-medium">{selectedOffer.seniority}</span>
                    </div>
                  )}
                  {(selectedOffer.daily_rate_min || selectedOffer.daily_rate_max) && (
                    <div>
                      <span className="text-muted-foreground">{isEn ? 'Day rate: ' : 'TJM : '}</span>
                      <span className="font-medium">
                        {selectedOffer.daily_rate_min ? formatCurrency(selectedOffer.daily_rate_min) : '?'}
                        {' – '}
                        {selectedOffer.daily_rate_max ? formatCurrency(selectedOffer.daily_rate_max) : '?'}
                      </span>
                    </div>
                  )}
                  {selectedOffer.location && (
                    <div>
                      <span className="text-muted-foreground">{isEn ? 'Location: ' : 'Lieu : '}</span>
                      <span className="font-medium">{selectedOffer.location}</span>
                    </div>
                  )}
                  {selectedOffer.start_date && (
                    <div>
                      <span className="text-muted-foreground">{isEn ? 'Start: ' : 'Démarrage : '}</span>
                      <span className="font-medium">{formatDate(selectedOffer.start_date)}</span>
                    </div>
                  )}
                  {selectedOffer.deadline && (
                    <div>
                      <span className="text-muted-foreground">{isEn ? 'Deadline: ' : 'Deadline : '}</span>
                      <span className="font-medium text-warning">
                        {formatDate(selectedOffer.deadline)}
                      </span>
                    </div>
                  )}
                  {selectedOffer.required_skills?.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">{isEn ? 'Required skills' : 'Compétences requises'}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedOffer.required_skills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* ================= Col 2 : Matching ================= */}
        <section className="col-span-12 lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  2
                </span>
                <Target className="h-4 w-4" />
                {isEn ? 'Ranked consultants' : 'Consultants classés'}
              </CardTitle>
              {matches && (
                <CardDescription className="text-xs">
                  {isEn
                    ? `${matches.length} consultant${matches.length > 1 ? 's' : ''} evaluated — sorted by score`
                    : `${matches.length} consultant${matches.length > 1 ? 's' : ''} évalué${matches.length > 1 ? 's' : ''} — trié par score`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 max-h-[75vh] overflow-auto">
              {!selectedOfferId ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">
                  {isEn ? 'Select an offer to run the matching.' : 'Sélectionne une offre pour lancer le matching.'}
                </p>
              ) : matchingLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-2">{isEn ? 'Matching…' : 'Matching en cours…'}</p>
                </div>
              ) : matches && matches.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">
                  {isEn ? 'No active consultant in the database.' : 'Aucun consultant actif dans la base.'}
                </p>
              ) : (
                matches?.map((m) => {
                  const isSelected = m.consultant.id === selectedConsultantId;
                  const recoColor =
                    m.recommendation === 'recommend'
                      ? 'border-success/40 bg-success/5'
                      : m.recommendation === 'maybe'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-border bg-muted';
                  const recoLabel =
                    m.recommendation === 'recommend'
                      ? isEn ? 'Recommended' : 'Recommandé'
                      : m.recommendation === 'maybe'
                        ? isEn ? 'Maybe' : 'Peut-être'
                        : isEn ? 'Not suited' : 'Pas adapté';
                  return (
                    <button
                      key={m.consultant.id}
                      onClick={() => setSelectedConsultantId(m.consultant.id)}
                      className={`w-full text-left rounded-md border p-3 transition ${recoColor} ${
                        isSelected
                          ? 'ring-2 ring-primary/50'
                          : 'hover:border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {m.consultant.first_name} {m.consultant.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.consultant.job_title}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold text-primary font-display leading-none">
                            {m.score}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            / 100
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                        <Badge variant="outline" className="text-[9px]">
                          {recoLabel}
                        </Badge>
                        <span className="text-muted-foreground">
                          {m.consultant.status === 'available'
                            ? isEn ? 'Available' : 'Dispo'
                            : m.consultant.status === 'soon_available'
                              ? isEn ? 'Soon' : 'Bientôt dispo'
                              : isEn ? 'On mission' : 'En mission'}
                        </span>
                        {m.consultant.daily_rate_eur && (
                          <span className="text-muted-foreground">
                            · {formatCurrency(m.consultant.daily_rate_eur)}
                          </span>
                        )}
                      </div>
                      {m.matchedSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.matchedSkills.slice(0, 4).map((s) => (
                            <Badge key={s} variant="success" className="text-[9px]">
                              {s}
                            </Badge>
                          ))}
                          {m.matchedSkills.length > 4 && (
                            <span className="text-[9px] text-muted-foreground self-center">
                              +{m.matchedSkills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      {m.missingSkills.length > 0 && (
                        <p className="mt-1 text-[9px] text-warning">
                          {isEn ? 'Missing: ' : 'Manquantes : '}{m.missingSkills.slice(0, 3).join(', ')}
                          {m.missingSkills.length > 3 && ` +${m.missingSkills.length - 3}`}
                        </p>
                      )}
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          {isEn ? 'Selected' : 'Sélectionné'}
                          <ChevronRight className="h-3 w-3 ml-auto" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        {/* ================= Col 3 : CV + Email ================= */}
        <section className="col-span-12 lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  3
                </span>
                <FileText className="h-4 w-4" />
                {isEn ? 'Aligned CV' : 'CV aligné'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  {isEn ? 'Select a consultant in column 2.' : 'Sélectionne un consultant dans la colonne 2.'}
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Template
                      </Label>
                      <Combobox
                        value={templateId}
                        onChange={(v) => setTemplateId(v as CVTemplateId)}
                        options={Object.entries(CV_TEMPLATE_LABEL).map(([id, label]) => ({
                          value: id,
                          label,
                        }))}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadDocx}
                      disabled={!cvContent || exporting === 'docx'}
                      className="self-end"
                    >
                      {exporting === 'docx' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      DOCX
                    </Button>
                  </div>

                  {cvContent && (
                    <div className="border border-hairline rounded-md overflow-auto max-h-[400px]">
                      <div
                        className="scale-[0.6] origin-top-left pointer-events-none"
                        style={{ width: '167%' }}
                      >
                        <CVRenderer content={cvContent} templateId={templateId} />
                      </div>
                    </div>
                  )}

                  {cvWarnings.length > 0 && (
                    <div className="mt-3 text-[10px] text-warning space-y-0.5">
                      {cvWarnings.slice(0, 3).map((w, i) => (
                        <p key={i}>⚠ {w}</p>
                      ))}
                      {cvWarnings.length > 3 && (
                        <p className="text-muted-foreground">
                          … +{cvWarnings.length - 3} {isEn ? 'more' : 'autres'}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {isEn ? 'Email pitch' : 'Pitch email'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isEn
                  ? 'The engine only cites facts from the profile. No fabrication.'
                  : "Le moteur ne cite que les faits du profil. Pas d'invention."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!loaded ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  {isEn ? 'Waiting for a selected consultant.' : "En attente d'un consultant sélectionné."}
                </p>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {isEn ? 'Tone' : 'Ton'}
                      </Label>
                      <Combobox
                        value={tone}
                        onChange={(v) => setTone(v as typeof tone)}
                        options={[
                          { value: 'sobre', label: isEn ? 'Sober and factual' : 'Sobre et factuel' },
                          { value: 'direct', label: isEn ? 'Direct and concise' : 'Direct et concis' },
                          { value: 'chaleureux', label: isEn ? 'Warm but professional' : 'Chaleureux mais pro' },
                        ]}
                      />
                    </div>
                    <Button
                      onClick={generateEmail}
                      disabled={generatingEmail || !loaded || !selectedOfferId}
                      size="sm"
                    >
                      {generatingEmail ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {email ? (isEn ? 'Regenerate' : 'Régénérer') : isEn ? 'Generate' : 'Générer'}
                    </Button>
                  </div>

                  {email && (
                    <>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isEn ? 'Subject' : 'Objet'}
                        </Label>
                        <Input
                          value={email.subject}
                          onChange={(e) =>
                            setEmail((prev) =>
                              prev ? { ...prev, subject: e.target.value } : prev,
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isEn ? 'Body' : 'Corps'}
                        </Label>
                        <Textarea
                          value={email.body}
                          onChange={(e) =>
                            setEmail((prev) =>
                              prev ? { ...prev, body: e.target.value } : prev,
                            )
                          }
                          className="min-h-[260px] text-xs font-mono"
                        />
                      </div>
                      {email.highlights.length > 0 && (
                        <div className="bg-card border border-hairline rounded-md p-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            {isEn ? 'Pitch key points' : 'Points-clés du pitch'}
                          </p>
                          <ul className="space-y-0.5 text-[11px]">
                            {email.highlights.map((h, i) => (
                              <li key={i}>• {h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyEmail}
                          className="flex-1"
                        >
                          <Copy className="h-3 w-3" />
                          {isEn ? 'Copy' : 'Copier'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openMailto}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {isEn ? 'Open mailto' : 'Ouvrir mailto'}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
