'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Target, TrendingUp, Plus, Briefcase, Pencil, Sparkles, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/Combobox';
import { Label } from '@/components/ui/label';
import {
  PageHeader,
  AppCard,
  AppCardBody,
  SectionHeader,
  EmptyState,
} from '@/components/app';

import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { matchingService, type MatchResult } from '@/lib/services/matching.service';
import { JobOfferFormDialog } from '@/components/offers/JobOfferFormDialog';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { AppDict } from '@/lib/i18n/app';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { useOrganization } from '@/lib/auth/context';
import type { JobOffer, Consultant } from '@/types';
import { CONSULTANT_STATUS_LABEL, CONSULTANT_STATUS_STYLE } from '@/constants';
import { useConsultantStatusLabels } from '@/lib/i18n/useBadges';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { SectionTabs } from '@/components/layout/SectionTabs';

function MatchingInner() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const consultantStatusLabels = useConsultantStatusLabels();
  const { format: formatCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [offerId, setOfferId] = useState<string>('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  // ID de requête pour éviter les race conditions sur double-click :
  // chaque runMatching incrémente runIdRef.current. Les .then() vérifient
  // que leur snapshot ID correspond toujours à la dernière request avant
  // d'écraser setResults. Sinon une enrichment lente d'un ancien click
  // peut overwrite les résultats d'un click plus récent.
  const runIdRef = useRef(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    consultant: Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'daily_rate_eur'> | null;
  }>({ open: false, consultant: null });

  // Offres chargées via cache SWR : hydratation instantanée depuis
  // sessionStorage (plus de dropdown vide au retour sur la page) + refetch en
  // arrière-plan. Keyé sur l'org → se recharge au changement d'organisation.
  const { data: offersData, reload: loadOffers } = useCachedQuery<JobOffer[]>(
    `matching:offers:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('status', 'open')
        .eq('archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobOffer[];
    },
    { enabled: !!activeOrgId },
  );
  const offers = offersData ?? [];

  // Pré-sélection depuis ?offerId=...
  useEffect(() => {
    const param = searchParams.get('offerId');
    if (param) setOfferId(param);
  }, [searchParams]);

  async function runMatching() {
    if (!offerId) {
      toast.error(t.pages.matching.err_select_offer);
      return;
    }
    // Snapshot l'ID de cette run pour invalider les .then() de runs précédents
    const myRunId = ++runIdRef.current;
    setLoading(true);
    try {
      const res = await matchingService.matchConsultantsToOffer(offerId);
      if (myRunId !== runIdRef.current) return; // une run plus récente est en cours
      if (res.error) {
        toast.error(t.pages.matching.err_matching_failed + (res.error.message ?? (isEn ? 'unknown' : 'inconnu')));
        setResults([]);
        return;
      }
      const initial = res.data ?? [];
      setResults(initial);

      // Enrichissement IA du top 5 — non bloquant, mais on vérifie l'ID
      // au retour pour ne pas écraser une run plus récente.
      if (initial.length > 0) {
        setEnriching(true);
        matchingService
          .enrichTopWithJustification(offerId, initial, 5)
          .then((enriched) => {
            if (myRunId !== runIdRef.current) return;
            setResults(enriched);
          })
          .catch(() => {
            // échec silencieux : le matching reste utilisable sans pitch
          })
          .finally(() => {
            if (myRunId === runIdRef.current) setEnriching(false);
          });
      }
    } catch (e) {
      if (myRunId !== runIdRef.current) return;
      toast.error(t.pages.matching.err_unexpected + ((e as Error).message ?? (isEn ? 'unknown' : 'inconnu')));
      setResults([]);
    } finally {
      if (myRunId === runIdRef.current) setLoading(false);
    }
  }

  const selectedOffer = offers.find((o) => o.id === offerId);

  return (
    <AppShell>
      <JobOfferFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        organizationId={activeOrgId ?? ''}
        offer={editing}
        onSaved={(saved) => {
          loadOffers();
          setOfferId(saved.id);
        }}
      />

      <PageHeader tabs={<SectionTabs section="staffing" />}
        eyebrow={t.pages.matching.eyebrow}
        title={
          <>
            {t.pages.matching.title_a}{' '}
            <span className="text-primary font-display ">{t.pages.matching.title_b}</span>
          </>
        }
        description={t.pages.matching.description}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/offers" className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {t.pages.matching.manage_offers}
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.pages.matching.new_offer}
            </Button>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-6"
      >
      <AppCard variant="luminous" tone="violet">
        <AppCardBody size="md">
          <SectionHeader
            eyebrow={t.pages.matching.scoring_eyebrow}
            title={t.pages.matching.pick_offer}
            description={
              locale === 'en'
                ? 'The engine compares required skills with your consultants and weights by seniority and availability.'
                : 'Le moteur compare les compétences requises avec celles de vos consultants et pondère par séniorité et disponibilité.'
            }
          />
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-end">
            <div>
              <Label>{t.pages.matching.offer_select}</Label>
              <Combobox
                value={offerId}
                onChange={(v) => setOfferId(v)}
                options={[
                  { value: '', label: t.pages.matching.pick_offer_placeholder },
                  ...offers.map((o) => ({ value: o.id, label: o.title })),
                ]}
              />
              {selectedOffer && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {selectedOffer.required_skills.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {selectedOffer && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(selectedOffer);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                {t.pages.matching.edit_action}
              </Button>
            )}
            <Button onClick={runMatching} disabled={loading || !offerId}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              {t.pages.matching.run_match}
            </Button>
          </div>
        </AppCardBody>
      </AppCard>
      </motion.div>

      {/* Skeleton pendant le calcul du matching */}
      {loading && results.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl surface-1 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {results.length === 0 && !loading && offerId && (
        <EmptyState
          icon={Target}
          title={t.pages.matching.empty_select_offer}
          description={t.pages.matching.empty_select_description}
        />
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            eyebrow={t.pages.matching.results_eyebrow}
            title={
              <>
                {results.length} <span className="text-primary font-display ">{t.pages.matching.results_classified}</span>
              </>
            }
            description={
              enriching
                ? t.pages.matching.ai_enriching
                : results.some((r) => r.justification)
                  ? t.pages.matching.top5_enriched_hint
                  : undefined
            }
          />
          {results.map((r, rank) => {
            // Garde-fous : profils anciens peuvent avoir des champs nulls.
            // On préfère afficher "—" qu'un crash render.
            const c = r.consultant;
            if (!c) return null;
            const fn = c.first_name ?? '';
            const ln = c.last_name ?? '';
            const initials = `${(fn[0] ?? '?').toUpperCase()}${(ln[0] ?? '').toUpperCase()}`;
            const statusKey = c.status as keyof typeof CONSULTANT_STATUS_LABEL;
            const matched = r.matchedSkills ?? [];
            const missing = r.missingSkills ?? [];
            // Confiance affichée = LLM si dispo, sinon score local
            const conf = r.justification?.confidence ?? r.confidence;
            const confLabel =
              conf === 'high' ? t.pages.matching.confidence_high : conf === 'medium' ? t.pages.matching.confidence_medium : conf === 'low' ? t.pages.matching.confidence_low : null;
            const confClass =
              conf === 'high'
                ? 'border-success/40 text-success'
                : conf === 'medium'
                  ? 'border-warning/40 text-warning'
                  : 'border-destructive/40 text-destructive';
            const breakdown = r.breakdown;
            const gates = r.gates ?? [];
            return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(rank, 8) * 0.06, ease: 'easeOut' }}
            >
            <Card className="qc-card-hover group">
              <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={
                      rank === 0
                        ? 'w-5 shrink-0 text-center font-mono text-xs font-bold text-warning'
                        : 'w-5 shrink-0 text-center font-mono text-xs font-semibold text-muted-foreground/50'
                    }
                  >
                    {rank + 1}
                  </span>
                  <div className="h-12 w-12 rounded-full bg-qc-gradient ring-1 ring-foreground/10 flex items-center justify-center text-white font-semibold transition-transform duration-200 group-hover:scale-105">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                      {fn} {ln}
                    </h3>
                    <p className="text-xs text-muted-foreground">{c.job_title ?? '—'}</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {statusKey && CONSULTANT_STATUS_LABEL[statusKey] && (
                        <Badge
                          variant="outline"
                          className={CONSULTANT_STATUS_STYLE[statusKey]}
                        >
                          {consultantStatusLabels[statusKey] ?? CONSULTANT_STATUS_LABEL[statusKey]}
                        </Badge>
                      )}
                      <Badge variant="outline">{formatCurrency(c.daily_rate_eur ?? 0)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-display font-light tracking-[-0.04em] text-[clamp(2rem,3vw,2.75rem)] text-primary leading-none">
                    <AnimatedNumber value={r.score ?? 0} />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                    {t.pages.matching.score_label}
                  </div>
                </div>

                <div className="shrink-0 min-w-[140px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {t.pages.matching.matched_label}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {matched.slice(0, 3).map((s) => (
                      <Badge key={s} variant="success" className="text-[9px]">
                        {s}
                      </Badge>
                    ))}
                    {matched.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">{t.pages.matching.none_label}</span>
                    )}
                  </div>
                  {missing.length > 0 && (
                    <>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                        {t.pages.matching.missing_label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {missing.slice(0, 2).map((s) => (
                          <Badge key={s} variant="warning" className="text-[9px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() =>
                      setAssignDialog({
                        open: true,
                        consultant: {
                          id: c.id,
                          first_name: fn,
                          last_name: ln,
                          daily_rate_eur: c.daily_rate_eur ?? null,
                        },
                      })
                    }
                  >
                    <Target className="h-3.5 w-3.5" />
                    {t.pages.matching.assign_action}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cv-optimizer?consultantId=${c.id}&offerId=${offerId}`}>
                      {t.pages.matching.generate_cv_action}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Breakdown détaillé du scoring (7 composants pondérés) */}
              {breakdown && (
                <div className="rounded-md border border-hairline surface-1 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t.pages.matching.scoring_detail_title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {confLabel && (
                        <Badge variant="outline" className={`text-[9px] ${confClass}`}>
                          {confLabel}
                        </Badge>
                      )}
                      {gates.map((g) => (
                        <Badge
                          key={g}
                          variant="outline"
                          className="text-[9px] border-destructive/40 text-destructive"
                          title={t.pages.matching.scoring_ceiling}
                        >
                          ⚠ {gateLabel(g, t)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <ScoreBar label={t.pages.matching.scoring_skills_required} points={breakdown.skillsRequired?.points ?? 0} max={50} tone="magenta" />
                    <ScoreBar label={t.pages.matching.scoring_skills_nice} points={breakdown.skillsNice?.points ?? 0} max={10} tone="violet" />
                    <ScoreBar label={t.pages.matching.scoring_seniority} points={breakdown.seniority?.points ?? 0} max={12} tone="blue" />
                    <ScoreBar label={t.pages.matching.scoring_availability} points={breakdown.availability?.points ?? 0} max={12} tone="emerald" />
                    <ScoreBar label={t.pages.matching.scoring_tjm} points={breakdown.dailyRate?.points ?? 0} max={8} tone="amber" />
                    <ScoreBar label={t.pages.matching.scoring_languages} points={breakdown.languages?.points ?? 0} max={5} tone="sky" />
                    <ScoreBar label={t.pages.matching.scoring_location} points={breakdown.location?.points ?? 0} max={3} tone="slate" />
                  </div>
                </div>
              )}

              {r.justification && (
                <div className="rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2.5 text-xs leading-relaxed">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
                      {t.pages.matching.pitch_ai_label}
                    </span>
                  </div>
                  <p className="text-foreground/90">{r.justification.pitch}</p>
                  {r.justification.risks.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.pages.matching.risks_label}
                      </span>
                      {r.justification.risks.map((risk, i) => (
                        <span key={i} className="text-[10px] text-warning">
                          {risk}{i < r.justification!.risks.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </Card>
            </motion.div>
            );
          })}
        </div>
      )}

      <AssignMissionDialog
        open={assignDialog.open}
        onOpenChange={(v) => setAssignDialog({ ...assignDialog, open: v })}
        offer={selectedOffer ?? null}
        consultant={assignDialog.consultant}
        onAssigned={() => {
          // rien à recharger ici, mais on pourrait toast ou marquer le profil comme proposé
        }}
      />
    </AppShell>
  );
}

/** Mini-barre de score pour un composant du breakdown matching. */
function ScoreBar({
  label,
  points,
  max,
  tone,
}: {
  label: string;
  points: number;
  max: number;
  tone: 'magenta' | 'violet' | 'blue' | 'emerald' | 'amber' | 'sky' | 'slate';
}) {
  const pct = max > 0 ? Math.min(100, (points / max) * 100) : 0;
  const toneClass: Record<typeof tone, string> = {
    magenta: 'bg-primary',
    violet: 'bg-primary',
    blue: 'bg-info',
    emerald: 'bg-success',
    amber: 'bg-warning',
    sky: 'bg-info',
    slate: 'bg-muted-foreground',
  };
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
        <span className="text-[10px] font-mono text-foreground/80 shrink-0">
          {points.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/[0.07] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${toneClass[tone]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function gateLabel(g: string, t: AppDict): string {
  switch (g) {
    case 'unavailable':
      return t.pages.matching.gate_unavailable;
    case 'seniority-mismatch':
      return t.pages.matching.gate_seniority_mismatch;
    case 'skills-too-low':
      return t.pages.matching.gate_skills_too_low;
    default:
      return g;
  }
}

export default function MatchingPage() {
  return (
    <Suspense fallback={null}>
      <MatchingInner />
    </Suspense>
  );
}
