'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useOrganization } from '@/lib/auth/context';
import { timesheetService } from '@/lib/services';
import {
  TimesheetCalendar,
  type CalendarDay,
  type TimesheetDayKind,
} from '@/components/timesheets/TimesheetCalendar';
import {
  TimesheetDocument,
  type TimesheetIssuer,
} from '@/components/timesheets/TimesheetDocument';
import { downloadElementAsPdf } from '@/lib/pdf/download-document';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { monthsLong } from '@/lib/i18n/months';
import type { Timesheet, Mission, Consultant, Company } from '@/types';

export default function PortalCraDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const brandName = useBrandName();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [ts, setTs] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  // Jours détaillés du calendrier (RLS : visibles/écrivables via le parent)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  // Contexte du DOCUMENT officiel (mission / client / consultant)
  const [mission, setMission] = useState<Mission | null>(null);
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);
  const { branding } = useOrganization();

  // Même issuer que côté org : le document du consultant est IDENTIQUE à
  // celui que l'admin imprime — branding + tampon/signature inclus.
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
    const supabase = createClient();
    const [{ data, error }, { data: dayRows }] = await Promise.all([
      supabase.from('timesheets').select('*').eq('id', params.id).maybeSingle(),
      supabase
        .from('timesheet_days')
        .select('id, day_date, duration, kind, note')
        .eq('timesheet_id', params.id),
    ]);
    if (error || !data) {
      toast.error(isEn ? 'Timesheet not found or access denied' : 'CRA introuvable ou accès refusé');
      router.push('/portal/cra');
      return;
    }
    const row = data as Timesheet;
    setTs(row);
    setDays(Number(row.days_worked));
    setNotes(row.notes ?? '');
    setCalendarDays((dayRows ?? []) as CalendarDay[]);

    // Contexte document (best-effort — le CRA reste utilisable sans)
    if (row.mission_id) {
      const { data: m } = await supabase
        .from('missions')
        .select('*')
        .eq('id', row.mission_id)
        .maybeSingle();
      setMission((m as Mission | null) ?? null);
      if (m?.company_id) {
        const { data: co } = await supabase
          .from('companies')
          .select('*')
          .eq('id', m.company_id)
          .maybeSingle();
        setCompany((co as Company | null) ?? null);
      }
    }
    if (row.consultant_id) {
      const { data: c } = await supabase
        .from('consultants')
        .select('*')
        .eq('id', row.consultant_id)
        .maybeSingle();
      setConsultant((c as Consultant | null) ?? null);
    }
    setLoading(false);
  }

  // Édition jour par jour — mêmes helpers que le calendrier org ; le
  // trigger DB recompute_timesheet_days_worked met à jour le total, et
  // la RLS n'autorise l'écriture que si le CRA est draft/rejected.
  const calendarEditable = ts?.status === 'draft' || ts?.status === 'rejected';

  async function handleDayChange(
    dayDate: string,
    next: { kind: TimesheetDayKind | null; duration?: number; note?: string | null },
  ) {
    if (!ts) return;
    const res = await timesheetService.upsertDay({
      timesheetId: ts.id,
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

  async function handleBatchDayChange(
    dayDates: string[],
    next: { kind: TimesheetDayKind | null; duration?: number },
  ) {
    if (!ts) return;
    const results = await Promise.all(
      dayDates.map((dayDate) =>
        timesheetService.upsertDay({
          timesheetId: ts.id,
          dayDate,
          kind: next.kind,
          duration: next.duration,
        }),
      ),
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      toast.error(
        isEn
          ? `Change failed on some days: ${firstError.message}`
          : `Modification impossible sur certains jours : ${firstError.message}`,
      );
    }
    await reload();
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function save() {
    if (!ts) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('timesheets')
      .update({ days_worked: days, notes: notes || null })
      .eq('id', ts.id);
    setSaving(false);
    if (error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + error.message);
      return;
    }
    toast.success(isEn ? 'Timesheet updated' : 'CRA mis à jour');
    setEditing(false);
    reload();
  }

  async function submit() {
    if (!ts) return;
    setSaving(true);
    try {
      // Via l'API de transition (et non le service direct) : la route fait
      // la même mise à jour SOUS RLS + triggers, ET envoie l'email "CRA
      // soumis" aux admins de l'organisation.
      const res = await fetch(`/api/timesheets/${ts.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? (isEn ? 'Submission failed' : 'Soumission impossible'));
        return;
      }
      toast.success(
        isEn ? 'Timesheet submitted — your organization has been notified' : 'CRA soumis — ton organisation a été notifiée',
      );
      reload();
    } catch {
      toast.error(isEn ? 'Network error — please try again.' : 'Erreur réseau — réessaie.');
    } finally {
      setSaving(false);
    }
  }

  async function reopen() {
    if (!ts) return;
    setSaving(true);
    const res = await timesheetService.reopen(ts.id);
    setSaving(false);
    if (res.error) {
      toast.error((isEn ? 'Error: ' : 'Erreur : ') + res.error.message);
      return;
    }
    toast.success(isEn ? 'Timesheet reopened for editing' : 'CRA réouvert pour édition');
    reload();
  }

  if (loading) {
    return <div className="h-60 rounded-xl bg-white/[0.02] animate-pulse" />;
  }
  if (!ts) return null;

  const editable = ts.status === 'draft' || (ts.status === 'rejected' && editing);
  const canSubmit = ts.status === 'draft';
  const canReopen = ts.status === 'rejected';

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/portal/cra">
          <ArrowLeft className="h-4 w-4" />
          {isEn ? 'Back' : 'Retour'}
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-2">
            {isEn ? 'My space' : 'Mon espace'}
          </div>
          <h1 className="font-display font-light tracking-[-0.03em] leading-[1.05] text-[clamp(1.75rem,3.5vw,2.5rem)]">
            {isEn ? 'Timesheet' : 'CRA'}{' '}
            <span className="qc-italic-accent font-editorial italic">
              {monthsLong(isEn)[ts.period_month - 1]} {ts.period_year}.
            </span>
          </h1>
          <div className="mt-2">
            <StatusPill status={ts.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ts.status === 'draft' && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              {isEn ? 'Edit' : 'Éditer'}
            </Button>
          )}
          {canReopen && !editing && (
            <Button variant="outline" onClick={reopen} disabled={saving}>
              <Pencil className="h-4 w-4" />
              {isEn ? 'Correct' : 'Corriger'}
            </Button>
          )}
          {canSubmit && !editing && (
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isEn ? 'Submit' : 'Soumettre'}
            </Button>
          )}
        </div>
      </div>

      {ts.status === 'rejected' && ts.rejection_reason && (
        <Card className="mb-4 border-red-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">{isEn ? 'Rejection reason' : 'Motif du rejet'}</div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {ts.rejection_reason}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {isEn
                  ? 'Click “Correct” to return to draft and submit again.'
                  : 'Clique sur « Corriger » pour revenir en brouillon et soumettre à nouveau.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {ts.status === 'client_validated' && (
        <Card className="mb-4 border-emerald-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">{isEn ? 'Timesheet validated' : 'CRA validé'}</div>
              <p className="text-muted-foreground">
                {isEn
                  ? 'Your related invoice will appear in “My invoices” as soon as it is marked paid.'
                  : 'Ta facture associée sera visible dans « Mes factures » dès qu’elle sera marquée payée.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {ts.status === 'submitted' && (
        <Card className="mb-4 border-blue-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">{isEn ? 'Awaiting validation' : 'En attente de validation'}</div>
              <p className="text-muted-foreground">
                {isEn
                  ? `Your timesheet has been sent to ${brandName}. You will be notified as soon as it is validated or rejected.`
                  : `Ton CRA a été envoyé à ${brandName}. Tu seras notifié dès qu’il sera validé ou refusé.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendrier jour par jour — même composant que côté organisation.
          Éditable en draft/rejected (RLS + trigger recalculent le total). */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            {isEn ? 'Month calendar' : 'Calendrier du mois'}
            {!calendarEditable && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {isEn
                  ? `(read-only — timesheet ${ts.status === 'submitted' ? 'submitted' : 'validated'})`
                  : `(lecture seule — CRA ${ts.status === 'submitted' ? 'soumis' : 'validé'})`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimesheetCalendar
            year={ts.period_year}
            month={ts.period_month}
            days={calendarDays}
            editable={calendarEditable}
            onChange={handleDayChange}
            onBatchChange={handleBatchDayChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isEn ? 'Timesheet details' : 'Détail du CRA'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isEn ? 'Days worked' : 'Jours travaillés'}</Label>
              {editable ? (
                <Input
                  type="number"
                  min={0}
                  max={31}
                  step={0.5}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              ) : (
                <div className="text-lg font-semibold">{ts.days_worked}</div>
              )}
            </div>
            <div>
              <Label>{isEn ? 'Validated days' : 'Jours validés'}</Label>
              <div className="text-lg font-semibold">{ts.days_validated}</div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            {editable ? (
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? 'Leave, public holidays, details…' : 'Congés, jours fériés, précisions…'}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {ts.notes ?? '—'}
              </p>
            )}
          </div>

          {editable && (
            <div className="flex gap-2 justify-end">
              {editing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    reload();
                  }}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </Button>
              )}
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEn ? 'Save' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document OFFICIEL — identique à celui que l'org imprime, avec le
          tampon/signature de l'organisation. Affiché une fois le CRA
          validé : c'est la version qui fait foi pour la facturation. */}
      {ts.status === 'client_validated' && (
        <div className="mt-8">
          <div className="no-print mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.28em] uppercase text-magenta mb-1.5">
                {isEn ? 'Official document' : 'Document officiel'}
              </div>
              <h2 className="font-display font-light tracking-[-0.02em] text-xl">
                {isEn ? 'Validated and' : 'CRA validé et'}{' '}
                <span className="qc-italic-accent font-editorial italic">
                  {isEn ? 'stamped.' : 'tamponné.'}
                </span>
              </h2>
            </div>
            <Button
              size="sm"
              onClick={() =>
                downloadElementAsPdf(docRef.current, {
                  fileName: `CRA_${ts.period_year}-${String(ts.period_month).padStart(2, '0')}`,
                })
              }
            >
              <Download className="h-4 w-4" />
              {isEn ? 'Download PDF' : 'Télécharger PDF'}
            </Button>
          </div>
          <div ref={docRef} className="bg-neutral-200 rounded-xl p-6 overflow-auto">
            <TimesheetDocument
              timesheet={ts}
              mission={mission}
              consultant={consultant}
              company={company}
              days={calendarDays.map((d, i) => ({
                id: `${d.day_date ?? i}`,
                day_date: d.day_date,
                duration: Number(d.duration ?? 0),
                note: d.note ?? null,
                kind: d.kind as
                  | 'worked'
                  | 'paid_leave'
                  | 'sick_leave'
                  | 'unpaid_leave'
                  | 'holiday'
                  | undefined,
              }))}
              issuer={issuer}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Timesheet['status'] }) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const map: Record<Timesheet['status'], { label: string; className: string }> = {
    draft: {
      label: isEn ? 'Draft' : 'Brouillon',
      className: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    },
    submitted: {
      label: isEn ? 'Awaiting validation' : 'En attente de validation',
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    client_validated: {
      label: isEn ? 'Client validated' : 'Validé client',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    rejected: {
      label: isEn ? 'Rejected' : 'Rejeté',
      className: 'bg-red-500/10 text-red-300 border-red-500/20',
    },
  };
  const s = map[status];
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
