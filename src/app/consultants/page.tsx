'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArchiveRestore,
  Archive,
  X,
  Target,
  ArrowLeftCircle,
  FileUp,
  KeyRound,
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
import { ConsultantFormDialog } from '@/components/consultants/ConsultantFormDialog';
import { AssignMissionDialog } from '@/components/missions/AssignMissionDialog';
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { GrantPortalDialog } from '@/components/consultants/GrantPortalDialog';
import { Select } from '@/components/ui/select';
import {
  classifyJobFamily,
  type JobFamilyId,
} from '@/lib/consultants/job-family';

import {
  consultantService,
  type ConsultantListItem,
  type ConsultantOwner,
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

export default function ConsultantsPage() {
  const { activeOrgId } = useOrganization();
  const [owners, setOwners] = useState<ConsultantOwner[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [assignTo, setAssignTo] = useState<ConsultantListItem | null>(null);
  const [familyFilter, setFamilyFilter] = useState<Set<JobFamilyId>>(new Set());
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
    `consultants:${activeOrgId ?? 'none'}:${showArchived ? 'arch' : 'active'}:${debouncedSearch}`,
    async () => {
      const res = await consultantService.list({
        search: debouncedSearch || undefined,
        archived: showArchived,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const allConsultants = consultantsData ?? [];

  // Comptes par corps de métier (sur la liste non filtrée par famille,
  // sinon les chips inactives masqueraient leur propre compte).
  const familyCounts = (() => {
    const base: Record<JobFamilyId, number> = {
      qa: 0, dev: 0, data: 0, devops: 0, cyber: 0, pm: 0,
      ba: 0, architect: 0, support: 0, design: 0, other: 0,
    };
    for (const c of allConsultants) {
      base[classifyJobFamily(c.job_title)] += 1;
    }
    return base;
  })();

  const consultants =
    familyFilter.size === 0
      ? allConsultants
      : allConsultants.filter((c) =>
          familyFilter.has(classifyJobFamily(c.job_title)),
        );

  useEffect(() => {
    if (!activeOrgId) return;
    consultantService.listOrgOwners(activeOrgId).then((res) => {
      if (res.data) setOwners(res.data);
    });
  }, [activeOrgId]);

  async function handleOwnerChange(consultantId: string, ownerId: string) {
    const next = ownerId || null;
    const prev = consultants;
    setConsultants((list) =>
      (list ?? []).map((c) =>
        c.id === consultantId
          ? { ...c, owner: next ? owners.find((o) => o.id === next) ?? null : null, owner_id: next }
          : c,
      ),
    );
    const res = await consultantService.updateOwner(consultantId, next);
    if (res.error) {
      toast.error('Impossible de mettre à jour le référent');
      setConsultants(prev);
    }
  }

  function ownerLabel(o: ConsultantOwner) {
    const name = [o.first_name, o.last_name].filter(Boolean).join(' ').trim();
    return name || o.email;
  }

  async function removeMission(consultantId: string, missionId: string, missionTitle: string) {
    if (
      !confirm(
        `Retirer la mission "${missionTitle}" de ce consultant ? La mission sera supprimée.`,
      )
    ) {
      return;
    }
    const prev = consultants;
    setConsultants((list) =>
      (list ?? []).map((c) =>
        c.id === consultantId
          ? { ...c, active_missions: c.active_missions.filter((m) => m.id !== missionId) }
          : c,
      ),
    );
    const res = await fetch(`/api/missions/${missionId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.message ?? 'Suppression impossible');
      setConsultants(prev);
      return;
    }
    toast.success('Mission retirée');
  }

  function openCreate() {
    setEditingConsultant(null);
    setDialogOpen(true);
  }

  function openEdit(consultant: Consultant) {
    setEditingConsultant(consultant);
    setDialogOpen(true);
  }

  async function archiveConsultant(consultant: Consultant) {
    if (
      !confirm(
        `Archiver ${consultant.first_name} ${consultant.last_name} ? Le consultant disparaît de la liste mais ses données (CRA, factures, CV) sont conservées.`,
      )
    ) {
      return;
    }
    const res = await consultantService.archive(consultant.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Consultant archivé');
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
  }

  async function unarchiveConsultant(consultant: Consultant) {
    const res = await consultantService.unarchive(consultant.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`${consultant.first_name} ${consultant.last_name} restauré`);
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
      toast.error('Confirmation incorrecte — suppression annulée.');
      return;
    }
    const res = await consultantService.delete(consultant.id);
    if (res.error) {
      // Cas typique : FK contraint (CRA, factures, contrats existants)
      const msg = /foreign key|violates foreign|reference/i.test(res.error.message)
        ? `Impossible : ${fullName} a des CRA, factures ou contrats liés. Supprime-les d'abord.`
        : 'Erreur : ' + res.error.message;
      toast.error(msg);
      return;
    }
    toast.success(`${fullName} supprimé définitivement`);
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
  }

  async function demoteToProspect(consultant: Consultant) {
    if (
      !confirm(
        `Renvoyer ${consultant.first_name} ${consultant.last_name} dans le vivier de prospection ? Le profil sort de l'effectif actif et n'est plus comptabilisé dans la facturation.`,
      )
    ) {
      return;
    }
    const res = await consultantService.demoteToProspect(consultant.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`${consultant.first_name} ${consultant.last_name} renvoyé au vivier`);
    setConsultants((prev) => (prev ?? []).filter((c) => c.id !== consultant.id));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {showArchived ? 'Consultants archivés' : 'Bibliothèque consultants'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {consultants.length}{' '}
            {showArchived
              ? `archivé${consultants.length > 1 ? 's' : ''}`
              : `consultant${consultants.length > 1 ? 's' : ''} référencé${consultants.length > 1 ? 's' : ''}`}
          </p>
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
        onAssigned={() => reload()}
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

      <Card className="mb-6">
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
            total={allConsultants.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Mission / AO</TableHead>
                <TableHead>Pris en charge par</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-10 rounded-md bg-white/[0.02] animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : consultants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {showArchived ? 'Aucun consultant archivé' : 'Aucun consultant'}
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
                    <TableCell>
                      <Badge variant="outline" className={CONSULTANT_STATUS_STYLE[c.status]}>
                        {CONSULTANT_STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="space-y-1.5">
                        {c.active_missions.length === 0 && showArchived ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          c.active_missions.map((m) => (
                            <div
                              key={m.id}
                              className="group flex items-start gap-1.5 text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{m.title}</div>
                                {m.job_offer_title && (
                                  <div className="text-muted-foreground truncate">
                                    AO · {m.job_offer_title}
                                  </div>
                                )}
                              </div>
                              {!showArchived && (
                                <button
                                  type="button"
                                  onClick={() => removeMission(c.id, m.id, m.title)}
                                  title="Retirer la mission"
                                  className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-400 mt-0.5"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                        {!showArchived && (
                          <button
                            type="button"
                            onClick={() => setAssignTo(c)}
                            className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200 hover:underline"
                          >
                            <Target className="h-3 w-3" />
                            Affecter une mission
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {showArchived ? (
                        <span className="text-xs text-muted-foreground">
                          {c.owner ? ownerLabel(c.owner) : '—'}
                        </span>
                      ) : (
                        <Select
                          value={c.owner?.id ?? ''}
                          onChange={(e) => handleOwnerChange(c.id, e.target.value)}
                          className="h-8 text-xs max-w-[180px]"
                        >
                          <option value="">— Non assigné</option>
                          {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {ownerLabel(o)}
                            </option>
                          ))}
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
                              onClick={() => demoteToProspect(c)}
                              title="Renvoyer au vivier de prospection"
                              className="text-amber-300 hover:text-amber-200"
                            >
                              <ArrowLeftCircle className="h-3.5 w-3.5" />
                            </Button>
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
