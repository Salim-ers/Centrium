'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BellRing, Check, ClipboardCheck, Plus, Send, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, KPICard } from '@/components/app';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimesheetFormDialog } from '@/components/timesheets/TimesheetFormDialog';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { timesheetService } from '@/lib/services';
import { TIMESHEET_STATUS, periodLabel, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { SectionTabs } from '@/components/layout/SectionTabs';

type Row = {
  id: string;
  mission_id: string;
  consultant_id: string;
  period_month: number;
  period_year: number;
  days_worked: number;
  days_validated: number;
  status: string;
  submitted_at: string | null;
  client_approval_status?: string;
  rejection_reason: string | null;
  consultant: { first_name: string; last_name: string } | null;
  mission: { title: string; company_id: string | null; companies: { name: string } | null } | null;
};

type Missing = {
  mission_id: string;
  title: string;
  consultant: string;
  client: string | null;
  month: number;
  year: number;
};

type Data = { rows: Row[]; missing: Missing[] };

const APPROVAL: Record<string, { fr: string; en: string; variant: 'info' | 'success' | 'destructive' }> = {
  pending: { fr: 'Approbation client en attente', en: 'Client approval pending', variant: 'info' },
  approved: { fr: 'Approuvé par le client', en: 'Approved by client', variant: 'success' },
  rejected: { fr: 'Refusé par le client', en: 'Rejected by client', variant: 'destructive' },
};

async function loadTimesheets(orgId: string, today = new Date()): Promise<Data> {
  const supabase = createClient();
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
  const [ts, missions] = await Promise.all([
    supabase
      .from('timesheets')
      .select('*, consultant:consultants(first_name, last_name), mission:missions(title, company_id, companies(name))')
      .eq('organization_id', orgId)
      .eq('archived', false)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(3000),
    supabase
      .from('missions')
      .select('id, title, start_date, end_date, consultants(first_name, last_name), companies(name)')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .lte('start_date', prevEnd),
  ]);
  const rows = (ts.data ?? []) as unknown as Row[];
  const prevMonth = prev.getMonth() + 1;
  const prevYear = prev.getFullYear();
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const missing: Missing[] = ((missions.data ?? []) as unknown as Array<{
    id: string;
    title: string;
    end_date: string | null;
    consultants: { first_name: string; last_name: string } | null;
    companies: { name: string } | null;
  }>)
    .filter((m) => !m.end_date || m.end_date >= prevStart)
    .filter((m) => !rows.some((r) => r.mission_id === m.id && r.period_month === prevMonth && r.period_year === prevYear && r.status !== 'draft'))
    .map((m) => ({
      mission_id: m.id,
      title: m.title,
      consultant: m.consultants ? `${m.consultants.first_name} ${m.consultants.last_name}` : '—',
      client: m.companies?.name ?? null,
      month: prevMonth,
      year: prevYear,
    }));
  return { rows, missing };
}

export default function TimesheetsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canValidate = can('timesheets.validate');
  const [tab, setTab] = useState<'pending' | 'all' | 'missing'>(params.get('status') === 'submitted' ? 'pending' : 'pending');
  const [period, setPeriod] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState('');
  // « + Créer → CRA » ouvre directement la saisie (?new=1).
  const [createOpen, setCreateOpen] = useState(params.get('new') === '1');

  const { data, loading, reload } = useCachedQuery<Data>(
    `timesheets-v2:${activeOrgId ?? 'none'}`,
    () => loadTimesheets(activeOrgId!),
    { enabled: !!activeOrgId },
  );
  useRealtimeReload(['timesheets'], () => void reload(), { enabled: !!activeOrgId, debounceMs: 800 });

  const periods = useMemo(() => {
    const keys = new Set((data?.rows ?? []).map((r) => `${r.period_year}-${String(r.period_month).padStart(2, '0')}`));
    return [...keys].sort().reverse();
  }, [data]);

  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (tab === 'pending') list = list.filter((r) => r.status === 'submitted');
    if (period !== 'all') list = list.filter((r) => `${r.period_year}-${String(r.period_month).padStart(2, '0')}` === period);
    return list;
  }, [data, tab, period]);

  const kpis = useMemo(() => {
    const all = data?.rows ?? [];
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevValidated = all.filter((r) => r.status === 'client_validated' && r.period_month === prev.getMonth() + 1 && r.period_year === prev.getFullYear());
    return {
      pending: all.filter((r) => r.status === 'submitted').length,
      clientPending: all.filter((r) => r.client_approval_status === 'pending').length,
      prevValidated: prevValidated.length,
      prevDays: prevValidated.reduce((s, r) => s + Number(r.days_validated || 0), 0),
      missing: data?.missing.length ?? 0,
      prevLabel: periodLabel(prev.getMonth() + 1, prev.getFullYear(), lang),
    };
  }, [data, lang]);

  async function validate(r: Row) {
    if (!activeOrgId) return;
    setBusy(r.id);
    const res = await timesheetService.validateAndInvoice(r.id, activeOrgId);
    setBusy(null);
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? (fr ? 'Validation impossible' : 'Could not approve'));
      return;
    }
    void fetch(`/api/timesheets/${r.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify_validated' }),
    }).catch(() => {});
    toast.success(
      res.data.alreadyInvoiced
        ? fr ? 'CRA validé' : 'Timesheet approved'
        : fr ? `CRA validé · préfacture ${res.data.invoice.invoice_number} préparée` : `Approved · pre-invoice ${res.data.invoice.invoice_number} prepared`,
    );
    void reload();
  }

  async function transition(r: Row, action: 'reject' | 'request_client_approval', why?: string) {
    setBusy(r.id);
    const res = await fetch(`/api/timesheets/${r.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: why }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Action impossible' : 'Action failed'));
      return false;
    }
    toast.success(
      action === 'reject'
        ? fr ? 'CRA renvoyé au consultant' : 'Timesheet sent back to the consultant'
        : fr ? 'CRA envoyé au client pour approbation' : 'Timesheet sent to the client for approval',
    );
    void reload();
    return true;
  }

  async function remind(m: Missing) {
    setBusy(m.mission_id);
    const res = await fetch('/api/timesheets/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission_id: m.mission_id, period_month: m.month, period_year: m.year }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (fr ? 'Relance impossible' : 'Reminder failed'));
      return;
    }
    toast.success(fr ? 'Consultant relancé' : 'Consultant reminded');
  }

  const columns: Column<Row>[] = [
    {
      id: 'consultant',
      header: 'Consultant',
      mobile: 'title',
      sortValue: (r) => (r.consultant ? `${r.consultant.last_name} ${r.consultant.first_name}` : ''),
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.consultant ? `${r.consultant.first_name} ${r.consultant.last_name}` : '?'} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{r.consultant ? `${r.consultant.first_name} ${r.consultant.last_name}` : '—'}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {r.mission?.title}
              {r.mission?.companies?.name ? ` · ${r.mission.companies.name}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'period',
      header: fr ? 'Période' : 'Period',
      mobile: 'subtitle',
      sortValue: (r) => r.period_year * 100 + r.period_month,
      cell: (r) => <span className="text-[13px]">{periodLabel(r.period_month, r.period_year, lang)}</span>,
    },
    {
      id: 'days',
      header: fr ? 'Jours' : 'Days',
      align: 'right',
      mobile: 'meta',
      sortValue: (r) => Number(r.days_worked),
      cell: (r) => <span className="num">{r.status === 'client_validated' ? r.days_validated : r.days_worked}</span>,
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      mobile: 'trailing',
      sortValue: (r) => r.status,
      cell: (r) => {
        const s = statusOf(TIMESHEET_STATUS, r.status, lang);
        const approval = r.client_approval_status ? APPROVAL[r.client_approval_status] : null;
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={s.tone}>{s.label}</StatusPill>
            {approval && <Badge variant={approval.variant}>{approval[lang]}</Badge>}
            {r.status === 'rejected' && r.rejection_reason && (
              <Tooltip label={r.rejection_reason}>
                <span className="cursor-help text-xs text-muted-foreground underline decoration-dotted">{fr ? 'motif' : 'reason'}</span>
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      id: 'submitted',
      header: fr ? 'Soumis le' : 'Submitted',
      hideOnMobile: true,
      sortValue: (r) => r.submitted_at ?? '',
      cell: (r) => <span className="text-[13px] text-muted-foreground">{formatDate(r.submitted_at, lang, 'short')}</span>,
    },
    ...(canValidate
      ? ([
          {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            hideOnMobile: true,
            cell: (r) =>
              r.status === 'submitted' ? (
                <span className="flex justify-end gap-1">
                  {r.client_approval_status !== 'pending' && r.client_approval_status !== 'approved' && (
                    <Tooltip label={fr ? 'Demander l’approbation du client' : 'Request client approval'}>
                      <Button variant="ghost" size="icon-sm" disabled={busy === r.id} onClick={() => void transition(r, 'request_client_approval')} aria-label={fr ? 'Demander l’approbation du client' : 'Request client approval'}>
                        <Send />
                      </Button>
                    </Tooltip>
                  )}
                  <Button variant="secondary" size="sm" disabled={busy === r.id} onClick={() => { setRejecting(r); setReason(''); }}>
                    <X />
                    {fr ? 'Refuser' : 'Reject'}
                  </Button>
                  <Button size="sm" loading={busy === r.id} onClick={() => void validate(r)}>
                    <Check />
                    {fr ? 'Valider' : 'Approve'}
                  </Button>
                </span>
              ) : null,
          },
        ] as Column<Row>[])
      : []),
  ];

  return (
    <AppShell>
      <PageHeader tabs={<SectionTabs section="operations" />}
        eyebrow={fr ? 'Opérations' : 'Operations'}
        title={fr ? 'CRA' : 'Timesheets'}
        description={
          fr
            ? 'Validation des comptes rendus d’activité. Chaque CRA validé prépare la préfacture et met à jour le CA de la mission.'
            : 'Timesheet approval. Each approved timesheet prepares the pre-invoice and updates mission revenue.'
        }
        actions={
          can('timesheets.validate') && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus />
              {fr ? 'Saisir un CRA' : 'Enter a timesheet'}
            </Button>
          )
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPICard accent="peach" label={fr ? 'À valider' : 'To approve'} value={kpis.pending} tone={kpis.pending ? 'amber' : 'neutral'} loading={loading && !data} />
        <KPICard label={fr ? 'Chez le client' : 'With client'} value={kpis.clientPending} hint={fr ? 'Approbation demandée' : 'Approval requested'} loading={loading && !data} />
        <KPICard accent="terra" label={fr ? 'Validés' : 'Approved'} value={kpis.prevValidated} hint={kpis.prevLabel} loading={loading && !data} />
        <KPICard label={fr ? 'Jours validés' : 'Approved days'} value={kpis.prevDays} hint={kpis.prevLabel} loading={loading && !data} />
        <KPICard accent="soft" label={fr ? 'CRA manquants' : 'Missing timesheets'} value={kpis.missing} hint={kpis.prevLabel} tone={kpis.missing ? 'rose' : 'neutral'} loading={loading && !data} />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">
              {fr ? 'À valider' : 'To approve'} <span className="num text-xs text-muted-foreground">{kpis.pending}</span>
            </TabsTrigger>
            <TabsTrigger value="all">{fr ? 'Tous' : 'All'}</TabsTrigger>
            <TabsTrigger value="missing">
              {fr ? 'Manquants' : 'Missing'} <span className="num text-xs text-muted-foreground">{kpis.missing}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === 'all' && (
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-48" aria-label={fr ? 'Période' : 'Period'}>
            <option value="all">{fr ? 'Toutes les périodes' : 'All periods'}</option>
            {periods.map((p) => {
              const [y, m] = p.split('-').map(Number);
              return (
                <option key={p} value={p}>
                  {periodLabel(m!, y!, lang)}
                </option>
              );
            })}
          </Select>
        )}
      </div>

      {tab === 'missing' ? (
        (data?.missing ?? []).length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={fr ? 'Aucun CRA manquant' : 'No missing timesheet'} description={fr ? 'Toutes les missions actives ont transmis leur CRA du mois dernier.' : 'All active missions have submitted last month’s timesheet.'} />
        ) : (
          <div className="tile-surface overflow-hidden">
            <ul className="divide-y divide-border">
              {(data?.missing ?? []).map((m) => (
                <li key={m.mission_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{m.consultant}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      <Link href={`/missions/${m.mission_id}`} className="hover:text-foreground">
                        {m.title}
                      </Link>
                      {m.client ? ` · ${m.client}` : ''} · {periodLabel(m.month, m.year, lang)}
                    </div>
                  </div>
                  {canValidate && (
                    <Button variant="secondary" size="sm" loading={busy === m.mission_id} onClick={() => void remind(m)}>
                      <BellRing />
                      {fr ? 'Relancer' : 'Remind'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      ) : (
        <DataTable
          aria-label={fr ? 'Comptes rendus d’activité' : 'Timesheets'}
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          rowHref={(r) => `/timesheets/${r.id}`}
          rowActions={(r) => linkActions(`/timesheets/${r.id}`, fr)}
          tableId="timesheets"
          loading={loading && !data}
          initialSort={{ id: 'period', dir: 'desc' }}
          empty={
            <EmptyState
              icon={ClipboardCheck}
              title={tab === 'pending' ? (fr ? 'Aucun CRA à valider' : 'Nothing to approve') : fr ? 'Aucun CRA' : 'No timesheet'}
              description={
                tab === 'pending'
                  ? fr
                    ? 'Les CRA soumis par vos consultants apparaîtront ici.'
                    : 'Timesheets submitted by consultants will show up here.'
                  : undefined
              }
            />
          }
        />
      )}

      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Renvoyer le CRA au consultant' : 'Send the timesheet back'}</DialogTitle>
            <DialogDescription>
              {fr ? 'Le motif est visible par le consultant, qui pourra corriger et soumettre à nouveau.' : 'The reason is shown to the consultant, who can fix and resubmit.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} placeholder={fr ? 'ex. Le 14 était un jour férié chez le client.' : 'e.g. The 14th was a holiday at the client.'} aria-label={fr ? 'Motif' : 'Reason'} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              loading={!!rejecting && busy === rejecting.id}
              onClick={async () => {
                if (rejecting && (await transition(rejecting, 'reject', reason))) setRejecting(null);
              }}
            >
              {fr ? 'Renvoyer' : 'Send back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeOrgId && <TimesheetFormDialog open={createOpen} onOpenChange={setCreateOpen} organizationId={activeOrgId} onSaved={() => void reload()} />}
    </AppShell>
  );
}
