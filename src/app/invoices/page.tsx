'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppT } from '@/lib/i18n/LocaleProvider';
import { useInvoiceStatusLabels } from '@/lib/i18n/useBadges';
import {
  Plus,
  Receipt,
  CheckCircle2,
  Send,
  Eye,
  Undo2,
  Archive,
  ArchiveRestore,
  Trash2,
  Banknote,
  Clock3,
  AlertTriangle,
  FileText,
  Building2,
  UserRound,
  HandCoins,
} from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
  StatusBadge,
  type StatusTone,
} from '@/components/app';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InvoiceFormDialog } from '@/components/invoices/InvoiceFormDialog';

import { invoiceService, type InvoiceListItem } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import { INVOICE_STATUS_LABEL } from '@/constants';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';

type PartyView = 'client' | 'consultant';

function InvoicesPageInner() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { format: formatCurrency } = useCurrency();
  const invoiceLabels = useInvoiceStatusLabels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // Segment Clients (ventes, à encaisser) / Consultants (sous-traitance, à payer).
  const [partyView, setPartyView] = useState<PartyView>('client');

  const {
    data: invoicesData,
    loading,
    reload,
  } = useCachedQuery<InvoiceListItem[]>(
    `invoices:${activeOrgId ?? 'none'}:${showArchived ? 'all' : 'active'}`,
    async () => {
      const res = await invoiceService.listWithConsultant({
        includeArchived: showArchived,
      });
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const allInvoices = invoicesData ?? [];

  // Auto-sync : un collègue qui crée/édite/paie une facture est visible
  // sans F5. invoice_items est inclus car les totaux peuvent changer.
  useRealtimeReload(['invoices', 'invoice_items'], () => reload());

  // Drill-down depuis dashboard : ?status=sent|overdue|paid → filtre la liste
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStatusFilter = searchParams?.get('status') ?? null;
  const statusFiltered = urlStatusFilter
    ? allInvoices.filter((i) => i.status === urlStatusFilter)
    : allInvoices;
  const hasUrlFilter = !!urlStatusFilter;
  const clearUrlFilter = () => router.push('/invoices');

  // Comptes par segment (sur la liste filtrée statut, pour rester cohérent
  // avec ce que chaque onglet affichera).
  const clientCount = statusFiltered.filter((i) => (i.party ?? 'client') === 'client').length;
  const consultantCount = statusFiltered.length - clientCount;
  const invoices = statusFiltered.filter((i) => (i.party ?? 'client') === partyView);
  const isConsultantView = partyView === 'consultant';

  const pagination = usePagination(invoices.length, {
    storageKey: 'invoices-page-size',
  });
  const paginatedInvoices = pagination.paginate(invoices);

  async function markPaid(id: string) {
    const res = await invoiceService.markAsPaid(id);
    if (res.error) return toast.error(t.toasts.error_generic + ': ' + res.error.message);
    toast.success(t.forms.invoice.marked_paid);
    reload();
  }

  async function markSent(id: string) {
    const res = await invoiceService.markAsSent(id);
    if (res.error) return toast.error(t.toasts.error_generic + ': ' + res.error.message);
    toast.success(t.forms.invoice.marked_sent);
    reload();
  }

  async function markUnpaid(id: string) {
    if (!confirm(t.toasts.confirm_archive)) return;
    const res = await invoiceService.markAsUnpaid(id);
    if (res.error) return toast.error(t.toasts.error_generic + ': ' + res.error.message);
    toast.success(t.toasts.saved);
    reload();
  }

  async function archive(inv: InvoiceListItem) {
    if (!confirm(`${t.toasts.confirm_archive} ${inv.invoice_number} ?`)) return;
    const res = await invoiceService.archive(inv.id);
    if (res.error) return toast.error(t.toasts.error_generic + ': ' + res.error.message);
    toast.success(t.toasts.archived);
    reload();
  }

  async function unarchive(inv: InvoiceListItem) {
    const res = await invoiceService.unarchive(inv.id);
    if (res.error) return toast.error(t.toasts.error_generic + ': ' + res.error.message);
    toast.success(t.toasts.restored);
    reload();
  }

  async function remove(inv: InvoiceListItem) {
    if (!confirm(`${t.toasts.confirm_delete} ${inv.invoice_number}`)) return;
    const res = await invoiceService.remove(inv.id);
    if (res.error) return toast.error(res.error.message);
    toast.success(`${t.forms.invoice.deleted} — ${inv.invoice_number}`);
    reload();
  }

  // Defensive : amount_ht peut être null/string sur données legacy → NaN
  // qui pollue les sommes. safeAmount garantit un number fini.
  const safeAmount = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);
  const totalPending = invoices
    .filter((i) => ['sent', 'overdue'].includes(i.status))
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);

  // KPIs : émis ce mois / encaissé / en attente / en retard
  const now = new Date();
  const currMonth = now.getMonth();
  const currYear = now.getFullYear();
  const issuedThisMonth = invoices
    .filter((i) => {
      if (!i.issue_date) return false;
      const d = new Date(i.issue_date);
      return d.getMonth() === currMonth && d.getFullYear() === currYear;
    })
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);
  const overdueAmount = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + safeAmount(i.amount_ht), 0);

  // Mapping statut métier → tone unifié
  const statusToTone = (s: InvoiceListItem['status']): StatusTone => {
    if (s === 'paid') return 'success';
    if (s === 'sent') return 'info';
    if (s === 'overdue') return 'danger';
    if (s === 'cancelled') return 'neutral';
    return 'pending';
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.invoices.eyebrow}
        title={
          <>
            {t.pages.invoices.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.invoices.title_b}</span>
          </>
        }
        description={t.pages.invoices.description}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? t.pages.invoices.see_active : t.pages.invoices.see_archived}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  {t.pages.invoices.see_active}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {t.pages.invoices.see_archived}
                </>
              )}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.pages.invoices.new}
            </Button>
          </>
        }
      />

      {/* ===== Segments Clients / Consultants — deux flux d'argent opposés ===== */}
      <Reveal className="mb-6">
        <div className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-foreground/[0.03] p-1">
          {(
            [
              {
                value: 'client' as PartyView,
                icon: Building2,
                label: t.pages.invoices.tab_clients,
                count: clientCount,
              },
              {
                value: 'consultant' as PartyView,
                icon: UserRound,
                label: t.pages.invoices.tab_consultants,
                count: consultantCount,
              },
            ] as const
          ).map((seg) => {
            const active = partyView === seg.value;
            const Icon = seg.icon;
            return (
              <button
                key={seg.value}
                type="button"
                onClick={() => setPartyView(seg.value)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-hairline'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {seg.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    active ? 'bg-violet-glow/15 text-violet-glow' : 'bg-foreground/[0.06] text-muted-foreground'
                  }`}
                >
                  {seg.count}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={FileText}
          label={t.pages.invoices.kpi_issued}
          valueText={formatCurrency(issuedThisMonth)}
          tone="magenta"
        />
        <KPICard
          icon={isConsultantView ? HandCoins : Banknote}
          label={isConsultantView ? t.pages.invoices.kpi_paid_out : t.pages.invoices.kpi_paid}
          valueText={formatCurrency(totalPaid)}
          tone="emerald"
        />
        <KPICard
          icon={Clock3}
          label={isConsultantView ? t.pages.invoices.kpi_to_pay : t.pages.invoices.kpi_pending}
          valueText={formatCurrency(totalPending)}
          tone="amber"
        />
        <KPICard
          icon={AlertTriangle}
          label={t.pages.invoices.kpi_overdue}
          valueText={formatCurrency(overdueAmount)}
          tone="rose"
        />
      </Reveal>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        defaultParty={partyView}
        onSaved={() => reload()}
      />

      {/* Bandeau filtre URL (drill-down depuis dashboard StatRow) */}
      {hasUrlFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-violet-glow/30 bg-violet-glow/[0.06] px-4 py-2.5">
          <div className="text-sm">
            <span className="font-medium">
              {urlStatusFilter && (invoiceLabels[urlStatusFilter as keyof typeof invoiceLabels] ?? urlStatusFilter)}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">({invoices.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearUrlFilter} className="h-7">
            {t.actions.remove_filter}
          </Button>
        </div>
      )}

      {!loading && invoices.length === 0 ? (
        <EmptyState
          icon={isConsultantView ? UserRound : Receipt}
          title={
            showArchived
              ? t.pages.invoices.empty_title_archived
              : isConsultantView
                ? t.pages.invoices.empty_title_consultant
                : t.pages.invoices.empty_title
          }
          description={
            isConsultantView
              ? t.pages.invoices.empty_description_consultant
              : t.pages.invoices.empty_description
          }
          action={
            hasUrlFilter ? (
              <Button variant="outline" onClick={clearUrlFilter}>
                {t.actions.remove_filter}
              </Button>
            ) : !showArchived ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t.pages.invoices.new}
              </Button>
            ) : undefined
          }
        />
      ) : (
      <Reveal delay={0.08}>
      <AppCard>
        <div className="overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.forms.invoice.invoice_number}</TableHead>
                <TableHead>
                  {isConsultantView ? t.forms.invoice.consultant : t.forms.contract.client}
                </TableHead>
                <TableHead>{t.forms.timesheet.period}</TableHead>
                <TableHead>{t.forms.invoice.issue_date}</TableHead>
                <TableHead>{t.forms.invoice.due_date}</TableHead>
                <TableHead>{t.forms.invoice.amount_ht}</TableHead>
                <TableHead>TTC</TableHead>
                <TableHead>{t.forms.contract.status}</TableHead>
                <TableHead className="text-right">{t.pages.consultants.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <div
                        className="h-10 surface-1 animate-pulse rounded-lg"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                paginatedInvoices.map((inv, rowIdx) => {
                  // Le consultant peut venir d'une mission liée OU d'un
                  // lien direct sur la facture (cas des factures manuelles).
                  const c = inv.consultant ?? inv.mission?.consultant ?? null;
                  const consultantName = c
                    ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'
                    : '—';
                  const consultantCompany = inv.consultant?.company_name ?? null;
                  return (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(rowIdx, 10) * 0.03,
                        ease: 'easeOut',
                      }}
                      className="group border-b border-hairline transition-colors hover-surface"
                    >
                      <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        {isConsultantView ? (
                          <div className="flex items-center gap-2">
                            {c ? (
                              <div className="h-6 w-6 rounded-full bg-qc-gradient ring-1 ring-foreground/10 flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                                {(c.first_name?.[0] ?? '?').toUpperCase()}
                                {(c.last_name?.[0] ?? '').toUpperCase()}
                              </div>
                            ) : null}
                            <div className="min-w-0">
                              <div className="text-sm truncate">{consultantName}</div>
                              {consultantCompany && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {consultantCompany}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-lg bg-foreground/[0.05] ring-1 ring-foreground/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm truncate">{inv.company?.name ?? '—'}</div>
                              {c && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {consultantName}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{inv.period_label ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.due_date)}</TableCell>
                      <TableCell>{formatCurrency(Number(inv.amount_ht))}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(inv.amount_ttc))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusToTone(inv.status)}>
                          {invoiceLabels[inv.status as keyof typeof invoiceLabels] ?? INVOICE_STATUS_LABEL[inv.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/invoices/${inv.id}`}>
                              <Eye className="h-3 w-3" />
                              {t.pages.alerts.view}
                            </Link>
                          </Button>
                          {inv.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => markSent(inv.id)}>
                              <Send className="h-3 w-3" />
                              {t.badges.invoice_status.sent}
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Button
                              size="sm"
                              onClick={() => markPaid(inv.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {t.badges.invoice_status.paid}
                            </Button>
                          )}
                          {inv.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markUnpaid(inv.id)}
                              title={t.actions.cancel}
                            >
                              <Undo2 className="h-3 w-3" />
                              {t.actions.cancel}
                            </Button>
                          )}
                          {inv.archived ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unarchive(inv)}
                              title={t.actions.unarchive}
                            >
                              <ArchiveRestore className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => archive(inv)}
                              title={t.actions.archive}
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          {inv.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => remove(inv)}
                              title={t.actions.delete}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      </Reveal>
      )}

      <PaginationFooter
        pagination={pagination}
        total={invoices.length}
        itemLabel="facture"
      />
    </AppShell>
  );
}

/** Entrée en cascade des sections de la page (fondu + translation). */
function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesPageInner />
    </Suspense>
  );
}
