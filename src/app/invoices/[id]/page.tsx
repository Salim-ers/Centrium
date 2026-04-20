'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Printer, CheckCircle2, Send } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { invoiceService } from '@/lib/services';
import type { Invoice, Company, Mission, Consultant, Timesheet } from '@/types';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE } from '@/constants';

type Detail = {
  invoice: Invoice;
  company: Company | null;
  mission: Mission | null;
  consultant: Consultant | null;
  timesheet: Timesheet | null;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function reload() {
    if (!params?.id) return;
    const res = await invoiceService.getById(params.id);
    if (res.error || !res.data) setNotFound(true);
    else setDetail(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [params?.id]);

  async function markSent() {
    if (!detail) return;
    const res = await invoiceService.markAsSent(detail.invoice.id);
    if (res.error) return toast.error('Erreur');
    toast.success('Facture marquée envoyée');
    reload();
  }

  async function markPaid() {
    if (!detail) return;
    const res = await invoiceService.markAsPaid(detail.invoice.id);
    if (res.error) return toast.error('Erreur');
    toast.success('Facture marquée payée');
    reload();
  }

  if (loading) {
    return (
      <AppShell>
        <div className="h-[70vh] rounded-xl bg-white/[0.02] animate-pulse" />
      </AppShell>
    );
  }

  if (notFound || !detail) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h1 className="font-display text-2xl font-bold">Facture introuvable</h1>
          <Button className="mt-6" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
            Retour aux factures
          </Button>
        </div>
      </AppShell>
    );
  }

  const { invoice } = detail;

  return (
    <AppShell>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={INVOICE_STATUS_STYLE[invoice.status]}>
            {INVOICE_STATUS_LABEL[invoice.status]}
          </Badge>
          {invoice.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={markSent}>
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button variant="outline" size="sm" onClick={markPaid}>
              <CheckCircle2 className="h-4 w-4" />
              Marquer payée
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      <div className="no-print bg-neutral-200 rounded-xl p-6 overflow-auto">
        <InvoiceDocument {...detail} />
      </div>

      <div className="print-only hidden print:block">
        <InvoiceDocument {...detail} />
      </div>
    </AppShell>
  );
}
