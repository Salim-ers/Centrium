'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BellRing, Check, CheckCheck, ClipboardCheck, ClipboardX, Download, Eye, Plus, Search, Send, X } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/app';
import { StatStrip } from '@/components/app/StatStrip';
import { Segmented } from '@/components/app/Segmented';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { showBrandToast } from '@/components/ui/BrandToast';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimesheetFormDialog } from '@/components/timesheets/TimesheetFormDialog';
import { TimesheetQuickView } from '@/components/timesheets/TimesheetQuickView';
import { SectionTabs } from '@/components/layout/SectionTabs';
import { useOrganization } from '@/lib/auth/context';
import { usePermissions } from '@/hooks/usePermissions';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { timesheetService } from '@/lib/services';
import { consultantName, loadTimesheets, missingExportRows, missionLabel, previousPeriod, summarizeTimesheets, timesheetExportRows, type MissingTimesheet, type TimesheetRow, type TimesheetsData } from '@/lib/timesheets/approvals';
import { toDelimited } from '@/lib/finance/export-format';
import { TIMESHEET_STATUS, periodLabel, periodLabelShort, statusOf } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type View = 'pending' | 'missing' | 'all';

const APPROVAL: Record<string, { fr: string; en: string; variant: 'info' | 'success' | 'destructive' }> = {
  pending: { fr: 'Chez le client', en: 'With client', variant: 'info' },
  approved: { fr: 'Approuvé par le client', en: 'Approved by client', variant: 'success' },
  rejected: { fr: 'Refusé par le client', en: 'Rejected by client', variant: 'destructive' },
};

/**
 * CRA : trois indicateurs (à valider, manquants, validés ce mois) puis le
 * centre de validation rapide — valider, renvoyer, ouvrir en ligne, ou
 * valider plusieurs CRA d'un coup. Chaque CRA validé prépare la préfacture.
 */
