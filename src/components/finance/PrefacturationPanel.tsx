'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Ban, BadgeEuro, CheckCircle2, Download, FileCheck2, FilePlus2, MoreHorizontal, Receipt, Send, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { showBrandToast } from '@/components/ui/BrandToast';
import { DataTable, type Column, linkActions } from '@/components/ui/data-table';
import { EmptyState } from '@/components/app/EmptyState';
import { Segmented } from '@/components/app/Segmented';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { downloadPrefactures, useExportFormat } from '@/hooks/useExportFormat';
import { useOrganization } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { timesheetService } from '@/lib/services';
import { loadPrefacturation, prefacturationKey, stageOf, PREPARE_WINDOW_MONTHS, type PrefactureRow, type PrefactureStage, type PrefacturationData, type ToPrepareRow } from '@/lib/finance/prefactures';
import { INVOICE_STATUS, periodLabelShort, statusOf } from '@/lib/status';
import { formatDate, formatEur } from '@/lib/format';
import { cn } from '@/lib/utils';

type Party = 'client' | 'consultant';


/**
 * Préfacturation, un écran opérationnel : CRA validé → jours × TJM →
 * à contrôler → prête à exporter → exportée vers l'outil comptable.
 * Centrium n'émet pas la facture : c'est l'outil comptable qui le fait.
 */
