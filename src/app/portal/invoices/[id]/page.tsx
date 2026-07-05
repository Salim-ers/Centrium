'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceDocument, type InvoiceIssuer } from '@/components/invoices/InvoiceDocument';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { downloadElementAsPdf } from '@/lib/pdf/download-document';
import type { Invoice, Company, Mission, Consultant, Timesheet } from '@/types';

type Detail = {
  invoice: Invoice;
  company: Company | null;
  mission: Mission | null;
  consultant: Consultant | null;
  timesheet: Timesheet | null;
};

export default function PortalInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { branding } = useOrganization();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<HTMLDivElement | null>(null);

  // La facture OFFICIELLE, identique à celle émise côté org : branding,
  // identité légale, coordonnées bancaires ET tampon/signature de
  // l'organisation. Sans issuer, le consultant voyait un document
  // générique sans le tampon apposé par l'admin.
  const issuer: InvoiceIssuer | null = useMemo(() => {
    if (!branding) return null;
    return {
      brandName: branding.brandName ?? branding.name,
      legalName: branding.name,
      address: branding.address,
      city: branding.city,
      postalCode: branding.postalCode,
      siren: branding.siren,
      vatNumber: branding.vatNumber,
      footerTagline: branding.footerTagline,
      logoUrl: branding.logoUrl,
      signatureUrl: branding.signatureUrl,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      representativeName: branding.representativeName,
      representativeTitle: branding.representativeTitle,
      iban: branding.iban,
      bic: branding.bic,
      bankName: branding.bankName,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding, branding?.version]);

  useEffect(() => {
    (async () => {
      if (!params?.id) return;
      const supabase = createClient();

      // RLS : uniquement SES factures de sous-traitance (party='consultant').
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();

      if (error || !invoice) {
        toast.error('Facture introuvable ou accès refusé');
        router.push('/portal/invoices');
        return;
      }

      const [companyRes, missionRes, tsRes] = await Promise.all([
        invoice.company_id
          ? supabase.from('companies').select('*').eq('id', invoice.company_id).maybeSingle()
          : Promise.resolve({ data: null }),
        invoice.mission_id
          ? supabase.from('missions').select('*').eq('id', invoice.mission_id).maybeSingle()
          : Promise.resolve({ data: null }),
        invoice.timesheet_id
          ? supabase.from('timesheets').select('*').eq('id', invoice.timesheet_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const mission = (missionRes as { data: Mission | null }).data;
      // Consultant : lien direct de la facture d'abord (sous-traitance),
      // mission en secours. Ses infos légales (société, SIRET, IBAN)
      // alimentent le bloc Émetteur du document.
      const consultantId = invoice.consultant_id ?? mission?.consultant_id ?? null;
      const consultantRes = consultantId
        ? await supabase.from('consultants').select('*').eq('id', consultantId).maybeSingle()
        : { data: null };

      setDetail({
        invoice: invoice as Invoice,
        company: (companyRes as { data: Company | null }).data,
        mission,
        consultant: (consultantRes as { data: Consultant | null }).data,
        timesheet: (tsRes as { data: Timesheet | null }).data,
      });
      setLoading(false);
    })();
  }, [params?.id, router]);

  if (loading) {
    return <div className="h-[70vh] rounded-xl bg-white/[0.02] animate-pulse" />;
  }
  if (!detail) return null;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/invoices">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              detail.invoice.status === 'paid'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : detail.invoice.status === 'overdue'
                  ? 'bg-red-500/10 text-red-300 border-red-500/20'
                  : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
            }
          >
            {detail.invoice.status === 'paid'
              ? 'Payée'
              : detail.invoice.status === 'overdue'
                ? 'En retard'
                : 'En attente de paiement'}
          </Badge>
          <Button
            size="sm"
            onClick={() =>
              downloadElementAsPdf(docRef.current, {
                fileName: `Facture_${detail.invoice.invoice_number}`,
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
    </div>
  );
}
