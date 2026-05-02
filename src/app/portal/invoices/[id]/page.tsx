'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument';
import { createClient } from '@/lib/supabase/client';
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
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      if (!params?.id) return;
      const supabase = createClient();

      // La RLS ne laissera voir que si la facture est paid ET liée à ses missions
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
      const consultantRes = mission
        ? await supabase
            .from('consultants')
            .select('*')
            .eq('id', mission.consultant_id)
            .maybeSingle()
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
            className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          >
            Payée
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
        <InvoiceDocument {...detail} />
      </div>
    </div>
  );
}
