'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Briefcase, CalendarClock, DoorOpen, Eye, FileText, FileUp, Plus, Search, SlidersHorizontal, Sparkles, Target, UserCheck, Users, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { SavedViews } from '@/components/app/SavedViews';
import { StatStrip } from '@/components/app/StatStrip';
import { ConsultantQuickView } from '@/components/consultants/ConsultantQuickView';
import { AvailabilityBadge } from '@/components/consultants/AvailabilityBadge';
import { SkillChips } from '@/components/consultants/SkillChips';
import { SkillFilterInput } from '@/components/consultants/SkillFilterInput';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Field } from '@/components/ui/label';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useMatchingPool } from '@/hooks/useMatchingPool';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { consultantService, type ConsultantListItem } from '@/lib/services/consultant.service';
import { CONSULTANT_STATUS, statusOf } from '@/lib/status';
import { SENIORITY_LABEL } from '@/constants';
import {
  DEFAULT_TALENT_FILTERS,
  advancedFilterCount,
  availabilityOf,
  availabilitySortKey,
  filterOptions,
  fromViewFilters,
  hasActiveFilters,
  languageName,
  matchesTalent,
  rankSkills,
  toViewFilters,
  type TalentFilters,
  type TalentScope,
} from '@/lib/talents/filters';
import { formatEur, formatPct } from '@/lib/format';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import { SectionTabs } from '@/components/layout/SectionTabs';
import { cn } from '@/lib/utils';
import type { SeniorityLevel } from '@/types';

const CONTRACT_LABEL: Record<string, { fr: string; en: string }> = {
  freelance: { fr: 'Freelance', en: 'Freelance' },
  cdi: { fr: 'CDI', en: 'Permanent' },
  cdd: { fr: 'CDD', en: 'Fixed-term' },
  portage: { fr: 'Portage', en: 'Umbrella' },
  partner_esn: { fr: 'ESN partenaire', en: 'Partner firm' },
};
const SENIORITIES = Object.keys(SENIORITY_LABEL) as SeniorityLevel[];
const MIN_YEARS = [2, 5, 8, 12];

/** Lien-icône d'une ligne (dossier, matching, mission). */
function RowShortcut({ href, label, icon: Icon }: { href: string; label: string; icon: typeof FileText }) {
  return (
    <Tooltip label={label}>
      <Link
        href={href}
        aria-label={label}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-app-peach-light hover:text-app-terra-dark focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon className="h-4 w-4" />
      </Link>
    </Tooltip>
  );
}

