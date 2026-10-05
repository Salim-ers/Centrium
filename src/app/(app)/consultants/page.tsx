'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Briefcase, DoorOpen, Eye, FileText, FileUp, Plus, Search, SlidersHorizontal, Target, UserCheck, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip } from '@/components/app/StatStrip';
import { ConsultantQuickView } from '@/components/consultants/ConsultantQuickView';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Field } from '@/components/ui/label';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { formatDate, formatEur, formatPct } from '@/lib/format';
import { RelatedLinks } from '@/components/app/RelatedLinks';
import { cn } from '@/lib/utils';

type Scope = 'staff' | 'pool' | 'positioned' | 'archived';

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

  const [scope, setScope] = useState<Scope>('staff');
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const [status, setStatus] = useState('all');
  const [availability, setAvailability] = useState('any');
  const [owner, setOwner] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; prospect: boolean }>({ open: params.get('new') === '1', prospect: false });
  const [csvOpen, setCsvOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Aperçu dans un tiroir ; la fiche complète reste à un clic.
  const [quickId, setQuickId] = useState<string | null>(null);

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

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sk = skill.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (owner !== 'all' && c.owner_id !== owner) return false;
      const freeOn = c.status === 'available' ? today : (c.available_from ?? c.current_mission_end);
      if (availability === 'now' && c.status !== 'available') return false;
      if (availability === '30' && !(freeOn && freeOn <= in30)) return false;
      if (availability === '60' && !(freeOn && freeOn <= in60)) return false;
      if (sk) {
        const skills = skillsByConsultant.get(c.id) ?? [];
        if (!skills.some((s) => s.name.toLowerCase().includes(sk))) return false;
      }
      if (!q) return true;
      return `${c.first_name} ${c.last_name} ${c.job_title} ${c.city ?? ''}`.toLowerCase().includes(q);
    });
  }, [data, query, skill, status, availability, owner, skillsByConsultant, today, in30, in60]);

  const kpis = useMemo(() => {
    const list = scope === 'staff' ? (data ?? []) : [];
    const pool = list.filter((c) => c.status !== 'unavailable');
    const onMission = list.filter((c) => c.status === 'on_mission').length;
    const available = list.filter((c) => c.status === 'available').length;
    const soon = list.filter((c) => {
      const d = c.available_from ?? c.current_mission_end;
      return c.status !== 'available' && !!d && d >= today && d <= in30;
    }).length;
    return {
      total: list.length,
      onMission,
      available,
      soon,
      bench: pool.length ? (available / pool.length) * 100 : null,
    };
  }, [data, scope, today, in30]);

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
              {c.job_title}
              {c.seniority ? ` · ${SENIORITY_LABEL[c.seniority]}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: fr ? 'Profil' : 'Profile',
      mobile: 'trailing',
      sortValue: (c) => c.status,
      cell: (c) => {
        const s = statusOf(CONSULTANT_STATUS, c.status, lang);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
    {
      id: 'availability',
      header: fr ? 'Disponibilité' : 'Availability',
      mobile: 'meta',
      sortValue: (c) => (c.status === 'available' ? '0000' : (c.available_from ?? c.current_mission_end ?? '9999')),
      cell: (c) => {
        if (c.status === 'available' && (!c.available_from || c.available_from <= today))
          return <span className="text-[13px] font-medium text-success">{fr ? 'Immédiate' : 'Now'}</span>;
        const d = c.available_from ?? c.current_mission_end;
        return d ? <span className="text-[13px] text-muted-foreground">{formatDate(d, lang, 'short')}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'mission',
      header: 'Mission',
      hideOnMobile: true,
      sortValue: (c) => c.active_missions[0]?.title ?? '',
      cell: (c) => {
        const m = c.active_missions.find((x) => x.status === 'active') ?? c.active_missions[0];
        return m ? <span className="block max-w-[14rem] truncate text-[13px] text-muted-foreground">{m.title}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'skills',
      header: fr ? 'Compétences' : 'Skills',
      hideOnMobile: true,
      cell: (c) => {
        const skills = (skillsByConsultant.get(c.id) ?? [])
          .slice()
          .sort((a, b) => Number(b.is_highlighted) - Number(a.is_highlighted) || (b.level ?? 0) - (a.level ?? 0))
          .slice(0, 3);
        return skills.length ? (
          <span className="flex flex-wrap gap-1">
            {skills.map((s) => (
              <Badge key={s.id} variant="secondary">
                {s.name}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'city',
      header: fr ? 'Ville' : 'City',
      hideOnMobile: true,
      defaultHidden: true,
      mobile: 'meta',
      sortValue: (c) => c.city ?? '',
      cell: (c) => <span className="text-[13px] text-muted-foreground">{c.city ?? '—'}</span>,
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
  ];

  const isEmptyScope = !loading && (data ?? []).length === 0;
  const advancedCount = (status !== 'all' ? 1 : 0) + (owner !== 'all' ? 1 : 0);
  const quick = quickId ? ((data ?? []).find((c) => c.id === quickId) ?? null) : null;
  const scopes: Array<{ id: Scope; label: string }> = [
    { id: 'staff', label: fr ? 'Effectif' : 'Staff' },
    { id: 'pool', label: fr ? 'Vivier' : 'Talent pool' },
    { id: 'positioned', label: fr ? 'Positionnés' : 'Positioned' },
    { id: 'archived', label: fr ? 'Archivés' : 'Archived' },
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
          items={[
            { label: fr ? 'talents' : 'talents', value: loading && !data ? '…' : kpis.total, tone: 'terra', icon: Users },
            {
              label: fr ? `disponibles · ${kpis.soon} sous 30 j` : `available · ${kpis.soon} within 30 d`,
              value: loading && !data ? '…' : kpis.available,
              tone: kpis.available ? 'peach' : 'ivory',
              icon: UserCheck,
              title: fr ? `Intercontrat : ${formatPct(kpis.bench, lang, 0)}` : `Bench: ${formatPct(kpis.bench, lang, 0)}`,
            },
            { label: fr ? 'en mission' : 'on mission', value: loading && !data ? '…' : kpis.onMission, tone: 'white', icon: Briefcase },
          ]}
        />
      )}

      {/* Barre d'outils unique ; les filtres avancés vivent dans un tiroir. */}
      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Nom, poste, ville' : 'Name, title, city'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={fr ? 'Compétence (ex. AWS)' : 'Skill (e.g. AWS)'} className="sm:w-48" aria-label={fr ? 'Filtrer par compétence' : 'Filter by skill'} />
        <Select value={availability} onChange={(e) => setAvailability(e.target.value)} className="sm:w-48" aria-label={fr ? 'Disponibilité' : 'Availability'}>
          <option value="any">{fr ? 'Toute disponibilité' : 'Any availability'}</option>
          <option value="now">{fr ? 'Disponible maintenant' : 'Available now'}</option>
          <option value="30">{fr ? 'Sous 30 jours' : 'Within 30 days'}</option>
          <option value="60">{fr ? 'Sous 60 jours' : 'Within 60 days'}</option>
        </Select>
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} className="sm:ml-auto">
          <SlidersHorizontal />
          {fr ? 'Plus de filtres' : 'More filters'}
          {advancedCount > 0 && <span className="num rounded-full bg-app-terra px-1.5 text-[11px] font-semibold text-white">{advancedCount}</span>}
        </Button>
      </div>

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
        rowActions={(c) => [
          { label: fr ? 'Aperçu' : 'Quick view', icon: Eye, onSelect: () => setQuickId(c.id) },
          { label: fr ? 'Générer un dossier' : 'Generate a dossier', icon: FileText, href: `/consultants/${c.id}/dossier` },
          { label: fr ? 'Positionner' : 'Position', icon: Target, href: `/consultants/${c.id}?tab=opportunities` },
          ...linkActions(`/consultants/${c.id}`, fr).map((a, i) => (i === 0 ? { ...a, separatorBefore: true } : a)),
        ]}
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
                : fr ? 'Aucun résultat' : 'No results'
            }
            description={
              isEmptyScope && scope === 'staff'
                ? fr
                  ? 'Ajoutez vos consultants un par un, ou importez-les depuis un fichier CSV.'
                  : 'Add consultants one by one, or import them from a CSV file.'
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
          ]}
        />
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent side="right" className="sm:max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{fr ? 'Plus de filtres' : 'More filters'}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            <Field label={fr ? 'Statut' : 'Status'} htmlFor="flt-status">
              <Select id="flt-status" value={status} onChange={(e) => setStatus(e.target.value)}>
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
              <Select id="flt-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="all">{fr ? 'Tous les référents' : 'All owners'}</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          </DrawerBody>
          <DrawerFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setStatus('all');
                setOwner('all');
              }}
            >
              {fr ? 'Réinitialiser' : 'Reset'}
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>{fr ? 'Voir les résultats' : 'Show results'}</Button>
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
        skills={quick ? (skillsByConsultant.get(quick.id) ?? []) : []}
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
