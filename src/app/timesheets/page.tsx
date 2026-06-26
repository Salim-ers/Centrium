'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle2,
  Eye,
  Plus,
  Trash2,
  Clock3,
  CalendarDays,
  Percent,
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
import { TimesheetFormDialog } from '@/components/timesheets/TimesheetFormDialog';
import { timesheetService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { usePagination } from '@/hooks/usePagination';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import type { Timesheet } from '@/types';

const MONTHS = [
  'Janv',
  'Févr',
  'Mars',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sept',
  'Oct',
  'Nov',
  'Déc',
];

const STATUS_LABEL: Record<Timesheet['status'], string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  client_validated: 'Validé',
  rejected: 'Rejeté',
};

export default function TimesheetsPage() {
  const { activeOrgId } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data: timesheetsData,
    loading,
    reload,
    setData: setTimesheets,
  } = useCachedQuery<Timesheet[]>(
    `timesheets:${activeOrgId ?? 'none'}`,
    async () => {
      const res = await timesheetService.list();
      return res.data ?? [];
    },
    { enabled: !!activeOrgId },
  );
  const timesheets = timesheetsData ?? [];

  useRealtimeReload(['timesheets', 'timesheet_days'], () => reload());

  const pagination = usePagination(timesheets.length, {
    storageKey: 'timesheets-page-size',
  });
  const paginatedTimesheets = pagination.paginate(timesheets);

  async function removeTimesheet(t: Timesheet) {
    const period = `${MONTHS[t.period_month - 1]} ${t.period_year}`;
    if (
      !confirm(
        `Supprimer le CRA de ${period} ?\n\nIrréversible. Échouera si une facture y est rattachée — supprime d'abord la facture liée.`,
      )
    ) {
      return;
    }
    const res = await timesheetService.remove(t.id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setTimesheets((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    toast.success(`CRA de ${period} supprimé`);
  }

  async function validate(id: string) {
    if (!activeOrgId) {
      toast.error('Organisation active manquante');
      return;
    }
    const res = await timesheetService.validateAndInvoice(id, activeOrgId);
    if (res.error || !res.data) {
      toast.error('Erreur : ' + (res.error?.message ?? 'inconnue'));
      return;
    }
    setTimesheets((prev) =>
      (prev ?? []).map((t) =>
        t.id === id
          ? { ...t, status: 'client_validated', days_validated: t.days_worked }
          : t,
      ),
    );
    if (res.data.alreadyInvoiced) {
      toast.success('CRA validé (facture déjà existante)');
    } else {
      toast.success(`CRA validé → facture ${res.data.invoice.invoice_number} générée et marquée payée`);
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
        eyebrow="Facturation"
        title={
          <>
            Comptes-rendus <span className="qc-italic-accent font-editorial italic">d'activité.</span>
          </>
        }
        description="Validation et suivi mensuel des CRA — générez les factures en un clic."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau CRA
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={CheckCircle2}
          label="Validés ce mois"
          value={validatedThisMonth}
          tone="emerald"
        />
        <KPICard
          icon={Clock3}
          label="En attente"
          value={pendingCount}
          tone="amber"
        />
        <KPICard
          icon={CalendarDays}
          label="Jours saisis"
          value={totalDaysWorked}
          tone="magenta"
          hint={`${totalDaysValidated} validé${totalDaysValidated > 1 ? 's' : ''}`}
        />
        <KPICard
          icon={Percent}
          label="Ratio facturable"
          value={billableRatio}
          suffix="%"
          tone="violet"
        />
      </div>

      <TimesheetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        onSaved={() => reload()}
      />

      {!loading && timesheets.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucun CRA"
          description="Crée ton premier compte-rendu d'activité pour démarrer la facturation."
          action={
            <Button onClick={() => setDialogOpen(true)} disabled={!activeOrgId}>
              <Plus className="h-4 w-4" />
              Nouveau CRA
            </Button>
          }
        />
      ) : (
      <AppCard>
        <div className="overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Jours travaillés</TableHead>
                <TableHead>Jours validés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="h-10 bg-foreground/[0.04] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTimesheets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {MONTHS[t.period_month - 1]} {t.period_year}
                    </TableCell>
                    <TableCell>{t.days_worked}</TableCell>
                    <TableCell>{t.days_validated}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusToTone(t.status)}>
                        {STATUS_LABEL[t.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/timesheets/${t.id}`}>
                            <Eye className="h-3 w-3" />
                            Voir
                          </Link>
                        </Button>
                        {t.status !== 'client_validated' && (
                          <Button size="sm" variant="ghost" onClick={() => validate(t.id)}>
                            <CheckCircle2 className="h-3 w-3" />
                            Valider
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimesheet(t)}
                          title="Supprimer le CRA"
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AppCard>
      )}

      {timesheets.length > 0 && (
        <PaginationFooter
          pagination={pagination}
          total={timesheets.length}
          itemLabel="CRA"
          itemLabelPlural="CRA"
        />
      )}
    </AppShell>
  );
}
