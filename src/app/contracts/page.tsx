'use client';

import { useState } from 'react';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useContractStatusLabels } from '@/lib/i18n/useBadges';
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
  Hourglass,
  AlertCircle,
  Coins,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
  StatusBadge,
  type StatusTone,
} from '@/components/app';
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
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
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

const STATUS_TONE: Record<ContractStatus, StatusTone> = {
  draft: 'pending',
  pending_review: 'warning',
  sent: 'info',
  signed: 'success',
  active: 'success',
  ended: 'neutral',
  terminated: 'danger',
  cancelled: 'neutral',
};

type View = 'active' | 'archived';

export default function ContractsPage() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const ctLabels = useContractStatusLabels();
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

  useRealtimeReload(['contracts'], () => reload());

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
    toast.success(t.toasts.saved);
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
    toast.success(t.toasts.deleted);
  }

  function openEdit(c: Contract) {
    setEditing(c);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  // KPIs : signés ce mois / en attente signature / expirés / total annuel
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const signedThisMonth = contracts.filter((c) => {
    if (c.status !== 'signed' && c.status !== 'active') return false;
    const d = c.start_date ? new Date(c.start_date) : null;
    return d && d >= startOfMonth;
  }).length;
  const pendingSignature = contracts.filter(
    (c) => c.status === 'sent' || c.status === 'pending_review',
  ).length;
  const expiredCount = contracts.filter((c) => {
    if (!c.end_date) return false;
    return new Date(c.end_date) < now && (c.status === 'active' || c.status === 'signed' || c.status === 'ended');
  }).length;
  const totalAnnual = contracts
    .filter((c) => {
      const d = c.start_date ? new Date(c.start_date) : null;
      return d && d >= startOfYear;
    })
    .reduce((sum, c) => sum + (Number(c.daily_rate_eur) || 0), 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.contracts.eyebrow}
        title={
          <>
            {t.pages.contracts.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.contracts.title_b}</span>
          </>
        }
        description={`${contracts.length} contrat${contracts.length > 1 ? 's' : ''}${
          view === 'archived' ? ' archivé' : ''
        }${contracts.length > 1 && view === 'archived' ? 's' : ''} — assistance technique, sous-traitance, avenants.`}
        actions={
          <Button onClick={openCreate} disabled={!activeOrgId}>
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        }
      />

      {view === 'active' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Signés ce mois"
            value={signedThisMonth}
            icon={CheckCircle2}
            tone="emerald"
          />
          <KPICard
            label="En attente signature"
            value={pendingSignature}
            icon={Hourglass}
            tone="amber"
          />
          <KPICard
            label="Expirés"
            value={expiredCount}
            icon={AlertCircle}
            tone="rose"
            hint="à clôturer ou renouveler"
          />
          <KPICard
            label="TJM annuel cumulé"
            value={totalAnnual}
            prefix="€"
            icon={Coins}
            tone="violet"
            hint={`depuis le 1er janvier`}
          />
        </div>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as View)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Archivés
          </TabsTrigger>
        </TabsList>

        <TabsContent value={view}>
          {!loading && contracts.length === 0 ? (
            <EmptyState
              icon={FileSignature}
              title={view === 'archived' ? 'Aucun contrat archivé' : 'Aucun contrat pour l’instant'}
              description={
                view === 'archived'
                  ? 'Les contrats archivés apparaîtront ici.'
                  : 'Crée ton premier contrat d’assistance technique pour démarrer le suivi.'
              }
              action={
                view === 'active' ? (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nouveau contrat
                  </Button>
                ) : undefined
              }
            />
          ) : (
          <AppCard>
            <div className="p-0">
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
                          <StatusBadge tone={STATUS_TONE[c.status]}>
                            {ctLabels[c.status as keyof typeof ctLabels] ?? STATUS_LABEL[c.status]}
                          </StatusBadge>
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
            </div>
          </AppCard>
          )}
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
