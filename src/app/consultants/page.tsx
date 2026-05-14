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
  ArrowRightCircle,
  ArrowLeftCircle,
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
import { PromoteToConsultantDialog } from '@/components/consultants/PromoteToConsultantDialog';
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
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

type OriginFilter = 'all' | 'consultant' | 'prospect';

/**
 * Onglet "Consultants" — fusion bibliothèque + vivier.
 *
 * Affiche tous les profils SAUF ceux qui ont une mission "proposed" ou
 * "active" (ceux-là vivent respectivement dans /cv-pushed et /en-mission).
 *
 * Le bouton "Pousser CV" ouvre AssignMissionDialog : on choisit une offre
 * (onglet Offres & missions) et on valide le TJM. Une mission "proposed"
 * est créée → le profil bascule automatiquement vers l'onglet "CV poussés".
 */
export default function ConsultantsPage() {
  const { activeOrgId } = useOrganization();
  const [owners, setOwners] = useState<ConsultantOwner[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [assignTo, setAssignTo] = useState<ConsultantListItem | null>(null);
  const [promoting, setPromoting] = useState<Consultant | null>(null);
  const [familyFilter, setFamilyFilter] = useState<Set<JobFamilyId>>(new Set());
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvAsProspect, setCsvAsProspect] = useState(false);
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
        // Bibliothèque + vivier confondus
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
  const allInPool = (consultantsData ?? []).filter(
    (c) => c.active_missions.length === 0,
  );

  // Comptes par corps de métier (avant filtre origine pour rester stable).
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

  const originCounts = {
    all: allInPool.length,
    consultant: allInPool.filter((c) => !c.is_prospect).length,
    prospect: allInPool.filter((c) => c.is_prospect).length,
  };

  const consultants = allInPool
    .filter((c) =>
      originFilter === 'all'
        ? true
        : originFilter === 'consultant'
          ? !c.is_prospect
          : c.is_prospect,
    )
    .filter((c) =>
      familyFilter.size === 0
        ? true
        : familyFilter.has(classifyJobFamily(c.job_title)),
    );

  useEffect(() => {
    if (!activeOrgId) return;
    consultantService.listOrgOwners(activeOrgId).then((res) => {
      if (res.data) setOwners(res.data);
    });
  }, [activeOrgId]);

  async function handleOwnerChange(consultantId: string, ownerId: string) {
    const next = ownerId || null;
    const prev = consultantsData ?? [];
    setConsultants((list) =>
      (list ?? []).map((c) =>
        c.id === consultantId
          ? { ...c, owner: next ? owners.find((o) => o.id === next) ?? null : null, owner_id: next }
          : c,
      ),
    );
    const res = await consultantService.updateOwner(consultantId, next);
    if (res.error) {
      notifyError('Impossible de mettre à jour le référent');
      setConsultants(prev);
    }
  }

  function ownerLabel(o: ConsultantOwner) {
    const name = [o.first_name, o.last_name].filter(Boolean).join(' ').trim();
    return name || o.email;
  }

  function openCreate(asProspect: boolean) {
    setEditingConsultant(null);
    setOriginFilter(asProspect ? 'prospect' : 'consultant');
    setDialogOpen(true);
  }

  function openEdit(consultant: Consultant) {
    setEditingConsultant(consultant);
    setDialogOpen(true);
  }

  function openCsv(asProspect: boolean) {
    setCsvAsProspect(asProspect);
    setCsvOpen(true);
  }

  async function archiveConsultant(consultant: Consultant) {
    const verb = consultant.is_prospect ? 'Retirer du vivier' : 'Archiver';
    if (
      !confirm(
        `${verb} ${consultant.first_name} ${consultant.last_name} ? Le profil disparaît de la liste mais ses données (CV, CRA, factures) sont conservées.`,
      )
    ) {
      return;
    }
    const res = await consultantService.archive(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${consultant.first_name} ${consultant.last_name} ${consultant.is_prospect ? 'retiré du vivier' : 'archivé'}`);
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

  async function demoteToProspect(consultant: Consultant) {
    if (
      !confirm(
        `Renvoyer ${consultant.first_name} ${consultant.last_name} dans le vivier ? Le profil sort de l'effectif actif et n'est plus comptabilisé dans la facturation.`,
      )
    ) {
      return;
    }
    const res = await consultantService.demoteToProspect(consultant.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${consultant.first_name} ${consultant.last_name} renvoyé au vivier`);
    setConsultants((prev) =>
      (prev ?? []).map((c) =>
        c.id === consultant.id ? { ...c, is_prospect: true } : c,
      ),
    );
  }

  const headerTitle = showArchived
    ? 'Profils archivés'
    : 'Consultants — bibliothèque & vivier';
  const headerSub = showArchived
    ? `${consultants.length} archivé${consultants.length > 1 ? 's' : ''}`
    : `${consultants.length} profil${consultants.length > 1 ? 's' : ''} disponible${consultants.length > 1 ? 's' : ''}${originFilter === 'prospect' ? ' (vivier)' : originFilter === 'consultant' ? ' (bibliothèque)' : ''} — non encore positionné${consultants.length > 1 ? 's' : ''}`;

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
              <Button variant="outline" onClick={() => openCsv(originFilter === 'prospect')}>
                <FileUp className="h-4 w-4" />
                Importer CSV
              </Button>
              <Button onClick={() => openCreate(originFilter === 'prospect')}>
                <Plus className="h-4 w-4" />
                {originFilter === 'prospect' ? 'Nouveau prospect' : 'Nouveau consultant'}
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
        isProspect={!editingConsultant && originFilter === 'prospect'}
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
          // Mission proposed créée → le profil quitte cet onglet vers "CV poussés".
          setConsultants((prev) => (prev ?? []).filter((c) => c.id !== assignTo?.id));
          reload();
        }}
      />

      <PromoteToConsultantDialog
        open={!!promoting}
        onOpenChange={(v) => {
          if (!v) setPromoting(null);
        }}
        consultant={promoting}
        onPromoted={(c) => {
          setConsultants((prev) =>
            (prev ?? []).map((p) => (p.id === c.id ? { ...p, is_prospect: false } : p)),
          );
        }}
      />

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        isProspect={csvAsProspect}
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

          {!showArchived && (
            <div className="flex items-center gap-2 flex-wrap">
              <OriginChip
                label="Tous"
                active={originFilter === 'all'}
                count={originCounts.all}
                onClick={() => setOriginFilter('all')}
              />
              <OriginChip
                label="Bibliothèque"
                active={originFilter === 'consultant'}
                count={originCounts.consultant}
                tone="emerald"
                onClick={() => setOriginFilter('consultant')}
              />
              <OriginChip
                label="Vivier"
                active={originFilter === 'prospect'}
                count={originCounts.prospect}
                tone="amber"
                onClick={() => setOriginFilter('prospect')}
              />
            </div>
          )}

          <JobFamilyFilter
            counts={familyCounts}
            total={allInPool.length}
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
                <TableHead>Origine</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM</TableHead>
                <TableHead>Statut</TableHead>
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
                    {showArchived ? 'Aucun profil archivé' : 'Aucun profil disponible. Ajoute un consultant ou un prospect.'}
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
                      {c.is_prospect ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/[0.08] text-[10px]">
                          Vivier
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/[0.08] text-[10px]">
                          Bibliothèque
                        </Badge>
                      )}
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
                            {!c.is_prospect && !c.has_portal && (
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
                            {c.is_prospect ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPromoting(c)}
                                title="Promouvoir en consultant actif"
                                className="text-emerald-300 hover:text-emerald-200"
                              >
                                <ArrowRightCircle className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => demoteToProspect(c)}
                                title="Renvoyer au vivier de prospection"
                                className="text-amber-300 hover:text-amber-200"
                              >
                                <ArrowLeftCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => archiveConsultant(c)}
                              title={c.is_prospect ? 'Retirer du vivier' : 'Archiver'}
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

function OriginChip({
  label,
  count,
  active,
  tone = 'violet',
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: 'violet' | 'emerald' | 'amber';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/[0.08]'
      : tone === 'amber'
        ? 'border-amber-500/40 text-amber-200 bg-amber-500/[0.08]'
        : 'border-violet-glow/40 text-violet-100 bg-violet-glow/[0.12]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition',
        active
          ? toneClass
          : 'border-hairline text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-80">{count}</span>
    </button>
  );
}
