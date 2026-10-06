'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, ScanSearch, Sparkles, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonRows } from '@/components/ui/skeleton';
import { AvailabilityBadge } from '@/components/consultants/AvailabilityBadge';
import { MatchRow } from '@/components/matching/MatchRow';
import { ScoreBadge } from '@/components/matching/MatchScore';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useMatchingEvidence } from '@/hooks/useMatchingEvidence';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { crmService, type Proposal } from '@/lib/services/crm.service';
import { opportunityToOffer, hasSkills } from '@/lib/matching/opportunity-offer';
import { needFromJobOffer } from '@/lib/matching/needs';
import { leadSentence, type MatchNeed } from '@/lib/matching/engine';
import { rankForNeed } from '@/lib/matching/rank';
import { availabilityOf } from '@/lib/talents/filters';
import { SENIORITY_LABEL } from '@/constants';
import { formatDate, formatEur } from '@/lib/format';
import { languageName } from '@/lib/utils/text';
import { cn } from '@/lib/utils';
import type { JobOffer, Opportunity } from '@/types';

const PAGE = 8;
const REMOTE_LABEL = { onsite: { fr: 'sur site', en: 'on site' }, hybrid: { fr: 'hybride', en: 'hybrid' }, remote: { fr: 'télétravail complet', en: 'fully remote' } } as const;

