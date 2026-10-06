'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { SkeletonRows } from '@/components/ui/skeleton';
import { AvailabilityBadge } from '@/components/consultants/AvailabilityBadge';
import { ScoreBadge } from '@/components/matching/MatchScore';
import { noteText } from '@/components/matching/MatchBreakdown';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useMatchingEvidence } from '@/hooks/useMatchingEvidence';
import { createClient } from '@/lib/supabase/client';
import { remoteModeOf, type MatchNeed } from '@/lib/matching/engine';
import { needFromJobOffer } from '@/lib/matching/needs';
import { opportunityToOffer } from '@/lib/matching/opportunity-offer';
import { rankForNeed } from '@/lib/matching/rank';
import { rankSkills, availabilityOf } from '@/lib/talents/filters';
import { isoAddDays } from '@/lib/missions/renewal';
import { formatDate } from '@/lib/format';
import type { JobOffer, Mission, Opportunity } from '@/types';

type Props = {
  mission: Pick<Mission, 'id' | 'title' | 'company_id' | 'consultant_id' | 'opportunity_id' | 'end_date' | 'location' | 'remote_policy' | 'daily_rate_eur' | 'renewal_status' | 'status'>;
  companyName: string | null;
  lang: 'fr' | 'en';
  showRates: boolean;
};

/**
 * Relève et renfort : les profils compatibles avec la mission (Matching IA),
 * pour un renfort ou pour prendre la suite à l'échéance. Le besoin est celui
 * de l'opportunité d'origine ; sans elle, les compétences du titulaire.
 */
export function MissionSuccessors({ mission, companyName, lang, showRates }: Props) {
  const fr = lang === 'fr';
  const { consultants, skillsByConsultant, loading } = useMatchingPool();
  const { evidence } = useMatchingEvidence();
  const today = new Date().toISOString().slice(0, 10);

  const { data: origin } = useCachedQuery<{ opp: Opportunity; offer: JobOffer | null } | null>(
    `mission-origin:${mission.opportunity_id ?? 'none'}`,
    async () => {
      if (!mission.opportunity_id) return null;
      const supabase = createClient();
      const { data: opp } = await supabase.from('opportunities').select('*').eq('id', mission.opportunity_id).maybeSingle();
      if (!opp) return null;
      const o = opp as Opportunity;
      const offer = o.job_offer_id ? (((await supabase.from('job_offers').select('*').eq('id', o.job_offer_id).maybeSingle()).data as JobOffer | null) ?? null) : null;
      return { opp: o, offer };
    },
    { enabled: !!mission.opportunity_id },
  );

  // Prise de relais : au lendemain de la fin si la mission n'est pas renouvelée.
  const handover = mission.end_date && mission.renewal_status !== 'confirmed' && mission.end_date >= today ? isoAddDays(mission.end_date, 1) : null;
  const titularSkills = useMemo(() => rankSkills(skillsByConsultant.get(mission.consultant_id) ?? []).slice(0, 6).map((s) => s.name), [skillsByConsultant, mission.consultant_id]);

  const { need, basis } = useMemo((): { need: MatchNeed | null; basis: 'origin' | 'titular' | null } => {
    if (origin?.opp && ((origin.offer?.required_skills?.length ?? 0) > 0 || (origin.opp.required_skills?.length ?? 0) > 0)) {
      return { need: { ...needFromJobOffer(opportunityToOffer(origin.opp, origin.offer), companyName), startDate: handover ?? origin.opp.start_date ?? null }, basis: 'origin' };
    }
    if (titularSkills.length === 0) return { need: null, basis: null };
    const derived: MatchNeed = {
      title: mission.title,
      companyId: mission.company_id,
      companyName,
      mandatory: titularSkills,
      optional: [],
      seniority: null,
      minYears: null,
      startDate: handover,
      location: mission.location ?? null,
      remote: remoteModeOf(mission.remote_policy ?? null),
      rateMax: mission.daily_rate_eur ? Number(mission.daily_rate_eur) : null,
      rateMin: null,
      languages: [],
    };
    return { need: derived, basis: 'titular' };
  }, [origin, titularSkills, mission, companyName, handover]);

  const ranked = useMemo(
    () => (need ? rankForNeed(need, consultants, skillsByConsultant, { limit: 3, minScore: 40, excludeIds: new Set([mission.consultant_id]), evidence, today }) : []),
    [need, consultants, skillsByConsultant, mission.consultant_id, evidence, today],
  );
  const fromOrigin = basis === 'origin';

  return (
    <div className="tile-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-app-terra" />
          {fr ? 'Relève et renfort' : 'Handover and reinforcement'}
        </h3>
        {fromOrigin && origin?.opp && (
          <Link href={`/matching?opportunity=${origin.opp.id}`} className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-app-terra-dark hover:underline">
            {fr ? 'Classement' : 'Ranking'}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <p className="mb-3 text-[11.5px] leading-snug text-muted-foreground">
        {!need
          ? fr
            ? 'Renseignez les compétences du titulaire ou rattachez l’opportunité d’origine.'
            : 'Add the incumbent’s skills or link the original opportunity.'
          : fromOrigin
            ? fr
              ? 'Besoin de l’opportunité d’origine'
              : 'Need of the original opportunity'
            : fr
              ? `Compétences du titulaire : ${titularSkills.join(', ')}`
              : `Incumbent’s skills: ${titularSkills.join(', ')}`}
        {need && handover && (fr ? ` · relève au ${formatDate(handover, lang, 'short')}` : ` · handover on ${formatDate(handover, lang, 'short')}`)}
      </p>
      {!need ? null : loading && consultants.length === 0 ? (
        <SkeletonRows rows={3} />
      ) : ranked.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">{fr ? 'Aucun profil suffisamment compatible.' : 'No profile is compatible enough.'}</p>
      ) : (
        <ul className="space-y-2">
          {ranked.map(({ consultant: c, breakdown }) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <ScoreBadge score={breakdown.score} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <Avatar name={`${c.first_name} ${c.last_name}`} size="xs" />
                  <Link href={`/consultants/${c.id}`} className="truncate text-[13px] font-medium hover:text-app-terra-dark">
                    {c.first_name} {c.last_name}
                  </Link>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <AvailabilityBadge availability={availabilityOf(c, today)} lang={lang} className="h-5 text-[11px]" />
                  {breakdown.strengths[0] && <span className="truncate text-[11.5px] text-muted-foreground">{noteText(breakdown.strengths[0], lang, showRates)}</span>}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
