'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarRange, ChevronLeft, ChevronRight, Search, Sparkles, Target } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/Combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffingPlanning, PlanningLegend } from '@/components/staffing/StaffingPlanning';
import { OpportunityMatching } from '@/components/matching/OpportunityMatching';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadStaffing, type StaffingData } from '@/lib/staffing/load-staffing';
import { addDays, nextFreeDate, planningWindow, type PlanningScale } from '@/lib/staffing/planning';
import { isOpenOpportunity } from '@/lib/pilotage/metrics';
import { CONSULTANT_STATUS } from '@/lib/status';
import { formatDate, formatPct } from '@/lib/format';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import type { JobOffer, Opportunity } from '@/types';

export default function StaffingPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can, ready } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const { byId: companies } = useCompaniesLite();
  const { options: memberOptions } = useTeamMembers();
  const { skillsByConsultant } = useMatchingPool();

  const view = params.get('view');
  const [tab, setTab] = useState(params.get('tab') === 'matching' ? 'matching' : 'planning');
  const [scale, setScale] = useState<PlanningScale>('weeks');
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const [owner, setOwner] = useState('all');
  const [client, setClient] = useState('all');
  const [status, setStatus] = useState('all');
  const [availability, setAvailability] = useState(view === 'bench' ? 'bench' : view === 'soon' ? '30' : 'any');
  const [city, setCity] = useState('');

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const win = useMemo(() => planningWindow(scale, today, offset), [scale, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading } = useCachedQuery<StaffingData>(
    `staffing:${activeOrgId ?? 'none'}:${win.start}:${win.end}`,
    () => loadStaffing(createClient(), activeOrgId!, { start: win.start, end: win.end }, can('timesheets.view'), can('opportunities.view')),
    { enabled: !!activeOrgId && ready },
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const sk = skill.trim().toLowerCase();
    const ct = city.trim().toLowerCase();
    const in30 = addDays(todayIso, 30);
    const in60 = addDays(todayIso, 60);
    return data.consultants
      .map((c) => ({
        consultant: c,
        missions: data.missions.filter((m) => m.consultant_id === c.id),
        leaves: data.leaves[c.id] ?? [],
        proposals: data.proposals.filter((p) => p.consultant_id === c.id),
      }))
      .filter((r) => {
        const c = r.consultant;
        if (q && !`${c.first_name} ${c.last_name} ${c.job_title ?? ''}`.toLowerCase().includes(q)) return false;
        if (owner !== 'all' && c.owner_id !== owner) return false;
        if (status !== 'all' && c.status !== status) return false;
        if (ct && !`${c.city ?? ''} ${c.mobility ?? ''}`.toLowerCase().includes(ct)) return false;
        if (client !== 'all' && !r.missions.some((m) => m.company_id === client && m.status === 'active')) return false;
        if (sk && !(skillsByConsultant.get(c.id) ?? []).some((s) => s.name.toLowerCase().includes(sk))) return false;
        const free = nextFreeDate(r.missions, todayIso);
        if (availability === 'bench' && !(free === todayIso && c.status !== 'unavailable')) return false;
        if (availability === '30' && !(free && free <= in30)) return false;
        if (availability === '60' && !(free && free <= in60)) return false;
        return true;
      })
      .sort((a, b) => {
        // Les plus vite disponibles d'abord : c'est la question du staffing.
        const fa = nextFreeDate(a.missions, todayIso) ?? '9999';
        const fb = nextFreeDate(b.missions, todayIso) ?? '9999';
        return fa.localeCompare(fb) || a.consultant.last_name.localeCompare(b.consultant.last_name);
      });
  }, [data, query, skill, owner, status, city, client, availability, skillsByConsultant, todayIso]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const pool = data.consultants.filter((c) => c.status !== 'unavailable');
    const staffed = pool.filter((c) => data.missions.some((m) => m.consultant_id === c.id && m.status === 'active' && m.start_date <= todayIso && (!m.end_date || m.end_date >= todayIso)));
    const in30 = addDays(todayIso, 30);
    const soon = pool.filter((c) => {
      const f = nextFreeDate(data.missions.filter((m) => m.consultant_id === c.id), todayIso);
      return f && f > todayIso && f <= in30;
    });
    return {
      capacity: pool.length,
      bench: pool.length - staffed.length,
      soon: soon.length,
      rate: pool.length ? (staffed.length / pool.length) * 100 : null,
      proposals: new Set(data.proposals.map((p) => p.consultant_id)).size,
    };
  }, [data, todayIso]);

  const clientOptions = useMemo(() => {
    const ids = new Set((data?.missions ?? []).filter((m) => m.status === 'active' && m.company_id).map((m) => m.company_id!));
    return [...ids].map((id) => ({ value: id, label: companies.get(id)?.name ?? '—' })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data, companies]);

  return (
    <AppShell wide>
      <PageHeader
        eyebrow={fr ? 'Ressources' : 'Resources'}
        title="Staffing"
        description={fr ? 'Qui est en mission, qui se libère, qui positionner.' : 'Who is staffed, who is freeing up, who to propose.'}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="underline">
            <TabsTrigger value="planning">
              <CalendarRange />
              Planning
            </TabsTrigger>
            <TabsTrigger value="matching">
              <Sparkles />
              Matching
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>
      <RelatedLinks
        links={[
          { href: '/matching', label: { fr: 'Matching par offre', en: 'Matching by job offer' }, permission: 'staffing.view' },
          { href: '/en-mission', label: { fr: 'Consultants en mission', en: 'Consultants on assignment' }, permission: 'missions.view' },
        ]}
      />

      {tab === 'planning' ? (
        <>
          <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KPICard label={fr ? 'Capacité' : 'Capacity'} value={kpis?.capacity} hint={fr ? 'Hors indisponibles' : 'Excluding unavailable'} loading={!kpis} />
            <KPICard label={fr ? "Taux d'occupation" : 'Utilisation'} valueText={formatPct(kpis?.rate, lang)} loading={!kpis} />
            <KPICard label={fr ? 'Intercontrat' : 'On bench'} value={kpis?.bench} tone={kpis && kpis.bench > 0 ? 'amber' : 'neutral'} loading={!kpis} />
            <KPICard label={fr ? 'Libérés sous 30 j' : 'Free within 30 d'} value={kpis?.soon} loading={!kpis} />
            <KPICard label={fr ? 'Positionnés' : 'Positioned'} value={kpis?.proposals} hint={fr ? 'Sur des opportunités ouvertes' : 'On open opportunities'} loading={!kpis} />
          </section>

          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Nom ou poste' : 'Name or title'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
            </div>
            <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={fr ? 'Compétence' : 'Skill'} aria-label={fr ? 'Compétence' : 'Skill'} />
            <Select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label={fr ? 'Disponibilité' : 'Availability'}>
              <option value="any">{fr ? 'Toute disponibilité' : 'Any availability'}</option>
              <option value="bench">{fr ? 'En intercontrat' : 'On bench'}</option>
              <option value="30">{fr ? 'Libres sous 30 j' : 'Free within 30 d'}</option>
              <option value="60">{fr ? 'Libres sous 60 j' : 'Free within 60 d'}</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={fr ? 'Statut' : 'Status'}>
              <option value="all">{fr ? 'Tous statuts' : 'All statuses'}</option>
              {Object.entries(CONSULTANT_STATUS)
                .filter(([k]) => k !== 'archived')
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label[lang]}
                  </option>
                ))}
            </Select>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Business Manager">
              <option value="all">{fr ? 'Tous les BM' : 'All BMs'}</option>
              {memberOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select value={client} onChange={(e) => setClient(e.target.value)} aria-label={fr ? 'Client' : 'Client'}>
              <option value="all">{fr ? 'Tous les clients' : 'All clients'}</option>
              {clientOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tabs value={scale} onValueChange={(v) => { setScale(v as PlanningScale); setOffset(0); }}>
                <TabsList>
                  <TabsTrigger value="weeks">{fr ? 'Semaines' : 'Weeks'}</TabsTrigger>
                  <TabsTrigger value="months">{fr ? 'Mois' : 'Months'}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center">
                <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o - (scale === 'weeks' ? 4 : 3))} aria-label={fr ? 'Période précédente' : 'Previous period'}>
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
                  {fr ? "Aujourd'hui" : 'Today'}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o + (scale === 'weeks' ? 4 : 3))} aria-label={fr ? 'Période suivante' : 'Next period'}>
                  <ChevronRight />
                </Button>
              </div>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={fr ? 'Localisation / mobilité' : 'Location / mobility'} className="hidden h-8 w-48 md:flex" aria-label={fr ? 'Localisation' : 'Location'} />
            </div>
            <PlanningLegend lang={lang} />
          </div>

          {loading && !data ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title={(data?.consultants.length ?? 0) === 0 ? (fr ? 'Aucun consultant dans l’effectif' : 'No consultants on staff') : fr ? 'Aucun consultant ne correspond' : 'No matching consultant'}
              description={
                (data?.consultants.length ?? 0) === 0
                  ? fr
                    ? 'Ajoutez vos consultants pour visualiser leurs missions et disponibilités.'
                    : 'Add consultants to see their missions and availability.'
                  : fr
                    ? 'Élargissez les filtres.'
                    : 'Broaden the filters.'
              }
            />
          ) : (
            <>
              <StaffingPlanning rows={rows} win={win} lang={lang} today={todayIso} />
              <p className="mt-2 text-xs text-muted-foreground">
                {fr
                  ? `${rows.length} consultant(s) · du ${formatDate(win.start, lang)} au ${formatDate(win.end, lang)} · triés par date de disponibilité`
                  : `${rows.length} consultant(s) · ${formatDate(win.start, lang)} to ${formatDate(win.end, lang)} · sorted by availability date`}
              </p>
            </>
          )}
        </>
      ) : (
        <MatchingWorkspace lang={lang} />
      )}
    </AppShell>
  );
}

