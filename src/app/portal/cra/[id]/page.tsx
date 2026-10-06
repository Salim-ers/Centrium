'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, Clock, Download, FileText, Loader2, Pencil, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { showBrandToast } from '@/components/ui/BrandToast';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { TimesheetCalendar, type CalendarDay, type DayChange } from '@/components/timesheets/TimesheetCalendar';
import { TimesheetDocument, type TimesheetIssuer } from '@/components/timesheets/TimesheetDocument';
import { MonthChecks } from '@/components/timesheets/MonthChecks';
import { MonthSummary } from '@/components/timesheets/MonthSummary';
import { createClient } from '@/lib/supabase/client';
import { useOrganization } from '@/lib/auth/context';
import { timesheetService } from '@/lib/services';
import { downloadElementAsPdf } from '@/lib/pdf/download-document';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fetchMyMissions, fetchMyProfile, type PortalProfile } from '@/lib/portal/consultant-data';
import { CONSULTANT_TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { missionLabel } from '@/lib/timesheets/approvals';
import { expectedDays, monthChecks, monthTotals, type CraCheck } from '@/lib/timesheets/month';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PortalMission, Timesheet } from '@/types';

type Lang = 'fr' | 'en';

/** « de septembre 2026 », « d’octobre 2026 ». */
const ofMonth = (period: string) => {
  const p = period.toLowerCase();
  return /^[aeiouéh]/.test(p) ? `d’${p}` : `de ${p}`;
};

/**
 * Un CRA côté consultant : où il en est (saisie, envoi, validation), le
 * récapitulatif du mois, les points à vérifier avant l'envoi, le
 * calendrier et un bouton d'envoi toujours à portée de pouce sur mobile.
 * Le calendrier n'est modifiable qu'en brouillon (RLS) : un CRA renvoyé
 * repasse d'abord en brouillon via « Corriger ».
 */