/** Ce que le moteur a lu du besoin, en une ligne (transparence du calcul). */
function NeedSummary({ need, lang }: { need: MatchNeed; lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const parts = [
    need.mandatory.length ? (fr ? `${need.mandatory.length} exigence${need.mandatory.length > 1 ? 's' : ''} obligatoire${need.mandatory.length > 1 ? 's' : ''}` : `${need.mandatory.length} mandatory`) : null,
    need.optional.length ? (fr ? `${need.optional.length} appréciée${need.optional.length > 1 ? 's' : ''}` : `${need.optional.length} nice-to-have`) : null,
    need.languages.length ? need.languages.map((l) => languageName(l, lang)).join(', ') : null,
    need.seniority ? SENIORITY_LABEL[need.seniority] : need.minYears != null ? (fr ? `${need.minYears} ans et +` : `${need.minYears}+ yrs`) : null,
    need.startDate ? (fr ? `démarrage ${formatDate(need.startDate, lang, 'short')}` : `start ${formatDate(need.startDate, lang, 'short')}`) : null,
    [need.location, need.remote ? REMOTE_LABEL[need.remote][lang] : null].filter(Boolean).join(', ') || null,
    need.rateMax != null ? (fr ? `TJM cible ${formatEur(need.rateMax, lang)}` : `target rate ${formatEur(need.rateMax, lang)}`) : null,
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-2 rounded-xl bg-app-sand/50 px-3 py-2 text-[12.5px] text-muted-foreground">
      <ScanSearch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-terra" />
      <span>
        <span className="font-medium text-foreground">{fr ? 'Besoin lu : ' : 'Requirement read: '}</span>
        {parts.join(' · ')}
        {need.mandatory.length > 0 && <span className="block truncate text-[12px]">{need.mandatory.join(', ')}</span>}
      </span>
    </div>
  );
}

/**
 * Profils d'une opportunité : ceux déjà proposés (avec leur score) et le
 * classement Matching IA des autres, expliqué critère par critère.
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
  const { can } = usePermissions();
  const showRates = can('consultants.financials') || can('finance.view');
  const { byId: companies } = useCompaniesLite();
  const companyName = opp.company_id ? (companies.get(opp.company_id)?.name ?? null) : null;
  const today = new Date().toISOString().slice(0, 10);
  const dossierHref = (consultantId: string) =>
    `/cv-optimizer?consultantId=${consultantId}&opportunityId=${opp.id}${opp.job_offer_id ? `&offerId=${opp.job_offer_id}` : ''}`;
  const { consultants, skillsByConsultant, loading: poolLoading } = useMatchingPool();
  const { evidence } = useMatchingEvidence();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [withPool, setWithPool] = useState(true);
  const [onlySoon, setOnlySoon] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const { data: proposals, setData: setProposals, loading } = useCachedQuery<Proposal[]>(
    `proposals:${opp.id}`,
    async () => (await crmService.proposals(opp.id)).data ?? [],
    { enabled: !!opp.id },
  );

  const proposedIds = useMemo(() => new Set((proposals ?? []).map((p) => p.consultant_id)), [proposals]);
  const matchable = hasSkills(opp, offer);
  const need = useMemo(() => needFromJobOffer(opportunityToOffer(opp, offer), companyName), [opp, offer, companyName]);
  const ranked = useMemo(() => {
    if (!matchable || consultants.length === 0) return [];
    const pool = withPool ? consultants : consultants.filter((c) => !c.is_prospect);
    const list = rankForNeed(need, pool, skillsByConsultant, { limit: 80, minScore: 20, excludeIds: proposedIds, evidence, today });
    return onlySoon
      ? list.filter((r) => {
          const a = availabilityOf(r.consultant, today);
          return a.kind === 'now' || a.kind === 'soon';
        })
      : list;
  }, [matchable, consultants, skillsByConsultant, need, proposedIds, evidence, today, withPool, onlySoon]);
  // Score des profils déjà proposés, pour comparer d'un coup d'œil.
  const proposedScores = useMemo(() => {
    if (!matchable || proposedIds.size === 0) return new Map<string, number>();
    const list = rankForNeed(need, consultants.filter((c) => proposedIds.has(c.id)), skillsByConsultant, { limit: proposedIds.size, evidence, today });
    return new Map(list.map((r) => [r.consultant.id, r.breakdown.score]));
  }, [matchable, proposedIds, need, consultants, skillsByConsultant, evidence, today]);

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

  const toggle = (on: boolean, label: string, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors', on ? 'border-app-terra bg-app-terra text-white' : 'border-border bg-card text-foreground hover:border-app-terra/40')}
    >
      {label}
    </button>
  );

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
            <p className="text-[13px] text-muted-foreground">{fr ? 'Aucun profil proposé au client pour le moment.' : 'No profile sent to the client yet.'}</p>
          ) : (
            <ul className="divide-y divide-border">
              {(proposals ?? []).map((p) => {
                const score = proposedScores.get(p.consultant_id);
                return (
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
                    {score != null && <ScoreBadge score={score} />}
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
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <section aria-label={fr ? 'Matching IA' : 'AI matching'} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="h-4 w-4 text-app-terra" />
              {fr ? 'Matching IA' : 'AI matching'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {fr
                ? 'Score sur 100 : compétences clés 40, expérience 20, disponibilité 15, localisation 10, TJM 10, mission similaire 5.'
                : 'Score out of 100: key skills 40, experience 20, availability 15, location 10, day rate 10, similar mission 5.'}
            </p>
          </div>
          {matchable && (
            <div className="flex flex-wrap gap-1.5">
              {toggle(withPool, fr ? 'Vivier inclus' : 'Include pool', () => setWithPool((v) => !v))}
              {toggle(onlySoon, fr ? 'Libres sous 30 j' : 'Free within 30 d', () => setOnlySoon((v) => !v))}
            </div>
          )}
        </div>

        {matchable && <NeedSummary need={need} lang={lang} />}

        {!matchable ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground">
            {fr ? 'Renseignez les compétences recherchées sur l’opportunité pour obtenir un classement.' : 'Add the required skills on the opportunity to get a ranking.'}
          </p>
        ) : poolLoading && consultants.length === 0 ? (
          <SkeletonRows rows={4} />
        ) : ranked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground">
            {fr ? 'Aucun profil ne correspond suffisamment à ce besoin avec ces filtres.' : 'No profile matches this requirement well enough with these filters.'}
          </p>
        ) : (
          <>
            <ul className="space-y-2.5">
              {ranked.slice(0, shown).map((r, i) => {
                const c = r.consultant;
                const next = ranked[i + 1];
                const name = `${c.first_name} ${c.last_name}`;
                return (
                  <MatchRow
                    key={c.id}
                    rank={i + 1}
                    result={r.breakdown}
                    lang={lang}
                    showRates={showRates}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                    title={
                      <Link href={`/consultants/${c.id}`} className="hover:text-primary-deep">
                        {name}
                        {c.is_prospect && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({fr ? 'vivier' : 'pool'})</span>}
                      </Link>
                    }
                    aside={
                      <>
                        <AvailabilityBadge availability={availabilityOf(c, today)} lang={lang} />
                        {showRates && c.daily_rate_eur ? <span className="num text-[12px] text-muted-foreground">{formatEur(Number(c.daily_rate_eur), lang)}</span> : null}
                      </>
                    }
                    subtitle={[c.job_title, c.seniority ? SENIORITY_LABEL[c.seniority] : null, c.city].filter(Boolean).join(' · ')}
                    lead={next ? leadSentence(r.breakdown, next.breakdown, `${next.consultant.first_name} ${next.consultant.last_name}`, lang) : null}
                    actions={
                      <>
                        {canEdit && (
                          <Button size="sm" onClick={() => void propose(c.id)}>
                            <UserPlus />
                            {fr ? 'Positionner' : 'Position'}
                          </Button>
                        )}
                        <Button asChild variant="secondary" size="sm">
                          <Link href={dossierHref(c.id)}>
                            <FileText />
                            {fr ? 'Dossier adapté' : 'Tailored dossier'}
                          </Link>
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </ul>
            {ranked.length > shown && (
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                  {fr ? `Afficher ${Math.min(PAGE, ranked.length - shown)} profils de plus` : `Show ${Math.min(PAGE, ranked.length - shown)} more`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
