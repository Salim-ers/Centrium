'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Target, TrendingUp, Plus, Briefcase, Pencil, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  PageHeader,
  AppCard,
  AppCardBody,
  SectionHeader,
  EmptyState,
  StatusBadge,
} from '@/components/app';

import { createClient } from '@/lib/supabase/client';
import { matchingService, type MatchResult } from '@/lib/services/matching.service';
import { JobOfferFormDialog } from '@/components/offers/JobOfferFormDialog';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { useOrganization } from '@/lib/auth/context';
import type { JobOffer, Consultant } from '@/types';
import { CONSULTANT_STATUS_LABEL, CONSULTANT_STATUS_STYLE } from '@/constants';
import { formatCurrency } from '@/lib/utils';

function MatchingInner() {
  const { activeOrgId } = useOrganization();
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [offerId, setOfferId] = useState<string>('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    consultant: Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'daily_rate_eur'> | null;
  }>({ open: false, consultant: null });

  async function loadOffers() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('status', 'open')
        .eq('archived', false)
        .order('updated_at', { ascending: false });
      if (error) {
        console.warn('[matching] loadOffers failed', error);
        return;
      }
      setOffers((data ?? []) as JobOffer[]);
    } catch (e) {
      console.warn('[matching] loadOffers exception', e);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  // Pré-sélection depuis ?offerId=...
  useEffect(() => {
    const param = searchParams.get('offerId');
    if (param) setOfferId(param);
  }, [searchParams]);

  async function runMatching() {
    if (!offerId) {
      toast.error('Sélectionne une offre');
      return;
    }
    setLoading(true);
    try {
      const res = await matchingService.matchConsultantsToOffer(offerId);
      if (res.error) {
        toast.error('Matching impossible : ' + (res.error.message ?? 'inconnu'));
        setResults([]);
        return;
      }
      const initial = res.data ?? [];
      setResults(initial);

      // Enrichissement IA du top 5 — non bloquant
      if (initial.length > 0) {
        setEnriching(true);
        matchingService
          .enrichTopWithJustification(offerId, initial, 5)
          .then((enriched) => setResults(enriched))
          .catch(() => {
            // échec silencieux : le matching reste utilisable sans pitch
          })
          .finally(() => setEnriching(false));
      }
    } catch (e) {
      toast.error('Erreur inattendue : ' + ((e as Error).message ?? 'inconnu'));
      setResults([]);
    } finally {
      setLoading(false);
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

      <PageHeader
        eyebrow="Commercial"
        title={
          <>
            Matching <span className="qc-italic-accent font-editorial italic">IA.</span>
          </>
        }
        description="Trouve les meilleurs profils pour chaque offre client — scoring multi-critères sur skills, séniorité, TJM et disponibilité."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/offers" className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                Gérer les offres
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouvelle offre
            </Button>
          </>
        }
      />

      <AppCard variant="luminous" tone="violet" className="mb-6">
        <AppCardBody size="md">
          <SectionHeader
            eyebrow="Scoring"
            title={
              <>
                Sélection de l’<span className="qc-italic-accent font-editorial italic">offre.</span>
              </>
            }
            description="Le moteur compare les compétences requises avec celles de vos consultants et pondère par séniorité et disponibilité."
          />
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-end">
            <div>
              <Label>Offre</Label>
              <Select value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                <option value="">— Choisir une offre —</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </Select>
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
                Éditer
              </Button>
            )}
            <Button onClick={runMatching} disabled={loading || !offerId}>
              <TrendingUp className="h-4 w-4" />
              Lancer le matching
            </Button>
          </div>
        </AppCardBody>
      </AppCard>

      {results.length === 0 && !loading && offerId && (
        <EmptyState
          icon={Target}
          title="Lance le matching pour voir les profils classés"
          description="Choisis une offre puis clique sur « Lancer le matching » pour obtenir les meilleurs candidats."
        />
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            eyebrow="Résultats"
            title={
              <>
                {results.length} profils <span className="qc-italic-accent font-editorial italic">classés.</span>
              </>
            }
            description={
              enriching
                ? 'L’IA rédige les justifications du top 5…'
                : results.some((r) => r.justification)
                  ? 'Top 5 enrichi par une justification IA (pitch + risques).'
                  : undefined
            }
          />
          {results.map((r) => {
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
            const conf = r.justification?.confidence;
            const confLabel =
              conf === 'high' ? 'Confiance haute' : conf === 'medium' ? 'Confiance moyenne' : conf === 'low' ? 'Confiance faible' : null;
            const confClass =
              conf === 'high'
                ? 'border-emerald-400/40 text-emerald-300'
                : conf === 'medium'
                  ? 'border-amber-400/40 text-amber-300'
                  : 'border-rose-400/40 text-rose-300';
            return (
            <Card key={c.id} className="qc-card-hover">
              <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-full bg-qc-gradient flex items-center justify-center text-white font-semibold">
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
                          {CONSULTANT_STATUS_LABEL[statusKey]}
                        </Badge>
                      )}
                      <Badge variant="outline">{formatCurrency(c.daily_rate_eur ?? 0)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-display font-light tracking-[-0.04em] text-[clamp(2rem,3vw,2.75rem)] qc-gradient-text leading-none">
                    {r.score ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                    score / 100
                  </div>
                </div>

                <div className="shrink-0 min-w-[140px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Matchées
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {matched.slice(0, 3).map((s) => (
                      <Badge key={s} variant="success" className="text-[9px]">
                        {s}
                      </Badge>
                    ))}
                    {matched.length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">aucune</span>
                    )}
                  </div>
                  {missing.length > 0 && (
                    <>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                        Manquantes
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
                    Affecter
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cv-optimizer?consultantId=${c.id}&offerId=${offerId}`}>
                      Générer CV
                    </Link>
                  </Button>
                </div>
              </div>

              {r.justification && (
                <div className="rounded-md border border-violet-400/20 bg-violet-500/[0.04] px-3 py-2.5 text-xs leading-relaxed">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="h-3 w-3 text-violet-300" />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-violet-300/80">
                      Pitch IA
                    </span>
                    {confLabel && (
                      <Badge variant="outline" className={`text-[9px] ${confClass}`}>
                        {confLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground/90">{r.justification.pitch}</p>
                  {r.justification.risks.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Risques :
                      </span>
                      {r.justification.risks.map((risk, i) => (
                        <span key={i} className="text-[10px] text-amber-200/80">
                          {risk}{i < r.justification!.risks.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </Card>
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

export default function MatchingPage() {
  return (
    <Suspense fallback={null}>
      <MatchingInner />
    </Suspense>
  );
}
