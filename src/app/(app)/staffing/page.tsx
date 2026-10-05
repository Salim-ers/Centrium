'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, ChevronLeft, ChevronRight, Gauge, Maximize2, Minimize2, Search, SlidersHorizontal, UserMinus, UserPlus } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip } from '@/components/app/StatStrip';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/label';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffingPlanning, PlanningLegend } from '@/components/staffing/StaffingPlanning';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useCompaniesLite, useTeamMembers } from '@/hooks/useOrgDirectory';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { loadStaffing, type StaffingData } from '@/lib/staffing/load-staffing';
import { addDays, nextFreeDate, planningWindow, type PlanningScale } from '@/lib/staffing/planning';
import { CONSULTANT_STATUS } from '@/lib/status';
import { formatDate, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SectionTabs } from '@/components/layout/SectionTabs';

/**
 * Staffing · Planning : un vrai planning plein écran. Trois indicateurs,
 * une barre d'outils, le planning occupe le reste ; mode plein écran pour
 * les responsables staffing.
 */
export default function StaffingPage() {
  const router = useRouter();
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
  useEffect(() => {
    if (params.get('tab') === 'matching') {
      const opp = params.get('opportunity');
      router.replace(opp ? `/matching?opportunity=${encodeURIComponent(opp)}` : '/matching');
    }
  }, [params, router]);
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

  // Plein écran (API Fullscreen) : le planning occupe tout l'écran.
  const boardRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === boardRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void boardRef.current?.requestFullscreen?.();
  }
  const advancedCount = (status !== 'all' ? 1 : 0) + (owner !== 'all' ? 1 : 0) + (availability !== 'any' ? 1 : 0) + (city.trim() ? 1 : 0);
  // Sur mobile, compétence et client passent aussi dans le tiroir.
  const mobileCount = advancedCount + (skill.trim() ? 1 : 0) + (client !== 'all' ? 1 : 0);

  return (
    <AppShell fill>
      <PageHeader
        title="Staffing"
        description={fr ? 'Qui est en mission, qui se libère, qui positionner.' : 'Who is staffed, who is freeing up, who to propose.'}
        tabs={<SectionTabs section="staffing" />}
      />

      <StatStrip
        className="mb-3"
        items={[
          {
            label: fr ? `occupation · ${kpis?.capacity ?? '…'} consultants` : `utilisation · ${kpis?.capacity ?? '…'} consultants`,
            value: kpis ? formatPct(kpis.rate, lang, 0) : '…',
            tone: 'terra',
            icon: Gauge,
          },
          { label: fr ? 'en intercontrat' : 'on bench', value: kpis?.bench ?? '…', tone: kpis && kpis.bench > 0 ? 'peach' : 'ivory', icon: UserMinus },
          {
            label: fr ? `libérés sous 30 j · ${kpis?.proposals ?? 0} positionnés` : `free within 30 d · ${kpis?.proposals ?? 0} positioned`,
            value: kpis?.soon ?? '…',
            tone: 'white',
            icon: UserPlus,
          },
        ]}
      />

      <div ref={boardRef} className={cn('flex min-h-[36rem] flex-1 flex-col md:min-h-0', full && 'bg-background p-4')}>
        {/* Barre d'outils unique ; les filtres secondaires vivent dans un tiroir. */}
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-1 rounded-xl border border-app-terra/20 bg-card p-1">
            {(['weeks', 'months'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setScale(sc);
                  setOffset(0);
                }}
                aria-pressed={scale === sc}
                className={cn('h-7 rounded-lg px-3 text-[13px] font-semibold transition-colors', scale === sc ? 'bg-app-terra text-white' : 'text-app-terra-dark hover:bg-app-peach-light')}
              >
                {sc === 'weeks' ? (fr ? 'Semaines' : 'Weeks') : fr ? 'Mois' : 'Months'}
              </button>
            ))}
          </div>
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
          <div className="relative w-full sm:w-48 2xl:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Nom ou poste' : 'Name or title'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
          </div>
          <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={fr ? 'Compétence' : 'Skill'} className="hidden md:block md:w-36 2xl:w-44" aria-label={fr ? 'Compétence' : 'Skill'} />
          <Select value={client} onChange={(e) => setClient(e.target.value)} className="hidden md:block md:w-40 2xl:w-48" aria-label={fr ? 'Client' : 'Client'}>
            <option value="all">{fr ? 'Tous les clients' : 'All clients'}</option>
            {clientOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              // Le tiroir s'affiche hors de l'élément plein écran : on en sort d'abord.
              if (document.fullscreenElement) void document.exitFullscreen();
              setFiltersOpen(true);
            }}
          >
            <SlidersHorizontal />
            {fr ? 'Plus de filtres' : 'More filters'}
            {advancedCount > 0 && <span className="num hidden rounded-full bg-app-terra px-1.5 text-[11px] font-semibold text-white md:inline">{advancedCount}</span>}
            {mobileCount > 0 && <span className="num rounded-full bg-app-terra px-1.5 text-[11px] font-semibold text-white md:hidden">{mobileCount}</span>}
          </Button>
          <Button variant="secondary" onClick={toggleFull} className="ml-auto hidden md:inline-flex" aria-pressed={full}>
            {full ? <Minimize2 /> : <Maximize2 />}
            {full ? (fr ? 'Quitter le plein écran' : 'Exit full screen') : fr ? 'Plein écran' : 'Full screen'}
          </Button>
        </div>

        {loading && !data ? (
          <Skeleton className="min-h-0 w-full flex-1 rounded-[22px]" />
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
          <StaffingPlanning rows={rows} win={win} lang={lang} today={todayIso} fill />
        )}

        <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {fr
              ? `${rows.length} consultant(s) · du ${formatDate(win.start, lang)} au ${formatDate(win.end, lang)} · les plus vite disponibles d’abord`
              : `${rows.length} consultant(s) · ${formatDate(win.start, lang)} to ${formatDate(win.end, lang)} · soonest available first`}
          </p>
          <PlanningLegend lang={lang} />
        </div>
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent side="right" className="sm:max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{fr ? 'Plus de filtres' : 'More filters'}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <div className="space-y-4 md:hidden">
              <Field label={fr ? 'Compétence' : 'Skill'} htmlFor="st-skill">
                <Input id="st-skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={fr ? 'ex. React' : 'e.g. React'} />
              </Field>
              <Field label={fr ? 'Client' : 'Client'} htmlFor="st-client">
                <Select id="st-client" value={client} onChange={(e) => setClient(e.target.value)}>
                  <option value="all">{fr ? 'Tous les clients' : 'All clients'}</option>
                  {clientOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={fr ? 'Disponibilité' : 'Availability'} htmlFor="st-availability">
              <Select id="st-availability" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                <option value="any">{fr ? 'Toute disponibilité' : 'Any availability'}</option>
                <option value="bench">{fr ? 'En intercontrat' : 'On bench'}</option>
                <option value="30">{fr ? 'Libres sous 30 j' : 'Free within 30 d'}</option>
                <option value="60">{fr ? 'Libres sous 60 j' : 'Free within 60 d'}</option>
              </Select>
            </Field>
            <Field label={fr ? 'Statut' : 'Status'} htmlFor="st-status">
              <Select id="st-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">{fr ? 'Tous statuts' : 'All statuses'}</option>
                {Object.entries(CONSULTANT_STATUS)
                  .filter(([k]) => k !== 'archived')
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label[lang]}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={fr ? 'Business manager' : 'Business manager'} htmlFor="st-owner">
              <Select id="st-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="all">{fr ? 'Tous les BM' : 'All BMs'}</option>
                {memberOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={fr ? 'Localisation / mobilité' : 'Location / mobility'} htmlFor="st-city">
              <Input id="st-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={fr ? 'ex. Paris' : 'e.g. Paris'} />
            </Field>
          </DrawerBody>
          <DrawerFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAvailability('any');
                setStatus('all');
                setOwner('all');
                setCity('');
                setSkill('');
                setClient('all');
              }}
            >
              {fr ? 'Réinitialiser' : 'Reset'}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>{fr ? 'Voir le planning' : 'Show planning'}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
