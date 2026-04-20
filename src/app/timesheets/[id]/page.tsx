'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimesheetDocument } from '@/components/timesheets/TimesheetDocument';
import { timesheetService } from '@/lib/services';
import type { Timesheet, Mission, Consultant, Company } from '@/types';

const ORG_ID = '11111111-1111-1111-1111-111111111111';

type TimesheetDay = {
  id: string;
  timesheet_id: string;
  day_date: string;
  duration: number;
  note: string | null;
};

type Detail = {
  timesheet: Timesheet;
  mission: Mission | null;
  consultant: Consultant | null;
  company: Company | null;
  days: TimesheetDay[];
};

const STATUS_STYLE: Record<Timesheet['status'], string> = {
  draft: 'bg-slate-500/10 text-slate-300',
  submitted: 'bg-blue-500/10 text-blue-300',
  client_validated: 'bg-emerald-500/10 text-emerald-300',
  rejected: 'bg-red-500/10 text-red-300',
};

const STATUS_LABEL: Record<Timesheet['status'], string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  client_validated: 'Validé client',
  rejected: 'Rejeté',
};

export default function TimesheetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function reload() {
    if (!params?.id) return;
    const res = await timesheetService.getById(params.id);
    if (res.error || !res.data) setNotFound(true);
    else setDetail(res.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [params?.id]);

  async function validateAndInvoice() {
    if (!detail) return;
    const res = await timesheetService.validateAndInvoice(detail.timesheet.id, ORG_ID);
    if (res.error || !res.data) {
      toast.error('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    if (res.data.alreadyInvoiced) {
      toast.success('CRA validé — facture déjà existante, ouverture…');
    } else {
      toast.success(
        `CRA validé → facture ${res.data.invoice.invoice_number} générée et marquée payée`,
      );
    }
    router.push(`/invoices/${res.data.invoice.id}`);
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
          <h1 className="font-display text-2xl font-bold">CRA introuvable</h1>
          <Button className="mt-6" onClick={() => router.push('/timesheets')}>
            <ArrowLeft className="h-4 w-4" />
            Retour aux CRA
          </Button>
        </div>
      </AppShell>
    );
  }

  const { timesheet } = detail;

  return (
    <AppShell>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/timesheets">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_STYLE[timesheet.status]}>
            {STATUS_LABEL[timesheet.status]}
          </Badge>
          {timesheet.status !== 'client_validated' && (
            <Button variant="outline" size="sm" onClick={validateAndInvoice}>
              <CheckCircle2 className="h-4 w-4" />
              Valider &amp; facturer
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      <div className="no-print bg-neutral-200 rounded-xl p-6 overflow-auto">
        <TimesheetDocument {...detail} />
      </div>

      <div className="print-only hidden print:block">
        <TimesheetDocument {...detail} />
      </div>
    </AppShell>
  );
}
