'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Target,
  MapPin,
  Euro,
  Calendar,
  FileDown,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { JobOfferFormDialog } from '@/components/offers/JobOfferFormDialog';
import { jobOfferService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { JobOffer } from '@/types';
import { formatCurrency, relativeDate } from '@/lib/utils';
import { exportJobOfferPoster } from '@/lib/offers/export-poster';
import { resolveBrand } from '@/lib/cv/branding';

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouverte',
  closed: 'Fermée',
  won: 'Gagnée',
  lost: 'Perdue',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  won: 'bg-violet-brand/15 text-violet-300 border-violet-brand/30',
  lost: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const SENIORITY_LABEL: Record<string, string> = {
  junior: 'Junior',
  confirmed: 'Confirmé',
  senior: 'Senior',
  expert: 'Expert',
  lead: 'Lead',
  architect: 'Architecte',
};

export default function OffersPage() {
  const { activeOrgId, branding } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'won' | 'lost' | 'all'>('open');
  const [exportingOfferId, setExportingOfferId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const {
    data: offersData,
    loading,
    reload,
    setData: setOffers,
  } = useCachedQuery<JobOffer[]>(
    `offers:${activeOrgId ?? 'none'}:${statusFilter}:${showArchived ? 'arch' : 'live'}`,
    async () => {
      const res = await jobOfferService.list(statusFilter, showArchived);
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const offers = offersData ?? [];

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

  async function changeStatus(o: JobOffer, newStatus: 'open' | 'closed' | 'won' | 'lost') {
    const res = await jobOfferService.update(o.id, { status: newStatus });
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Statut mis à jour');
    reload();
  }

  async function archiveOffer(o: JobOffer) {
    if (
      !confirm(
        `Archiver l'offre "${o.title}" ?\n\nElle disparaît du KPI "Opportunités ouvertes" et de la liste par défaut. Reste consultable via "Voir les archivées".`,
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
            Offres & missions
          </h1>
          <p className="text-muted-foreground mt-1">
            Les besoins clients qui alimentent le matching consultants
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
        onSaved={() => reload()}
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Statut</label>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="max-w-[200px]"
        >
          <option value="open">Ouvertes</option>
          <option value="closed">Fermées</option>
          <option value="won">Gagnées</option>
          <option value="lost">Perdues</option>
          <option value="all">Toutes</option>
        </Select>
        <span className="text-xs text-muted-foreground">
          {offers.length} offre{offers.length > 1 ? 's' : ''}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mission</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Lieu / TT</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Mis à jour</TableHead>
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
                    Aucune offre. Clique sur &laquo; Nouvelle offre &raquo; pour en ajouter une.
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.title}</div>
                      {o.start_date && (
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(o.start_date).toLocaleDateString('fr-FR')}
                          {o.duration_months ? ` · ${o.duration_months} mois` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.seniority ? SENIORITY_LABEL[o.seniority] : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.daily_rate_min || o.daily_rate_max ? (
                        <span className="inline-flex items-center gap-1">
                          <Euro className="h-3 w-3 text-muted-foreground" />
                          {o.daily_rate_min ? formatCurrency(o.daily_rate_min) : '?'} –{' '}
                          {o.daily_rate_max ? formatCurrency(o.daily_rate_max) : '?'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {o.location ?? '—'}
                      </div>
                      {o.remote_days != null && o.remote_days > 0 && (
                        <div className="text-[10px] text-violet-300 mt-0.5">
                          {o.remote_days}j TT / sem.
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[220px]">
                        {o.required_skills.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="text-[10px] border-violet-brand/40 bg-violet-brand/10"
                          >
                            {s}
                          </Badge>
                        ))}
                        {o.required_skills.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{o.required_skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onChange={(e) => changeStatus(o, e.target.value as 'open' | 'closed' | 'won' | 'lost')}
                        className={`h-7 text-xs min-w-[120px] ${STATUS_STYLE[o.status] ?? ''}`}
                      >
                        <option value="open">{STATUS_LABEL.open}</option>
                        <option value="closed">{STATUS_LABEL.closed}</option>
                        <option value="won">{STATUS_LABEL.won}</option>
                        <option value="lost">{STATUS_LABEL.lost}</option>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{relativeDate(o.updated_at)}</TableCell>
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
                              Restaurer
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
                              title="Archiver — sort des KPI et de la liste par défaut"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
