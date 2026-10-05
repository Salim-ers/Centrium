'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, FileText, Sparkles, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonRows } from '@/components/ui/skeleton';
import { MatchExplanation, ScoreBadge } from '@/components/matching/MatchExplanation';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { crmService, type Proposal } from '@/lib/services/crm.service';
import { opportunityToOffer, hasSkills } from '@/lib/matching/opportunity-offer';
import { rankConsultants } from '@/lib/matching/rank';
import { formatDate, formatEur } from '@/lib/format';
import type { JobOffer, Opportunity } from '@/types';

/**
 * Consultants proposés sur une opportunité + suggestions classées par le
 * moteur de scoring déterministe, avec le détail de chaque score.
 */
export function OpportunityMatching({
  opp,
  offer,
  lang,
  canEdit,
  organizationId,
}: {
  opp: Opportunity;
  offer: JobOffer | null;
  lang: 'fr' | 'en';
  canEdit: boolean;
  organizationId: string;
}) {
  const fr = lang === 'fr';
  const dossierHref = (consultantId: string) => `/cv-optimizer?consultantId=${consultantId}${opp.job_offer_id ? `&offerId=${opp.job_offer_id}` : ''}`;
  const { consultants, skillsByConsultant, loading: poolLoading } = useMatchingPool();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: proposals, setData: setProposals, loading } = useCachedQuery<Proposal[]>(
    `proposals:${opp.id}`,
    async () => (await crmService.proposals(opp.id)).data ?? [],
    { enabled: !!opp.id },
  );

  const proposedIds = useMemo(() => new Set((proposals ?? []).map((p) => p.consultant_id)), [proposals]);
  const matchable = hasSkills(opp, offer);
  const ranked = useMemo(() => {
    if (!matchable || consultants.length === 0) return [];
    return rankConsultants(opportunityToOffer(opp, offer), consultants, skillsByConsultant, {
      limit: 12,
      minScore: 20,
      excludeIds: proposedIds,
    });
  }, [matchable, consultants, skillsByConsultant, opp, offer, proposedIds]);

  async function propose(consultantId: string) {
    const res = await crmService.propose(opp.id, consultantId, organizationId);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    const c = consultants.find((x) => x.id === consultantId);
    setProposals((list) => [
      ...(list ?? []),
      {
        opportunity_id: opp.id,
        consultant_id: consultantId,
        pitch: null,
        sent_at: new Date().toISOString(),
        client_feedback: null,
        consultants: c ? { id: c.id, first_name: c.first_name, last_name: c.last_name, job_title: c.job_title, status: c.status } : null,
      },
    ]);
    toast.success(fr ? 'Profil ajouté aux propositions' : 'Profile added to proposals');
  }

  async function withdraw(consultantId: string) {
    const res = await crmService.withdrawProposal(opp.id, consultantId);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setProposals((list) => (list ?? []).filter((p) => p.consultant_id !== consultantId));
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{fr ? 'Profils proposés' : 'Proposed profiles'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !proposals ? (
            <SkeletonRows rows={2} />
          ) : (proposals ?? []).length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              {fr ? 'Aucun profil proposé au client pour le moment.' : 'No profile sent to the client yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(proposals ?? []).map((p) => (
                <li key={p.consultant_id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={p.consultants ? `${p.consultants.first_name} ${p.consultants.last_name}` : '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/consultants/${p.consultant_id}`} className="block truncate text-[13.5px] font-medium hover:text-primary-deep">
                      {p.consultants ? `${p.consultants.first_name} ${p.consultants.last_name}` : '—'}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.consultants?.job_title}
                      {p.sent_at && ` · ${fr ? 'proposé le' : 'sent on'} ${formatDate(p.sent_at, lang, 'short')}`}
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" title={fr ? 'Générer le dossier de compétences' : 'Generate the skills dossier'}>
                    <Link href={dossierHref(p.consultant_id)}>
                      <FileText />
                      {fr ? 'Dossier' : 'Dossier'}
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => void withdraw(p.consultant_id)}>
                      {fr ? 'Retirer' : 'Withdraw'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {fr ? 'Consultants suggérés' : 'Suggested consultants'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {fr ? 'Classement déterministe et explicable. Cliquez sur un score pour le détail.' : 'Deterministic, explainable ranking. Click a score for details.'}
          </p>
        </CardHeader>
        <CardContent>
          {!matchable ? (
            <p className="text-[13px] text-muted-foreground">
              {fr ? 'Renseignez les compétences recherchées pour obtenir des suggestions.' : 'Add required skills to get suggestions.'}
            </p>
          ) : poolLoading && consultants.length === 0 ? (
            <SkeletonRows rows={4} />
          ) : ranked.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              {fr ? 'Aucun consultant ne correspond suffisamment à ce besoin.' : 'No consultant matches this requirement well enough.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ranked.map(({ consultant: c, breakdown }) => {
                const open = expanded === c.id;
                return (
                  <li key={c.id} className="py-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : c.id)}
                        aria-expanded={open}
                        className="inline-flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:shadow-focus"
                        aria-label={fr ? `Détail du score de ${c.first_name} ${c.last_name}` : `Score details for ${c.first_name} ${c.last_name}`}
                      >
                        <ScoreBadge score={breakdown.score} />
                        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link href={`/consultants/${c.id}`} className="block truncate text-[13.5px] font-medium hover:text-primary-deep">
                          {c.first_name} {c.last_name}
                          {c.is_prospect && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({fr ? 'vivier' : 'talent pool'})</span>}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.job_title}
                          {c.daily_rate_eur ? ` · ${formatEur(c.daily_rate_eur, lang)}` : ''}
                          {c.status === 'available'
                            ? ` · ${fr ? 'disponible' : 'available'}`
                            : c.available_from
                              ? ` · ${fr ? 'dispo.' : 'free'} ${formatDate(c.available_from, lang, 'short')}`
                              : ''}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm" title={fr ? 'Générer le dossier de compétences' : 'Generate the skills dossier'}>
                        <Link href={dossierHref(c.id)} aria-label={fr ? 'Générer le dossier de compétences' : 'Generate the skills dossier'}>
                          <FileText />
                          <span className="hidden sm:inline">{fr ? 'Dossier' : 'Dossier'}</span>
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button variant="secondary" size="sm" onClick={() => void propose(c.id)} aria-label={fr ? 'Positionner' : 'Position'}>
                          <UserPlus />
                          <span className="hidden sm:inline">{fr ? 'Positionner' : 'Position'}</span>
                        </Button>
                      )}
                    </div>
                    {open && (
                      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
                        <MatchExplanation breakdown={breakdown} lang={lang} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
