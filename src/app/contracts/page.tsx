'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus,
  FileSignature,
  Eye,
  Archive,
  ArchiveRestore,
  Send,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { contractService } from '@/lib/services/contract.service';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Contract, ContractStatus } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: 'Brouillon',
  pending_review: 'À relire',
  sent: 'Envoyé',
  signed: 'Signé',
  active: 'Actif',
  ended: 'Terminé',
  terminated: 'Résilié',
  cancelled: 'Annulé',
};

const STATUS_STYLE: Record<ContractStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  pending_review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  sent: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  signed: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ended: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
  terminated: 'bg-red-500/15 text-red-300 border-red-500/30',
  cancelled: 'bg-slate-700/15 text-slate-500 border-slate-700/30',
};

type View = 'active' | 'archived';

export default function ContractsPage() {
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | undefined>(undefined);
  const [view, setView] = useState<View>('active');

  const {
    data: contractsData,
    loading,
    reload,
    setData: setContracts,
  } = useCachedQuery<Contract[]>(
    `contracts:${activeOrgId ?? 'none'}:${view}`,
    async () => {
      const res = await contractService.list({ archived: view === 'archived' });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const contracts = contractsData ?? [];
  const pagination = usePagination(contracts.length, {
    storageKey: 'contracts-page-size',
  });
  const paginatedContracts = pagination.paginate(contracts);

  async function updateStatus(id: string, status: ContractStatus) {
    const res = await contractService.updateStatus(id, status);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setContracts((prev) =>
      (prev ?? []).map((c) => (c.id === id ? { ...c, status } : c)),
    );
    toast.success('Statut mis à jour');
  }

  async function archive(id: string) {
    const res = await contractService.archive(id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setContracts((prev) => (prev ?? []).filter((c) => c.id !== id));
    toast.success('Contrat archivé');
  }

  async function unarchive(id: string) {
    const res = await contractService.unarchive(id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setContracts((prev) => (prev ?? []).filter((c) => c.id !== id));
    toast.success('Contrat restauré');
  }

  async function remove(c: Contract) {
    const ok = window.confirm(
      `Supprimer définitivement le contrat ${c.contract_number} ?\n\nCette action est irréversible. Préfère "Archiver" si tu veux juste le masquer.`,
    );
    if (!ok) return;
    const res = await contractService.delete(c.id);
    if (res.error) {
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    setContracts((prev) => (prev ?? []).filter((x) => x.id !== c.id));
    toast.success('Contrat supprimé');
  }

  function openEdit(c: Contract) {
    setEditing(c);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileSignature className="h-7 w-7 text-violet-glow" />
            Contrats
          </h1>
          <p className="text-muted-foreground mt-1">
            {contracts.length} contrat{contracts.length > 1 ? 's' : ''}
            {view === 'archived' ? ' archivé' : ''}
            {contracts.length > 1 && view === 'archived' ? 's' : ''} — assistance technique,
            sous-traitance, avenants
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau contrat
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Archivés
          </TabsTrigger>
        </TabsList>

        <TabsContent value={view}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>TJM</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ) : contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                        <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        {view === 'archived' ? (
                          <p>Aucun contrat archivé.</p>
                        ) : (
                          <p>Aucun contrat. Crée ton premier contrat d'assistance technique.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedContracts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">{c.contract_number}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{c.title}</div>
                          {c.client_name && (
                            <div className="text-xs text-muted-foreground">
                              Client : {c.client_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.supplier_company_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(c.start_date)}
                          {c.end_date && <> → {formatDate(c.end_date)}</>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(c.daily_rate_eur)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLE[c.status]}>
                            {STATUS_LABEL[c.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" asChild title="Voir le détail">
                              <Link href={`/contracts/${c.id}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>

                            {view === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(c)}
                                  title="Modifier"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>

                                {c.status === 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateStatus(c.id, 'sent')}
                                    title="Marquer envoyé"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                {c.status === 'sent' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateStatus(c.id, 'signed')}
                                    title="Marquer signé"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => archive(c.id)}
                                  title="Archiver"
                                >
                                  <Archive className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            {view === 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unarchive(c.id)}
                                title="Restaurer"
                              >
                                <ArchiveRestore className="h-3 w-3" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(c)}
                              title="Supprimer définitivement"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
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
        </TabsContent>
      </Tabs>

      <PaginationFooter
        pagination={pagination}
        total={contracts.length}
        itemLabel="contrat"
      />

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(undefined);
        }}
        organizationId={activeOrgId ?? ''}
        contract={editing}
        onSaved={() => reload()}
      />
    </AppShell>
  );
}