/** Choisir une opportunité ouverte et obtenir les consultants les plus pertinents. */
function MatchingWorkspace({ lang }: { lang: 'fr' | 'en' }) {
  const fr = lang === 'fr';
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { byId: companies } = useCompaniesLite();
  const [oppId, setOppId] = useState(params.get('opportunity') ?? '');

  const { data } = useCachedQuery<{ opps: Opportunity[]; offers: Record<string, JobOffer> }>(
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
  const selected = opps.find((o) => o.id === oppId) ?? null;
  const options = opps.map((o) => ({
    value: o.id,
    label: o.title,
    sublabel: o.company_id ? companies.get(o.company_id)?.name : undefined,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium" htmlFor="matching-opp">
            {fr ? 'Opportunité à staffer' : 'Opportunity to staff'}
          </label>
          <Combobox id="matching-opp" options={options} value={oppId} onChange={setOppId} placeholder={fr ? 'Choisir une opportunité ouverte' : 'Choose an open opportunity'} />
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {opps.slice(0, 12).map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setOppId(o.id)}
                aria-pressed={o.id === oppId}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 aria-pressed:bg-brand-50/60"
              >
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{o.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.company_id ? companies.get(o.company_id)?.name : '—'}
                    {o.start_date ? ` · ${fr ? 'début' : 'start'} ${formatDate(o.start_date, lang, 'short')}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {opps.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{fr ? 'Aucune opportunité ouverte.' : 'No open opportunity.'}</li>}
        </ul>
      </aside>
      <div className="min-w-0">
        {selected ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="truncate font-display text-base font-semibold">{selected.title}</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/opportunities/${selected.id}`}>{fr ? 'Ouvrir la fiche' : 'Open'}</Link>
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
      </div>
    </div>
  );
}
