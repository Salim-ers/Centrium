'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Plus, Eye, AlertTriangle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types';

const MONTHS = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

const STATUS: Record<
  Timesheet['status'],
  { label: string; className: string; highlight?: boolean }
> = {
  draft: { label: 'Brouillon', className: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  submitted: {
    label: 'En attente',
    className: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  client_validated: {
    label: 'Validé',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejeté',
    className: 'bg-red-500/10 text-red-300 border-red-500/20',
    highlight: true,
  },
};

export default function PortalCraListPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('timesheets')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      setTimesheets((data ?? []) as Timesheet[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-violet-glow" />
            Mes CRA
          </h1>
          <p className="text-muted-foreground mt-1">
            Déclare ton activité mensuelle et suis l&apos;avancement.
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/cra/new">
            <Plus className="h-4 w-4" />
            Nouveau CRA
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Jours travaillés</TableHead>
                <TableHead>Jours validés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                    Aucun CRA. Clique « Nouveau CRA » pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                timesheets.map((t) => {
                  const s = STATUS[t.status];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {MONTHS[t.period_month - 1]} {t.period_year}
                      </TableCell>
                      <TableCell>{t.days_worked}</TableCell>
                      <TableCell>{t.days_validated}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${s.className} flex items-center gap-1 w-fit`}>
                          {s.highlight && <AlertTriangle className="h-3 w-3" />}
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/portal/cra/${t.id}`}>
                            <Eye className="h-3 w-3" />
                            Ouvrir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
