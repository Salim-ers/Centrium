'use client';

import Link from 'next/link';
import { Receipt, CheckCircle2, Eye, Wallet, TrendingUp, Hourglass, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PageHeader,
  KPICard,
  AppCard,
  StatusBadge,
  EmptyState,
  DataRow,
  Reveal,
  type StatusTone,
} from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useBrandName } from '@/components/brand/BrandingStyles';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePortalConsultant } from '../portal-context';
import type { Invoice } from '@/types';

// Libellés vus DU POINT DE VUE DU CONSULTANT : une facture « envoyée » est
// une facture en attente de paiement par l'ESN.
const INVOICE_TONE: Record<Invoice['status'], { tone: StatusTone; label: string }> = {
  draft: { tone: 'pending', label: 'Brouillon' },
  sent: { tone: 'info', label: 'En attente de paiement' },
  paid: { tone: 'success', label: 'Payée' },
  overdue: { tone: 'danger', label: 'En retard' },
  cancelled: { tone: 'neutral', label: 'Annulée' },
};

export default function PortalInvoicesPage() {
  const brandName = useBrandName();
  const { consultantId } = usePortalConsultant();
  const { data, loading } = useCachedQuery<Invoice[]>(
    `portal-invoices:${consultantId}`,
    async () => {
      const supabase = createClient();
      // RLS : uniquement SES factures de sous-traitance (party='consultant',
      // consultant_id = lui, hors brouillons). Les factures CLIENT de ses
      // missions ne sont plus jamais visibles (TJM de vente confidentiel).
      const { data: rows } = await supabase
        .from('invoices')
        .select('*')
        .order('issue_date', { ascending: false });
      return (rows ?? []) as Invoice[];
    },
  );
  const invoices = data ?? [];

  const currentYear = new Date().getFullYear();
  const paid = invoices.filter((i) => i.status === 'paid');
  const ytdPaid = paid.filter(
    (i) => i.payment_date && new Date(i.payment_date).getFullYear() === currentYear,
  );
  const totalPaidYtd = ytdPaid.reduce((s, i) => s + Number(i.amount_ht), 0);
  const totalPaidAll = paid.reduce((s, i) => s + Number(i.amount_ht), 0);
  // À encaisser : factures émises non payées (TTC — c'est ce qui arrive sur
  // le compte du freelance).
  const pendingAmount = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + Number(i.amount_ttc), 0);
  const lastPayment = paid
    .map((i) => i.payment_date)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <div>
      <PageHeader
        eyebrow="Mon espace"
        title={<>Mes <span className="qc-italic-accent font-editorial italic">factures.</span></>}
        description={`Vos factures de sous-traitance établies avec ${brandName} — montants, échéances et paiements reçus.`}
      />

      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="À encaisser"
          value={pendingAmount}
          prefix="€"
          icon={Clock3}
          tone="amber"
          hint="TTC · émises non payées"
        />
        <KPICard
          label="Encaissé YTD"
          value={totalPaidYtd}
          prefix="€"
          icon={TrendingUp}
          tone="magenta"
          hint={`HT · ${currentYear}`}
        />
        <KPICard
          label="Encaissé total"
          value={totalPaidAll}
          prefix="€"
          icon={Receipt}
          tone="violet"
          hint="HT toutes périodes"
        />
        <KPICard
          label="Dernier paiement"
          valueText={
            lastPayment
              ? new Date(lastPayment).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
              : '—'
          }
          icon={Hourglass}
          tone="cyan"
        />
      </Reveal>

      {loading ? (
        <div className="h-40 rounded-2xl bg-foreground/[0.03] animate-pulse" />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune facture pour le moment"
          description={`Vos factures de sous-traitance apparaissent ici dès qu'elles sont établies par ${brandName} — en général à la validation de votre CRA mensuel.`}
        />
      ) : (
        <Reveal delay={0.08}>
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
                      {inv.status === 'paid' && inv.payment_date ? (
                        <> · Payée le {formatDate(inv.payment_date)}</>
                      ) : (
                        <> · Échéance le {formatDate(inv.due_date)}</>
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
        </Reveal>
      )}

      {paid.length > 0 && (
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
