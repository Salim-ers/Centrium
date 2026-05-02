'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, CheckCircle2, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimesheetFormDialog } from '@/components/timesheets/TimesheetFormDialog';
import { timesheetService } from '@/lib/services';
import { useOrganization } from '@/lib/auth/context';
import { useCachedQuery } from '@/hooks/useCachedQuery';
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

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-violet-glow" />
            Comptes rendus d'activité (CRA)
          </h1>
          <p className="text-muted-foreground mt-1">Validation et suivi mensuel</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouveau CRA
        </Button>
      </div>

      <TimesheetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={activeOrgId ?? ''}
        onSaved={() => reload()}
      />

      <Card>
        <CardContent className="p-0">
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
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : timesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Aucun CRA
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {MONTHS[t.period_month - 1]} {t.period_year}
                    </TableCell>
                    <TableCell>{t.days_worked}</TableCell>
                    <TableCell>{t.days_validated}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.status}</Badge>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
