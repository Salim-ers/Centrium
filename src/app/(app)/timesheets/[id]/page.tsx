'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Receipt,
  Pencil,
  XCircle,
  Loader2,
  HandCoins,
} from 'lucide-react';

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
import { timesheetService, invoiceService } from '@/lib/services';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useTimesheetStatusLabels } from '@/lib/i18n/useBadges';
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
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  client_validated: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const STATUS_LABEL: Record<Timesheet['status'], string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  client_validated: 'Validé client',
  rejected: 'Rejeté',
};

export default function TimesheetDetailPage() {
  const { activeOrgId, branding } = useOrganization();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const tsStatus = useTimesheetStatusLabels() as Record<string, string>;
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Les DEUX factures que peut porter un CRA validé : la facture de vente
  // (client) et la facture de sous-traitance (consultant).
  type LinkedInvoice = { id: string; invoice_number: string };
  const [clientInvoice, setClientInvoice] = useState<LinkedInvoice | null>(null);
  const [consultantInvoice, setConsultantInvoice] = useState<LinkedInvoice | null>(null);
  const [pushingConsultant, setPushingConsultant] = useState(false);
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
      // Factures liées au CRA — un seul aller-retour, réparties par party.
      const supabase = createClient();
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, party')
        .eq('timesheet_id', params.id);
      const rows = (invs ?? []) as { id: string; invoice_number: string; party: string }[];
      setClientInvoice(rows.find((r) => r.party === 'client') ?? null);
      setConsultantInvoice(rows.find((r) => r.party === 'consultant') ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [params?.id]);

  async function validateAndInvoice() {
    if (!detail) return;
    if (!activeOrgId) {
      toast.error(isEn ? 'Missing active organization' : 'Organisation active manquante');
      return;
    }
    const res = await timesheetService.validateAndInvoice(detail.timesheet.id, activeOrgId);
    if (res.error || !res.data) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')));
      return;
    }
    // Email "CRA validé" au consultant — fire-and-forget, jamais bloquant.
    void fetch(`/api/timesheets/${detail.timesheet.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify_validated' }),
    }).catch(() => {});
    if (res.data.alreadyInvoiced) {
      toast.success(isEn ? 'Timesheet validated — the client invoice already existed' : 'CRA validé — la facture client existait déjà');
    } else {
      toast.success(
        isEn
          ? `Timesheet validated → client invoice ${res.data.invoice.invoice_number} generated`
          : `CRA validé → facture client ${res.data.invoice.invoice_number} générée`,
      );
    }
    // On RESTE sur le CRA : le bouton « Facture consultant » apparaît juste
    // à côté pour enchaîner le 2e volet du flux (vente → sous-traitance).
    await reload();
  }

  // Pousse le CRA validé en facture de SOUS-TRAITANCE (jours validés × TJM
  // achat du contrat consultant) — le pendant « achat » de la facture client.
  async function pushConsultantInvoice() {
    if (!detail) return;
    setPushingConsultant(true);
    try {
      const res = await invoiceService.generateConsultantInvoice(detail.timesheet.id);
      if (res.error || !res.data) {
        toast.error((isEn ? 'Error: ' : 'Erreur : ') + (res.error?.message ?? (isEn ? 'unknown' : 'inconnue')));
        return;
      }
      if (res.data.alreadyExists) {
        toast.info(
          isEn
            ? `Consultant invoice already generated — ${res.data.invoice.invoice_number}`
            : `Facture consultant déjà générée — ${res.data.invoice.invoice_number}`,
        );
      } else {
        toast.success(
          isEn
            ? `Consultant invoice ${res.data.invoice.invoice_number} generated — visible in their portal`
            : `Facture consultant ${res.data.invoice.invoice_number} générée — visible dans son espace`,
        );
      }
      await reload();
    } finally {
      setPushingConsultant(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="h-[70vh] rounded-xl bg-card animate-pulse" />
      </AppShell>
    );
  }

  if (notFound || !detail) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h1 className="font-display text-2xl font-bold">{isEn ? 'Timesheet not found' : 'CRA introuvable'}</h1>
          <Button className="mt-6" onClick={() => router.push('/timesheets')}>
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'Back to timesheets' : 'Retour aux CRA'}
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
      toast.error((isEn ? 'Change failed: ' : 'Modification impossible : ') + res.error.message);
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
      toast.error(
        (isEn ? 'Change failed on some days: ' : 'Modification impossible sur certains jours : ') + firstError.message,
      );
    }
    await reload();
  }

  return (
    <AppShell>
      <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/timesheets">
            <ArrowLeft className="h-4 w-4" />
            {isEn ? 'Back' : 'Retour'}
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_STYLE[timesheet.status]}>
            {tsStatus[timesheet.status] ?? STATUS_LABEL[timesheet.status]}
          </Badge>
          {timesheet.status === 'submitted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectReason('');
                setRejectOpen(true);
              }}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              {isEn ? 'Reject' : 'Refuser'}
            </Button>
          )}
          {timesheet.status !== 'client_validated' && (
            <Button variant="outline" size="sm" onClick={validateAndInvoice}>
              <CheckCircle2 className="h-4 w-4" />
              {isEn ? 'Validate & invoice' : 'Valider & facturer'}
            </Button>
          )}
          {/* Volet 1 — facture CLIENT (vente, à encaisser) */}
          {timesheet.status === 'client_validated' && !clientInvoice && (
            <Button variant="outline" size="sm" onClick={validateAndInvoice}>
              <Receipt className="h-4 w-4" />
              {isEn ? 'Generate client invoice' : 'Générer la facture client'}
            </Button>
          )}
          {clientInvoice && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/invoices/${clientInvoice.id}`}>
                <Receipt className="h-4 w-4" />
                {isEn ? 'Client invoice' : 'Facture client'} · {clientInvoice.invoice_number}
              </Link>
            </Button>
          )}
          {/* Volet 2 — facture CONSULTANT (sous-traitance, à payer).
              Apparaît dès la validation : un clic la génère et l'envoie
              dans l'espace perso du consultant. */}
          {timesheet.status === 'client_validated' && !consultantInvoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={pushConsultantInvoice}
              disabled={pushingConsultant}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {pushingConsultant ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HandCoins className="h-4 w-4" />
              )}
              {isEn ? 'Push to consultant invoice' : 'Pousser en facture consultant'}
            </Button>
          )}
          {consultantInvoice && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/invoices/${consultantInvoice.id}`}>
                <HandCoins className="h-4 w-4" />
                {isEn ? 'Consultant invoice' : 'Facture consultant'} · {consultantInvoice.invoice_number}
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
            {isEn ? 'Download PDF' : 'Télécharger PDF'}
          </Button>
        </div>
      </div>

      {/* Calendrier interactif (hors PDF) */}
      <Card className="no-print mb-4">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {isEn ? 'Month calendar' : 'Calendrier du mois'}
              </div>
              <div className="text-sm">
                {calendarEditable ? (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                    {isEn
                      ? 'Pick a type below then click-drag to fill several days — or click a day for the detailed menu'
                      : 'Choisis un type ci-dessous puis clique-glisse pour remplir plusieurs jours — ou clique un jour pour le menu détaillé'}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {isEn ? 'Timesheet validated — calendar read-only' : 'CRA validé — calendrier en lecture seule'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isEn ? 'Total billed' : 'Total facturé'}
              </div>
              <div className="text-2xl font-bold text-primary">
                {Number(timesheet.days_worked)} {isEn ? 'd' : 'j'}
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

      <div ref={docRef} className="bg-muted rounded-xl p-6 overflow-auto">
        <TimesheetDocument {...detail} issuer={issuer} />
      </div>

      {/* Dialog de refus — la raison est OBLIGATOIRE : elle s'affiche sur le
          portail consultant et part dans l'email "correction demandée". */}
      <Dialog open={rejectOpen} onOpenChange={(o) => !rejecting && setRejectOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {isEn ? 'Reject this timesheet' : 'Refuser ce CRA'}
            </DialogTitle>
            <DialogDescription>
              {isEn
                ? 'The consultant will receive an email with your reason, will be able to correct their timesheet from their portal and submit it again.'
                : 'Le consultant recevra un email avec ta raison, pourra corriger son CRA depuis son portail et le soumettre à nouveau.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={
              isEn
                ? 'E.g. March 15 is counted as worked while the mission was suspended…'
                : 'Ex : le 15 mars est compté travaillé alors que la mission était suspendue…'
            }
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              {isEn ? 'Cancel' : 'Annuler'}
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
                    toast.error(body.message ?? (isEn ? 'Rejection failed' : 'Refus impossible'));
                    return;
                  }
                  setRejectOpen(false);
                  await reload();
                } finally {
                  setRejecting(false);
                }
              }}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEn ? 'Reject and request correction' : 'Refuser et demander correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