export default function TimesheetsPage() {
  const params = useSearchParams();
  const { activeOrgId } = useOrganization();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  const canValidate = can('timesheets.validate');
  const initialView = params.get('view');
  const [view, setView] = useState<View>(initialView === 'missing' || initialView === 'all' ? initialView : 'pending');
  const [period, setPeriod] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickId, setQuickId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TimesheetRow | null>(null);
  const [reason, setReason] = useState('');
  // « + Créer → CRA » ouvre directement la saisie (?new=1).
  const [createOpen, setCreateOpen] = useState(params.get('new') === '1');

  const { data, loading, reload } = useCachedQuery<TimesheetsData>(
    `timesheets-v3:${activeOrgId ?? 'none'}`,
    () => loadTimesheets(createClient(), activeOrgId!),
    { enabled: !!activeOrgId },
  );
  useRealtimeReload(['timesheets'], () => void reload(), { enabled: !!activeOrgId, debounceMs: 800 });

  const kpis = useMemo(() => (data ? summarizeTimesheets(data) : null), [data]);
  const prev = previousPeriod(new Date());
  const prevLabel = periodLabel(prev.month, prev.year, lang);

  const periods = useMemo(() => {
    const keys = new Set((data?.rows ?? []).map((r) => `${r.period_year}-${String(r.period_month).padStart(2, '0')}`));
    return [...keys].sort().reverse();
  }, [data]);

  const matches = (text: string) => {
    const q = query.trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
  };

  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (view === 'pending') list = list.filter((r) => r.status === 'submitted');
    if (view === 'all' && period !== 'all') list = list.filter((r) => `${r.period_year}-${String(r.period_month).padStart(2, '0')}` === period);
    return list.filter((r) => matches(`${consultantName(r)} ${r.mission?.title ?? ''} ${r.mission?.companies?.name ?? ''}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, period, query]);

  const missing = useMemo(
    () => (data?.missing ?? []).filter((m) => matches(`${m.consultant} ${m.title} ${m.client ?? ''}`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, query],
  );

  const selectedRows = rows.filter((r) => selected.has(r.id) && r.status === 'submitted');
  const selectedDays = selectedRows.reduce((s, r) => s + Number(r.days_worked || 0), 0);

  /** Export CSV de la vue affichée (à valider, manquants ou tous, filtres compris). */
  function exportView() {
    const out = view === 'missing' ? missingExportRows(missing) : timesheetExportRows(rows);
    if (out.length === 0) {
      toast.error(fr ? 'Rien à exporter dans cette vue' : 'Nothing to export in this view');
      return;
    }
    // BOM UTF-8 : accents corrects à l'ouverture dans Excel.
    const blob = new Blob(['\uFEFF' + toDelimited(out)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cra-${view === 'missing' ? 'manquants' : view === 'pending' ? 'a-valider' : 'tous'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBrandToast('success', fr ? 'Export prêt' : 'Export ready', { description: fr ? `${out.length} ligne${out.length > 1 ? 's' : ''}` : `${out.length} row${out.length > 1 ? 's' : ''}` });
  }

  function notifyValidated(id: string) {
    void fetch(`/api/timesheets/${id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify_validated' }),
    }).catch(() => {});
  }

  async function validate(r: TimesheetRow) {
    if (!activeOrgId) return;
    setBusy(r.id);
    const res = await timesheetService.validateAndInvoice(r.id, activeOrgId);
    setBusy(null);
    if (res.error || !res.data) {
      toast.error(res.error?.message ?? (fr ? 'Validation impossible' : 'Could not approve'));
      return;
    }
    notifyValidated(r.id);
    showBrandToast('success', fr ? `CRA de ${consultantName(r)} validé` : `${consultantName(r)}’s timesheet approved`, {
      description: res.data.alreadyInvoiced
        ? undefined
        : fr
          ? `Préfacture ${res.data.invoice.invoice_number} préparée`
          : `Pre-invoice ${res.data.invoice.invoice_number} prepared`,
    });
    setQuickId(null);
    setSelected((s) => {
      const next = new Set(s);
      next.delete(r.id);
      return next;
    });
    void reload();
  }

  /** Validation par lot : un CRA après l'autre, bilan à la fin. */
  async function validateMany(list: TimesheetRow[]) {
    if (!activeOrgId || list.length === 0) return;
    setBulkBusy(true);
    const progress = showBrandToast('loading', fr ? `Validation de ${list.length} CRA…` : `Approving ${list.length} timesheets…`);
    let ok = 0;
    let prepared = 0;
    const failed = new Set<string>();
    for (const r of list) {
      const res = await timesheetService.validateAndInvoice(r.id, activeOrgId);
      if (res.error || !res.data) {
        failed.add(r.id);
        continue;
      }
      ok++;
      if (!res.data.alreadyInvoiced) prepared++;
      notifyValidated(r.id);
    }
    toast.dismiss(progress);
    setBulkBusy(false);
    setSelected(failed);
    showBrandToast(failed.size ? 'warning' : 'success', fr ? `${ok} CRA validé${ok > 1 ? 's' : ''}` : `${ok} timesheet${ok > 1 ? 's' : ''} approved`, {
      description: [
        prepared ? (fr ? `${prepared} préfacture${prepared > 1 ? 's' : ''} préparée${prepared > 1 ? 's' : ''}` : `${prepared} pre-invoice${prepared > 1 ? 's' : ''} prepared`) : null,
        failed.size ? (fr ? `${failed.size} en échec, toujours sélectionné${failed.size > 1 ? 's' : ''}` : `${failed.size} failed, still selected`) : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    });
    void reload();
  }

  async function transition(r: TimesheetRow, action: 'reject' | 'request_client_approval', why?: string) {
    setBusy(r.id);
    const res = await fetch(`/api/timesheets/${r.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: why }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (typeof json.error === 'string' ? json.error : fr ? 'Action impossible' : 'Action failed'));
      return false;
    }
    showBrandToast(
      'update',
      action === 'reject'
        ? fr
          ? 'CRA renvoyé au consultant'
          : 'Timesheet sent back to the consultant'
        : fr
          ? 'CRA envoyé au client pour approbation'
          : 'Timesheet sent to the client for approval',
    );
    void reload();
    return true;
  }

  async function remind(m: MissingTimesheet, quiet = false) {
    setBusy(m.mission_id);
    const res = await fetch('/api/timesheets/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission_id: m.mission_id, period_month: m.month, period_year: m.year }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!quiet) toast.error((json as { message?: string }).message ?? (fr ? 'Relance impossible' : 'Reminder failed'));
      return false;
    }
    if (!quiet) showBrandToast('success', fr ? `${m.consultant} relancé` : `${m.consultant} reminded`);
    return true;
  }

  async function remindAll() {
    setBulkBusy(true);
    let ok = 0;
    for (const m of missing) if (await remind(m, true)) ok++;
    setBulkBusy(false);
    showBrandToast(ok === missing.length ? 'success' : 'warning', fr ? `${ok} consultant${ok > 1 ? 's' : ''} relancé${ok > 1 ? 's' : ''}` : `${ok} consultant${ok > 1 ? 's' : ''} reminded`, {
      description: ok < missing.length ? (fr ? `${missing.length - ok} relance(s) impossible(s)` : `${missing.length - ok} reminder(s) failed`) : undefined,
    });
  }

  const columns: Column<TimesheetRow>[] = [
    {
      id: 'consultant',
      header: 'Consultant',
      mobile: 'title',
      sortValue: (r) => (r.consultant ? `${r.consultant.last_name} ${r.consultant.first_name}` : ''),
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={consultantName(r)} size="sm" />
          <span className="truncate font-medium text-foreground">{consultantName(r)}</span>
        </span>
      ),
    },
    {
      id: 'mission',
      header: 'Mission',
      mobile: 'subtitle',
      sortValue: (r) => r.mission?.title ?? '',
      cell: (r) => (
        <span className="block min-w-0 max-w-[15rem] truncate text-[13px] text-muted-foreground xl:max-w-[20rem] 2xl:max-w-[28rem]">
          {missionLabel(r.mission?.title, r.mission?.companies?.name)}
        </span>
      ),
    },
    {
      id: 'period',
      header: fr ? 'Mois' : 'Month',
      mobile: 'meta',
      sortValue: (r) => r.period_year * 100 + r.period_month,
      cell: (r) => <span className="whitespace-nowrap text-[13px]">{periodLabelShort(r.period_month, r.period_year, lang)}</span>,
    },
    {
      id: 'days',
      header: fr ? 'Jours' : 'Days',
      align: 'right',
      mobile: 'meta',
      sortValue: (r) => Number(r.days_worked),
      cell: (r) => <span className="num font-medium">{r.status === 'client_validated' ? r.days_validated : r.days_worked}</span>,
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
      defaultHidden: view !== 'pending',
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
                <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {r.client_approval_status !== 'pending' && r.client_approval_status !== 'approved' && (
                    <Tooltip label={fr ? 'Demander l’approbation du client' : 'Request client approval'}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy === r.id || bulkBusy}
                        onClick={() => void transition(r, 'request_client_approval')}
                        aria-label={fr ? 'Demander l’approbation du client' : 'Request client approval'}
                      >
                        <Send />
                      </Button>
                    </Tooltip>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === r.id || bulkBusy}
                    onClick={() => {
                      setRejecting(r);
                      setReason('');
                    }}
                  >
                    <X />
                    {fr ? 'Rejeter' : 'Reject'}
                  </Button>
                  <Button size="sm" loading={busy === r.id} disabled={bulkBusy} onClick={() => void validate(r)}>
                    <Check />
                    {fr ? 'Valider' : 'Approve'}
                  </Button>
                </span>
              ) : null,
          },
        ] as Column<TimesheetRow>[])
      : []),
  ];

  const quick = quickId ? ((data?.rows ?? []).find((r) => r.id === quickId) ?? null) : null;

  return (
    <AppShell fill>
      <PageHeader
        title={fr ? 'CRA' : 'Timesheets'}
        description={fr ? 'Chaque CRA validé prépare la préfacture de la mission.' : 'Each approved timesheet prepares the mission’s pre-invoice.'}
        tabs={<SectionTabs section="operations" />}
        actions={
          canValidate && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus />
              {fr ? 'Saisir un CRA' : 'Enter a timesheet'}
            </Button>
          )
        }
      />

      <StatStrip
        className="mb-3"
        items={[
          {
            label: kpis?.pendingDays ? (fr ? `à valider · ${kpis.pendingDays} jours` : `to approve · ${kpis.pendingDays} days`) : fr ? 'à valider' : 'to approve',
            value: kpis ? kpis.pending : '…',
            tone: 'terra',
            icon: ClipboardCheck,
          },
          {
            label: fr ? `manquants · ${prevLabel}` : `missing · ${prevLabel}`,
            value: kpis ? kpis.missing : '…',
            tone: kpis?.missing ? 'peach' : 'ivory',
            icon: ClipboardX,
          },
          {
            label: kpis?.validatedDaysThisMonth
              ? fr
                ? `validés ce mois · ${kpis.validatedDaysThisMonth} jours`
                : `approved this month · ${kpis.validatedDaysThisMonth} days`
              : fr
                ? 'validés ce mois'
                : 'approved this month',
            value: kpis ? kpis.validatedThisMonth : '…',
            tone: 'white',
            icon: CheckCheck,
          },
        ]}
      />

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <Segmented<View>
          label={fr ? 'Vue' : 'View'}
          value={view}
          onChange={(v) => {
            setView(v);
            setSelected(new Set());
          }}
          options={[
            { value: 'pending', label: fr ? 'Validation rapide' : 'Quick approval', count: kpis?.pending },
            { value: 'missing', label: fr ? 'Manquants' : 'Missing', count: kpis?.missing },
            { value: 'all', label: fr ? 'Tous' : 'All' },
          ]}
        />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? 'Consultant, mission, client' : 'Consultant, mission, client'} className="pl-9" aria-label={fr ? 'Rechercher' : 'Search'} />
        </div>
        {view === 'all' && (
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-48" aria-label={fr ? 'Période' : 'Period'}>
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
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {view === 'pending' && canValidate && rows.length > 1 && selected.size === 0 && (
            <Button variant="secondary" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>
              <CheckCheck />
              {fr ? 'Tout sélectionner' : 'Select all'}
            </Button>
          )}
          {view === 'missing' && canValidate && missing.length > 1 && (
            <Button variant="secondary" onClick={() => void remindAll()} loading={bulkBusy}>
              <BellRing />
              {fr ? `Relancer les ${missing.length}` : `Remind all ${missing.length}`}
            </Button>
          )}
          <Button variant="ghost" onClick={exportView} title={fr ? 'Exporter la vue affichée (CSV, filtres compris)' : 'Export the current view (CSV, filters included)'}>
            <Download />
            {fr ? 'Exporter' : 'Export'}
          </Button>
        </div>
      </div>

      {view === 'pending' && selectedRows.length > 0 && canValidate && (
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-app-terra/20 bg-app-peach-light px-4 py-2">
          <span className="num text-[13px] font-medium text-app-terra-deep">
            {fr
              ? `${selectedRows.length} CRA sélectionné${selectedRows.length > 1 ? 's' : ''} · ${selectedDays} jours`
              : `${selectedRows.length} timesheet${selectedRows.length > 1 ? 's' : ''} selected · ${selectedDays} days`}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void validateMany(selectedRows)} loading={bulkBusy}>
              <CheckCheck />
              {fr ? 'Valider la sélection' : 'Approve selection'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {view === 'missing' ? (
        missing.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={fr ? 'Aucun CRA manquant' : 'No missing timesheet'}
            description={fr ? `Toutes les missions actives ont transmis leur CRA de ${prevLabel}.` : `All active missions have submitted their ${prevLabel} timesheet.`}
          />
        ) : (
          <div className="tile-surface flex min-h-0 flex-1 flex-col overflow-hidden">
            <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {missing.map((m) => (
                <li key={m.mission_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <Avatar name={m.consultant} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{m.consultant}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      <Link href={`/missions/${m.mission_id}`} className="hover:text-foreground">
                        {missionLabel(m.title, m.client)}
                      </Link>
                    </div>
                  </div>
                  <span className="text-[13px] capitalize text-muted-foreground">{periodLabel(m.month, m.year, lang)}</span>
                  {canValidate && (
                    <Button variant="secondary" size="sm" loading={busy === m.mission_id} disabled={bulkBusy} onClick={() => void remind(m)}>
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
          fill
          aria-label={fr ? 'Comptes rendus d’activité' : 'Timesheets'}
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          rowHref={(r) => `/timesheets/${r.id}`}
          onRowClick={(r) => setQuickId(r.id)}
          rowActions={(r) => [
            { label: fr ? 'Aperçu du mois' : 'Month preview', icon: Eye, onSelect: () => setQuickId(r.id) },
            ...linkActions(`/timesheets/${r.id}`, fr).map((a, i) => (i === 0 ? { ...a, separatorBefore: true } : a)),
          ]}
          tableId={view === 'pending' ? 'timesheets-approval' : 'timesheets'}
          loading={loading && !data}
          selectable={view === 'pending' && canValidate}
          selected={selected}
          onSelectedChange={setSelected}
          initialSort={view === 'pending' ? { id: 'submitted', dir: 'asc' } : { id: 'period', dir: 'desc' }}
          empty={
            <EmptyState
              icon={ClipboardCheck}
              title={
                query.trim()
                  ? fr
                    ? 'Aucun résultat'
                    : 'No results'
                  : view === 'pending'
                    ? fr
                      ? 'Aucun CRA à valider'
                      : 'Nothing to approve'
                    : fr
                      ? 'Aucun CRA'
                      : 'No timesheet'
              }
              description={
                !query.trim() && view === 'pending'
                  ? kpis?.missing
                    ? fr
                      ? `Tout est validé. ${kpis.missing} CRA de ${prevLabel} manque${kpis.missing > 1 ? 'nt' : ''} encore.`
                      : `All approved. ${kpis.missing} ${prevLabel} timesheet(s) still missing.`
                    : fr
                      ? 'Les CRA soumis par vos consultants apparaîtront ici.'
                      : 'Timesheets submitted by consultants will show up here.'
                  : undefined
              }
              action={
                !query.trim() && view === 'pending' && kpis?.missing ? (
                  <Button variant="secondary" onClick={() => setView('missing')}>
                    <BellRing />
                    {fr ? 'Voir les manquants' : 'See missing'}
                  </Button>
                ) : undefined
              }
            />
          }
          className={cn(selectedRows.length > 0 && 'ring-1 ring-app-terra/20')}
        />
      )}

      <TimesheetQuickView
        row={quick}
        open={!!quick}
        onOpenChange={(v) => !v && setQuickId(null)}
        lang={lang}
        canValidate={canValidate}
        busy={!!quick && busy === quick.id}
        onValidate={(r) => void validate(r)}
        onReject={(r) => {
          setRejecting(r);
          setReason('');
        }}
      />

      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr ? 'Renvoyer le CRA au consultant' : 'Send the timesheet back'}</DialogTitle>
            <DialogDescription>
              {fr ? 'Le motif est visible par le consultant, qui pourra corriger et soumettre à nouveau.' : 'The reason is shown to the consultant, who can fix and resubmit.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder={fr ? 'ex. Le 14 était un jour férié chez le client.' : 'e.g. The 14th was a holiday at the client.'}
            aria-label={fr ? 'Motif' : 'Reason'}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              loading={!!rejecting && busy === rejecting.id}
              onClick={async () => {
                if (rejecting && (await transition(rejecting, 'reject', reason))) {
                  setRejecting(null);
                  setQuickId(null);
                }
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
