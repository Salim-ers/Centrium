'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Download, CheckCircle2, Send } from 'lucide-react';

import { downloadElementAsPdf } from '@/lib/pdf/download-document';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceDocument, type InvoiceIssuer } from '@/components/invoices/InvoiceDocument';
import { invoiceService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import type { Invoice, Company, Mission, Consultant, Timesheet } from '@/types';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE } from '@/constants';

type Detail = {
  invoice: Invoice;
  company: Company | null;
  mission: Mission | null;
  consultant: Consultant | null;
  timesheet: Timesheet | null;
};

type IdentityRow = {
  name: string;
  brand_name: string | null;
  footer_tagline: string | null;
  logo_url: string | null;
  signature_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  siren: string | null;
  representative_name: string | null;
  representative_title: string | null;
};

export default function InvoiceDetailPage() {
  const { activeOrgId, branding } = useOrganization();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!activeOrgId) {
      setIssuer(null);
      return;
    }
    let cancelled = false;
    fetch('/api/organizations/identity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data: IdentityRow } | null) => {
        if (cancelled || !body?.data) return;
        const row = body.data;
        setIssuer({
          brandName: row.brand_name ?? row.name,
          legalName: row.name,
          address: row.address,
          city: row.city,
          postalCode: row.postal_code,
          siren: row.siren,
          footerTagline: row.footer_tagline,
          logoUrl: row.logo_url,
          signatureUrl: row.signature_url,
          primaryColor: branding?.primaryColor ?? null,
          accentColor: branding?.accentColor ?? null,
          representativeName: row.representative_name,
          representativeTitle: row.representative_title,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeOrgId, branding?.primaryColor, branding?.accentColor]);

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
          <Button
            size="sm"
            onClick={() =>
              downloadElementAsPdf(docRef.current, {
                fileName: `Facture_${invoice.invoice_number}`,
              })
            }
          >
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      <div ref={docRef} className="bg-neutral-200 rounded-xl p-6 overflow-auto">
        <InvoiceDocument {...detail} issuer={issuer} />
      </div>
    </AppShell>
  );
}
