'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useConsultantStatusLabels, useSeniorityLabels } from '@/lib/i18n/useBadges';
import {
  notifyDestructive,
  notifyError,
  notifyCreated,
} from '@/lib/notify';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArchiveRestore,
  Archive,
  FileUp,
  KeyRound,
  Send,
  Users,
  UserCheck,
  Briefcase,
  Timer,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { TalentTabs } from '@/components/consultants/TalentTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
  StatusBadge,
  BulkActionBar,
} from '@/components/app';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
import { CityFilter } from '@/components/consultants/CityFilter';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { GrantPortalDialog } from '@/components/consultants/GrantPortalDialog';
import { UsageBanner, USAGE_REFRESH_EVENT } from '@/components/billing/UsageBanner';
import { Combobox } from '@/components/ui/Combobox';
import { cn } from '@/lib/utils';
import {
  classifyJobFamily,
  type JobFamilyId,
} from '@/lib/consultants/job-family';

import {
  consultantService,
  type ConsultantListItem,
} from '@/lib/services/consultant.service';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Consultant } from '@/types';
import {
  CONSULTANT_STATUS_LABEL,
  CONSULTANT_STATUS_STYLE,
  SENIORITY_LABEL,
} from '@/constants';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';

/**
 * Onglet "Consultants" — toutes les fiches sans distinction
 * bibliothèque/vivier (concept fusionné).
 *
 * Exclut les profils qui ont une mission "proposed" ou "active"
 * (ils vivent dans /cv-pushed et /en-mission).
 *
 * "Pousser CV" ouvre AssignMissionDialog (sélection d'offre + TJM).
 * Création d'une mission "proposed" → le profil bascule en CV poussés.
 */
