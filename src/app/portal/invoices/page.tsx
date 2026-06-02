'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, CheckCircle2, Eye, Wallet, TrendingUp, AlertCircle, Hourglass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  AppCard,
  StatusBadge,
  EmptyState,
  DataRow,
  type StatusTone,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

const INVOICE_TONE: Record<Invoice['status'], { tone: StatusTone; label: string }> = {
  draft: { tone: 'pending', label: 'Brouillon' },
  sent: { tone: 'info', label: 'Envoyée' },
  paid: { tone: 'success', label: 'Payée' },
  overdue: { tone: 'danger', label: 'En retard' },
  cancelled: { tone: 'neutral', label: 'Annulée' },
};

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

  const currentYear = new Date().getFullYear();
  const ytdPaid = invoices.filter(
    (i) => i.status === 'paid' && i.payment_date && new Date(i.payment_date).getFullYear() === currentYear,
  );
  const totalPaidYtd = ytdPaid.reduce((s, i) => s + Number(i.amount_ht), 0);
  const overdue = invoices.filter((i) => i.status === 'overdue');
  const upcoming = invoices.filter((i) => i.status === 'sent');
  const totalYtd = invoices
    .filter((i) => new Date(i.issue_date).getFullYear() === currentYear)
    .reduce((s, i) => s + Number(i.amount_ht), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Mon espace"
        title={<>Mes <span className="qc-italic-accent font-editorial italic">factures.</span></>}
        description={`Suivez vos factures émises par ${brandName} et les paiements reçus.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="À venir"
          value={upcoming.length}
          icon={Hourglass}
          tone="cyan"
          hint="Émises non payées"
        />
        <KPICard
          label="Payées YTD"
          value={ytdPaid.length}
          icon={CheckCircle2}
          tone="emerald"
          hint={`${currentYear}`}
        />
        <KPICard
          label="En retard"
          value={overdue.length}
          icon={AlertCircle}
          tone="rose"
        />
        <KPICard
          label="Total YTD"
          value={totalYtd}
          prefix="€"
          icon={TrendingUp}
          tone="magenta"
          hint="HT cumulé"
        />
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune facture pour le moment"
          description={`Les factures apparaissent ici dès qu'elles sont émises côté ${brandName}.`}
        />
      ) : (
        <AppCard>
          <div>
            {invoices.map((inv) => {
              const s = INVOICE_TONE[inv.status];
              return (
                <DataRow
                  key={inv.id}
                  leading={
                    inv.status === 'paid' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Wallet className="h-4 w-4 text-muted-foreground/70" />
                    )
                  }
                  primary={
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{inv.invoice_number}</span>
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                    </span>
                  }
                  secondary={
                    <>
                      {inv.period_label ?? '—'} · Émise le {formatDate(inv.issue_date)}
                      {inv.status === 'paid' && inv.payment_date && (
                        <> · Payée le {formatDate(inv.payment_date)}</>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(Number(inv.amount_ttc))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatCurrency(Number(inv.amount_ht))} HT
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/portal/invoices/${inv.id}`}>
                          <Eye className="h-3 w-3" />
                          Voir
                        </Link>
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        </AppCard>
      )}

      {invoices.length > 0 && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <StatusBadge tone="success">
            {ytdPaid.length} payée{ytdPaid.length > 1 ? 's' : ''} en {currentYear}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            Total encaissé YTD :{' '}
            <span className="text-emerald-400 font-semibold">{formatCurrency(totalPaidYtd)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
