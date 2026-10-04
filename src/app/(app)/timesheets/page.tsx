'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useTimesheetStatusLabels } from '@/lib/i18n/useBadges';
import { monthsShort } from '@/lib/i18n/months';
import {
  ClipboardCheck,
  CheckCircle2,
  Eye,
  Plus,
  Trash2,
  Clock3,
  CalendarDays,
  Percent,
  Receipt,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PageHeader,
  KPICard,
  AppCard,
  EmptyState,
  StatusBadge,
  type StatusTone,
} from '@/components/app';
import { ArchivePurgeNotice } from '@/components/app/ArchivePurgeNotice';
import { TimesheetFormDialog } from '@/components/timesheets/TimesheetFormDialog';
import { timesheetService, invoiceService, type TimesheetListItem } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Timesheet } from '@/types';

const STATUS_LABEL: Record<Timesheet['status'], string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  client_validated: 'Validé',
  rejected: 'Rejeté',
};

function TimesheetsPageInner() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const MONTHS = monthsShort(isEn);
  const tsLabels = useTimesheetStatusLabels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const {
    data: timesheetsData,
    loading,
    reload,
    setData: setTimesheets,
  } = useCachedQuery<TimesheetListItem[]>(
    `timesheets:${activeOrgId ?? 'none'}:${showArchived ? 'arch' : 'live'}`,
    async () => {
      const res = await timesheetService.list(showArchived);
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const allTimesheets = timesheetsData ?? [];

  useRealtimeReload(['timesheets', 'timesheet_days'], () => reload());

  // Drill-down depuis dashboard StatRow : ?status=submitted/draft/client_validated
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStatusFilter = searchParams?.get('status') ?? null;
  const timesheets = urlStatusFilter
    ? allTimesheets.filter((t) => t.status === urlStatusFilter)
    : allTimesheets;
  const hasUrlFilter = !!urlStatusFilter;
  const clearUrlFilter = () => router.push('/timesheets');

  const pagination = usePagination(timesheets.length, {
    storageKey: 'timesheets-page-size',
  });
  const paginatedTimesheets = pagination.paginate(timesheets);

  async function removeTimesheet(ts: Timesheet) {
    const period = `${MONTHS[ts.period_month - 1]} ${ts.period_year}`;
    if (!confirm(`${t.pages.todos.delete_confirm_prefix} ${period} ?`)) {
      return;
    }
    const res = await timesheetService.remove(ts.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setTimesheets((prev) => (prev ?? []).filter((x) => x.id !== ts.id));
    toast.success(`${period}${t.pages.todos.toast_deleted_suffix}`);
  }

  async function archiveTimesheet(ts: Timesheet) {
    const period = `${MONTHS[ts.period_month - 1]} ${ts.period_year}`;
    if (!confirm(t.pages.timesheets.confirm_archive.replace('{period}', period))) return;
    const res = await timesheetService.archive(ts.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    // Le CRA passe dans les archives → on le retire de la liste active affichée.
    setTimesheets((prev) => (prev ?? []).filter((x) => x.id !== ts.id));
    toast.success(t.pages.timesheets.toast_archived);
  }

  async function restoreTimesheet(ts: Timesheet) {
    const res = await timesheetService.unarchive(ts.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setTimesheets((prev) => (prev ?? []).filter((x) => x.id !== ts.id));
    toast.success(t.pages.timesheets.toast_restored);
  }

  async function validate(id: string) {
    if (!activeOrgId) {
      toast.error(t.toasts.error_generic);
      return;
    }
    const res = await timesheetService.validateAndInvoice(id, activeOrgId);
    if (res.error || !res.data) {
      toast.error(t.toasts.error_generic + ': ' + (res.error?.message ?? ''));
      return;
    }
    setTimesheets((prev) =>
      (prev ?? []).map((ts) =>
        ts.id === id
          ? { ...ts, status: 'client_validated', days_validated: ts.days_worked }
          : ts,
      ),
    );
    if (res.data.alreadyInvoiced) {
      toast.success(t.forms.timesheet.validated);
    } else {
      toast.success(t.forms.timesheet.validated + ` — ${res.data.invoice.invoice_number}`);
    }
  }

  // Pendant de la facture client : génère la facture de SOUS-TRAITANCE du
  // consultant (jours validés × TJM achat), visible dans son espace perso.
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  async function generateConsultantInvoice(ts: Timesheet) {
    setGeneratingId(ts.id);
    try {
      const res = await invoiceService.generateConsultantInvoice(ts.id);
      if (res.error || !res.data) {
        toast.error(t.toasts.error_generic + ': ' + (res.error?.message ?? ''));
        return;
      }
      if (res.data.alreadyExists) {
        toast.info(
          `${t.pages.timesheets.consultant_invoice_exists} — ${res.data.invoice.invoice_number}`,
        );
      } else {
        toast.success(
          `${t.pages.timesheets.consultant_invoice_done} — ${res.data.invoice.invoice_number}`,
        );
      }
    } finally {
      setGeneratingId(null);
    }
  }

  // KPIs CRA — basés sur le mois en cours
  const now = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();
  const thisMonth = timesheets.filter(
    (t) => t.period_month === currMonth && t.period_year === currYear,
  );
  const validatedThisMonth = thisMonth.filter((t) => t.status === 'client_validated').length;
  const pendingCount = timesheets.filter(
    (t) => t.status === 'submitted' || t.status === 'draft',
  ).length;
  const totalDaysWorked = timesheets.reduce((s, t) => s + (t.days_worked ?? 0), 0);
  const totalDaysValidated = timesheets.reduce((s, t) => s + (t.days_validated ?? 0), 0);
  const billableRatio =
    totalDaysWorked > 0 ? Math.round((totalDaysValidated / totalDaysWorked) * 100) : 0;

  // Mapping statut métier → tone unifié
  const statusToTone = (s: Timesheet['status']): StatusTone => {
    if (s === 'client_validated') return 'success';
    if (s === 'submitted') return 'warning';
    if (s === 'rejected') return 'danger';
    return 'pending';
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.timesheets.eyebrow}
        title={
          showArchived ? (
            <>
              {t.pages.timesheets.archived_title_a}{' '}
              <span className="text-primary font-display ">
                {t.pages.timesheets.archived_title_b}
              </span>
            </>
          ) : (
            <>
              {t.pages.timesheets.title_a}{' '}
              <span className="text-primary font-display ">{t.pages.timesheets.title_b}</span>
            </>
          )
        }
        description={t.pages.timesheets.description}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? t.pages.timesheets.see_active : t.pages.timesheets.see_archived}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  {t.pages.timesheets.see_active}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {t.pages.timesheets.see_archived}
                </>
              )}
            </Button>
            {!showArchived && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t.pages.timesheets.new}
              </Button>
            )}
          </div>
        }
      />

      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={CheckCircle2}
          label={t.pages.timesheets.kpi_validated_month}
          value={validatedThisMonth}
          tone="emerald"
        />
        <KPICard
          icon={Clock3}
          label={t.pages.timesheets.kpi_pending}
          value={pendingCount}
          tone="amber"
        />
        <KPICard
          icon={CalendarDays}
          label={t.pages.timesheets.kpi_days_entered}
          value={totalDaysWorked}
          tone="magenta"
          hint={t.pages.timesheets.kpi_validated_count.replace('{n}', String(totalDaysValidated))}
        />
        <KPICard
          icon={Percent}
          label={t.pages.timesheets.kpi_billable_ratio}
          value={billableRatio}
          suffix="%"
          tone="violet"
        />
      </Reveal>

      <TimesheetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        onSaved={() => reload()}
      />

      {/* Bandeau filtre URL (drill-down depuis dashboard "CRA à valider") */}
      {hasUrlFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-2.5">
          <div className="text-sm">
            <span className="font-medium">
              {urlStatusFilter && (tsLabels[urlStatusFilter as keyof typeof tsLabels] ?? urlStatusFilter)}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">({timesheets.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearUrlFilter} className="h-7">
            {t.actions.remove_filter}
          </Button>
        </div>
      )}

      {showArchived && <ArchivePurgeNotice message={t.pages.timesheets.purge_notice} />}

      {!loading && timesheets.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={showArchived ? t.pages.timesheets.empty_archived_title : t.pages.timesheets.empty_title}
          description={
            showArchived
              ? t.pages.timesheets.empty_archived_description
              : t.pages.timesheets.empty_description
          }
          action={
            showArchived ? (
              <Button variant="outline" onClick={() => setShowArchived(false)}>
                <ArchiveRestore className="h-4 w-4" />
                {t.pages.timesheets.see_active}
              </Button>
            ) : hasUrlFilter ? (
              <Button variant="outline" onClick={clearUrlFilter}>
                {t.actions.remove_filter}
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)} disabled={!activeOrgId}>
                <Plus className="h-4 w-4" />
                {t.pages.timesheets.new}
              </Button>
            )
          }
        />
      ) : (
      <Reveal delay={0.08}>
      <AppCard>
        <div className="overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.forms.invoice.consultant}</TableHead>
                <TableHead>{t.forms.timesheet.period}</TableHead>
                <TableHead>{t.forms.timesheet.days_worked}</TableHead>
                <TableHead>{t.forms.timesheet.days_validated}</TableHead>
                <TableHead>{t.forms.timesheet.status}</TableHead>
                <TableHead className="text-right">{t.pages.consultants.table_actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div
                        className="h-10 surface-1 animate-pulse rounded-lg"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                paginatedTimesheets.map((ts, rowIdx) => (
                  <motion.tr
                    key={ts.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(rowIdx, 10) * 0.03,
                      ease: 'easeOut',
                    }}
                    className="group border-b border-hairline transition-colors hover-surface"
                  >
                    <TableCell>
                      {ts.consultant ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-qc-gradient ring-1 ring-foreground/10 flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                            {(ts.consultant.first_name?.[0] ?? '?').toUpperCase()}
                            {(ts.consultant.last_name?.[0] ?? '').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {ts.consultant.first_name} {ts.consultant.last_name}
                            </div>
                            {ts.mission?.title && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {ts.mission.title}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {MONTHS[ts.period_month - 1]} {ts.period_year}
                    </TableCell>
                    <TableCell>{ts.days_worked}</TableCell>
                    <TableCell>{ts.days_validated}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusToTone(ts.status)}>
                        {tsLabels[ts.status as keyof typeof tsLabels] ?? STATUS_LABEL[ts.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/timesheets/${ts.id}`}>
                            <Eye className="h-3 w-3" />
                            {t.pages.alerts.view}
                          </Link>
                        </Button>
                        {!showArchived && ts.status !== 'client_validated' && (
                          <Button size="sm" variant="ghost" onClick={() => validate(ts.id)}>
                            <CheckCircle2 className="h-3 w-3" />
                            {t.actions.confirm}
                          </Button>
                        )}
                        {!showArchived && ts.status === 'client_validated' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateConsultantInvoice(ts)}
                            disabled={generatingId === ts.id}
                            title={t.pages.timesheets.consultant_invoice}
                          >
                            <Receipt className="h-3 w-3" />
                            {t.pages.timesheets.consultant_invoice}
                          </Button>
                        )}
                        {showArchived ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => restoreTimesheet(ts)}
                            title={t.pages.timesheets.action_restore}
                          >
                            <ArchiveRestore className="h-3 w-3" />
                            {t.pages.timesheets.action_restore}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => archiveTimesheet(ts)}
                            title={t.pages.timesheets.action_archive}
                            className="text-muted-foreground"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimesheet(ts)}
                          title={t.actions.delete}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      </Reveal>
      )}

      {timesheets.length > 0 && (
        <PaginationFooter
          pagination={pagination}
          total={timesheets.length}
          itemLabel={isEn ? 'timesheet' : 'CRA'}
          itemLabelPlural={isEn ? 'timesheets' : 'CRA'}
        />
      )}
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

export default function TimesheetsPage() {
  return (
    <Suspense fallback={null}>
      <TimesheetsPageInner />
    </Suspense>
  );
}
