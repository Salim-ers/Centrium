'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUpRight, Check, FileText, Info, Sparkles, Target, UserPlus, Users } from 'lucide-react';

import { EmptyState } from '@/components/app/EmptyState';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { StatusPill } from '@/components/ui/status-pill';
import { SkeletonRows } from '@/components/ui/skeleton';
import { AvailabilityBadge } from '@/components/consultants/AvailabilityBadge';
import { MatchRow } from '@/components/matching/MatchRow';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useMatchingEvidence } from '@/hooks/useMatchingEvidence';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { createClient } from '@/lib/supabase/client';
import { crmService } from '@/lib/services/crm.service';
import { hasSkills, opportunityToOffer } from '@/lib/matching/opportunity-offer';
import { needFromJobOffer, profileFromConsultant } from '@/lib/matching/needs';
import { leadSentence, scoreMatch } from '@/lib/matching/engine';
import { stageLabel, stageTone } from '@/lib/crm/pipeline';
import { availabilityOf, availabilitySortKey } from '@/lib/talents/filters';
import { SENIORITY_LABEL } from '@/constants';
import { isOpenOpportunity, opportunityAmount } from '@/lib/pilotage/metrics';
import { formatDate, formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobOffer, Opportunity } from '@/types';

type Mode = 'opportunity' | 'consultant';

/**
 * Centre de matching, dans les deux sens : une opportunité ouverte → les
 * profils classés ; un consultant → les opportunités ouvertes classées.
 * Chaque score est expliqué (critères, forces, écarts, rang) ; on
 * positionne ou génère le dossier sans quitter l'écran.
 * `?opportunity=`, `?offerId=` ou `?consultant=` présélectionnent.
 */
