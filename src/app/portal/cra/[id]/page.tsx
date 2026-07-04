'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import { timesheetService } from '@/lib/services';
import {
  TimesheetCalendar,
  type CalendarDay,
  type TimesheetDayKind,
} from '@/components/timesheets/TimesheetCalendar';
import type { Timesheet } from '@/types';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function PortalCraDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const brandName = useBrandName();
  const [ts, setTs] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  // Jours détaillés du calendrier (RLS : visibles/écrivables via le parent)
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  async function reload() {
    if (!params?.id) return;
    const supabase = createClient();
    const [{ data, error }, { data: dayRows }] = await Promise.all([
      supabase.from('timesheets').select('*').eq('id', params.id).maybeSingle(),
      supabase
        .from('timesheet_days')
        .select('day_date, duration, kind, note')
        .eq('timesheet_id', params.id),
    ]);
    if (error || !data) {
      toast.error('CRA introuvable ou accès refusé');
      router.push('/portal/cra');
      return;
    }
    const row = data as Timesheet;
    setTs(row);
    setDays(Number(row.days_worked));
    setNotes(row.notes ?? '');
    setCalendarDays((dayRows ?? []) as CalendarDay[]);
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
      toast.error('Modification impossible : ' + res.error.message);
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
      toast.error(`Modification impossible sur certains jours : ${firstError.message}`);
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
      toast.error('Erreur : ' + error.message);
      return;
    }
    toast.success('CRA mis à jour');
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
        toast.error(body.message ?? 'Soumission impossible');
        return;
      }
      toast.success('CRA soumis — ton organisation a été notifiée');
      reload();
    } catch {
      toast.error('Erreur réseau — réessaie.');
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
      toast.error('Erreur : ' + res.error.message);
      return;
    }
    toast.success('CRA réouvert pour édition');
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
          Retour
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-2">
            Mon espace
          </div>
          <h1 className="font-display font-light tracking-[-0.03em] leading-[1.05] text-[clamp(1.75rem,3.5vw,2.5rem)]">
            CRA{' '}
            <span className="qc-italic-accent font-editorial italic">
              {MONTHS[ts.period_month - 1]} {ts.period_year}.
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
              Éditer
            </Button>
          )}
          {canReopen && !editing && (
            <Button variant="outline" onClick={reopen} disabled={saving}>
              <Pencil className="h-4 w-4" />
              Corriger
            </Button>
          )}
          {canSubmit && !editing && (
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Soumettre
            </Button>
          )}
        </div>
      </div>

      {ts.status === 'rejected' && ts.rejection_reason && (
        <Card className="mb-4 border-red-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Motif du rejet</div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {ts.rejection_reason}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Clique sur « Corriger » pour revenir en brouillon et soumettre à nouveau.
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
              <div className="font-semibold">CRA validé</div>
              <p className="text-muted-foreground">
                Ta facture associée sera visible dans « Mes factures » dès qu&apos;elle sera marquée payée.
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
              <div className="font-semibold">En attente de validation</div>
              <p className="text-muted-foreground">
                Ton CRA a été envoyé à {brandName}. Tu seras notifié dès qu&apos;il sera validé ou refusé.
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
            Calendrier du mois
            {!calendarEditable && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (lecture seule — CRA {ts.status === 'submitted' ? 'soumis' : 'validé'})
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
          <CardTitle className="text-base">Détail du CRA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jours travaillés</Label>
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
              <Label>Jours validés</Label>
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
                placeholder="Congés, jours fériés, précisions…"
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
                  Annuler
                </Button>
              )}
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: Timesheet['status'] }) {
  const map: Record<Timesheet['status'], { label: string; className: string }> = {
    draft: { label: 'Brouillon', className: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    submitted: {
      label: 'En attente de validation',
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    },
    client_validated: {
      label: 'Validé client',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    },
    rejected: {
      label: 'Rejeté',
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
