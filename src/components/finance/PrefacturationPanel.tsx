'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileCheck2, MoreHorizontal, Receipt, Undo2, Ban, BadgeEuro, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/app/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useOrganization } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { INVOICE_STATUS, statusOf } from '@/lib/status';
import { formatDate, formatEur } from '@/lib/format';
import type { Invoice } from '@/types';

type Row = Invoice & {
  validated_at?: string | null;
  export_status?: string;
  exported_at?: string | null;
  companies: { name: string } | null;
  consultants: { first_name: string; last_name: string } | null;
  missions: { title: string } | null;
};

type Stage = 'review' | 'ready' | 'issued' | 'closed';

const STEPS: Array<{ id: Stage; fr: string; en: string; hint: { fr: string; en: string } }> = [
  { id: 'review', fr: 'À contrôler', en: 'To review', hint: { fr: 'Préfactures issues des CRA validés', en: 'Pre-invoices from approved timesheets' } },
  { id: 'ready', fr: 'Validées', en: 'Approved', hint: { fr: 'Prêtes à exporter vers votre outil', en: 'Ready to export to your tool' } },
  { id: 'issued', fr: 'Émises', en: 'Issued', hint: { fr: 'En attente de paiement', en: 'Awaiting payment' } },
  { id: 'closed', fr: 'Payées et annulées', en: 'Paid and cancelled', hint: { fr: 'Historique', en: 'History' } },
];

function stageOfInvoice(i: Row): Stage {
  if (i.status === 'paid' || i.status === 'cancelled') return 'closed';
  if (i.status === 'sent' || i.status === 'overdue') return 'issued';
  return i.validated_at ? 'ready' : 'review';
}