function ConsultantsPageInner() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  const consultantStatusI18n = useConsultantStatusLabels();
  const seniorityI18n = useSeniorityLabels();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [assignTo, setAssignTo] = useState<ConsultantListItem | null>(null);
  const [familyFilter, setFamilyFilter] = useState<Set<JobFamilyId>>(new Set());
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set());
  const [csvOpen, setCsvOpen] = useState(false);
  const [grantingPortal, setGrantingPortal] = useState<Consultant | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: consultantsData,
    loading,
    reload,
    setData: setConsultants,
  } = useCachedQuery<ConsultantListItem[]>(
    `consultants-pool:${activeOrgId ?? 'none'}:${showArchived ? 'arch' : 'active'}:${debouncedSearch}`,
    async () => {
      const res = await consultantService.list({
        // Plus de distinction bibliothèque/vivier : on prend tout.
        is_prospect: 'all',
        search: debouncedSearch || undefined,
        archived: showArchived,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );

  // Sync temps réel : modifs faites par un collègue (édition fiche, ajout
  // skill, archivage, push CV qui crée une mission…) se voient sans F5.
  useRealtimeReload(['consultants', 'consultant_skills', 'missions'], () => reload());

  // Exclusion : profils avec mission proposed/active → ils vivent dans CV poussés
  // ou En Mission. Une seule présence par profil, partout dans l'app.
  // ⚠️ active_missions peut être absent sur des fiches anciennes (sécurité null).
  const allInPool = (consultantsData ?? [])
    .filter((c) => (c.active_missions?.length ?? 0) === 0)
    // Tri alphabétique sur le nom de famille (puis prénom). Stable et
    // français-friendly grâce à 'fr' qui gère accents et casse.
    .slice()
    .sort((a, b) => {
      const an = `${a.last_name ?? ''} ${a.first_name ?? ''}`.toLowerCase();
      const bn = `${b.last_name ?? ''} ${b.first_name ?? ''}`.toLowerCase();
      return an.localeCompare(bn, 'fr');
    });

  // Comptes par corps de métier (sur la liste avant filtre famille pour rester
  // stable visuellement quand on coche/décoche un domaine).
  const familyCounts = (() => {
    const base: Record<JobFamilyId, number> = {
      qa: 0, dev: 0, data: 0, devops: 0, cyber: 0, pm: 0,
      ba: 0, architect: 0, support: 0, design: 0, other: 0,
    };
    for (const c of allInPool) {
      base[classifyJobFamily(c.job_title)] += 1;
    }
    return base;
  })();

  // Comptage villes : on s'aligne sur la sélection famille pour que les
  // villes proposées correspondent au sous-ensemble actuellement visible.
  const familyFiltered =
    familyFilter.size === 0
      ? allInPool
      : allInPool.filter((c) =>
          familyFilter.has(classifyJobFamily(c.job_title)),
        );
  const cityCounts = (() => {
    const map = new Map<string, number>();
    for (const c of familyFiltered) {
      if (c.city && c.city.trim()) {
        map.set(c.city, (map.get(c.city) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const cityFiltered = familyFiltered.filter((c) =>
    cityFilter.size === 0 ? true : c.city ? cityFilter.has(c.city) : false,
  );

  // Drill-down depuis dashboard/widgets : ?status=available, ?status=on_mission,
  // ?endedBefore=today. On lit l'URL et on filtre la liste affichée. Si filtre
  // actif, on affiche un bandeau au-dessus du tableau avec un bouton "Retirer".
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStatusFilter = searchParams?.get('status') ?? null;
  const urlEndedBefore = searchParams?.get('endedBefore') ?? null;
  const consultants = (() => {
    let list = cityFiltered;
    if (urlStatusFilter) {
      list = list.filter((c) => c.status === urlStatusFilter);
    }
    if (urlEndedBefore === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter(
        (c) => c.current_mission_end !== null && (c.current_mission_end as string) <= today,
      );
    }
    return list;
  })();
  const hasUrlFilter = !!urlStatusFilter || !!urlEndedBefore;
  const clearUrlFilter = () => router.push('/consultants');

  const totalCount = consultants.length;
  const pagination = usePagination(totalCount, {
    storageKey: 'consultants-page-size',
  });
  const paginated = pagination.paginate(consultants);

  // Sélection multiple — bornée à la page courante pour rester lisible
  const bulkSel = useBulkSelection(paginated.map((c) => c.id));
  const [bulkBusy, setBulkBusy] = useState(false);

  /** Rafraîchit le compteur de quota (« X / 20 consultants ») instantanément
   *  après toute mutation qui change le nombre de consultants. */
  function bumpUsage() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(USAGE_REFRESH_EVENT));
  }

  async function handleBulkArchive() {
    if (bulkSel.selectedCount === 0) return;
    if (!confirm(`Archiver ${bulkSel.selectedCount} consultant${bulkSel.selectedCount > 1 ? 's' : ''} ?`)) return;
    setBulkBusy(true);
    const ids = [...bulkSel.selected];
    const res = await consultantService.archiveMany(ids);
    setBulkBusy(false);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyCreated(`${res.data ?? ids.length} consultant${(res.data ?? ids.length) > 1 ? 's' : ''} archivé${(res.data ?? ids.length) > 1 ? 's' : ''}`);
    bulkSel.clear();
    bumpUsage();
    void reload();
  }

  async function handleBulkUnarchive() {
    if (bulkSel.selectedCount === 0) return;
    setBulkBusy(true);
    const ids = [...bulkSel.selected];
    const res = await consultantService.unarchiveMany(ids);
    setBulkBusy(false);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyCreated(`${res.data ?? ids.length} consultant${(res.data ?? ids.length) > 1 ? 's' : ''} restauré${(res.data ?? ids.length) > 1 ? 's' : ''}`);
    bulkSel.clear();
    bumpUsage();
    void reload();
  }

  async function handleBulkDelete() {
    if (bulkSel.selectedCount === 0) return;
    if (
      !confirm(
        `Supprimer DÉFINITIVEMENT ${bulkSel.selectedCount} consultant${bulkSel.selectedCount > 1 ? 's' : ''} ? Cette action est irréversible.`,
      )
    )
      return;
    setBulkBusy(true);
    const ids = [...bulkSel.selected];
    const res = await consultantService.deleteMany(ids);
    setBulkBusy(false);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${res.data ?? ids.length} consultant${(res.data ?? ids.length) > 1 ? 's' : ''} supprimé${(res.data ?? ids.length) > 1 ? 's' : ''}`);
    bulkSel.clear();
    bumpUsage();
    void reload();
  }

  function openCreate() {
    setEditingConsultant(null);
    setDialogOpen(true);
  }

  function openEdit(consultant: Consultant) {
    setEditingConsultant(consultant);
    setDialogOpen(true);
  }

  async function handleStatusChange(consultantId: string, next: Consultant['status']) {
    // Optimistic update : la liste se rafraîchit avant l'aller-retour DB.
    // On capture le statut ACTUEL du consultant (pas tout l'array) pour
    // un rollback ciblé qui ne réécrase pas les autres updates entre-temps.
    let previousStatus: Consultant['status'] | null = null;
    setConsultants((list) =>
      (list ?? []).map((c) => {
        if (c.id !== consultantId) return c;
        previousStatus = c.status;
        return { ...c, status: next };
      }),
    );
    const res = await consultantService.update(consultantId, { status: next });
    if (res.error) {
      notifyError('Mise à jour du statut impossible : ' + res.error.message);
      if (previousStatus !== null) {
        const rollback = previousStatus;
        setConsultants((list) =>
          (list ?? []).map((c) => (c.id === consultantId ? { ...c, status: rollback } : c)),
        );
      }
    }
  }

  async function archiveConsultant(consultant: Consultant) {
    const displayName = `${consultant.first_name ?? ''} ${consultant.last_name ?? ''}`.trim() || 'ce consultant';
    if (
      !confirm(
        `Archiver ${displayName} ? Le profil disparaît de la liste mais ses données (CV, CRA, factures) sont conservées.`,
      )
    ) {
      return;
    }
    const res = await consultantService.archive(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
    bumpUsage();
  }

  async function unarchiveConsultant(consultant: Consultant) {
    const res = await consultantService.unarchive(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
    bumpUsage();
  }

  async function hardDeleteConsultant(consultant: Consultant) {
    const fullName = `${consultant.first_name} ${consultant.last_name}`;
    if (
      !confirm(
        `⚠️ Suppression DÉFINITIVE de ${fullName} et de toutes ses données (CV, expériences, formations, compétences, documents).\n\nCette action est IRRÉVERSIBLE. Continuer ?`,
      )
    ) {
      return;
    }
    const typed = prompt(
      `Pour confirmer, tape exactement le nom complet du consultant :\n${fullName}`,
    );
    if (typed?.trim() !== fullName) {
      notifyError('Confirmation incorrecte — suppression annulée.');
      return;
    }
    const res = await consultantService.delete(consultant.id);
    if (res.error) {
      const msg = /foreign key|violates foreign|reference/i.test(res.error.message)
        ? `Impossible : ${fullName} a des CRA, factures ou contrats liés. Supprime-les d'abord.`
        : 'Erreur : ' + res.error.message;
      notifyError(msg);
      return;
    }
    notifyDestructive(`${fullName} supprimé définitivement`);
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
    bumpUsage();
  }

  const headerSub = showArchived
    ? `${consultants.length} ${consultants.length > 1 ? 'archivés' : 'archivé'}`
    : `${consultants.length} ${t.pages.consultants.profiles_available} — ${t.pages.consultants.not_positioned_yet}`;

  // KPIs : total / en mission (présent dans consultantsData) / disponibles / intercontrat
  // ⚠️ active_missions inclut les statuts 'active' ET 'proposed' (CV poussé).
  // On compte "En Mission" UNIQUEMENT les missions vraiment actives.
  // Un CV juste poussé pour une opportunité n'est pas "en mission".
  const allData = consultantsData ?? [];
  const totalLibrary = allData.length;
  const hasActiveMission = (c: typeof allData[number]) =>
    (c.active_missions ?? []).some((m) => m.status === 'active');
  const onMissionCount = allData.filter(hasActiveMission).length;
  const availableCount = allData.filter((c) => c.status === 'available').length;
  const interContractCount = allData.filter(
    (c) => !hasActiveMission(c) && c.status !== 'archived',
  ).length;
  const interContractRatio =
    totalLibrary > 0 ? Math.round((interContractCount / totalLibrary) * 100) : 0;

  return (
    <AppShell>
      <TalentTabs active="consultants" counts={{ consultants: allInPool.length }} />
      <PageHeader
        eyebrow={t.pages.consultants.eyebrow}
        title={
          <>
            {t.pages.consultants.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.consultants.title_b}</span>
          </>
        }
        description={headerSub}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? t.pages.consultants.see_active : t.pages.consultants.see_archived}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  {t.pages.consultants.see_active}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {t.pages.consultants.see_archived}
                </>
              )}
            </Button>
            {!showArchived && (
              <>
                <Button variant="outline" onClick={() => setCsvOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  {t.pages.consultants.import_csv}
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t.pages.consultants.new}
                </Button>
              </>
            )}
          </>
        }
      />

      {!showArchived && (
        <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard
            icon={Users}
            label={t.pages.consultants.kpi_library}
            value={totalLibrary}
            tone="magenta"
            hint={t.pages.consultants.kpi_library_sub}
          />
          <KPICard
            icon={Briefcase}
            label={t.pages.consultants.kpi_on_mission}
            value={onMissionCount}
            tone="violet"
          />
          <KPICard
            icon={UserCheck}
            label={t.pages.consultants.kpi_available}
            value={availableCount}
            tone="emerald"
          />
          <KPICard
            icon={Timer}
            label={t.pages.consultants.kpi_intercontract}
            value={interContractRatio}
            suffix="%"
            tone="amber"
            hint={`${interContractCount} ${t.pages.consultants.kpi_intercontract_sub}`}
          />
        </Reveal>
      )}

      <ConsultantFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingConsultant(null);
        }}
        organizationId={activeOrgId ?? ''}
        consultant={editingConsultant}
        onSaved={() => {
          reload();
          bumpUsage();
        }}
      />

      <AssignMissionDialog
        open={!!assignTo}
        onOpenChange={(v) => {
          if (!v) setAssignTo(null);
        }}
        consultant={
          assignTo
            ? {
                id: assignTo.id,
                first_name: assignTo.first_name,
                last_name: assignTo.last_name,
                daily_rate_eur: assignTo.daily_rate_eur,
              }
            : null
        }
        onAssigned={() => {
          setConsultants((prev) => (prev ?? []).filter((c) => c.id !== assignTo?.id));
          reload();
        }}
      />

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={() => {
          reload();
          bumpUsage();
        }}
      />

      <GrantPortalDialog
        open={!!grantingPortal}
        onOpenChange={(v) => {
          if (!v) setGrantingPortal(null);
        }}
        consultant={grantingPortal}
        onGranted={() => reload()}
      />

      <UsageBanner resource="consultants" />

      {/* Barre d'outils unifiée : recherche + filtres métier + ville dans
          un seul bloc premium. PAS d'overflow-hidden ici — le popover du
          CityFilter (position absolute) doit pouvoir déborder du bloc. */}
      <Reveal delay={0.05}>
        <div className="qc-premium relative mb-6 rounded-2xl border p-4 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.pages.consultants.search_placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <CityFilter
              cities={cityCounts}
              selected={cityFilter}
              onChange={setCityFilter}
            />
          </div>

          <JobFamilyFilter
            counts={familyCounts}
            total={allInPool.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
        </div>
      </Reveal>

      {/* Bandeau filtre URL actif (drill-down depuis dashboard/widget) */}
      {hasUrlFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-violet-glow/30 bg-violet-glow/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-glow/15 text-violet-glow">
              <Search className="h-3 w-3" />
            </span>
            <span className="text-muted-foreground">Filtre actif :</span>
            <span className="font-medium">
              {urlStatusFilter === 'available' && 'Disponibles'}
              {urlStatusFilter === 'on_mission' && 'En mission'}
              {urlStatusFilter === 'soon_available' && 'Bientôt disponibles'}
              {urlStatusFilter === 'unavailable' && 'Indisponibles'}
              {urlEndedBefore === 'today' && ' · mission terminée'}
            </span>
            <span className="text-xs text-muted-foreground">({totalCount} profils)</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearUrlFilter} className="h-7">
            Retirer le filtre
          </Button>
        </div>
      )}

      {!loading && consultantsData !== null && totalCount === 0 ? (
        <EmptyState
          icon={Users}
          title={showArchived ? 'Aucun profil archivé' : 'Aucun profil disponible'}
          description={
            showArchived
              ? 'Les profils archivés apparaîtront ici.'
              : 'Importez votre première bibliothèque CSV ou créez un consultant manuellement.'
          }
          action={
            !showArchived ? (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setCsvOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  Importer CSV
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Nouveau consultant
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
      <Reveal delay={0.1}>
      <AppCard>
        <div className="overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={bulkSel.allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = bulkSel.someSelected;
                    }}
                    onChange={(e) => (e.target.checked ? bulkSel.selectAll() : bulkSel.clear())}
                    className="h-4 w-4 cursor-pointer accent-magenta"
                  />
                </TableHead>
                <TableHead>{t.pages.consultants.table_consultant}</TableHead>
                <TableHead>{t.pages.consultants.table_seniority}</TableHead>
                <TableHead>{t.pages.consultants.table_daily_rate}</TableHead>
                <TableHead>{t.pages.consultants.table_city}</TableHead>
                <TableHead>{t.pages.consultants.table_status}</TableHead>
                <TableHead className="text-right">{t.pages.consultants.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* data===null = query pas encore lancée (activeOrgId pas prêt).
                  On affiche le skeleton plutôt qu'un "Aucun profil disponible"
                  trompeur le temps que l'auth se réhydrate au F5. */}
              {loading || consultantsData === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div
                        className="h-10 rounded-lg surface-1 animate-pulse"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                paginated.map((c, rowIdx) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(rowIdx, 10) * 0.03,
                      ease: 'easeOut',
                    }}
                    className={cn(
                      'group border-b border-hairline transition-colors hover-surface',
                      bulkSel.isSelected(c.id) && 'bg-magenta/[0.04]',
                    )}
                  >
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${c.first_name} ${c.last_name}`}
                        checked={bulkSel.isSelected(c.id)}
                        onChange={() => bulkSel.toggle(c.id)}
                        className="h-4 w-4 cursor-pointer accent-magenta"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-qc-gradient ring-1 ring-foreground/10 flex items-center justify-center text-white text-xs font-semibold transition-transform duration-200 group-hover:scale-105">
                          {(c.first_name?.[0] ?? '?').toUpperCase()}
                          {(c.last_name?.[0] ?? '').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">
                            <span className="uppercase">{c.last_name ?? '—'}</span>{' '}
                            {c.first_name ?? ''}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.job_title ?? '—'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.seniority ? (seniorityI18n[c.seniority] ?? SENIORITY_LABEL[c.seniority] ?? c.seniority) : '—'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.daily_rate_eur ? formatCurrency(c.daily_rate_eur) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.city ?? '—'}
                    </TableCell>
                    <TableCell>
                      {showArchived || c.status === 'on_mission' || c.status === 'archived' ? (
                        // En lecture seule : 'on_mission' est piloté par le trigger
                        // missions, 'archived' par l'archivage du profil.
                        <StatusBadge
                          tone={
                            c.status === 'on_mission'
                              ? 'magenta'
                              : c.status === 'archived'
                                ? 'neutral'
                                : c.status === 'available'
                                  ? 'success'
                                  : c.status === 'soon_available'
                                    ? 'warning'
                                    : 'neutral'
                          }
                        >
                          {consultantStatusI18n[c.status as keyof typeof consultantStatusI18n] ?? CONSULTANT_STATUS_LABEL[c.status]}
                        </StatusBadge>
                      ) : (
                        <Combobox
                          value={c.status}
                          onChange={(v) =>
                            handleStatusChange(c.id, v as Consultant['status'])
                          }
                          className="w-[140px]"
                          // La couleur du statut va sur le BOUTON (triggerClassName),
                          // pas sur le conteneur — sinon la pastille verte débordait
                          // du cadre (le bouton du Combobox est h-10 par défaut).
                          triggerClassName={cn(
                            'h-8 px-2.5 text-xs font-medium leading-none',
                            CONSULTANT_STATUS_STYLE[c.status],
                          )}
                          ariaLabel={`Statut de ${c.first_name ?? ''} ${c.last_name ?? ''}`}
                          options={[
                            { value: 'available', label: consultantStatusI18n.available },
                            { value: 'soon_available', label: consultantStatusI18n.soon_available },
                            { value: 'unavailable', label: consultantStatusI18n.unavailable },
                          ]}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button variant="ghost" size="sm" asChild title={t.pages.consultants.action_view}>
                          <Link href={`/consultants/${c.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            {t.pages.consultants.action_view}
                          </Link>
                        </Button>
                        {showArchived ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unarchiveConsultant(c)}
                              title="Restaurer"
                              className="text-emerald-300 hover:text-emerald-200"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              Restaurer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => hardDeleteConsultant(c)}
                              title="Supprimer définitivement"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Supprimer
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignTo(c)}
                              title="Pousser le CV sur une offre (choisis l'offre + valide le TJM)"
                              className="text-magenta-neon hover:bg-magenta/10"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {t.pages.consultants.action_push_cv}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(c)}
                              title="Éditer"
                            >
                              <Pencil className="h-3.5 w-3.5 text-violet-glow" />
                            </Button>
                            {!c.has_portal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setGrantingPortal(c)}
                                title="Créer un accès portail consultant"
                                className="text-violet-300 hover:text-violet-200"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => archiveConsultant(c)}
                              title="Archiver"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      </Reveal>
      )}

      <PaginationFooter
        pagination={pagination}
        total={totalCount}
        itemLabel="profil"
      />

      <BulkActionBar
        count={bulkSel.selectedCount}
        entityLabel="consultant"
        onClear={bulkSel.clear}
        actions={
          showArchived
            ? [
                {
                  label: 'Restaurer',
                  icon: <ArchiveRestore className="h-3.5 w-3.5" />,
                  onClick: handleBulkUnarchive,
                  busy: bulkBusy,
                },
                {
                  label: 'Supprimer définitivement',
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  onClick: handleBulkDelete,
                  variant: 'destructive',
                  busy: bulkBusy,
                },
              ]
            : [
                {
                  label: 'Archiver',
                  icon: <Archive className="h-3.5 w-3.5" />,
                  onClick: handleBulkArchive,
                  busy: bulkBusy,
                },
              ]
        }
      />
    </AppShell>
  );
}

/** Entrée en cascade des sections de la page (fondu + translation). */
function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ConsultantsPage() {
  return (
    <Suspense fallback={null}>
      <ConsultantsPageInner />
    </Suspense>
  );
}
