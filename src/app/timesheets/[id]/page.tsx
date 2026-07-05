'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Download, CheckCircle2, Receipt, Pencil, XCircle, Loader2 } from 'lucide-react';

import { downloadElementAsPdf } from '@/lib/pdf/download-document';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TimesheetDocument, type TimesheetIssuer } from '@/components/timesheets/TimesheetDocument';
import {
  TimesheetCalendar,
  type TimesheetDayKind,
} from '@/components/timesheets/TimesheetCalendar';
import { timesheetService } from '@/lib/services';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import type { Timesheet, Mission, Consultant, Company } from '@/types';

type TimesheetDay = {
  id: string;
  timesheet_id: string;
  day_date: string;
  duration: number;
  note: string | null;
  kind: TimesheetDayKind;
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
  const { activeOrgId, branding } = useOrganization();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);
  // Refus de CRA (boucle de correction consultant)
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Issuer dérivé du branding unifié (Phase 3) — plus de fetch identity séparé.
  // version dependency = régen instantanée après save dans /settings/branding.
  const issuer: TimesheetIssuer | null = useMemo(() => {
    if (!branding) return null;
    return {
      brandName: branding.brandName ?? branding.name,
      logoUrl: branding.logoUrl,
      footerTagline: branding.footerTagline,
      signatureUrl: branding.signatureUrl,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      representativeName: branding.representativeName,
      representativeTitle: branding.representativeTitle,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding, branding?.version]);

  async function reload() {
    if (!params?.id) return;
    const res = await timesheetService.getById(params.id);
    if (res.error || !res.data) {
      setNotFound(true);
    } else {
      setDetail(res.data);
      // Lookup invoice link to know if "Générer la facture" should appear.
      // Scopé party='client' : un CRA peut aussi porter une facture
      // consultant (sous-traitance) — sans le filtre, maybeSingle() plante
      // dès que les deux existent.
      const supabase = createClient();
      const { data: inv } = await supabase
        .from('invoices')
        .select('id')
        .eq('timesheet_id', params.id)
        .eq('party', 'client')
        .maybeSingle();
      setLinkedInvoiceId((inv?.id as string | undefined) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [params?.id]);

  async function validateAndInvoice() {
    if (!detail) return;
    if (!activeOrgId) {
      toast.error('Organisation active manquante');
      return;
    }
    const res = await timesheetService.validateAndInvoice(detail.timesheet.id, activeOrgId);
    if (res.error || !res.data) {
      toast.error('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    // Email "CRA validé" au consultant — fire-and-forget, jamais bloquant.
    void fetch(`/api/timesheets/${detail.timesheet.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify_validated' }),
    }).catch(() => {});
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
  const calendarEditable = timesheet.status !== 'client_validated';

  async function handleDayChange(
    dayDate: string,
    next: { kind: TimesheetDayKind | null; duration?: number; note?: string | null },
  ) {
    const res = await timesheetService.upsertDay({
      timesheetId: timesheet.id,
      dayDate,
      kind: next.kind,
      duration: next.duration,
      note: next.note,
    });
    if (res.error) {
      toast.error('Modification impossible : ' + res.error.message);
      return;
    }
    await reload();
  }

  /** Applique un même type à plusieurs jours (pinceau clic-glissé) :
   *  upserts en parallèle, UN SEUL reload à la fin. */
  async function handleBatchDayChange(
    dayDates: string[],
    next: { kind: TimesheetDayKind | null; duration?: number },
  ) {
    const results = await Promise.all(
      dayDates.map((dayDate) =>
        timesheetService.upsertDay({
          timesheetId: timesheet.id,
          dayDate,
          kind: next.kind,
          duration: next.duration,
        }),
      ),
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      toast.error(`Modification impossible sur certains jours : ${firstError.message}`);
    }
    await reload();
  }

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
          {timesheet.status === 'submitted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectReason('');
                setRejectOpen(true);
              }}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </Button>
          )}
          {timesheet.status !== 'client_validated' && (
            <Button variant="outline" size="sm" onClick={validateAndInvoice}>
              <CheckCircle2 className="h-4 w-4" />
              Valider &amp; facturer
            </Button>
          )}
          {timesheet.status === 'client_validated' && !linkedInvoiceId && (
            <Button variant="outline" size="sm" onClick={validateAndInvoice}>
              <Receipt className="h-4 w-4" />
              Générer la facture
            </Button>
          )}
          {linkedInvoiceId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/invoices/${linkedInvoiceId}`}>
                <Receipt className="h-4 w-4" />
                Voir la facture
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() =>
              downloadElementAsPdf(docRef.current, {
                fileName: `CRA_${(detail.consultant ? `${detail.consultant.first_name}_${detail.consultant.last_name}_` : '')}${detail.timesheet.period_year}-${String(detail.timesheet.period_month).padStart(2, '0')}`,
              })
            }
          >
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Calendrier interactif (hors PDF) */}
      <Card className="no-print mb-4">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Calendrier du mois
              </div>
              <div className="text-sm">
                {calendarEditable ? (
                  <span className="inline-flex items-center gap-1.5 text-violet-300">
                    <Pencil className="h-3.5 w-3.5" />
                    Choisis un type ci-dessous puis clique-glisse pour remplir
                    plusieurs jours — ou clique un jour pour le menu détaillé
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    CRA validé — calendrier en lecture seule
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total facturé
              </div>
              <div className="text-2xl font-bold qc-gradient-text">
                {Number(timesheet.days_worked)} j
              </div>
            </div>
          </div>
          <TimesheetCalendar
            year={timesheet.period_year}
            month={timesheet.period_month}
            days={detail.days}
            editable={calendarEditable}
            onChange={handleDayChange}
            onBatchChange={handleBatchDayChange}
            primaryColor={branding?.primaryColor ?? undefined}
          />
        </CardContent>
      </Card>

      <div ref={docRef} className="bg-neutral-200 rounded-xl p-6 overflow-auto">
        <TimesheetDocument {...detail} issuer={issuer} />
      </div>

      {/* Dialog de refus — la raison est OBLIGATOIRE : elle s'affiche sur le
          portail consultant et part dans l'email "correction demandée". */}
      <Dialog open={rejectOpen} onOpenChange={(o) => !rejecting && setRejectOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              Refuser ce CRA
            </DialogTitle>
            <DialogDescription>
              Le consultant recevra un email avec ta raison, pourra corriger son
              CRA depuis son portail et le soumettre à nouveau.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex : le 15 mars est compté travaillé alors que la mission était suspendue…"
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              Annuler
            </Button>
            <Button
              variant="outline"
              disabled={rejecting || !rejectReason.trim()}
              onClick={async () => {
                setRejecting(true);
                try {
                  const res = await fetch(
                    `/api/timesheets/${timesheet.id}/transition`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'reject', reason: rejectReason }),
                    },
                  );
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(body.message ?? 'Refus impossible');
                    return;
                  }
                  setRejectOpen(false);
                  await reload();
                } finally {
                  setRejecting(false);
                }
              }}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Refuser et demander correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
