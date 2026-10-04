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
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { downloadElementAsPdf } from '@/lib/pdf/download-document';
import { fetchMyMissions, fetchMyProfile } from '@/lib/portal/consultant-data';
import type { Invoice, Timesheet } from '@/types';

type Detail = React.ComponentProps<typeof InvoiceDocument>;

export default function PortalInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { branding } = useOrganization();
  const { locale } = useLocale();
  const isEn = locale === 'en';
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
        toast.error(isEn ? 'Invoice not found or access denied' : 'Facture introuvable ou accès refusé');
        router.push('/portal/invoices');
        return;
      }

      // Mission et fiche via les fonctions portail (liste blanche). Le tarif
      // de la mission est celui du consultant (son prix), jamais le TJM de vente.
      const [missions, profile, tsRes] = await Promise.all([
        fetchMyMissions(supabase),
        fetchMyProfile(supabase),
        invoice.timesheet_id
          ? supabase.from('timesheets').select('*').eq('id', invoice.timesheet_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const m = missions.find((x) => x.id === invoice.mission_id) ?? null;

      setDetail({
        invoice: invoice as Invoice,
        company: null,
        mission: m ? { title: m.title, daily_rate_eur: m.consultant_rate } : null,
        consultant: profile,
        timesheet: (tsRes as { data: Timesheet | null }).data,
      });
      setLoading(false);
    })();
  }, [params?.id, router]);

  if (loading) {
    return <div className="h-[70vh] rounded-xl bg-card animate-pulse" />;
  }
  if (!detail) return null;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/invoices">
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'Back' : 'Retour'}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              detail.invoice.status === 'paid'
                ? 'bg-success/10 text-success border-success/20'
                : detail.invoice.status === 'overdue'
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-info/10 text-info border-info/20'
            }
          >
            {detail.invoice.status === 'paid'
              ? (isEn ? 'Paid' : 'Payée')
              : detail.invoice.status === 'overdue'
                ? (isEn ? 'Overdue' : 'En retard')
                : (isEn ? 'Awaiting payment' : 'En attente de paiement')}
          </Badge>
          <Button
            size="sm"
            onClick={() =>
              downloadElementAsPdf(docRef.current, {
                fileName: `${isEn ? 'Invoice' : 'Facture'}_${detail.invoice.invoice_number}`,
              })
            }
          >
            <Download className="h-4 w-4" />
            {isEn ? 'Download PDF' : 'Télécharger PDF'}
          </Button>
        </div>
      </div>

      <div ref={docRef} className="bg-muted rounded-xl p-6 overflow-auto">
        <InvoiceDocument {...detail} issuer={issuer} />
      </div>
    </div>
  );
}
