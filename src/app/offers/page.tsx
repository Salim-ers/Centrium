'use client';

import { useState } from 'react';
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
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency, relativeDate } from '@/lib/utils';
import { exportJobOfferPoster } from '@/lib/offers/export-poster';
import { resolveBrand } from '@/lib/cv/branding';
import {
  classifyJobFamily,
  type JobFamilyId,
} from '@/lib/consultants/job-family';

const SENIORITY_LABEL: Record<string, string> = {
  junior: 'Junior',
  confirmed: 'Confirmé',
  senior: 'Senior',
  expert: 'Expert',
  lead: 'Lead',
  architect: 'Architecte',
};

/**
 * Liste des offres / missions. Une seule "vue active" — on ne distingue
 * plus open/closed/won/lost en colonne (le funnel commercial vit dans le
 * CRM). Ici, on liste les besoins, on filtre par métier + ville, on
 * pousse un consultant via matching, on archive quand c'est terminé.
 */
export default function OffersPage() {
  const { activeOrgId, branding } = useOrganization();
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

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(o: JobOffer) {
    setEditing(o);
    setDialogOpen(true);
  }

  async function deleteOffer(o: JobOffer) {
    if (!confirm(`Supprimer l'offre "${o.title}" ?\n\nCette action est irréversible.`)) return;
    const res = await jobOfferService.remove(o.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Offre supprimée');
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  async function downloadPoster(o: JobOffer) {
    setExportingOfferId(o.id);
    try {
      const brand = resolveBrand(branding);
      const safeTitle = o.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      const brandSlug = brand.brandName.replace(/[^a-zA-Z0-9]/g, '') || 'QuadCore';
      await exportJobOfferPoster(o, {
        filename: `Fiche_Poste_${safeTitle}_${brandSlug}`,
        brand,
      });
      toast.success('Fiche de poste téléchargée');
    } catch (e) {
      console.error(e);
      toast.error(
        `Erreur export PDF : ${e instanceof Error ? e.message : 'inconnue'}`,
      );
    } finally {
      setExportingOfferId(null);
    }
  }

  async function archiveOffer(o: JobOffer) {
    if (
      !confirm(
        `Archiver l'offre "${o.title}" ?\n\nElle disparaît du KPI "Opportunités ouvertes" et de la liste par défaut.`,
      )
    ) {
      return;
    }
    const res = await jobOfferService.update(o.id, { archived: true });
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`Offre "${o.title}" archivée`);
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  async function unarchiveOffer(o: JobOffer) {
    const res = await jobOfferService.update(o.id, { archived: false });
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`Offre "${o.title}" restaurée`);
    setOffers((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-violet-glow" />
            Offres &amp; missions
          </h1>
          <p className="text-muted-foreground mt-1">
            {offers.length} offre{offers.length > 1 ? 's' : ''}
            {showArchived ? ' archivée' : ''} • besoins clients qui alimentent le
            matching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived((v) => !v)}
            title={showArchived ? 'Revenir aux offres actives' : 'Voir les offres archivées'}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Voir les actives
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Voir les archivées
              </>
            )}
          </Button>
          {!showArchived && (
            <>
              <Button variant="outline" asChild>
                <Link href="/matching" className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Lancer matching
                </Link>
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Button>
            </>
          )}
        </div>
      </div>

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
          / Avec CV poussé (offres déjà engagées). Caché en vue archivée. */}
      {!showArchived && (
        <div className="mb-4 flex items-center gap-1 rounded-lg border border-hairline bg-white/[0.02] p-1 w-fit">
          <button
            type="button"
            onClick={() => setPipelineTab('available')}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition',
              pipelineTab === 'available'
                ? 'bg-violet-glow/15 text-violet-glow border border-violet-glow/30 shadow-[0_0_30px_-12px_rgba(139,92,246,0.5)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
            )}
            title="Offres encore disponibles pour pousser un CV"
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="font-medium">Disponibles</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                pipelineTab === 'available'
                  ? 'bg-violet-glow/25 text-violet-50'
                  : 'bg-white/[0.05] text-muted-foreground',
              )}
            >
              {availableCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPipelineTab('pushed')}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition',
              pipelineTab === 'pushed'
                ? 'bg-magenta-neon/15 text-magenta-neon border border-magenta-neon/30 shadow-[0_0_30px_-12px_rgba(236,72,153,0.5)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
            )}
            title="Offres déjà avec un CV poussé (en attente de validation ou en mission)"
          >
            <Target className="h-4 w-4 shrink-0" />
            <span className="font-medium">Avec CV poussé</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                pipelineTab === 'pushed'
                  ? 'bg-magenta-neon/25 text-magenta-50'
                  : 'bg-white/[0.05] text-muted-foreground',
              )}
            >
              {pushedCount}
            </span>
          </button>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par intitulé, skill, source, lieu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <JobFamilyFilter
            counts={familyCounts}
            total={allOffers.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
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
            Effacer le filtre ville
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mission</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Maj</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Aucune offre. Clique sur « Nouvelle offre » pour en ajouter une.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOffers.map((o) => {
                  // TJM unique : on lit max en priorité, fallback min.
                  const tjm = o.daily_rate_max ?? o.daily_rate_min ?? null;
                  return (
                    <TableRow key={o.id}>
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
                            {o.duration_months ? ` · ${o.duration_months} mois` : ''}
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
                                {o.source_kind === 'esn' ? 'ESN partenaire' : 'Client direct'}
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
                                Client à définir
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 pl-[18px] italic">
                              À renseigner sur l&apos;AO
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.seniority ? SENIORITY_LABEL[o.seniority] : '—'}
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
                            {o.remote_days}j TT/sem.
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
                        <div className="flex items-center justify-end gap-1">
                          {showArchived ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => unarchiveOffer(o)}
                                title="Restaurer l'offre"
                                className="text-emerald-300 hover:text-emerald-200"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteOffer(o)}
                                title="Supprimer définitivement"
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
                                title="Lancer le matching sur cette offre"
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
                                title="Télécharger la fiche de poste PDF"
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
                                title="Éditer"
                              >
                                <Pencil className="h-3.5 w-3.5 text-violet-glow" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => archiveOffer(o)}
                                title="Archiver — sort des KPI, peut être restauré"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteOffer(o)}
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaginationFooter
        pagination={pagination}
        total={offers.length}
        itemLabel="offre"
      />
    </AppShell>
  );
}
