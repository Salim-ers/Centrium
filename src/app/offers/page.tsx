'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Target,
  MapPin,
  Calendar,
  FileDown,
  Archive,
  ArchiveRestore,
  Building2,
  Network,
  Search,
  HelpCircle,
  DoorOpen,
  Trophy,
  TrendingUp,
  Coins,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
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
import { JobOfferFormDialog } from '@/components/offers/JobOfferFormDialog';
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
import { CityFilter } from '@/components/consultants/CityFilter';
import { jobOfferService } from '@/lib/services';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { JobOffer } from '@/types';
import { relativeDate } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { exportJobOfferPoster } from '@/lib/offers/export-poster';
import { resolvePosterBrand } from '@/lib/cv/branding';
import {
  classifyJobFamily,
  type JobFamilyId,
} from '@/lib/consultants/job-family';

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

function getSeniorityLabel(t: ReturnType<typeof useAppT>): Record<string, string> {
  return {
    junior: t.seniority.junior,
    confirmed: t.seniority.confirmed,
    senior: t.seniority.senior,
    expert: t.seniority.expert,
    lead: t.seniority.lead,
    architect: t.seniority.architect,
  };
}

/**
 * Liste des offres / missions. Une seule "vue active" — on ne distingue
 * plus open/closed/won/lost en colonne (le funnel commercial vit dans le
 * CRM). Ici, on liste les besoins, on filtre par métier + ville, on
 * pousse un consultant via matching, on archive quand c'est terminé.
 */
