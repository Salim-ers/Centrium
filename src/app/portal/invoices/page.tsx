'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, CheckCircle2, Eye } from 'lucide-react';

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
import { useBrandName } from '@/components/brand/BrandingStyles';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

export default function PortalInvoicesPage() {
  const brandName = useBrandName();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // Les RLS garantissent qu'on ne voit que les factures 'paid' liées
      // aux missions du consultant courant.
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('payment_date', { ascending: false });
      setInvoices((data ?? []) as Invoice[]);
      setLoading(false);
    })();
  }, []);

  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_ht), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Receipt className="h-7 w-7 text-violet-glow" />
          Mes factures
        </h1>
        <p className="text-muted-foreground mt-1">
          Factures payées · Total encaissé :{' '}
          <span className="text-emerald-400 font-semibold">{formatCurrency(totalPaid)}</span>
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Émission</TableHead>
                <TableHead>Payée le</TableHead>
                <TableHead>Montant HT</TableHead>
                <TableHead>TTC</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="h-10 bg-white/[0.02] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Aucune facture payée pour le moment. Les factures apparaissent ici dès
                    qu&apos;elles sont marquées payées côté {brandName}.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.period_label ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatDate(inv.payment_date)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(inv.amount_ht))}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(inv.amount_ttc))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/portal/invoices/${inv.id}`}>
                          <Eye className="h-3 w-3" />
                          Voir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          >
            {invoices.length} facture{invoices.length > 1 ? 's' : ''} payée{invoices.length > 1 ? 's' : ''}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Les factures non encore payées ne sont pas visibles ici.
          </span>
        </div>
      )}
    </div>
  );
}