export default function PortalCraDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const brandName = useBrandName();
  const { branding } = useOrganization();
  const { locale } = useLocale();
  const lang: Lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';

  const [ts, setTs] = useState<Timesheet | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [mission, setMission] = useState<PortalMission | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'submit' | 'reopen' | 'fix'>(null);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const docRef = useRef<HTMLDivElement | null>(null);
  const checksRef = useRef<HTMLDivElement | null>(null);

  // Même émetteur que côté agence : le document du consultant est celui que
  // l'ESN imprime (identité, tampon et signature compris).
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

  /** Recharge le CRA et ses jours (le total suit le trigger de recalcul). */
  const refresh = useCallback(async (): Promise<Timesheet | null> => {
    if (!id) return null;
    const supabase = createClient();
    const [{ data }, { data: dayRows }] = await Promise.all([
      supabase.from('timesheets').select('*').eq('id', id).maybeSingle(),
      supabase.from('timesheet_days').select('day_date, duration, kind, note, is_remote').eq('timesheet_id', id),
    ]);
    const row = (data as Timesheet | null) ?? null;
    if (row) {
      setTs(row);
      setDays((dayRows ?? []) as CalendarDay[]);
    }
    return row;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await refresh();
      if (cancelled) return;
      if (!row) {
        toast.error(fr ? 'CRA introuvable ou accès refusé' : 'Timesheet not found or access denied');
        router.push('/portal/cra');
        return;
      }
      setNotes(row.notes ?? '');
      // Contexte via les fonctions du portail (liste blanche : ni TJM de vente ni notes internes).
      const supabase = createClient();
      const [missions, me] = await Promise.all([fetchMyMissions(supabase), fetchMyProfile(supabase)]);
      if (cancelled) return;
      setMission(missions.find((m) => m.id === row.mission_id) ?? null);
      setProfile(me);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const span = useMemo(() => (mission ? { start_date: mission.start_date, end_date: mission.end_date } : null), [mission]);
  const checks = useMemo(() => (ts ? monthChecks(ts.period_year, ts.period_month, span, days) : []), [ts, span, days]);
  const blocking = checks.filter((c) => c.id !== 'holiday_worked');

  async function changeDays(dates: string[], next: DayChange) {
    if (!ts) return;
    const results = await Promise.all(
      dates.map((dayDate) =>
        timesheetService.upsertDay({ timesheetId: ts.id, dayDate, kind: next.kind, duration: next.duration, is_remote: next.is_remote, note: next.note }),
      ),
    );
    const failed = results.find((r) => r.error)?.error;
    if (failed) toast.error(fr ? `Modification impossible : ${failed.message}` : `Change failed: ${failed.message}`);
    setConfirming(false);
    await refresh();
  }

  async function fix(check: CraCheck) {
    setBusy('fix');
    try {
      if (check.id === 'unfilled') await changeDays(check.days, { kind: 'worked', duration: 1, is_remote: false });
      else if (check.id === 'outside') await changeDays(check.days, { kind: null });
      else await changeDays(check.days, { kind: 'holiday' });
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes(): Promise<boolean> {
    if (!ts || ts.status !== 'draft') return true;
    const value = notes.trim();
    if (value === (ts.notes ?? '').trim()) return true;
    const { error } = await createClient().from('timesheets').update({ notes: value || null }).eq('id', ts.id);
    if (error) {
      toast.error(fr ? 'Commentaire non enregistré. Réessayez.' : 'Comment not saved. Please try again.');
      return false;
    }
    setTs({ ...ts, notes: value || null });
    setNotesSaved(true);
    return true;
  }

  async function submit(force = false) {
    if (!ts) return;
    if (!force && blocking.length > 0) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy('submit');
    try {
      if (!(await saveNotes())) return;
      // Route de transition : même mise à jour sous RLS et triggers, plus l'e-mail à l'agence.
      const res = await fetch(`/api/timesheets/${ts.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(body.message ?? (fr ? 'Envoi impossible. Réessayez.' : 'Could not send. Please try again.'));
        return;
      }
      await refresh();
      showBrandToast('success', fr ? 'CRA envoyé' : 'Timesheet sent', {
        description: fr
          ? `${brandName} va le vérifier. Vous recevrez un e-mail dès qu’il sera validé ou renvoyé.`
          : `${brandName} will review it. You will get an email once it is approved or sent back.`,
      });
    } catch {
      toast.error(fr ? 'Erreur réseau. Réessayez.' : 'Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function startCorrection() {
    if (!ts) return;
    setBusy('reopen');
    const res = await timesheetService.reopen(ts.id);
    setBusy(null);
    if (res.error) {
      toast.error(fr ? `Correction impossible : ${res.error.message}` : `Could not reopen: ${res.error.message}`);
      return;
    }
    await refresh();
  }

  async function downloadPdf() {
    if (!ts) return;
    if (!showDoc) {
      setShowDoc(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await downloadElementAsPdf(docRef.current, { fileName: `CRA_${ts.period_year}-${String(ts.period_month).padStart(2, '0')}` });
  }

  if (loading || !ts) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const status = ts.status;
  const editable = status === 'draft';
  const correcting = editable && !!ts.rejection_reason;
  const st = correcting ? { label: fr ? 'En correction' : 'Being fixed', tone: 'warning' as const } : statusOf(CONSULTANT_TIMESHEET_STATUS, status, lang);
  const totals = monthTotals(days);
  const expected = expectedDays(ts.period_year, ts.period_month, span).length;
  const period = periodLabel(ts.period_month, ts.period_year, lang);
  const monthStart = `${ts.period_year}-${String(ts.period_month).padStart(2, '0')}-01`;
  const monthEnd = `${ts.period_year}-${String(ts.period_month).padStart(2, '0')}-${String(new Date(ts.period_year, ts.period_month, 0).getDate()).padStart(2, '0')}`;
  const partial = !!span && (span.start_date > monthStart || (!!span.end_date && span.end_date < monthEnd));
  const dayCount = (n: number) => `${n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} ${fr ? 'j' : 'd'}`;

  return (
    <div className={cn('mx-auto max-w-2xl space-y-4', editable && 'pb-20 md:pb-0')}>
      <div>
        <Link href="/portal/cra" className="-my-2 inline-block py-2 text-[13px] text-muted-foreground hover:text-foreground">
          ← {fr ? 'Mes CRA' : 'My timesheets'}
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{fr ? `CRA ${ofMonth(period)}` : `${period} timesheet`}</h1>
            {mission && <p className="truncate text-[13.5px] text-muted-foreground">{missionLabel(mission.title, mission.company_name)}</p>}
          </div>
          <StatusPill tone={st.tone} className="mt-1.5 shrink-0">
            {st.label}
          </StatusPill>
        </div>
      </div>

      <Steps ts={ts} lang={lang} />

      {status === 'rejected' && (
        <Banner
          tone="danger"
          icon={AlertTriangle}
          title={fr ? `${brandName} vous a renvoyé ce CRA` : `${brandName} sent this timesheet back`}
          action={
            <Button onClick={() => void startCorrection()} disabled={busy !== null} className="w-full sm:w-auto">
              {busy === 'reopen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {fr ? 'Corriger mon CRA' : 'Fix my timesheet'}
            </Button>
          }
        >
          {ts.rejection_reason && <p className="whitespace-pre-line">« {ts.rejection_reason} »</p>}
          {ts.rejected_at && <p className="text-[12.5px] text-muted-foreground">{fr ? `Renvoyé le ${formatDate(ts.rejected_at, lang)}` : `Sent back on ${formatDate(ts.rejected_at, lang)}`}</p>}
        </Banner>
      )}
      {correcting && (
        <Banner tone="warning" icon={Pencil} title={fr ? 'Correction demandée' : 'Correction requested'}>
          <p className="whitespace-pre-line">« {ts.rejection_reason} »</p>
          <p className="text-[12.5px] text-muted-foreground">
            {fr ? 'Corrigez le calendrier, puis renvoyez votre CRA.' : 'Fix the calendar, then send your timesheet again.'}
          </p>
        </Banner>
      )}
      {status === 'submitted' && (
        <Banner tone="info" icon={Clock} title={fr ? 'En attente de validation' : 'Awaiting approval'}>
          <p>
            {fr
              ? `Envoyé${ts.submitted_at ? ` le ${formatDate(ts.submitted_at, lang)}` : ''}. ${brandName} va le vérifier. Vous recevrez un e-mail dès qu’il sera validé ou renvoyé.`
              : `Sent${ts.submitted_at ? ` on ${formatDate(ts.submitted_at, lang)}` : ''}. ${brandName} will review it. You will get an email once it is approved or sent back.`}
          </p>
        </Banner>
      )}
      {status === 'client_validated' && (
        <Banner
          tone="success"
          icon={CheckCircle2}
          title={
            fr
              ? `Validé${ts.validated_at ? ` le ${formatDate(ts.validated_at, lang)}` : ''} · ${dayCount(Number(ts.days_validated))} ${Number(ts.days_validated) > 1 ? 'validés' : 'validé'}`
              : `Approved${ts.validated_at ? ` on ${formatDate(ts.validated_at, lang)}` : ''} · ${dayCount(Number(ts.days_validated))} approved`
          }
          action={
            <Button variant="outline" onClick={() => void downloadPdf()} className="w-full bg-card sm:w-auto">
              <Download className="h-4 w-4" />
              {fr ? 'Télécharger le CRA validé (PDF)' : 'Download the approved timesheet (PDF)'}
            </Button>
          }
        >
          {Number(ts.days_validated) !== Number(ts.days_worked) && (
            <p>{fr ? `Vous aviez déclaré ${dayCount(Number(ts.days_worked))}.` : `You had declared ${dayCount(Number(ts.days_worked))}.`}</p>
          )}
        </Banner>
      )}

      <MonthSummary totals={totals} expected={expected} />

      {(editable || status === 'rejected') && (
        <div ref={checksRef} className="scroll-mt-20">
          <MonthChecks
            checks={checks}
            onFix={editable ? (c) => void fix(c) : undefined}
            busy={busy !== null}
            okText={editable ? (fr ? 'Tous les jours ouvrés de la mission sont renseignés.' : 'Every working day of the mission is filled in.') : undefined}
          />
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 px-1">
          <h2 className="text-[14px] font-semibold">{fr ? 'Calendrier' : 'Calendar'}</h2>
          <p className="text-[12.5px] text-muted-foreground">
            {editable
              ? fr
                ? 'Les jours ouvrés de la mission sont pré-remplis. Choisissez un jour pour le changer (congé, télétravail, demi-journée…).'
                : 'Mission working days are pre-filled. Pick a day to change it (leave, remote, half day…).'
              : fr
                ? 'Lecture seule.'
                : 'Read-only.'}
            {partial && (fr ? ' Les jours en pointillés sont hors de la période de mission.' : ' Dashed days are outside the mission period.')}
          </p>
        </div>
        <TimesheetCalendar
          year={ts.period_year}
          month={ts.period_month}
          days={days}
          editable={editable}
          legend={false}
          missionSpan={span}
          onChange={(dayDate, next) => changeDays([dayDate], next)}
          onBatchChange={(dates, next) => changeDays(dates, next)}
        />
      </section>

      {(editable || ts.notes) && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <label htmlFor="cra-notes" className="text-[14px] font-semibold">
            {fr ? `Commentaire pour ${brandName}` : `Comment for ${brandName}`}
          </label>
          {editable ? (
            <>
              <Textarea
                id="cra-notes"
                rows={3}
                className="mt-2"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesSaved(false);
                }}
                onBlur={() => void saveNotes()}
                placeholder={fr ? 'Facultatif : astreinte, déplacement, précision sur une absence…' : 'Optional: on-call, travel, detail about an absence…'}
              />
              {notesSaved && <p className="mt-1 text-[12px] text-muted-foreground">{fr ? 'Enregistré' : 'Saved'}</p>}
            </>
          ) : (
            <p className="mt-1 whitespace-pre-line text-[13.5px] text-muted-foreground">{ts.notes}</p>
          )}
        </section>
      )}

      {/* Document officiel (validé) : version qui fait foi, à l'identité de l'ESN. */}
      {status === 'client_validated' && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <button type="button" onClick={() => setShowDoc((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={showDoc}>
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              {fr ? 'Document officiel' : 'Official document'}
            </span>
            <span className="text-[12.5px] text-primary-deep">{showDoc ? (fr ? 'Masquer' : 'Hide') : fr ? 'Afficher' : 'Show'}</span>
          </button>
          {showDoc && (
            <div ref={docRef} className="mt-3 overflow-auto rounded-xl bg-muted p-3 sm:p-6">
              <TimesheetDocument
                timesheet={ts}
                mission={mission ? { title: mission.title } : null}
                consultant={profile}
                company={mission?.company_name ? { name: mission.company_name } : null}
                days={days.map((d, i) => ({ id: `${d.day_date ?? i}`, day_date: d.day_date, duration: Number(d.duration ?? 0), note: d.note ?? null, kind: d.kind }))}
                issuer={issuer}
              />
            </div>
          )}
        </section>
      )}

      {/* Envoi : barre fixe au-dessus des onglets sur mobile, en fin de page au-delà. */}
      {editable && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:z-auto md:rounded-2xl md:border md:bg-card md:p-4 md:backdrop-blur-none">
          {confirming ? (
            <div className="space-y-2.5">
              <p className="flex items-start gap-2 text-[13px]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {fr ? 'Il reste des points à vérifier. Envoyer quand même ?' : 'Some points still need checking. Send anyway?'}
              </p>
              <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirming(false);
                    checksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {fr ? 'Vérifier' : 'Review'}
                </Button>
                <Button onClick={() => void submit(true)} disabled={busy !== null}>
                  {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {fr ? 'Envoyer' : 'Send'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-[12.5px] leading-tight text-muted-foreground">
                <span className="num block text-[15px] font-semibold text-foreground">{fr ? `${dayCount(totals.worked)} travaillés` : `${dayCount(totals.worked)} worked`}</span>
                {fr ? `à envoyer à ${brandName}` : `to send to ${brandName}`}
              </div>
              <Button onClick={() => void submit()} disabled={busy !== null} className="shrink-0">
                {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {correcting ? (fr ? 'Renvoyer mon CRA' : 'Send again') : fr ? 'Envoyer mon CRA' : 'Send my timesheet'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Avancement : saisie, envoi, validation (ou renvoi), avec les dates connues. */
function Steps({ ts, lang }: { ts: Timesheet; lang: Lang }) {
  const fr = lang === 'fr';
  const s = ts.status;
  const date = (d: string | null) => (d ? formatDate(d, lang) : null);
  type State = 'done' | 'current' | 'todo' | 'error';
  const steps: Array<{ label: string; state: State; note: string | null }> = [
    {
      label: fr ? 'Saisie' : 'Entry',
      state: s === 'draft' ? 'current' : 'done',
      note: s === 'draft' ? (ts.rejection_reason ? (fr ? 'correction' : 'fixing') : fr ? 'en cours' : 'in progress') : null,
    },
    { label: fr ? 'Envoi' : 'Sent', state: s === 'draft' ? 'todo' : 'done', note: s === 'draft' ? null : date(ts.submitted_at) },
    {
      label: fr ? 'Validation' : 'Approval',
      state: s === 'client_validated' ? 'done' : s === 'rejected' ? 'error' : s === 'submitted' ? 'current' : 'todo',
      note: s === 'client_validated' ? date(ts.validated_at) : s === 'rejected' ? (fr ? 'renvoyé' : 'sent back') : s === 'submitted' ? (fr ? 'en attente' : 'pending') : null,
    },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label={fr ? 'Avancement du CRA' : 'Timesheet progress'}>
      {steps.map((step) => (
        <li key={step.label} className="min-w-0" aria-current={step.state === 'current' ? 'step' : undefined}>
          <div
            className={cn(
              'h-1 rounded-full',
              step.state === 'done' ? 'bg-success' : step.state === 'current' ? 'bg-primary' : step.state === 'error' ? 'bg-destructive' : 'bg-muted',
            )}
          />
          <div className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium">
            {step.state === 'done' && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
            {step.state === 'error' && <X className="h-3.5 w-3.5 shrink-0 text-destructive" />}
            <span className={cn('truncate', step.state === 'todo' && 'text-muted-foreground')}>{step.label}</span>
          </div>
          {step.note && <div className="truncate text-[11.5px] text-muted-foreground">{step.note}</div>}
        </li>
      ))}
    </ol>
  );
}

const BANNER_TONE = {
  danger: { box: 'border-destructive/25 bg-danger-soft', icon: 'text-destructive' },
  warning: { box: 'border-warning/30 bg-warning-soft', icon: 'text-warning' },
  info: { box: 'border-info/25 bg-info-soft', icon: 'text-info' },
  success: { box: 'border-success/25 bg-success-soft', icon: 'text-success' },
} as const;

function Banner({
  tone,
  icon: Icon,
  title,
  action,
  children,
}: {
  tone: keyof typeof BANNER_TONE;
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = BANNER_TONE[tone];
  return (
    <section className={cn('rounded-2xl border p-4', t.box)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.icon)} />
        <div className="min-w-0 flex-1 space-y-1 text-[13.5px]">
          <div className="font-semibold">{title}</div>
          {children}
        </div>
      </div>
      {action && <div className="mt-3 sm:pl-7">{action}</div>}
    </section>
  );
}