export function PrefacturationPanel({ lang, canEdit }: { lang: 'fr' | 'en'; canEdit: boolean }) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const { format } = useExportFormat();
  const [party, setParty] = useState<Party>('client');
  const [stage, setStage] = useState<PrefactureStage>('review');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, reload } = useCachedQuery<PrefacturationData>(prefacturationKey(activeOrgId), () => loadPrefacturation(createClient(), activeOrgId!), {
    enabled: !!activeOrgId,
  });

  const counts = useMemo(() => {
    const c: Record<PrefactureStage, number> = { prepare: party === 'client' ? (data?.toPrepare.length ?? 0) : 0, review: 0, ready: 0, done: 0 };
    for (const i of data?.invoices ?? []) if (i.party === party) c[stageOf(i)]++;
    return c;
  }, [data, party]);

  const invoices = useMemo(() => (data?.invoices ?? []).filter((i) => i.party === party && stage !== 'prepare' && stageOf(i) === stage), [data, party, stage]);
  const toPrepare = party === 'client' && stage === 'prepare' ? (data?.toPrepare ?? []) : [];
  const today = new Date().toISOString().slice(0, 10);

  function reset(next: Partial<{ party: Party; stage: PrefactureStage }>) {
    if (next.party) setParty(next.party);
    if (next.stage) setStage(next.stage);
    if (next.party === 'consultant' && stage === 'prepare') setStage('review');
    setSelected(new Set());
  }

  async function act(i: PrefactureRow, action: string) {
    setBusy(i.id);
    const res = await fetch(`/api/finance/prefactures/${i.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? (typeof json.error === 'string' ? json.error : fr ? 'Action impossible' : 'Action failed'));
      return;
    }
    void reload();
  }

  /** Prépare les préfactures manquantes : un CRA après l'autre. */
  async function prepare(rows: ToPrepareRow[]) {
    if (!activeOrgId || rows.length === 0) return;
    setBusy('bulk');
    let ok = 0;
    for (const r of rows) {
      const res = await timesheetService.validateAndInvoice(r.id, activeOrgId);
      if (!res.error && res.data) ok++;
    }
    setBusy(null);
    setSelected(new Set());
    showBrandToast(ok === rows.length ? 'success' : 'warning', fr ? `${ok} préfacture${ok > 1 ? 's' : ''} préparée${ok > 1 ? 's' : ''}` : `${ok} pre-invoice${ok > 1 ? 's' : ''} prepared`, {
      description: ok < rows.length ? (fr ? `${rows.length - ok} en échec` : `${rows.length - ok} failed`) : fr ? 'À contrôler avant export' : 'To review before export',
    });
    void reload();
  }

  async function validateSelected() {
    setBusy('bulk');
    let ok = 0;
    for (const id of selected) {
      const res = await fetch(`/api/finance/prefactures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });
      if (res.ok) ok++;
    }
    setBusy(null);
    setSelected(new Set());
    showBrandToast('success', fr ? `${ok} préfacture${ok > 1 ? 's' : ''} validée${ok > 1 ? 's' : ''}` : `${ok} pre-invoice${ok > 1 ? 's' : ''} approved`, {
      description: fr ? 'Prêtes à exporter' : 'Ready to export',
    });
    void reload();
  }

  async function exportSelected() {
    setBusy('export');
    const error = await downloadPrefactures([...selected], format, fr);
    setBusy(null);
    if (error) {
      toast.error(error);
      return;
    }
    setSelected(new Set());
    showBrandToast('success', fr ? 'Export généré' : 'Export generated', { description: fr ? 'Préfactures marquées comme exportées' : 'Pre-invoices marked as exported' });
    void reload();
  }

  const prepareColumns: Column<ToPrepareRow>[] = [
    {
      id: 'consultant',
      header: 'Consultant',
      mobile: 'title',
      sortValue: (r) => r.consultant,
      cell: (r) => <span className="font-medium text-foreground">{r.consultant}</span>,
    },
    {
      id: 'mission',
      header: 'Mission',
      mobile: 'subtitle',
      sortValue: (r) => r.mission,
      cell: (r) => (
        <span className="block max-w-[18rem] truncate text-[13px] text-muted-foreground xl:max-w-[26rem]">
          {r.mission}
          {r.client ? ` · ${r.client}` : ''}
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
      id: 'calc',
      header: fr ? 'Jours × TJM' : 'Days × rate',
      align: 'right',
      hideOnMobile: true,
      cell: (r) => (
        <span className="num whitespace-nowrap text-[13px] text-muted-foreground">
          {r.days} × {formatEur(r.rate, lang)}
        </span>
      ),
    },
    {
      id: 'amount',
      header: fr ? 'Montant HT' : 'Amount (excl. VAT)',
      align: 'right',
      mobile: 'meta',
      sortValue: (r) => r.amount,
      cell: (r) => <span className="num font-medium">{formatEur(r.amount, lang, 2)}</span>,
    },
    ...(canEdit
      ? ([
          {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            hideOnMobile: true,
            cell: (r) => (
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void prepare([r])}>
                <FilePlus2 />
                {fr ? 'Préparer' : 'Prepare'}
              </Button>
            ),
          },
        ] as Column<ToPrepareRow>[])
      : []),
  ];

  const invoiceColumns: Column<PrefactureRow>[] = [
    {
      id: 'number',
      header: fr ? 'N°' : 'No.',
      mobile: 'title',
      sortValue: (i) => i.invoice_number,
      cell: (i) => <span className="num font-medium text-foreground">{i.invoice_number}</span>,
    },
    {
      id: 'party',
      header: party === 'client' ? 'Client' : 'Consultant',
      mobile: 'subtitle',
      sortValue: (i) => (party === 'client' ? (i.companies?.name ?? '') : `${i.consultants?.last_name ?? ''}`),
      cell: (i) => (
        <span className="block min-w-0 max-w-[18rem] xl:max-w-[26rem]">
          <span className="block truncate">{party === 'client' ? (i.companies?.name ?? '—') : i.consultants ? `${i.consultants.first_name} ${i.consultants.last_name}` : '—'}</span>
          <span className="block truncate text-xs text-muted-foreground">{i.missions?.title}</span>
        </span>
      ),
    },
    {
      id: 'period',
      header: fr ? 'Période' : 'Period',
      hideOnMobile: true,
      sortValue: (i) => i.issue_date,
      cell: (i) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{i.period_label ?? formatDate(i.issue_date, lang, 'short')}</span>,
    },
    {
      id: 'amount',
      header: fr ? 'Montant HT' : 'Amount (excl. VAT)',
      align: 'right',
      mobile: 'meta',
      sortValue: (i) => Number(i.amount_ht),
      cell: (i) => <span className="num font-medium">{formatEur(Number(i.amount_ht), lang, 2)}</span>,
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      mobile: 'trailing',
      cell: (i) => {
        const st = stageOf(i);
        if (st === 'review') return <StatusPill tone="warning">{fr ? 'À contrôler' : 'To review'}</StatusPill>;
        if (st === 'ready') return <StatusPill tone="brand">{fr ? 'Prête à exporter' : 'Ready to export'}</StatusPill>;
        const s = statusOf(INVOICE_STATUS, i.status, lang);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            {i.export_status === 'exported' && <Badge variant="success">{fr ? 'Exportée' : 'Exported'}</Badge>}
            {i.status !== 'draft' && <StatusPill tone={s.tone}>{s.label}</StatusPill>}
            {i.status === 'sent' && i.due_date < today && <span className="text-xs font-medium text-destructive">{fr ? 'échue' : 'overdue'}</span>}
          </span>
        );
      },
    },
    ...(canEdit
      ? ([
          {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            hideOnMobile: true,
            cell: (i) => (
              <span className="flex justify-end gap-1">
                {stageOf(i) === 'review' && (
                  <Button size="sm" variant="secondary" disabled={busy === i.id} onClick={() => void act(i, 'validate')}>
                    <CheckCircle2 />
                    {fr ? 'Valider' : 'Approve'}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" disabled={busy === i.id} aria-label={fr ? `Actions sur ${i.invoice_number}` : `Actions for ${i.invoice_number}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {i.status === 'draft' && i.validated_at && i.export_status !== 'exported' && (
                      <DropdownMenuItem onSelect={() => void act(i, 'unvalidate')}>
                        <Undo2 />
                        {fr ? 'Remettre à contrôler' : 'Back to review'}
                      </DropdownMenuItem>
                    )}
                    {i.status === 'draft' && i.validated_at && (
                      <DropdownMenuItem onSelect={() => void act(i, 'mark_sent')}>
                        <Send />
                        {fr ? 'Suivi : émise par l’outil comptable' : 'Tracking: issued by the accounting tool'}
                      </DropdownMenuItem>
                    )}
                    {(i.status === 'sent' || i.status === 'overdue') && (
                      <DropdownMenuItem onSelect={() => void act(i, 'mark_paid')}>
                        <BadgeEuro />
                        {fr ? 'Suivi : payée' : 'Tracking: paid'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/invoices/${i.id}`}>
                        <Receipt />
                        {fr ? 'Ouvrir la préfacture' : 'Open pre-invoice'}
                      </Link>
                    </DropdownMenuItem>
                    {i.status === 'draft' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => void act(i, 'cancel')}>
                          <Ban />
                          {fr ? 'Annuler la préfacture' : 'Cancel pre-invoice'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            ),
          },
        ] as Column<PrefactureRow>[])
      : []),
  ];

  const selectable = canEdit && stage !== 'done';
  const hints: Record<PrefactureStage, string> = {
    prepare: fr ? `CRA validés des ${PREPARE_WINDOW_MONTHS} derniers mois sans préfacture : jours validés × TJM.` : `Approved timesheets of the last ${PREPARE_WINDOW_MONTHS} months without a pre-invoice: approved days × rate.`,
    review: fr ? 'Préfactures issues des CRA validés : vérifiez les jours, le TJM et le client.' : 'Pre-invoices from approved timesheets: check days, rate and client.',
    ready: fr ? 'Contrôlées : exportez-les vers votre outil comptable, qui émettra la facture.' : 'Approved: export them to your accounting tool, which will issue the invoice.',
    done: fr ? 'Exportées, avec le suivi saisi (émise, payée).' : 'Exported, with recorded tracking (issued, paid).',
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <Segmented<PrefactureStage>
          label={fr ? 'Étape' : 'Step'}
          value={stage}
          onChange={(v) => reset({ stage: v })}
          options={[
            ...(party === 'client' ? [{ value: 'prepare' as const, label: fr ? 'À préparer' : 'To prepare', count: counts.prepare }] : []),
            { value: 'review', label: fr ? 'À contrôler' : 'To review', count: counts.review },
            { value: 'ready', label: fr ? 'Prêtes à exporter' : 'Ready to export', count: counts.ready },
            { value: 'done', label: fr ? 'Exportées' : 'Exported', count: counts.done },
          ]}
        />
        <Segmented<Party>
          label={fr ? 'Type' : 'Type'}
          value={party}
          onChange={(v) => reset({ party: v })}
          options={[
            { value: 'client', label: fr ? 'Ventes' : 'Sales' },
            { value: 'consultant', label: fr ? 'Sous-traitance' : 'Subcontracting' },
          ]}
        />
        {selectable && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="num text-xs text-muted-foreground">
              {selected.size} {fr ? 'sélectionnée(s)' : 'selected'}
            </span>
            {stage === 'prepare' && (
              <Button size="sm" loading={busy === 'bulk'} onClick={() => void prepare(toPrepare.filter((r) => selected.has(r.id)))}>
                <FilePlus2 />
                {fr ? 'Préparer la sélection' : 'Prepare selection'}
              </Button>
            )}
            {stage === 'review' && (
              <Button size="sm" loading={busy === 'bulk'} onClick={() => void validateSelected()}>
                <FileCheck2 />
                {fr ? 'Valider la sélection' : 'Approve selection'}
              </Button>
            )}
            {stage === 'ready' && (
              <Button size="sm" loading={busy === 'export'} onClick={() => void exportSelected()}>
                <Download />
                {fr ? 'Exporter la sélection' : 'Export selection'}
              </Button>
            )}
          </div>
        )}
      </div>
      <p className={cn('mb-2 shrink-0 text-xs text-muted-foreground')}>{hints[stage]}</p>

      {stage === 'prepare' ? (
        <DataTable
          fill
          aria-label={fr ? 'CRA validés à préparer' : 'Approved timesheets to prepare'}
          rows={toPrepare}
          columns={prepareColumns}
          getRowId={(r) => r.id}
          rowHref={(r) => `/timesheets/${r.id}`}
          rowActions={(r) => linkActions(`/timesheets/${r.id}`, fr)}
          tableId="prefacturation-prepare"
          loading={loading && !data}
          selectable={selectable}
          selected={selected}
          onSelectedChange={setSelected}
          initialSort={{ id: 'period', dir: 'desc' }}
          empty={<EmptyState icon={FileCheck2} title={fr ? 'Rien à préparer' : 'Nothing to prepare'} description={fr ? 'Chaque CRA validé a sa préfacture.' : 'Every approved timesheet has its pre-invoice.'} />}
        />
      ) : (
        <DataTable
          fill
          aria-label={fr ? 'Préfactures' : 'Pre-invoices'}
          rows={invoices}
          columns={invoiceColumns}
          getRowId={(i) => i.id}
          rowHref={(i) => `/invoices/${i.id}`}
          rowActions={(i) => linkActions(`/invoices/${i.id}`, fr)}
          tableId="prefactures"
          loading={loading && !data}
          selectable={selectable}
          selected={selected}
          onSelectedChange={setSelected}
          initialSort={{ id: 'period', dir: 'desc' }}
          empty={
            <EmptyState
              icon={Receipt}
              title={fr ? 'Rien à cette étape' : 'Nothing at this step'}
              description={
                stage === 'review'
                  ? fr
                    ? 'Une préfacture est préparée à chaque CRA validé.'
                    : 'A pre-invoice is prepared for each approved timesheet.'
                  : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
