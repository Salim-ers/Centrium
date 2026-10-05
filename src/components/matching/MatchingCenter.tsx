'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Info, Sparkles, Target } from 'lucide-react';

import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/Combobox';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompaniesLite } from '@/hooks/useOrgDirectory';
import { createClient } from '@/lib/supabase/client';
import { isOpenOpportunity, opportunityAmount } from '@/lib/pilotage/metrics';
import { formatDate, formatEurCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobOffer, Opportunity } from '@/types';

/**
 * Centre de matching : on choisit une opportunité ouverte, Centrium classe
 * les consultants (compétences, disponibilité, TJM, localisation,
 * expérience), explique chaque score, et l'on positionne ou génère le
 * dossier sans quitter l'écran. `?opportunity=` ou `?offerId=` présélectionne.
 */
export function MatchingCenter({ lang }: { lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { byId: companies } = useCompaniesLite();
  const [oppId, setOppId] = useState(params.get('opportunity') ?? '');
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

  const opps = data?.opps ?? [];
  // Ancien lien « matching par fiche de poste » : on ouvre l'opportunité liée.
  const offerOpp = offerParam ? opps.find((o) => o.job_offer_id === offerParam) : undefined;
  useEffect(() => {
    if (!oppId && offerOpp) setOppId(offerOpp.id);
  }, [oppId, offerOpp]);

  const selected = opps.find((o) => o.id === oppId) ?? null;
  const options = opps.map((o) => ({ value: o.id, label: o.title, sublabel: o.company_id ? companies.get(o.company_id)?.name : undefined }));

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col gap-3">
        <div className="shrink-0">
          <label className="mb-1.5 block text-[13px] font-medium" htmlFor="matching-opp">
            {fr ? 'Opportunité à staffer' : 'Opportunity to staff'}
          </label>
          <Combobox id="matching-opp" options={options} value={oppId} onChange={setOppId} placeholder={fr ? 'Choisir une opportunité ouverte' : 'Choose an open opportunity'} />
        </div>
        <ul className="tile-surface no-scrollbar max-h-56 min-h-0 flex-1 divide-y divide-border overflow-y-auto lg:max-h-none">
          {loading && !data && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{fr ? 'Chargement…' : 'Loading…'}</li>}
          {opps.map((o) => {
            const amount = opportunityAmount(o);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setOppId(o.id)}
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
      </aside>

      <section className="no-scrollbar min-h-0 overflow-y-auto">
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
              canEdit={can('opportunities.edit') || can('staffing.edit')}
              organizationId={activeOrgId ?? ''}
            />
          </>
        ) : (
          <EmptyState
            icon={Sparkles}
            title={fr ? 'Choisissez une opportunité' : 'Choose an opportunity'}
            description={
              fr
                ? 'Centrium classe les consultants selon les compétences, la séniorité, la disponibilité, le TJM, les langues et la localisation, et explique chaque score.'
                : 'Centrium ranks consultants by skills, seniority, availability, day rate, languages and location, and explains every score.'
            }
          />
        )}
      </section>
    </div>
  );
}
