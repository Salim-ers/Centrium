'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Target, TrendingUp, Plus, Briefcase, Pencil } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    consultant: Pick<Consultant, 'id' | 'first_name' | 'last_name' | 'daily_rate_eur'> | null;
  }>({ open: false, consultant: null });

  async function loadOffers() {
    const supabase = createClient();
    const { data } = await supabase
      .from('job_offers')
      .select('*')
      .eq('status', 'open')
      .order('updated_at', { ascending: false });
    if (data) setOffers(data as JobOffer[]);
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
    const res = await matchingService.matchConsultantsToOffer(offerId);
    if (res.data) setResults(res.data);
    setLoading(false);
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

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="h-7 w-7 text-violet-glow" />
            Matching consultant ↔ mission
          </h1>
          <p className="text-muted-foreground mt-1">
            Trouve les meilleurs profils pour chaque offre client
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Sélection de l'offre</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-end">
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
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {results.length} profils classés
          </h2>
          {results.map((r) => (
            <Card key={r.consultant.id} className="qc-card-hover">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-full bg-qc-gradient flex items-center justify-center text-white font-semibold">
                    {r.consultant.first_name[0]}
                    {r.consultant.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                      {r.consultant.first_name} {r.consultant.last_name}
                      {r.consultant.is_prospect && (
                        <Badge
                          variant="outline"
                          className="border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10px]"
                        >
                          Vivier
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{r.consultant.job_title}</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      <Badge
                        variant="outline"
                        className={CONSULTANT_STATUS_STYLE[r.consultant.status]}
                      >
                        {CONSULTANT_STATUS_LABEL[r.consultant.status]}
                      </Badge>
                      <Badge variant="outline">{formatCurrency(r.consultant.daily_rate_eur)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-3xl font-bold qc-gradient-text">{r.score}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    /100
                  </div>
                </div>

                <div className="shrink-0 min-w-[140px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Matchées
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.matchedSkills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="success" className="text-[9px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {r.missingSkills.length > 0 && (
                    <>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                        Manquantes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.missingSkills.slice(0, 2).map((s) => (
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
                          id: r.consultant.id,
                          first_name: r.consultant.first_name,
                          last_name: r.consultant.last_name,
                          daily_rate_eur: r.consultant.daily_rate_eur,
                        },
                      })
                    }
                  >
                    <Target className="h-3.5 w-3.5" />
                    Affecter
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/cv-optimizer?consultantId=${r.consultant.id}&offerId=${offerId}`}>
                      Générer CV
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
