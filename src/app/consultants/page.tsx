'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { TalentTabs } from '@/components/consultants/TalentTabs';
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
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
import { CityFilter } from '@/components/consultants/CityFilter';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { GrantPortalDialog } from '@/components/consultants/GrantPortalDialog';
import { UsageBanner } from '@/components/billing/UsageBanner';
import { Select } from '@/components/ui/select';
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
import type { Consultant } from '@/types';
import {
  CONSULTANT_STATUS_LABEL,
  CONSULTANT_STATUS_STYLE,
  SENIORITY_LABEL,
} from '@/constants';
import { formatCurrency } from '@/lib/utils';

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
export default function ConsultantsPage() {
  const { activeOrgId } = useOrganization();
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

  const consultants = familyFiltered.filter((c) =>
    cityFilter.size === 0 ? true : c.city ? cityFilter.has(c.city) : false,
  );

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
    const prev = consultantsData;
    setConsultants((list) =>
      (list ?? []).map((c) =>
        c.id === consultantId ? { ...c, status: next } : c,
      ),
    );
    const res = await consultantService.update(consultantId, { status: next });
    if (res.error) {
      notifyError('Mise à jour du statut impossible : ' + res.error.message);
      setConsultants(prev ?? []);
    }
  }

  async function archiveConsultant(consultant: Consultant) {
    if (
      !confirm(
        `Archiver ${consultant.first_name} ${consultant.last_name} ? Le profil disparaît de la liste mais ses données (CV, CRA, factures) sont conservées.`,
      )
    ) {
      return;
    }
    const res = await consultantService.archive(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${consultant.first_name} ${consultant.last_name} archivé`);
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
  }

  async function unarchiveConsultant(consultant: Consultant) {
    const res = await consultantService.unarchive(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyCreated(`${consultant.first_name} ${consultant.last_name} restauré`);
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
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
  }

  const headerTitle = showArchived ? 'Profils archivés' : 'Consultants';
  const headerSub = showArchived
    ? `${consultants.length} archivé${consultants.length > 1 ? 's' : ''}`
    : `${consultants.length} profil${consultants.length > 1 ? 's' : ''} disponible${consultants.length > 1 ? 's' : ''} — pas encore positionné${consultants.length > 1 ? 's' : ''}`;

  return (
    <AppShell>
      <TalentTabs active="consultants" counts={{ consultants: allInPool.length }} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{headerTitle}</h1>
          <p className="text-muted-foreground mt-1">{headerSub}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived((v) => !v)}
            title={showArchived ? 'Revenir à la liste active' : 'Afficher les archivés'}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Voir les actifs
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Voir les archivés
              </>
            )}
          </Button>
          {!showArchived && (
            <>
              <Button variant="outline" onClick={() => setCsvOpen(true)}>
                <FileUp className="h-4 w-4" />
                Importer CSV
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nouveau consultant
              </Button>
            </>
          )}
        </div>
      </div>

      <ConsultantFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingConsultant(null);
        }}
        organizationId={activeOrgId ?? ''}
        consultant={editingConsultant}
        onSaved={() => reload()}
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
        onImported={() => reload()}
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

      <Card className="mb-3">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, intitulé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <JobFamilyFilter
            counts={familyCounts}
            total={allInPool.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
        </CardContent>
      </Card>

      {/* Filtre ville posé en dessous du carré principal : le popover
          a ainsi toute la place pour s'ouvrir sans recouvrir le tableau. */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <CityFilter
          cities={cityCounts}
          selected={cityFilter}
          onChange={setCityFilter}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-10 rounded-md bg-white/[0.02] animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : consultants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {showArchived ? 'Aucun profil archivé' : 'Aucun profil disponible.'}
                  </TableCell>
                </TableRow>
              ) : (
                consultants.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-qc-gradient flex items-center justify-center text-white text-xs font-semibold">
                          {c.first_name[0]}
                          {c.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium">
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.job_title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SENIORITY_LABEL[c.seniority]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(c.daily_rate_eur)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {c.city ?? '—'}
                    </TableCell>
                    <TableCell>
                      {showArchived || c.status === 'on_mission' || c.status === 'archived' ? (
                        // En lecture seule : 'on_mission' est piloté par le trigger
                        // missions, 'archived' par l'archivage du profil.
                        <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                          {CONSULTANT_STATUS_LABEL[c.status]}
                        </Badge>
                      ) : (
                        <Select
                          value={c.status}
                          onChange={(e) =>
                            handleStatusChange(c.id, e.target.value as Consultant['status'])
                          }
                          className={cn(
                            'h-7 text-xs font-medium min-w-[130px] border',
                            CONSULTANT_STATUS_STYLE[c.status],
                          )}
                          title="Changer le statut du consultant"
                        >
                          <option value="available">Disponible</option>
                          <option value="soon_available">Bientôt dispo</option>
                          <option value="unavailable">Indisponible</option>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild title="Voir la fiche">
                          <Link href={`/consultants/${c.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Voir
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
                              Pousser CV
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