export default function OffersPage() {
  const { activeOrgId, branding, user } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency, convert: convertCurrency, symbol: currencySymbol } = useCurrency();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const seniorityLabel = getSeniorityLabel(t);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [exportingOfferId, setExportingOfferId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  /** Onglet du pipeline : offres encore disponibles ou déjà avec un CV poussé. */
  const [pipelineTab, setPipelineTab] = useState<'available' | 'pushed'>('available');
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<Set<JobFamilyId>>(new Set());
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set());

  const {
    data: offersData,
    loading,
    reload,
    setData: setOffers,
  } = useCachedQuery<JobOffer[]>(
    `offers:${activeOrgId ?? 'none'}:${showArchived ? 'arch' : 'live'}`,
    async () => {
      // Plus de filtre statut visible : on prend toutes les non-archivées
      // (ou toutes les archivées si toggle). Les états gagné/perdu vivent
      // dans le CRM.
      const res = await jobOfferService.list('all', showArchived);
      const rows = res.data ?? [];
      // Tri alphabétique par intitulé (insensible casse, locale fr).
      return rows.slice().sort((a, b) =>
        (a.title ?? '').localeCompare(b.title ?? '', 'fr', { sensitivity: 'base' }),
      );
    },
    { enabled: !!activeOrgId },
  );
  const allOffers = offersData ?? [];

  // Sync temps réel : un collègue qui crée/édite/archive une offre, ou
  // qui pousse un CV (crée une mission), est visible sans F5.
  useRealtimeReload(['job_offers', 'missions'], () => {
    reload();
    reloadPushed();
  });

  // Liste des job_offer_id ayant au moins une mission "vivante" (proposed
  // ou active, non archivée). On stocke en string[] dans le cache (JSON-
  // sérialisable ; un Set deviendrait {} après réhydratation et .has()
  // crasherait) puis on convertit en Set à l'usage.
  const { data: pushedIds, reload: reloadPushed } = useCachedQuery<string[]>(
    // v2 du cache : on a basculé Set → string[] (le Set ne survit pas à
    // un JSON.parse, ça crashait sur .has()). Bump du suffixe pour invalider
    // l'ancien cache potentiellement corrompu dans la sessionStorage.
    `offers-pushed-ids-v2:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('missions')
        .select('job_offer_id')
        .in('status', ['proposed', 'active'])
        .eq('archived', false)
        .not('job_offer_id', 'is', null);
      if (error) return [];
      return (data ?? [])
        .map((r: any) => r.job_offer_id as string | null)
        .filter((id): id is string => !!id);
    },
    { enabled: !!activeOrgId },
  );
  // Double sécurité : si le cache restitue autre chose qu'un tableau
  // (ancienne version, corruption), on retombe sur Set vide plutôt que
  // de crasher (`new Set({})` throw car {} n'est pas itérable).
  const offersWithPushedCv = new Set<string>(
    Array.isArray(pushedIds) ? pushedIds : [],
  );
  const pushedCount = allOffers.filter((o) => offersWithPushedCv.has(o.id)).length;
  const availableCount = allOffers.length - pushedCount;

  // Split pipeline pré-calculé pour les chips "métier" (sinon elles
  // affichent les compteurs de l'autre onglet).
  const inCurrentTab = showArchived
    ? allOffers
    : pipelineTab === 'pushed'
      ? allOffers.filter((o) => offersWithPushedCv.has(o.id))
      : allOffers.filter((o) => !offersWithPushedCv.has(o.id));

  // Comptes corps de métier sur l'onglet courant (chips inactives gardent leur compte).
  const familyCounts = (() => {
    const base: Record<JobFamilyId, number> = {
      qa: 0, dev: 0, data: 0, devops: 0, cyber: 0, pm: 0,
      ba: 0, architect: 0, support: 0, design: 0, other: 0,
    };
    for (const o of inCurrentTab) {
      base[classifyJobFamily(o.title)] += 1;
    }
    return base;
  })();

  // Filtrage en cascade (pipeline → search → famille → ville).
  const searchTrim = search.trim().toLowerCase();
  const afterSearch = !searchTrim
    ? inCurrentTab
    : inCurrentTab.filter(
        (o) =>
          o.title.toLowerCase().includes(searchTrim) ||
          (o.source ?? '').toLowerCase().includes(searchTrim) ||
          (o.location ?? '').toLowerCase().includes(searchTrim) ||
          (o.required_skills ?? []).some((s) =>
            s.toLowerCase().includes(searchTrim),
          ),
      );
  const afterFamily =
    familyFilter.size === 0
      ? afterSearch
      : afterSearch.filter((o) => familyFilter.has(classifyJobFamily(o.title)));

  // Comptage villes sur le sous-ensemble post-famille pour que les villes
  // proposées correspondent au scope visible.
  const cityCounts = (() => {
    const map = new Map<string, number>();
    for (const o of afterFamily) {
      const city = (o.location ?? '').trim();
      if (city) map.set(city, (map.get(city) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const offers = afterFamily.filter((o) =>
    cityFilter.size === 0
      ? true
      : o.location
        ? cityFilter.has(o.location)
        : false,
  );
  const pagination = usePagination(offers.length, {
    storageKey: 'offers-page-size',
  });
  const paginatedOffers = pagination.paginate(offers);

  // Sélection multiple pour archivage/suppression en masse
  const offerBulk = useBulkSelection(paginatedOffers.map((o) => o.id));
  const [offerBulkBusy, setOfferBulkBusy] = useState(false);

  async function handleOfferBulkArchive() {
    if (offerBulk.selectedCount === 0) return;
    if (!confirm(t.pages.offers.bulk_confirm_archive.replace('{n}', offerBulk.selectedCount.toString()))) return;
    setOfferBulkBusy(true);
    const ids = [...offerBulk.selected];
    const res = await jobOfferService.archiveMany(ids);
    setOfferBulkBusy(false);
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offers_archived.replace('{n}', (res.data ?? ids.length).toString()));
    offerBulk.clear();
    void reload();
  }

  async function handleOfferBulkUnarchive() {
    if (offerBulk.selectedCount === 0) return;
    setOfferBulkBusy(true);
    const ids = [...offerBulk.selected];
    const res = await jobOfferService.unarchiveMany(ids);
    setOfferBulkBusy(false);
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offers_restored.replace('{n}', (res.data ?? ids.length).toString()));
    offerBulk.clear();
    void reload();
  }

  async function handleOfferBulkDelete() {
    if (offerBulk.selectedCount === 0) return;
    if (
      !confirm(
        t.pages.offers.bulk_confirm_delete_permanent.replace('{n}', offerBulk.selectedCount.toString()),
      )
    )
      return;
    setOfferBulkBusy(true);
    const ids = [...offerBulk.selected];
    const res = await jobOfferService.deleteMany(ids);
    setOfferBulkBusy(false);
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offers_deleted.replace('{n}', (res.data ?? ids.length).toString()));
    offerBulk.clear();
    void reload();
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(o: JobOffer) {
    setEditing(o);
    setDialogOpen(true);
  }

  async function deleteOffer(o: JobOffer) {
    if (!confirm(t.pages.offers.confirm_delete.replace('{title}', o.title))) return;
    const res = await jobOfferService.remove(o.id);
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offer_deleted);
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  async function downloadPoster(o: JobOffer) {
    setExportingOfferId(o.id);
    try {
      // Fiche de poste : fallback couleur NEUTRE si l'org n'a pas de branding
      // (les CV gardent resolveBrand / fallback QuadCore).
      const brand = resolvePosterBrand(branding);
      const safeTitle = o.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      const brandSlug = brand.brandName.replace(/[^a-zA-Z0-9]/g, '') || 'Centrium';
      await exportJobOfferPoster(o, {
        filename: `Fiche_Poste_${safeTitle}_${brandSlug}`,
        brand,
        contactEmail: user?.email,
        locale,
      });
      toast.success(t.pages.offers.toast_poster_downloaded);
    } catch (e) {
      console.error(e);
      toast.error(
        `${t.pages.offers.toast_export_pdf_error}: ${e instanceof Error ? e.message : ''}`,
      );
    } finally {
      setExportingOfferId(null);
    }
  }

  async function archiveOffer(o: JobOffer) {
    if (
      !confirm(
        t.pages.offers.confirm_archive.replace('{title}', o.title),
      )
    ) {
      return;
    }
    const res = await jobOfferService.update(o.id, { archived: true });
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offer_archived.replace('{title}', o.title));
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  async function unarchiveOffer(o: JobOffer) {
    const res = await jobOfferService.update(o.id, { archived: false });
    if (res.error) {
      toast.error(t.toasts.error_generic + ': ' + res.error.message);
      return;
    }
    toast.success(t.pages.offers.toast_offer_restored.replace('{title}', o.title));
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  // KPIs : ouvertes (non archivées) / avec CV poussé / archivées / TJM moyen
  const openCount = !showArchived ? availableCount : 0;
  const tjmValues = allOffers
    .map((o) => o.daily_rate_max ?? o.daily_rate_min ?? null)
    .filter((v): v is number => v != null && v > 0);
  const avgTjm =
    tjmValues.length > 0
      ? Math.round(tjmValues.reduce((s, v) => s + v, 0) / tjmValues.length)
      : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.offers.eyebrow}
        title={
          showArchived ? (
            <>
              {t.pages.offers.archived_title_a}{' '}
              <span className="qc-italic-accent font-editorial italic">{t.pages.offers.archived_title_b}</span>
            </>
          ) : (
            <>
              {t.pages.offers.title_a}{' '}
              <span className="qc-italic-accent font-editorial italic">{t.pages.offers.title_b}</span>
            </>
          )
        }
        description={`${offers.length} ${t.pages.offers.item_label}${offers.length > 1 ? 's' : ''}${showArchived ? t.pages.offers.description_suffix_archived : t.pages.offers.description_suffix}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? t.pages.offers.see_active : t.pages.offers.see_archived}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  {t.pages.offers.see_active}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {t.pages.offers.see_archived}
                </>
              )}
            </Button>
            {!showArchived && (
              <>
                <Button variant="outline" asChild>
                  <Link href="/matching" className="inline-flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    {t.pages.offers.launch_matching}
                  </Link>
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {t.pages.offers.new}
                </Button>
              </>
            )}
          </>
        }
      />

      {!showArchived && (
        <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label={t.pages.offers.kpi_open}
            value={openCount}
            icon={DoorOpen}
            tone="cyan"
            hint={t.pages.offers.kpi_open_hint}
          />
          <KPICard
            label={t.pages.offers.kpi_pushed}
            value={pushedCount}
            icon={Trophy}
            tone="magenta"
            hint={t.pages.offers.kpi_pushed_hint}
          />
          <KPICard
            label={t.pages.offers.kpi_total}
            value={allOffers.length}
            icon={TrendingUp}
            tone="violet"
          />
          <KPICard
            label={t.pages.offers.kpi_avg_tjm}
            value={convertCurrency(avgTjm)}
            prefix={currencySymbol}
            icon={Coins}
            tone="emerald"
            hint={tjmValues.length > 0 ? t.pages.offers.kpi_avg_tjm_hint.replace('{n}', tjmValues.length.toString()) : t.pages.offers.kpi_avg_tjm_hint_zero}
          />
        </Reveal>
      )}

      <JobOfferFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        organizationId={activeOrgId ?? ''}
        offer={editing}
        onSaved={() => {
          reload();
          reloadPushed();
        }}
      />

      {/* Switcher pipeline : Disponibles (offres pas encore pushées)
          / Avec CV poussé (offres déjà engagées). Pilule active qui glisse
          d'un onglet à l'autre. Caché en vue archivée. */}
      {!showArchived && (
        <Reveal delay={0.05} className="mb-4 flex w-fit items-center gap-1 rounded-xl border border-hairline surface-1 p-1">
          {(
            [
              {
                key: 'available' as const,
                label: t.pages.offers.tab_available,
                tooltip: t.pages.offers.tab_available_tooltip,
                Icon: Briefcase,
                count: availableCount,
                activeText: 'text-violet-glow',
                pill: 'border-violet-glow/30 bg-violet-glow/15',
                countActive: 'bg-violet-glow/15 text-violet-glow',
              },
              {
                key: 'pushed' as const,
                label: t.pages.offers.tab_pushed,
                tooltip: t.pages.offers.tab_pushed_tooltip,
                Icon: Target,
                count: pushedCount,
                activeText: 'text-magenta-neon',
                pill: 'border-magenta-neon/30 bg-magenta-neon/15',
                countActive: 'bg-magenta-neon/15 text-magenta-neon',
              },
            ]
          ).map((tab) => {
            const active = pipelineTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPipelineTab(tab.key)}
                title={tab.tooltip}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? tab.activeText : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="offers-pipeline-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    className={cn('absolute inset-0 rounded-lg border', tab.pill)}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <tab.Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      active ? tab.countActive : 'surface-2 text-muted-foreground',
                    )}
                  >
                    {tab.count}
                  </span>
                </span>
              </button>
            );
          })}
        </Reveal>
      )}

      {/* Barre d'outils unifiée : recherche + filtres métier + ville. PAS
          d'overflow-hidden — le popover du CityFilter doit pouvoir déborder. */}
      <Reveal delay={0.08}>
        <div className="qc-premium relative mb-4 rounded-2xl border p-4 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t.pages.offers.search_placeholder}
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
            {cityFilter.size > 0 && (
              <button
                type="button"
                onClick={() => setCityFilter(new Set())}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                {t.pages.offers.clear_city_filter}
              </button>
            )}
          </div>
          <JobFamilyFilter
            counts={familyCounts}
            total={allOffers.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
        </div>
      </Reveal>

      {!loading && offers.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={showArchived ? t.pages.offers.empty_archived_title : t.pages.offers.empty_no_offers_title}
          description={
            showArchived
              ? t.pages.offers.empty_archived_description
              : t.pages.offers.empty_no_offers_description
          }
          action={
            !showArchived ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t.pages.offers.new}
              </Button>
            ) : undefined
          }
        />
      ) : (
      <Reveal delay={0.12}>
      <AppCard>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label={t.pages.offers.select_all_aria}
                    checked={offerBulk.allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = offerBulk.someSelected;
                    }}
                    onChange={(e) =>
                      e.target.checked ? offerBulk.selectAll() : offerBulk.clear()
                    }
                    className="h-4 w-4 cursor-pointer accent-magenta"
                  />
                </TableHead>
                <TableHead>{t.pages.offers.table_mission}</TableHead>
                <TableHead>{t.pages.offers.table_source}</TableHead>
                <TableHead>{t.pages.offers.table_seniority}</TableHead>
                <TableHead>{t.pages.offers.table_tjm}</TableHead>
                <TableHead>{t.pages.offers.table_location}</TableHead>
                <TableHead>{t.pages.offers.table_skills}</TableHead>
                <TableHead>{t.pages.offers.table_updated}</TableHead>
                <TableHead className="text-right">{t.pages.offers.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <div
                        className="h-10 surface-1 animate-pulse rounded-lg"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                paginatedOffers.map((o, rowIdx) => {
                  // TJM unique : on lit max en priorité, fallback min.
                  const tjm = o.daily_rate_max ?? o.daily_rate_min ?? null;
                  return (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(rowIdx, 10) * 0.03,
                        ease: 'easeOut',
                      }}
                      className={cn(
                        'group border-b border-hairline transition-colors hover-surface',
                        offerBulk.isSelected(o.id) && 'bg-magenta/[0.04]',
                      )}
                    >
                      <TableCell className="w-10 align-top py-3">
                        <input
                          type="checkbox"
                          aria-label={`${isEn ? 'Select' : 'Sélectionner'} ${o.title}`}
                          checked={offerBulk.isSelected(o.id)}
                          onChange={() => offerBulk.toggle(o.id)}
                          className="h-4 w-4 cursor-pointer accent-magenta"
                        />
                      </TableCell>
                      <TableCell className="max-w-[320px] align-top py-3">
                        <div
                          className="font-medium text-sm leading-tight break-words"
                          title={o.title}
                        >
                          {o.title}
                        </div>
                        {o.start_date && (
                          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(o.start_date).toLocaleDateString('fr-FR')}
                            {o.duration_months ? ` · ${o.duration_months} ${t.pages.offers.duration_months_short}` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {o.source ? (
                          <>
                            <div
                              className="flex items-start gap-1.5 min-w-0"
                              title={o.source}
                            >
                              {o.source_kind === 'esn' ? (
                                <Network className="h-3 w-3 text-amber-300 shrink-0 mt-0.5" />
                              ) : (
                                <Building2 className="h-3 w-3 text-violet-300 shrink-0 mt-0.5" />
                              )}
                              <span className="font-medium leading-tight break-words">
                                {o.source}
                              </span>
                            </div>
                            {o.source_kind && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 pl-[18px]">
                                {o.source_kind === 'esn' ? t.pages.offers.esn_partner : t.pages.offers.direct_client}
                              </div>
                            )}
                          </>
                        ) : (
                          // Placeholder explicite quand le nom du client n'est
                          // pas renseigné — cohérent avec /cv-pushed.
                          <>
                            <div className="flex items-start gap-1.5 min-w-0 font-medium text-amber-200/80">
                              <HelpCircle className="h-3 w-3 text-amber-300/80 shrink-0 mt-0.5" />
                              <span className="leading-tight break-words">
                                {t.pages.offers.client_to_define}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 pl-[18px] italic">
                              {t.pages.offers.client_to_fill}
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.seniority ? seniorityLabel[o.seniority] : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {tjm != null ? (
                          formatCurrency(tjm)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="inline-flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{o.location ?? '—'}</span>
                        </div>
                        {o.remote_days != null && o.remote_days > 0 && (
                          <div className="text-[10px] text-violet-300 mt-0.5">
                            {o.remote_days}{t.pages.offers.remote_short}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {o.required_skills.slice(0, 3).map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[10px] font-normal py-0 px-1.5 border-violet-brand/40 bg-violet-brand/10 text-violet-200"
                            >
                              {s}
                            </Badge>
                          ))}
                          {o.required_skills.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal py-0 px-1.5 border-violet-brand/40 bg-violet-brand/10 text-violet-200"
                            >
                              +{o.required_skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeDate(o.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={cn(
                            'flex items-center justify-end gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
                            // Pendant un export PDF, on garde les actions visibles
                            // même si le curseur quitte la ligne (feedback du spinner).
                            exportingOfferId === o.id && 'md:opacity-100',
                          )}
                        >
                          {showArchived ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => unarchiveOffer(o)}
                                title={t.pages.offers.action_unarchive}
                                className="text-emerald-300 hover:text-emerald-200"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteOffer(o)}
                                title={t.pages.offers.action_delete}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                title={t.pages.offers.action_run_matching}
                              >
                                <Link href={`/matching?offerId=${o.id}`}>
                                  <Target className="h-3.5 w-3.5 text-violet-glow" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadPoster(o)}
                                disabled={exportingOfferId === o.id}
                                title={t.pages.offers.action_download_poster}
                              >
                                <FileDown
                                  className={`h-3.5 w-3.5 ${
                                    exportingOfferId === o.id
                                      ? 'animate-pulse text-violet-glow/60'
                                      : 'text-violet-glow'
                                  }`}
                                />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(o)}
                                title={t.pages.offers.action_edit}
                              >
                                <Pencil className="h-3.5 w-3.5 text-violet-glow" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => archiveOffer(o)}
                                title={t.pages.offers.action_archive}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteOffer(o)}
                                title={t.pages.offers.action_delete}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      </Reveal>
      )}

      <PaginationFooter
        pagination={pagination}
        total={offers.length}
        itemLabel={t.pages.offers.item_label}
      />

      <BulkActionBar
        count={offerBulk.selectedCount}
        entityLabel={t.pages.offers.item_label}
        onClear={offerBulk.clear}
        actions={
          showArchived
            ? [
                {
                  label: t.pages.offers.bulk_restore,
                  icon: <ArchiveRestore className="h-3.5 w-3.5" />,
                  onClick: handleOfferBulkUnarchive,
                  busy: offerBulkBusy,
                },
                {
                  label: t.pages.offers.bulk_delete_permanent,
                  icon: <Trash2 className="h-3.5 w-3.5" />,
                  onClick: handleOfferBulkDelete,
                  variant: 'destructive',
                  busy: offerBulkBusy,
                },
              ]
            : [
                {
                  label: t.pages.offers.bulk_archive,
                  icon: <Archive className="h-3.5 w-3.5" />,
                  onClick: handleOfferBulkArchive,
                  busy: offerBulkBusy,
                },
              ]
        }
      />
    </AppShell>
  );
}
