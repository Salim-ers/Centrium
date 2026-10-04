'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, DoorOpen, FileUp, Plus, Search, Users } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      header: fr ? 'Statut' : 'Status',
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
      header: fr ? 'Mission actuelle' : 'Current mission',
      hideOnMobile: true,
      sortValue: (c) => c.active_missions[0]?.title ?? '',
      cell: (c) => {
        const m = c.active_missions.find((x) => x.status === 'active') ?? c.active_missions[0];
        return m ? <span className="block max-w-[14rem] truncate text-[13px] text-muted-foreground">{m.title}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'skills',
      header: fr ? 'Compétences clés' : 'Key skills',
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

  return (
    <AppShell>
      <PageHeader
        eyebrow={fr ? 'Ressources' : 'Resources'}
        title="Consultants"
        description={fr ? 'Effectif, vivier et profils positionnés.' : 'Staff, talent pool and positioned profiles.'}
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={() => setCsvOpen(true)}>
                <FileUp />
                {fr ? 'Importer' : 'Import'}
              </Button>
              <Button onClick={() => setDialog({ open: true, prospect: scope === 'pool' })}>
                <Plus />
                {scope === 'pool' ? (fr ? 'Ajouter au vivier' : 'Add to pool') : fr ? 'Ajouter un consultant' : 'Add a consultant'}
              </Button>
            </>
          )
        }
      />
      <RelatedLinks
        links={[
          { href: '/cv-pushed', label: { fr: 'CV envoyés aux clients', en: 'CVs sent to clients' }, permission: 'consultants.view' },
          { href: '/templates', label: { fr: 'Modèles de dossiers', en: 'Dossier templates' }, permission: 'consultants.view' },
        ]}
      />

      {scope === 'staff' && (
        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KPICard label={fr ? 'Effectif' : 'Headcount'} value={kpis.total} loading={loading && !data} />
          <KPICard label={fr ? 'En mission' : 'On mission'} value={kpis.onMission} loading={loading && !data} />
          <KPICard label={fr ? 'Disponibles' : 'Available'} value={kpis.available} tone={kpis.available ? 'amber' : 'neutral'} loading={loading && !data} />
          <KPICard label={fr ? 'Disponibles sous 30 j' : 'Free within 30 d'} value={kpis.soon} loading={loading && !data} />
          <KPICard label={fr ? 'Taux d’intercontrat' : 'Bench rate'} valueText={formatPct(kpis.bench, lang, 0)} loading={loading && !data} />
        </section>
      )}

      <Tabs value={scope} onValueChange={(v) => { setScope(v as Scope); setSelected(new Set()); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="staff">{fr ? 'Effectif' : 'Staff'}</TabsTrigger>
          <TabsTrigger value="pool">{fr ? 'Vivier' : 'Talent pool'}</TabsTrigger>
          <TabsTrigger value="positioned">{fr ? 'Positionnés' : 'Positioned'}</TabsTrigger>
          <TabsTrigger value="archived">{fr ? 'Archivés' : 'Archived'}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,12rem)_repeat(3,minmax(0,11rem))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Nom, poste, ville' : 'Name, title, city'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={fr ? 'Compétence (ex. AWS)' : 'Skill (e.g. AWS)'} aria-label={fr ? 'Filtrer par compétence' : 'Filter by skill'} />
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
        <Select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label={fr ? 'Disponibilité' : 'Availability'}>
          <option value="any">{fr ? 'Toute disponibilité' : 'Any availability'}</option>
          <option value="now">{fr ? 'Disponible maintenant' : 'Available now'}</option>
          <option value="30">{fr ? 'Sous 30 jours' : 'Within 30 days'}</option>
          <option value="60">{fr ? 'Sous 60 jours' : 'Within 60 days'}</option>
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Business Manager">
          <option value="all">{fr ? 'Tous les référents' : 'All owners'}</option>
          {owners.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {selected.size > 0 && canEdit && (
        <div className="sticky top-[4.5rem] z-10 mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-md">
          <span className="num text-[13px]">
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
        aria-label="Consultants"
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        rowHref={(c) => `/consultants/${c.id}`}
        rowActions={(c) => linkActions(`/consultants/${c.id}`, fr)}
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
