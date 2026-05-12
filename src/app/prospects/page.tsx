'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notifyDestructive, notifyError } from '@/lib/notify';
import { Plus, Search, Eye, Pencil, Trash2, ArrowRightCircle, FileUp } from 'lucide-react';

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
import { JobFamilyFilter } from '@/components/consultants/JobFamilyFilter';
import { CsvImportDialog } from '@/components/consultants/CsvImportDialog';
import { PromoteToConsultantDialog } from '@/components/consultants/PromoteToConsultantDialog';
import { CityFilter } from '@/components/consultants/CityFilter';

import { consultantService } from '@/lib/services/consultant.service';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { classifyJobFamily, type JobFamilyId } from '@/lib/consultants/job-family';
import type { Consultant } from '@/types';
import { SENIORITY_LABEL } from '@/constants';
import { formatCurrency } from '@/lib/utils';

export default function ProspectsPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Consultant | null>(null);
  const [familyFilter, setFamilyFilter] = useState<Set<JobFamilyId>>(new Set());
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set());
  const [csvOpen, setCsvOpen] = useState(false);
  const [promoting, setPromoting] = useState<Consultant | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: prospects,
    loading,
    reload,
    setData: setProspects,
  } = useCachedQuery<Consultant[]>(
    `prospects:${activeOrgId ?? 'none'}:${debouncedSearch}`,
    async () => {
      const res = await consultantService.list({
        is_prospect: true,
        search: debouncedSearch || undefined,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );

  const allProspects = prospects ?? [];

  const familyCounts = (() => {
    const base: Record<JobFamilyId, number> = {
      qa: 0, dev: 0, data: 0, devops: 0, cyber: 0, pm: 0,
      ba: 0, architect: 0, support: 0, design: 0, other: 0,
    };
    for (const c of allProspects) {
      base[classifyJobFamily(c.job_title)] += 1;
    }
    return base;
  })();

  // Comptage des villes présentes (sur la sélection famille pour rester
  // cohérent : si on filtre famille=QA, on ne propose que les villes des QA).
  const familyFilteredForCities =
    familyFilter.size === 0
      ? allProspects
      : allProspects.filter((c) =>
          familyFilter.has(classifyJobFamily(c.job_title)),
        );
  const cityCounts = (() => {
    const map = new Map<string, number>();
    for (const c of familyFilteredForCities) {
      if (c.city && c.city.trim()) {
        map.set(c.city, (map.get(c.city) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const prospectsList = familyFilteredForCities.filter((c) =>
    cityFilter.size === 0 ? true : c.city ? cityFilter.has(c.city) : false,
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: Consultant) {
    setEditing(c);
    setDialogOpen(true);
  }

  function promote(c: Consultant) {
    setPromoting(c);
  }

  async function archiveProspect(c: Consultant) {
    if (!confirm(`Retirer ${c.first_name} ${c.last_name} du vivier ?`)) return;
    const res = await consultantService.archive(c.id);
    if (res.error) {
      notifyError('Erreur : ' + res.error.message);
      return;
    }
    notifyDestructive(`${c.first_name} ${c.last_name} retiré du vivier`);
    setProspects((prev) => (prev ?? []).filter((p) => p.id !== c.id));
  }

  return (
    <AppShell>
      <TalentTabs active="prospects" counts={{ prospects: prospectsList.length }} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Vivier consultants
          </h1>
          <p className="text-muted-foreground mt-1">
            {prospectsList.length} profil{prospectsList.length > 1 ? 's' : ''} en prospection — non compté
            {prospectsList.length > 1 ? 's' : ''} dans l&apos;effectif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <FileUp className="h-4 w-4" />
            Importer CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau prospect
          </Button>
        </div>
      </div>

      <ConsultantFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        organizationId={activeOrgId ?? ''}
        consultant={editing}
        isProspect
        onSaved={() => reload()}
      />

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        isProspect
        onImported={() => reload()}
      />

      <PromoteToConsultantDialog
        open={!!promoting}
        onOpenChange={(v) => {
          if (!v) setPromoting(null);
        }}
        consultant={promoting}
        onPromoted={(c) => {
          setProspects((prev) => (prev ?? []).filter((p) => p.id !== c.id));
        }}
      />

      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un prospect par nom, intitulé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <JobFamilyFilter
            counts={familyCounts}
            total={allProspects.length}
            active={familyFilter}
            onChange={setFamilyFilter}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <CityFilter cities={cityCounts} selected={cityFilter} onChange={setCityFilter} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profil</TableHead>
                <TableHead>Séniorité</TableHead>
                <TableHead>TJM visé</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-10 rounded-md bg-white/[0.02] animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : prospectsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Aucun prospect. Ajoute un profil repéré pour l&apos;avoir sous le coude.
                  </TableCell>
                </TableRow>
              ) : (
                prospectsList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-qc-gradient flex items-center justify-center text-white text-xs font-semibold">
                          {c.first_name[0]}
                          {c.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {c.first_name} {c.last_name}
                            <Badge
                              variant="outline"
                              className="border-amber-400/40 bg-amber-400/10 text-amber-300 text-[10px]"
                            >
                              Vivier
                            </Badge>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild title="Voir la fiche">
                          <Link href={`/consultants/${c.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          title="Éditer"
                        >
                          <Pencil className="h-3.5 w-3.5 text-violet-glow" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => promote(c)}
                          title="Promouvoir en consultant actif"
                          className="text-emerald-300 hover:text-emerald-200"
                        >
                          <ArrowRightCircle className="h-3.5 w-3.5" />
                          Promouvoir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveProspect(c)}
                          title="Retirer du vivier"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
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