export function PrefacturationPanel({ lang, canEdit }: { lang: 'fr' | 'en'; canEdit: boolean }) {
  const fr = lang === 'fr';
  const { activeOrgId } = useOrganization();
  const [stage, setStage] = useState<Stage>('review');
  const [party, setParty] = useState<'client' | 'consultant'>('client');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, reload } = useCachedQuery<Row[]>(
    `prefactures:${activeOrgId ?? 'none'}`,
    async () => {
      const { data: rows } = await createClient()
        .from('invoices')
        .select('*, companies(name), consultants(first_name, last_name), missions(title)')
        .eq('organization_id', activeOrgId!)
        .eq('archived', false)
        .order('issue_date', { ascending: false })
        .limit(3000);
      return (rows ?? []) as unknown as Row[];
    },
    { enabled: !!activeOrgId },
  );

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { review: 0, ready: 0, issued: 0, closed: 0 };
    for (const i of data ?? []) if (i.party === party) c[stageOfInvoice(i)]++;
    return c;
  }, [data, party]);

  const rows = useMemo(() => (data ?? []).filter((i) => i.party === party && stageOfInvoice(i) === stage), [data, party, stage]);
  const today = new Date().toISOString().slice(0, 10);

  async function act(i: Row, action: string, success: string) {
    setBusy(i.id);
    const res = await fetch(`/api/finance/prefactures/${i.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.message ?? json.error ?? (fr ? 'Action impossible' : 'Action failed'));
      return;
    }
    toast.success(success);
    void reload();
  }

  async function validateSelected() {
    const ids = [...selected];
    setBusy('bulk');
    let ok = 0;
    for (const id of ids) {
      const res = await fetch(`/api/finance/prefactures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });
      if (res.ok) ok++;
    }
    setBusy(null);
    setSelected(new Set());
    toast.success(fr ? `${ok} préfacture(s) validée(s)` : `${ok} pre-invoice(s) approved`);
    void reload();
  }

  async function exportSelected() {
    const ids = [...selected];
    setBusy('export');
    const res = await fetch('/api/finance/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.message ?? (fr ? 'Export impossible' : 'Export failed'));
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `prefactures-${today}.csv`;
    a.click();
    URL.revokeObjectURL(href);
    setSelected(new Set());
    toast.success(fr ? 'Export généré · préfactures marquées comme exportées' : 'Export generated · pre-invoices marked as exported');
    void reload();
  }

  const columns: Column<Row>[] = [
    {
      id: 'number',
      header: fr ? 'N°' : 'No.',
      mobile: 'title',
      sortValue: (i) => i.invoice_number,
      cell: (i) => <span className="num font-medium text-foreground">{i.invoice_number}</span>,
    },
    {
      id: 'party',
      header: party === 'client' ? (fr ? 'Client' : 'Client') : fr ? 'Consultant' : 'Consultant',
      mobile: 'subtitle',
      sortValue: (i) => (party === 'client' ? (i.companies?.name ?? '') : `${i.consultants?.last_name ?? ''}`),
      cell: (i) => (
        <span className="min-w-0">
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
      cell: (i) => <span className="text-[13px] text-muted-foreground">{i.period_label ?? formatDate(i.issue_date, lang, 'short')}</span>,
    },
    {
      id: 'amount',
      header: fr ? 'Montant HT' : 'Amount (excl. VAT)',
      align: 'right',
      mobile: 'meta',
      sortValue: (i) => Number(i.amount_ht),
      cell: (i) => <span className="num">{formatEur(Number(i.amount_ht), lang, 2)}</span>,
    },
    {
      id: 'due',
      header: fr ? 'Échéance' : 'Due',
      mobile: 'meta',
      sortValue: (i) => i.due_date,
      cell: (i) => (
        <span className={i.status === 'sent' && i.due_date < today ? 'text-[13px] font-medium text-destructive' : 'text-[13px] text-muted-foreground'}>
          {formatDate(i.due_date, lang, 'short')}
        </span>
      ),
    },
    {
      id: 'status',
      header: fr ? 'Statut' : 'Status',
      mobile: 'trailing',
      cell: (i) => {
        const s = statusOf(INVOICE_STATUS, i.status, lang);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            {i.status === 'draft' && i.validated_at ? <StatusPill tone="brand">{fr ? 'Validée' : 'Approved'}</StatusPill> : <StatusPill tone={s.tone}>{s.label}</StatusPill>}
            {i.export_status === 'exported' && <Badge variant="success">{fr ? 'Exportée' : 'Exported'}</Badge>}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={busy === i.id} aria-label={fr ? `Actions sur ${i.invoice_number}` : `Actions for ${i.invoice_number}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {i.status === 'draft' && !i.validated_at && (
                    <DropdownMenuItem onSelect={() => void act(i, 'validate', fr ? 'Préfacture validée' : 'Pre-invoice approved')}>
                      <CheckCircle2 />
                      {fr ? 'Valider' : 'Approve'}
                    </DropdownMenuItem>
                  )}
                  {i.status === 'draft' && i.validated_at && (
                    <>
                      <DropdownMenuItem onSelect={() => void act(i, 'mark_sent', fr ? 'Marquée comme émise' : 'Marked as issued')}>
                        <Send />
                        {fr ? 'Marquer comme émise' : 'Mark as issued'}
                      </DropdownMenuItem>
                      {i.export_status !== 'exported' && (
                        <DropdownMenuItem onSelect={() => void act(i, 'unvalidate', fr ? 'Remise en contrôle' : 'Back to review')}>
                          <Undo2 />
                          {fr ? 'Remettre en contrôle' : 'Back to review'}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {(i.status === 'sent' || i.status === 'overdue') && (
                    <DropdownMenuItem onSelect={() => void act(i, 'mark_paid', fr ? 'Paiement enregistré' : 'Payment recorded')}>
                      <BadgeEuro />
                      {fr ? 'Marquer comme payée' : 'Mark as paid'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={`/invoices/${i.id}`}>
                      <Receipt />
                      {fr ? 'Ouvrir le document' : 'Open document'}
                    </Link>
                  </DropdownMenuItem>
                  {i.status === 'draft' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => void act(i, 'cancel', fr ? 'Préfacture annulée' : 'Pre-invoice cancelled')}>
                        <Ban />
                        {fr ? 'Annuler' : 'Cancel'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ] as Column<Row>[])
      : []),
  ];

  const selectable = canEdit && (stage === 'review' || stage === 'ready');

  return (
    <div>
      <ol className="mb-4 grid gap-2 sm:grid-cols-4" aria-label={fr ? 'Étapes de la préfacturation' : 'Pre-invoicing steps'}>
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                setStage(s.id);
                setSelected(new Set());
              }}
              aria-pressed={stage === s.id}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-sand-300 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary"
            >
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  {s[lang]} <span className="num text-xs text-muted-foreground">{counts[s.id]}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{s.hint[lang]}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={party} onValueChange={(v) => { setParty(v as 'client' | 'consultant'); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="client">{fr ? 'Ventes (clients)' : 'Sales (clients)'}</TabsTrigger>
            <TabsTrigger value="consultant">{fr ? 'Achats (sous-traitance)' : 'Purchases (subcontracting)'}</TabsTrigger>
          </TabsList>
        </Tabs>
        {selectable && selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="num text-xs text-muted-foreground">
              {selected.size} {fr ? 'sélectionnée(s)' : 'selected'}
            </span>
            {stage === 'review' ? (
              <Button size="sm" loading={busy === 'bulk'} onClick={() => void validateSelected()}>
                <FileCheck2 />
                {fr ? 'Valider la sélection' : 'Approve selection'}
              </Button>
            ) : (
              <Button size="sm" loading={busy === 'export'} onClick={() => void exportSelected()}>
                <Download />
                {fr ? 'Exporter (CSV)' : 'Export (CSV)'}
              </Button>
            )}
          </div>
        )}
      </div>

      <DataTable
        aria-label={fr ? 'Préfactures' : 'Pre-invoices'}
        rows={rows}
        columns={columns}
        getRowId={(i) => i.id}
        rowHref={(i) => `/invoices/${i.id}`}
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
                  ? 'Une préfacture est préparée automatiquement à chaque CRA validé.'
                  : 'A pre-invoice is prepared automatically for each approved timesheet.'
                : undefined
            }
          />
        }
      />
    </div>
  );
}
