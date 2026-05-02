'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Receipt, CheckCircle2, Send, Eye, Undo2 } from 'lucide-react';

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
import { InvoiceFormDialog } from '@/components/invoices/InvoiceFormDialog';

import { invoiceService, type InvoiceListItem } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE } from '@/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoicesPage() {
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data: invoicesData,
    loading,
    reload,
  } = useCachedQuery<InvoiceListItem[]>(
    `invoices:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await invoiceService.listWithConsultant();
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const invoices = invoicesData ?? [];

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

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount_ht), 0);
  const totalPending = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.amount_ht), 0);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <Receipt className="h-7 w-7 text-violet-glow" />
            Factures
          </h1>
          <p className="text-muted-foreground mt-1">
            Encaissé :{' '}
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalPaid)}</span>
            {' · '}
            En attente :{' '}
            <span className="text-amber-400 font-semibold">{formatCurrency(totalPending)}</span>
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        onSaved={() => reload()}
      />

      <Card>
        <CardContent className="p-0">
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
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Aucune facture
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const consultantName = inv.mission?.consultant
                    ? `${inv.mission.consultant.first_name} ${inv.mission.consultant.last_name}`
                    : '—';
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {inv.mission?.consultant ? (
                            <div className="h-6 w-6 rounded-full bg-qc-gradient flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                              {inv.mission.consultant.first_name[0]}
                              {inv.mission.consultant.last_name[0]}
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
                        <Badge variant="outline" className={INVOICE_STATUS_STYLE[inv.status]}>
                          {INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
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
    </AppShell>
  );
}
