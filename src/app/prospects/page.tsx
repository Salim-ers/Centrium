'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Search, Eye, Pencil, Trash2, ArrowRightCircle } from 'lucide-react';

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

import { consultantService } from '@/lib/services/consultant.service';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import type { Consultant } from '@/types';
import { SENIORITY_LABEL } from '@/constants';
import { formatCurrency } from '@/lib/utils';

export default function ProspectsPage() {
  const { activeOrgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Consultant | null>(null);

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

  const prospectsList = prospects ?? [];

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: Consultant) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function promote(c: Consultant) {
    if (
      !confirm(
        `Promouvoir ${c.first_name} ${c.last_name} en consultant de l'organisation ? Il rejoindra la bibliothèque active et comptera dans l'effectif.`,
      )
    ) {
      return;
    }
    const res = await consultantService.promoteToConsultant(c.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success(`${c.first_name} ${c.last_name} est désormais consultant actif`);
    setProspects((prev) => (prev ?? []).filter((p) => p.id !== c.id));
  }

  async function archiveProspect(c: Consultant) {
    if (!confirm(`Retirer ${c.first_name} ${c.last_name} du vivier ?`)) return;
    const res = await consultantService.archive(c.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('Prospect retiré du vivier');
    setProspects((prev) => (prev ?? []).filter((p) => p.id !== c.id));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Prospection consultants
          </h1>
          <p className="text-muted-foreground mt-1">
            {prospectsList.length} profil{prospectsList.length > 1 ? 's' : ''} en vivier — non compté
            {prospectsList.length > 1 ? 's' : ''} dans l&apos;effectif
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau prospect
        </Button>
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

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un prospect par nom, intitulé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