export function MatchingCenter({ lang }: { lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const canEdit = can('opportunities.edit') || can('staffing.edit');
  const showRates = can('consultants.financials') || can('finance.view');
  const { byId: companies } = useCompaniesLite();
  const { consultants, skillsByConsultant, loading: poolLoading } = useMatchingPool();
  const { evidence } = useMatchingEvidence();
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<Mode>(params.get('consultant') ? 'consultant' : 'opportunity');
  const [oppId, setOppId] = useState(params.get('opportunity') ?? '');
  const [consultantId, setConsultantId] = useState(params.get('consultant') ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);
  const offerParam = params.get('offerId');

  const { data, loading } = useCachedQuery<{ opps: Opportunity[]; offers: Record<string, JobOffer> }>(
    `staffing-opps:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data: opps } = await supabase
        .from('opportunities')
        .select('*')
        .eq('organization_id', activeOrgId!)
        .order('updated_at', { ascending: false })
        .limit(1000);
      const open = ((opps ?? []) as Opportunity[]).filter((o) => isOpenOpportunity(o));
      const offerIds = open.map((o) => o.job_offer_id).filter(Boolean) as string[];
      const offers: Record<string, JobOffer> = {};
      if (offerIds.length) {
        const { data: rows } = await supabase.from('job_offers').select('*').in('id', offerIds);
        for (const r of (rows ?? []) as JobOffer[]) offers[r.id] = r;
      }
      return { opps: open, offers };
    },
    { enabled: !!activeOrgId },
  );

  const opps = useMemo(() => data?.opps ?? [], [data]);
  // Ancien lien « matching par fiche de poste » : on ouvre l'opportunité liée.
  const offerOpp = offerParam ? opps.find((o) => o.job_offer_id === offerParam) : undefined;
  useEffect(() => {
    if (!oppId && offerOpp) setOppId(offerOpp.id);
  }, [oppId, offerOpp]);

  function select(next: { mode: Mode; id: string }) {
    setMode(next.mode);
    setExpanded(null);
    if (next.mode === 'opportunity') setOppId(next.id);
    else setConsultantId(next.id);
    const q = next.id ? `?${next.mode}=${next.id}` : next.mode === 'consultant' ? '?consultant=' : '';
    router.replace(`/matching${q}`, { scroll: false });
  }

  // ── Mode opportunité ────────────────────────────────────────────────
  const selected = opps.find((o) => o.id === oppId) ?? null;
  const oppOptions = opps.map((o) => ({ value: o.id, label: o.title, sublabel: o.company_id ? companies.get(o.company_id)?.name : undefined }));

  // ── Mode consultant ─────────────────────────────────────────────────
  const consultant = consultants.find((c) => c.id === consultantId) ?? null;
  const consultantOptions = useMemo(
    () => consultants.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}`, sublabel: [c.job_title, c.is_prospect ? (fr ? 'vivier' : 'pool') : null].filter(Boolean).join(' · ') })),
    [consultants, fr],
  );
  // Les profils à staffer en premier : disponibles, puis bientôt libres.
  const benchList = useMemo(
    () =>
      consultants
        .filter((c) => !c.is_prospect)
        .map((c) => ({ c, a: availabilityOf(c, today) }))
        .filter(({ a }) => a.kind !== 'unavailable')
        .sort((x, y) => availabilitySortKey(x.a).localeCompare(availabilitySortKey(y.a)))
        .slice(0, 60),
    [consultants, today],
  );
  const { data: myProposals, setData: setMyProposals } = useCachedQuery<string[]>(
    `consultant-proposals:${consultantId || 'none'}`,
    async () => {
      const { data: rows } = await createClient().from('opportunity_consultants').select('opportunity_id').eq('consultant_id', consultantId);
      return ((rows ?? []) as Array<{ opportunity_id: string }>).map((r) => r.opportunity_id);
    },
    { enabled: mode === 'consultant' && !!consultantId },
  );
  const proposedTo = useMemo(() => new Set(myProposals ?? []), [myProposals]);
  const matchableOpps = opps.filter((o) => hasSkills(o, o.job_offer_id ? data?.offers[o.job_offer_id] : null));
  const rankedOpps = useMemo(() => {
    if (!consultant) return [];
    const profile = profileFromConsultant(consultant, skillsByConsultant.get(consultant.id) ?? [], evidence ? (evidence.get(consultant.id) ?? { experiences: [], missions: [] }) : null);
    return matchableOpps
      .map((o) => {
        const linked = o.job_offer_id ? (data?.offers[o.job_offer_id] ?? null) : null;
        const need = needFromJobOffer(opportunityToOffer(o, linked), o.company_id ? companies.get(o.company_id)?.name : null);
        return { opp: o, result: scoreMatch(need, profile, { today }) };
      })
      .sort((a, b) => b.result.score - a.result.score);
  }, [consultant, skillsByConsultant, evidence, matchableOpps, data, companies, today]);

  async function propose(opp: Opportunity) {
    if (!consultant || !activeOrgId) return;
    const res = await crmService.propose(opp.id, consultant.id, activeOrgId);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setMyProposals((list) => [...(list ?? []), opp.id]);
    toast.success(fr ? `${consultant.first_name} positionné(e) sur « ${opp.title} »` : `${consultant.first_name} positioned on “${opp.title}”`);
  }

  const modeSwitch = (
    <div role="tablist" aria-label={fr ? 'Sens du matching' : 'Matching direction'} className="inline-flex w-full items-center gap-1 rounded-xl border border-app-terra/20 bg-card p-1">
      {(
        [
          { id: 'opportunity', icon: Target, label: fr ? 'Par opportunité' : 'By opportunity' },
          { id: 'consultant', icon: Users, label: fr ? 'Par consultant' : 'By consultant' },
        ] as const
      ).map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          onClick={() => select({ mode: m.id, id: m.id === 'opportunity' ? oppId : consultantId })}
          className={cn(
            'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors',
            mode === m.id ? 'bg-app-terra text-white shadow-[0_6px_14px_-8px_rgba(198,95,70,.9)]' : 'text-app-terra-dark hover:bg-app-peach-light',
          )}
        >
          <m.icon className="h-3.5 w-3.5" />
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-3">
        <div className="shrink-0 space-y-3">
          {modeSwitch}
          {mode === 'opportunity' ? (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="matching-opp">
                {fr ? 'Opportunité à staffer' : 'Opportunity to staff'}
              </label>
              <Combobox id="matching-opp" options={oppOptions} value={oppId} onChange={(v) => select({ mode: 'opportunity', id: v })} placeholder={fr ? 'Choisir une opportunité ouverte' : 'Choose an open opportunity'} />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium" htmlFor="matching-consultant">
                {fr ? 'Consultant à positionner' : 'Consultant to position'}
              </label>
              <Combobox id="matching-consultant" options={consultantOptions} value={consultantId} onChange={(v) => select({ mode: 'consultant', id: v })} placeholder={fr ? 'Choisir un consultant' : 'Choose a consultant'} />
            </div>
          )}
        </div>

        {mode === 'opportunity' ? (
          <ul className="tile-surface no-scrollbar max-h-56 min-h-0 flex-1 divide-y divide-border overflow-y-auto lg:max-h-none">
            {loading && !data && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</li>}
            {opps.map((o) => {
              const amount = opportunityAmount(o);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => select({ mode: 'opportunity', id: o.id })}
                    aria-pressed={o.id === oppId}
                    className={cn('flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-app-peach-light/60', o.id === oppId && 'bg-app-peach-light')}
                  >
                    <Target className={cn('mt-0.5 h-4 w-4 shrink-0', o.id === oppId ? 'text-app-terra' : 'text-muted-foreground')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{o.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.company_id ? companies.get(o.company_id)?.name : '—'}
                        {o.start_date ? ` · ${fr ? 'début' : 'start'} ${formatDate(o.start_date, lang, 'short')}` : ''}
                      </span>
                    </span>
                    {amount > 0 && <span className="num shrink-0 text-[12px] font-medium text-muted-foreground">{formatEurCompact(amount, lang)}</span>}
                  </button>
                </li>
              );
            })}
            {data && opps.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{fr ? 'Aucune opportunité ouverte.' : 'No open opportunity.'}</li>}
          </ul>
        ) : (
          <div className="tile-surface flex max-h-64 min-h-0 flex-1 flex-col overflow-hidden lg:max-h-none">
            <div className="shrink-0 border-b border-border px-3.5 py-2 text-[12px] font-medium text-muted-foreground">{fr ? 'À staffer en priorité' : 'To staff first'}</div>
            <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {poolLoading && consultants.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</li>}
              {benchList.map(({ c, a }) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select({ mode: 'consultant', id: c.id })}
                    aria-pressed={c.id === consultantId}
                    className={cn('flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-app-peach-light/60', c.id === consultantId && 'bg-app-peach-light')}
                  >
                    <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {c.first_name} {c.last_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{c.job_title}</span>
                    </span>
                    <AvailabilityBadge availability={a} lang={lang} className="shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section className="no-scrollbar min-h-0 overflow-y-auto">
        {mode === 'opportunity' ? (
          <>
            {offerParam && data && !offerOpp && !selected && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-app-peach-light px-3.5 py-2.5 text-[13px] text-app-terra-dark">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {fr
                  ? 'Cette fiche de poste n’est liée à aucune opportunité ouverte : choisissez une opportunité, ou créez-la depuis le CRM.'
                  : 'This job description is not linked to an open opportunity: pick one, or create it from the CRM.'}
              </p>
            )}
            {selected ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[17px] font-semibold">{selected.title}</h2>
                    <p className="truncate text-[12.5px] text-muted-foreground">{selected.company_id ? companies.get(selected.company_id)?.name : ''}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/opportunities/${selected.id}`}>
                      {fr ? 'Ouvrir l’opportunité' : 'Open opportunity'}
                      <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
                <OpportunityMatching
                  opp={selected}
                  offer={selected.job_offer_id ? (data?.offers[selected.job_offer_id] ?? null) : null}
                  lang={lang}
                  canEdit={canEdit}
                  organizationId={activeOrgId ?? ''}
                />
              </>
            ) : (
              <EmptyState
                icon={Sparkles}
                title={fr ? 'Choisissez une opportunité' : 'Choose an opportunity'}
                description={
                  fr
                    ? 'Centrium classe les profils sur 100 — compétences clés, expérience, disponibilité, localisation, TJM, missions similaires — et explique chaque score.'
                    : 'Centrium ranks profiles out of 100 — key skills, experience, availability, location, day rate, similar missions — and explains every score.'
                }
              />
            )}
          </>
        ) : consultant ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[17px] font-semibold">
                    {consultant.first_name} {consultant.last_name}
                  </h2>
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                    {[consultant.job_title, consultant.seniority ? SENIORITY_LABEL[consultant.seniority] : null, consultant.city].filter(Boolean).join(' · ')}
                    <AvailabilityBadge availability={availabilityOf(consultant, today)} lang={lang} />
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/consultants/${consultant.id}`}>
                  {fr ? 'Fiche consultant' : 'Consultant profile'}
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-terra" />
              <span>
                {fr
                  ? `${rankedOpps.length} opportunité${rankedOpps.length > 1 ? 's' : ''} ouverte${rankedOpps.length > 1 ? 's' : ''} classée${rankedOpps.length > 1 ? 's' : ''} pour ce profil.`
                  : `${rankedOpps.length} open opportunit${rankedOpps.length > 1 ? 'ies' : 'y'} ranked for this profile.`}
                {opps.length > matchableOpps.length &&
                  (fr
                    ? ` ${opps.length - matchableOpps.length} sans compétences renseignées ne sont pas classées.`
                    : ` ${opps.length - matchableOpps.length} without required skills are not ranked.`)}
              </span>
            </div>
            {loading && !data ? (
              <SkeletonRows rows={4} />
            ) : rankedOpps.length === 0 ? (
              <EmptyState
                icon={Target}
                title={fr ? 'Aucune opportunité à classer' : 'No opportunity to rank'}
                description={fr ? 'Renseignez les compétences recherchées sur vos opportunités ouvertes.' : 'Add required skills to your open opportunities.'}
              />
            ) : (
              <ul className="space-y-2.5">
                {rankedOpps.map(({ opp: o, result }, i) => {
                  const next = rankedOpps[i + 1];
                  const nextTitle = next ? `« ${next.opp.title.length > 28 ? `${next.opp.title.slice(0, 27)}…` : next.opp.title} »` : '';
                  const proposed = proposedTo.has(o.id);
                  const amount = opportunityAmount(o);
                  return (
                    <MatchRow
                      key={o.id}
                      rank={i + 1}
                      result={result}
                      lang={lang}
                      showRates={showRates}
                      expanded={expanded === o.id}
                      onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                      title={
                        <Link href={`/opportunities/${o.id}`} className="hover:text-primary-deep">
                          {o.title}
                        </Link>
                      }
                      aside={<StatusPill tone={stageTone(o.status)}>{stageLabel(o.status, lang)}</StatusPill>}
                      subtitle={[
                        o.company_id ? companies.get(o.company_id)?.name : null,
                        amount > 0 ? formatEurCompact(amount, lang) : null,
                        o.start_date ? (fr ? `début ${formatDate(o.start_date, lang, 'short')}` : `start ${formatDate(o.start_date, lang, 'short')}`) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      lead={next ? leadSentence(result, next.result, nextTitle, lang) : null}
                      actions={
                        <>
                          {canEdit &&
                            (proposed ? (
                              <Button size="sm" variant="secondary" disabled>
                                <Check />
                                {fr ? 'Déjà positionné' : 'Already positioned'}
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => void propose(o)}>
                                <UserPlus />
                                {fr ? 'Positionner' : 'Position'}
                              </Button>
                            ))}
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/cv-optimizer?consultantId=${consultant.id}&opportunityId=${o.id}${o.job_offer_id ? `&offerId=${o.job_offer_id}` : ''}`}>
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
            )}
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={fr ? 'Choisissez un consultant' : 'Choose a consultant'}
            description={
              fr
                ? 'Centrium classe les opportunités ouvertes pour ce profil, avec le même score sur 100 et ses explications.'
                : 'Centrium ranks open opportunities for this profile, with the same explained score out of 100.'
            }
          />
        )}
      </section>
    </div>
  );
}