export default function ConsultantsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canEdit = can('consultants.edit');
  const showRates = can('consultants.financials') || can('finance.view');
  const { skillsByConsultant } = useMatchingPool();

  const [scope, setScope] = useState<TalentScope>('staff');
  const [filters, setFilters] = useState<TalentFilters>(DEFAULT_TALENT_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; prospect: boolean }>({ open: params.get('new') === '1', prospect: false });
  const [csvOpen, setCsvOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Aperçu dans un tiroir ; la fiche complète reste à un clic.
  const [quickId, setQuickId] = useState<string | null>(null);
  const set = <K extends keyof TalentFilters>(key: K, value: TalentFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const { data, loading, reload, setData } = useCachedQuery<ConsultantListItem[]>(
    `consultants-v2:${activeOrgId ?? 'none'}:${scope}`,
    async () => {
      const res = await consultantService.list(
        scope === 'archived'
          ? { archived: true, is_prospect: 'all' }
          : scope === 'pool'
            ? { is_prospect: true }
            : scope === 'positioned'
              ? { is_prospect: 'all', cv_pushed: true }
              : { is_prospect: false },
      );
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) if (c.owner) m.set(c.owner.id, `${c.owner.first_name ?? ''} ${c.owner.last_name ?? ''}`.trim() || c.owner.email);
    return [...m.entries()];
  }, [data]);
  const options = useMemo(() => filterOptions(data ?? []), [data]);
  // Compétences connues, les plus fréquentes d'abord (suggestions de saisie).
  const skillSuggestions = useMemo(() => {
    const count = new Map<string, { name: string; n: number }>();
    for (const list of skillsByConsultant.values())
      for (const s of list) {
        const k = s.name.trim().toLowerCase();
        const cur = count.get(k);
        if (cur) cur.n += 1;
        else count.set(k, { name: s.name.trim(), n: 1 });
      }
    return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((x) => x.name);
  }, [skillsByConsultant]);

  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(
    () => (data ?? []).filter((c) => matchesTalent(c, skillsByConsultant.get(c.id) ?? [], filters, today)),
    [data, filters, skillsByConsultant, today],
  );

  const kpis = useMemo(() => {
    const list = scope === 'staff' ? (data ?? []) : [];
    const pool = list.filter((c) => c.status !== 'unavailable');
    const onMission = list.filter((c) => c.status === 'on_mission').length;
    const kinds = list.map((c) => availabilityOf(c, today));
    const available = kinds.filter((a) => a.kind === 'now').length;
    const soon = kinds.filter((a) => a.kind === 'soon').length;
    return { total: list.length, onMission, available, soon, bench: pool.length ? (available / pool.length) * 100 : null };
  }, [data, scope, today]);

  async function archive(ids: string[], restore = false) {
    const res = restore ? await consultantService.unarchiveMany(ids) : await consultantService.archiveMany(ids);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setData((list) => (list ?? []).filter((c) => !ids.includes(c.id)));
    setSelected(new Set());
    toast.success(
      restore
        ? fr ? `${ids.length} profil(s) restauré(s)` : `${ids.length} profile(s) restored`
        : fr ? `${ids.length} profil(s) archivé(s)` : `${ids.length} profile(s) archived`,
    );
  }

  const currentMission = (c: ConsultantListItem) => c.active_missions.find((x) => x.status === 'active') ?? c.active_missions[0] ?? null;

  const columns: Column<ConsultantListItem>[] = [
    {
      id: 'name',
      header: 'Consultant',
      mobile: 'title',
      sortValue: (c) => `${c.last_name} ${c.first_name}`,
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">
              {c.first_name} {c.last_name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {[c.job_title, c.seniority ? SENIORITY_LABEL[c.seniority] : null, c.years_experience ? (fr ? `${c.years_experience} ans` : `${c.years_experience} yrs`) : null].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'availability',
      header: fr ? 'Disponibilité' : 'Availability',
      mobile: 'trailing',
      sortValue: (c) => availabilitySortKey(availabilityOf(c, today)),
      cell: (c) => <AvailabilityBadge availability={availabilityOf(c, today)} lang={lang} />,
    },
    {
      id: 'mission',
      header: 'Mission',
      mobile: 'meta',
      sortValue: (c) => currentMission(c)?.title ?? '',
      cell: (c) => {
        const m = currentMission(c);
        if (!m) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="block min-w-0 max-w-[15rem]">
            <Link href={`/missions/${m.id}`} className="block truncate text-[13px] text-foreground hover:text-primary-deep hover:underline">
              {m.title}
            </Link>
            {c.current_client && <span className="block truncate text-xs text-muted-foreground">{c.current_client}</span>}
          </span>
        );
      },
    },
    {
      id: 'skills',
      header: fr ? 'Compétences' : 'Skills',
      hideOnMobile: true,
      cell: (c) => <SkillChips skills={rankSkills(skillsByConsultant.get(c.id) ?? [], filters.skills)} max={4} lang={lang} />,
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      hideOnMobile: true,
      defaultHidden: true,
      sortValue: (c) => c.status,
      cell: (c) => {
        const s = statusOf(CONSULTANT_STATUS, c.status, lang);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
    {
      id: 'city',
      header: fr ? 'Ville' : 'City',
      hideOnMobile: true,
      sortValue: (c) => c.city ?? '',
      cell: (c) => (
        <span className="block max-w-[10rem] truncate text-[13px] text-muted-foreground" title={c.mobility ? (fr ? `Mobilité : ${c.mobility}` : `Mobility: ${c.mobility}`) : undefined}>
          {c.city ?? '—'}
          {c.mobility && <span className="block truncate text-[11.5px]">{c.mobility}</span>}
        </span>
      ),
    },
    ...(showRates
      ? ([
          {
            id: 'rate',
            header: 'TJM',
            align: 'right',
            hideOnMobile: true,
            sortValue: (c) => Number(c.daily_rate_eur ?? 0),
            cell: (c) => <span className="num text-[13px]">{c.daily_rate_eur ? formatEur(Number(c.daily_rate_eur), lang) : '—'}</span>,
          },
        ] as Column<ConsultantListItem>[])
      : []),
    {
      id: 'portal',
      header: <span className="sr-only">{fr ? 'Portail' : 'Portal'}</span>,
      hideOnMobile: true,
      defaultHidden: true,
      cell: (c) =>
        c.has_portal ? (
          <Tooltip label={fr ? 'Accès au portail consultant actif' : 'Consultant portal access active'}>
            <span className="inline-flex text-muted-foreground" aria-label={fr ? 'Accès portail' : 'Portal access'}>
              <DoorOpen className="h-4 w-4" />
            </span>
          </Tooltip>
        ) : null,
    },
    {
      id: 'shortcuts',
      header: <span className="sr-only">{fr ? 'Accès rapides' : 'Shortcuts'}</span>,
      hideOnMobile: true,
      hideable: false,
      align: 'right',
      cell: (c) => {
        const m = currentMission(c);
        return (
          <span className="flex items-center justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
            <RowShortcut href={`/consultants/${c.id}/dossier`} label={fr ? 'Dossier de compétences' : 'Skills dossier'} icon={FileText} />
            <RowShortcut href={`/matching?consultant=${c.id}`} label={fr ? 'Matching IA : opportunités compatibles' : 'AI matching: fitting opportunities'} icon={Sparkles} />
            {m ? <RowShortcut href={`/missions/${m.id}`} label={fr ? `Mission : ${m.title}` : `Mission: ${m.title}`} icon={Briefcase} /> : <span className="inline-block h-7 w-7" aria-hidden />}
          </span>
        );
      },
    },
  ];

  const isEmptyScope = !loading && (data ?? []).length === 0;
  const advancedCount = advancedFilterCount(filters);
  const quick = quickId ? ((data ?? []).find((c) => c.id === quickId) ?? null) : null;
  const scopes: Array<{ id: TalentScope; label: string }> = [
    { id: 'staff', label: fr ? 'Effectif' : 'Staff' },
    { id: 'pool', label: fr ? 'Vivier' : 'Talent pool' },
    { id: 'positioned', label: fr ? 'Positionnés' : 'Positioned' },
    { id: 'archived', label: fr ? 'Archivés' : 'Archived' },
  ];
  const availabilityLabel = { now: fr ? 'Disponible maintenant' : 'Available now', '30': fr ? 'Libre sous 30 jours' : 'Free within 30 days', '60': fr ? 'Libre sous 60 jours' : 'Free within 60 days' };

  // Filtres actifs, chacun retirable d'un clic.
  const chips: Array<{ key: string; label: string; clear: () => void }> = [
    ...filters.skills.map((s) => ({ key: `skill:${s}`, label: s, clear: () => set('skills', filters.skills.filter((x) => x !== s)) })),
    ...(filters.availability !== 'any' ? [{ key: 'availability', label: availabilityLabel[filters.availability], clear: () => set('availability', 'any') }] : []),
    ...(filters.status !== 'all' ? [{ key: 'status', label: statusOf(CONSULTANT_STATUS, filters.status, lang).label, clear: () => set('status', 'all') }] : []),
    ...filters.seniority.map((s) => ({ key: `seniority:${s}`, label: SENIORITY_LABEL[s], clear: () => set('seniority', filters.seniority.filter((x) => x !== s)) })),
    ...(filters.minYears != null ? [{ key: 'minYears', label: fr ? `${filters.minYears} ans d’expérience et +` : `${filters.minYears}+ years`, clear: () => set('minYears', null) }] : []),
    ...(filters.city ? [{ key: 'city', label: fr ? `${filters.city} ou mobile` : `${filters.city} or mobile`, clear: () => set('city', '') }] : []),
    ...(filters.language ? [{ key: 'language', label: languageName(filters.language, lang), clear: () => set('language', '') }] : []),
    ...(filters.contract !== 'all' ? [{ key: 'contract', label: CONTRACT_LABEL[filters.contract]?.[lang] ?? filters.contract, clear: () => set('contract', 'all') }] : []),
    ...(filters.rateMax != null ? [{ key: 'rateMax', label: `TJM ≤ ${formatEur(filters.rateMax, lang)}`, clear: () => set('rateMax', null) }] : []),
    ...(filters.owner !== 'all' ? [{ key: 'owner', label: owners.find(([id]) => id === filters.owner)?.[1] ?? (fr ? 'Référent' : 'Owner'), clear: () => set('owner', 'all') }] : []),
    ...(filters.portal !== 'any' ? [{ key: 'portal', label: filters.portal === 'yes' ? (fr ? 'Avec portail' : 'With portal') : fr ? 'Sans portail' : 'Without portal', clear: () => set('portal', 'any') }] : []),
  ];

  return (
    <AppShell fill>
      <PageHeader
        title="Consultants"
        description={
          loading && !data
            ? fr ? 'Chargement…' : 'Loading…'
            : `${rows.length} ${rows.length > 1 ? 'talents' : 'talent'}${scope === 'pool' ? (fr ? ' dans le vivier' : ' in the pool') : scope === 'archived' ? (fr ? ' archivés' : ' archived') : scope === 'positioned' ? (fr ? ' positionnés' : ' positioned') : ''}`
        }
        tabs={
          <div className="flex flex-wrap items-center gap-2">
            <SectionTabs section="talents" />
            <div role="tablist" aria-label={fr ? 'Population' : 'Population'} className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-app-terra/20 bg-card p-1">
              {scopes.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === sc.id}
                  onClick={() => {
                    setScope(sc.id);
                    setSelected(new Set());
                  }}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-semibold transition-colors',
                    scope === sc.id ? 'bg-app-terra text-white shadow-[0_6px_14px_-8px_rgba(198,95,70,.9)]' : 'text-app-terra-dark hover:bg-app-peach-light',
                  )}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        }
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setCsvOpen(true)}>
                <FileUp />
                {fr ? 'Importer' : 'Import'}
              </Button>
              <Button onClick={() => setDialog({ open: true, prospect: scope === 'pool' })}>
                <Plus />
                {scope === 'pool' ? (fr ? 'Ajouter au vivier' : 'Add to pool') : fr ? 'Ajouter' : 'Add'}
              </Button>
            </>
          )
        }
      />

      {scope === 'staff' && (
        <StatStrip
          className="mb-3"
          scrollOnMobile
          items={[
            {
              label: fr ? 'talents' : 'talents',
              value: loading && !data ? '…' : kpis.total,
              tone: 'terra',
              icon: Users,
              ...(hasActiveFilters(filters) ? { onSelect: () => setFilters(DEFAULT_TALENT_FILTERS), title: fr ? 'Retirer tous les filtres' : 'Clear all filters' } : {}),
            },
            {
              label: fr ? `disponibles · intercontrat ${formatPct(kpis.bench, lang, 0)}` : `available · bench ${formatPct(kpis.bench, lang, 0)}`,
              value: loading && !data ? '…' : kpis.available,
              tone: kpis.available ? 'peach' : 'ivory',
              icon: UserCheck,
              onSelect: () => set('availability', filters.availability === 'now' ? 'any' : 'now'),
              active: filters.availability === 'now',
            },
            {
              label: fr ? 'libres sous 30 jours' : 'free within 30 days',
              value: loading && !data ? '…' : kpis.soon,
              tone: 'ivory',
              icon: CalendarClock,
              onSelect: () => set('availability', filters.availability === '30' ? 'any' : '30'),
              active: filters.availability === '30',
              title: fr ? 'Fin de mission ou disponibilité déclarée dans les 30 jours' : 'Mission ending or declared availability within 30 days',
            },
            {
              label: fr ? 'en mission' : 'on mission',
              value: loading && !data ? '…' : kpis.onMission,
              tone: 'white',
              icon: Briefcase,
              onSelect: () => set('status', filters.status === 'on_mission' ? 'all' : 'on_mission'),
              active: filters.status === 'on_mission',
            },
          ]}
        />
      )}

      {/* Barre d'outils unique ; les filtres avancés vivent dans un tiroir. */}
      <div className="mb-2 grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.query} onChange={(e) => set('query', e.target.value)} placeholder={fr ? 'Nom, poste, ville' : 'Name, title, city'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        <SkillFilterInput value={filters.skills} onChange={(v) => set('skills', v)} suggestions={skillSuggestions} lang={lang} className="col-span-2 sm:w-72" />
        <Select value={filters.availability} onChange={(e) => set('availability', e.target.value as TalentFilters['availability'])} className="col-span-2 sm:w-48" aria-label={fr ? 'Disponibilité' : 'Availability'}>
          <option value="any">{fr ? 'Toute disponibilité' : 'Any availability'}</option>
          <option value="now">{availabilityLabel.now}</option>
          <option value="30">{availabilityLabel['30']}</option>
          <option value="60">{availabilityLabel['60']}</option>
        </Select>
        <div className="col-span-2 flex gap-2 sm:ml-auto">
          <SavedViews
            page="consultants"
            current={toViewFilters(scope, filters)}
            defaults={toViewFilters('staff', DEFAULT_TALENT_FILTERS)}
            onApply={(v) => {
              const next = fromViewFilters(v);
              setScope(next.scope);
              setFilters(next.filters);
            }}
          />
          <Button variant="secondary" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal />
            {fr ? 'Filtres' : 'Filters'}
            {advancedCount > 0 && <span className="num rounded-full bg-app-terra px-1.5 text-[11px] font-semibold text-white">{advancedCount}</span>}
          </Button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-2 flex shrink-0 items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={fr ? 'Filtres actifs' : 'Active filters'}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              aria-label={fr ? `Retirer le filtre ${c.label}` : `Remove filter ${c.label}`}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-app-terra/25 bg-app-peach-light/70 pl-2.5 pr-1.5 text-[12px] font-medium text-app-terra-dark transition-colors hover:border-app-terra/50"
            >
              {c.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={() => setFilters(DEFAULT_TALENT_FILTERS)} className="h-7 shrink-0 rounded-full px-2 text-[12px] font-medium text-muted-foreground hover:text-foreground">
            {fr ? 'Tout effacer' : 'Clear all'}
          </button>
        </div>
      )}

      {selected.size > 0 && canEdit && (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-app-terra/20 bg-app-peach-light px-4 py-2">
          <span className="num text-[13px] font-medium">
            {selected.size} {fr ? 'sélectionné(s)' : 'selected'}
          </span>
          <div className="flex gap-2">
            {scope === 'archived' ? (
              <Button size="sm" variant="secondary" onClick={() => void archive([...selected], true)}>
                <ArchiveRestore />
                {fr ? 'Restaurer' : 'Restore'}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void archive([...selected])}>
                <Archive />
                {fr ? 'Archiver' : 'Archive'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        fill
        aria-label="Consultants"
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        rowHref={(c) => `/consultants/${c.id}`}
        onRowClick={(c) => setQuickId(c.id)}
        rowActions={(c) => {
          const m = currentMission(c);
          return [
            { label: fr ? 'Aperçu' : 'Quick view', icon: Eye, onSelect: () => setQuickId(c.id) },
            { label: fr ? 'Générer un dossier' : 'Generate a dossier', icon: FileText, href: `/consultants/${c.id}/dossier` },
            { label: fr ? 'Matching IA : opportunités compatibles' : 'AI matching: fitting opportunities', icon: Sparkles, href: `/matching?consultant=${c.id}` },
            ...(m ? [{ label: fr ? 'Voir la mission en cours' : 'Open the current mission', icon: Briefcase, href: `/missions/${m.id}` }] : []),
            { label: fr ? 'Propositions envoyées' : 'Proposals sent', icon: Target, href: `/consultants/${c.id}?tab=opportunities` },
            ...linkActions(`/consultants/${c.id}`, fr).map((a, i) => (i === 0 ? { ...a, separatorBefore: true } : a)),
          ];
        }}
        tableId="consultants"
        loading={loading && !data}
        selectable={canEdit}
        selected={selected}
        onSelectedChange={setSelected}
        initialSort={{ id: 'name', dir: 'asc' }}
        empty={
          <EmptyState
            icon={Users}
            title={
              isEmptyScope
                ? scope === 'pool'
                  ? fr ? 'Vivier vide' : 'Empty talent pool'
                  : scope === 'archived'
                    ? fr ? 'Aucun profil archivé' : 'No archived profiles'
                    : scope === 'positioned'
                      ? fr ? 'Aucun profil positionné' : 'No positioned profiles'
                      : fr ? 'Aucun consultant' : 'No consultants'
                : fr ? 'Aucun profil pour ces filtres' : 'No profile matches these filters'
            }
            description={
              isEmptyScope && scope === 'staff'
                ? fr
                  ? 'Ajoutez vos consultants un par un, ou importez-les depuis un fichier CSV.'
                  : 'Add consultants one by one, or import them from a CSV file.'
                : !isEmptyScope && hasActiveFilters(filters)
                  ? fr
                    ? 'Retirez un filtre, ou cherchez aussi dans le vivier.'
                    : 'Remove a filter, or also search the talent pool.'
                  : undefined
            }
            action={
              isEmptyScope && scope === 'staff' && canEdit ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setDialog({ open: true, prospect: false })}>
                    <Plus />
                    {fr ? 'Ajouter un consultant' : 'Add a consultant'}
                  </Button>
                  <Button variant="secondary" onClick={() => setCsvOpen(true)}>
                    <FileUp />
                    {fr ? 'Importer un CSV' : 'Import a CSV'}
                  </Button>
                </div>
              ) : !isEmptyScope && hasActiveFilters(filters) ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={() => setFilters(DEFAULT_TALENT_FILTERS)}>
                    {fr ? 'Retirer les filtres' : 'Clear filters'}
                  </Button>
                  {scope === 'staff' && (
                    <Button variant="ghost" onClick={() => setScope('pool')}>
                      {fr ? 'Chercher dans le vivier' : 'Search the pool'}
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          />
        }
        className={cn(selected.size > 0 && 'ring-1 ring-primary/20')}
      />

      <div className="mt-3 shrink-0 [&>nav]:mb-0 [&>nav]:mt-0">
        <RelatedLinks
          links={[
            { href: '/cv-optimizer', label: { fr: 'Dossiers de compétences', en: 'Skills dossiers' }, permission: 'consultants.view' },
            { href: '/cv-pushed', label: { fr: 'CV envoyés aux clients', en: 'CVs sent to clients' }, permission: 'consultants.view' },
            { href: '/templates', label: { fr: 'Modèles de dossiers', en: 'Dossier templates' }, permission: 'consultants.view' },
            { href: '/duplicates', label: { fr: 'Doublons', en: 'Duplicates' }, permission: 'consultants.edit' },
          ]}
        />
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent side="right" className="sm:max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{fr ? 'Filtres' : 'Filters'}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <div>
              <div className="mb-1.5 text-[13px] font-medium">{fr ? 'Séniorité' : 'Seniority'}</div>
              <div className="flex flex-wrap gap-1.5">
                {SENIORITIES.map((s) => {
                  const on = filters.seniority.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('seniority', on ? filters.seniority.filter((x) => x !== s) : [...filters.seniority, s])}
                      className={cn(
                        'h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                        on ? 'border-app-terra bg-app-terra text-white' : 'border-border bg-card hover:border-app-terra/40',
                      )}
                    >
                      {SENIORITY_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={fr ? 'Expérience minimale' : 'Minimum experience'} htmlFor="flt-years">
              <Select id="flt-years" value={filters.minYears == null ? '' : String(filters.minYears)} onChange={(e) => set('minYears', e.target.value ? Number(e.target.value) : null)}>
                <option value="">{fr ? 'Indifférente' : 'Any'}</option>
                {MIN_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {fr ? `${y} ans et plus` : `${y}+ years`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={fr ? 'Ville (ou mobilité qui la couvre)' : 'City (or covering mobility)'} htmlFor="flt-city">
              <Input id="flt-city" list="flt-city-list" value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder={fr ? 'Ex. Lyon' : 'e.g. Lyon'} />
              <datalist id="flt-city-list">
                {options.cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label={fr ? 'Langue' : 'Language'} htmlFor="flt-lang">
              <Select id="flt-lang" value={filters.language} onChange={(e) => set('language', e.target.value)}>
                <option value="">{fr ? 'Toutes les langues' : 'All languages'}</option>
                {options.languages.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code, lang)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={fr ? 'Type de contrat' : 'Contract type'} htmlFor="flt-contract">
              <Select id="flt-contract" value={filters.contract} onChange={(e) => set('contract', e.target.value)}>
                <option value="all">{fr ? 'Tous les contrats' : 'All contracts'}</option>
                {Object.entries(CONTRACT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v[lang]}
                  </option>
                ))}
              </Select>
            </Field>
            {showRates && (
              <Field label={fr ? 'TJM maximum' : 'Maximum day rate'} htmlFor="flt-rate">
                <Input
                  id="flt-rate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={filters.rateMax == null ? '' : String(filters.rateMax)}
                  onChange={(e) => set('rateMax', e.target.value ? Number(e.target.value) : null)}
                  placeholder={fr ? 'Ex. 650' : 'e.g. 650'}
                />
              </Field>
            )}
            <Field label={fr ? 'Statut' : 'Status'} htmlFor="flt-status">
              <Select id="flt-status" value={filters.status} onChange={(e) => set('status', e.target.value)}>
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
            <Field label={fr ? 'Référent' : 'Owner'} htmlFor="flt-owner">
              <Select id="flt-owner" value={filters.owner} onChange={(e) => set('owner', e.target.value)}>
                <option value="all">{fr ? 'Tous les référents' : 'All owners'}</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={fr ? 'Portail consultant' : 'Consultant portal'} htmlFor="flt-portal">
              <Select id="flt-portal" value={filters.portal} onChange={(e) => set('portal', e.target.value as TalentFilters['portal'])}>
                <option value="any">{fr ? 'Indifférent' : 'Any'}</option>
                <option value="yes">{fr ? 'Accès actif' : 'Active access'}</option>
                <option value="no">{fr ? 'Sans accès' : 'No access'}</option>
              </Select>
            </Field>
          </DrawerBody>
          <DrawerFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setFilters((f) => ({ ...DEFAULT_TALENT_FILTERS, query: f.query, skills: f.skills, availability: f.availability }))
              }
            >
              {fr ? 'Réinitialiser' : 'Reset'}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              {fr ? `Voir ${rows.length} profil${rows.length > 1 ? 's' : ''}` : `Show ${rows.length} profile${rows.length > 1 ? 's' : ''}`}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ConsultantQuickView
        consultant={quick}
        open={!!quick}
        onOpenChange={(v) => {
          if (!v) setQuickId(null);
        }}
        lang={lang}
        skills={quick ? rankSkills(skillsByConsultant.get(quick.id) ?? [], filters.skills) : []}
        showRates={showRates}
        today={today}
      />

      {activeOrgId && (
        <ConsultantFormDialog
          open={dialog.open}
          onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}
          organizationId={activeOrgId}
          isProspect={dialog.prospect}
          onSaved={() => void reload()}
        />
      )}
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} isProspect={scope === 'pool'} onImported={() => void reload()} />
    </AppShell>
  );
}
