'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus,
  Receipt,
  CheckCircle2,
  Send,
  Eye,
  Undo2,
  Archive,
  ArchiveRestore,
  Trash2,
  Banknote,
  Clock3,
  AlertTriangle,
  FileText,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
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
import { InvoiceFormDialog } from '@/components/invoices/InvoiceFormDialog';

import { invoiceService, type InvoiceListItem } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import { INVOICE_STATUS_LABEL } from '@/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const {
    data: invoicesData,
    loading,
    reload,
  } = useCachedQuery<InvoiceListItem[]>(
    `invoices:${activeOrgId ?? 'none'}:${showArchived ? 'all' : 'active'}`,
    async () => {
      const res = await invoiceService.listWithConsultant({
        includeArchived: showArchived,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const invoices = invoicesData ?? [];

  // Auto-sync : un collègue qui crée/édite/paie une facture est visible
  // sans F5. invoice_items est inclus car les totaux peuvent changer.
  useRealtimeReload(['invoices', 'invoice_items'], () => reload());

  const pagination = usePagination(invoices.length, {
    storageKey: 'invoices-page-size',
  });
  const paginatedInvoices = pagination.paginate(invoices);

  async function markPaid(id: string) {
    const res = await invoiceService.markAsPaid(id);
    if (res.error) return toast.error('Erreur : ' + res.error.message);
    toast.success('Facture marquée payée');
    reload();
  }

  async function markSent(id: string) {
    const res = await invoiceService.markAsSent(id);
    if (res.error) return toast.error('Erreur : ' + res.error.message);
    toast.success('Facture marquée envoyée');
    reload();
  }

  async function markUnpaid(id: string) {
    if (!confirm('Annuler le paiement et repasser la facture en "envoyée" ?')) return;
    const res = await invoiceService.markAsUnpaid(id);
    if (res.error) return toast.error('Erreur : ' + res.error.message);
    toast.success('Paiement annulé — facture repassée en envoyée');
    reload();
  }

  async function archive(inv: InvoiceListItem) {
    if (
      !confirm(
        `Archiver la facture ${inv.invoice_number} ? Elle ne s'affichera plus dans la liste active mais reste conservée pour la compta.`,
      )
    )
      return;
    const res = await invoiceService.archive(inv.id);
    if (res.error) return toast.error('Erreur : ' + res.error.message);
    toast.success(`Facture ${inv.invoice_number} archivée`);
    reload();
  }

  async function unarchive(inv: InvoiceListItem) {
    const res = await invoiceService.unarchive(inv.id);
    if (res.error) return toast.error('Erreur : ' + res.error.message);
    toast.success(`Facture ${inv.invoice_number} désarchivée`);
    reload();
  }

  async function remove(inv: InvoiceListItem) {
    if (
      !confirm(
        `Supprimer définitivement la facture ${inv.invoice_number} ? Cette action est irréversible. (Seules les factures en brouillon peuvent être supprimées — sinon archive plutôt.)`,
      )
    )
      return;
    const res = await invoiceService.remove(inv.id);
    if (res.error) return toast.error(res.error.message);
    toast.success(`Facture ${inv.invoice_number} supprimée`);
    reload();
  }

  // Defensive : amount_ht peut être null/string sur données legacy → NaN
  // qui pollue les sommes. safeAmount garantit un number fini.
  const safeAmount = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);
  const totalPending = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);

  // KPIs : émis ce mois / encaissé / en attente / en retard
  const now = new Date();
  const currMonth = now.getMonth();
  const currYear = now.getFullYear();
  const issuedThisMonth = invoices
    .filter((i) => {
      if (!i.issue_date) return false;
      const d = new Date(i.issue_date);
      return d.getMonth() === currMonth && d.getFullYear() === currYear;
    })
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);
  const overdueAmount = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);

  // Mapping statut métier → tone unifié
  const statusToTone = (s: InvoiceListItem['status']): StatusTone => {
    if (s === 'paid') return 'success';
    if (s === 'sent') return 'info';
    if (s === 'overdue') return 'danger';
    if (s === 'cancelled') return 'neutral';
    return 'pending';
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Facturation"
        title={
          <>
            Factures <span className="qc-italic-accent font-editorial italic">clients.</span>
          </>
        }
        description="Suivi du chiffre d'affaires, des encaissements et des relances."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? 'Revenir à la liste active' : 'Afficher les factures archivées'}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Voir actives
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Voir archivées
                </>
              )}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle facture
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={FileText}
          label="Émis ce mois"
          valueText={formatCurrency(issuedThisMonth)}
          tone="magenta"
        />
        <KPICard
          icon={Banknote}
          label="Encaissé"
          valueText={formatCurrency(totalPaid)}
          tone="emerald"
        />
        <KPICard
          icon={Clock3}
          label="En attente"
          valueText={formatCurrency(totalPending)}
          tone="amber"
        />
        <KPICard
          icon={AlertTriangle}
          label="En retard"
          valueText={formatCurrency(overdueAmount)}
          tone="rose"
        />
      </div>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        onSaved={() => reload()}
      />

      {!loading && invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={showArchived ? 'Aucune facture archivée' : 'Aucune facture'}
          description={
            showArchived
              ? 'Les factures archivées apparaîtront ici.'
              : 'Crée ta première facture pour démarrer la facturation client.'
          }
          action={
            !showArchived ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle facture
              </Button>
            ) : undefined
          }
        />
      ) : (
      <AppCard>
        <div className="overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Consultant</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Émission</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Montant HT</TableHead>
                <TableHead>TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv) => {
                  // Le consultant peut venir d'une mission liée OU d'un
                  // lien direct sur la facture (cas des factures manuelles).
                  const c = inv.mission?.consultant ?? inv.consultant ?? null;
                  const consultantName = c
                    ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'
                    : '—';
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {c ? (
                            <div className="h-6 w-6 rounded-full bg-qc-gradient flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                              {(c.first_name?.[0] ?? '?').toUpperCase()}
                              {(c.last_name?.[0] ?? '').toUpperCase()}
                            </div>
                          ) : null}
                          <span className="text-sm">{consultantName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{inv.period_label ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.due_date)}</TableCell>
                      <TableCell>{formatCurrency(Number(inv.amount_ht))}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(inv.amount_ttc))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusToTone(inv.status)}>
                          {INVOICE_STATUS_LABEL[inv.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/invoices/${inv.id}`}>
                              <Eye className="h-3 w-3" />
                              Voir
                            </Link>
                          </Button>
                          {inv.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => markSent(inv.id)}>
                              <Send className="h-3 w-3" />
                              Envoyer
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Button
                              size="sm"
                              onClick={() => markPaid(inv.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Marquer payée
                            </Button>
                          )}
                          {inv.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markUnpaid(inv.id)}
                              title="Annuler le paiement et repasser en envoyée"
                            >
                              <Undo2 className="h-3 w-3" />
                              Annuler paiement
                            </Button>
                          )}
                          {inv.archived ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unarchive(inv)}
                              title="Désarchiver la facture"
                            >
                              <ArchiveRestore className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => archive(inv)}
                              title="Archiver la facture (conservée pour la compta)"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          {inv.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => remove(inv)}
                              title="Supprimer définitivement (brouillon uniquement)"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      )}

      <PaginationFooter
        pagination={pagination}
        total={invoices.length}
        itemLabel="facture"
      />
    </AppShell>
  );
}
