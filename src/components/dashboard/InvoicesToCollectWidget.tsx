'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Banknote, ArrowUpRight } from 'lucide-react';

import { AppCard } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useRealtimeReload } from '@/hooks/useRealtimeReload';
import { useOrganization } from '@/lib/auth/context';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';
import { cn } from '@/lib/utils';

type Receivable = {
  id: string;
  invoice_number: string;
  client_name: string | null;
  amount_ht: number;
  due_date: string | null;
  days_overdue: number;
};

/**
 * Widget Factures à encaisser — top 5 factures impayées (status sent/overdue)
 * triées par montant HT descendant. Donne une lecture instantanée de
 * "qui me doit le plus" + un compteur "en retard" si la date d'échéance
 * est dépassée. Action évidente : relancer ces clients en priorité.
 *
 * Source : table `invoices` jointe avec la mission/le consultant pour
 * récupérer le client final.
 *
 * Drill-down : /invoices?status=sent (ouvre la liste filtrée).
 */
export function InvoicesToCollectWidget() {
  const { activeOrgId } = useOrganization();
  const t = useAppT();
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { format: formatCurrency } = useCurrency();

  const { data, loading, reload } = useCachedQuery<Receivable[]>(
    `invoices-to-collect:${activeOrgId ?? 'none'}`,
    async () => {
      const supabase = createClient();
      // On va chercher les factures avec leur mission → company (client final)
      const { data: rows, error } = await supabase
        .from('invoices')
        .select(
          `
          id, invoice_number, amount_ht, due_date, status,
          mission:missions ( company:companies ( name ) ),
          client:companies ( name )
        `,
        )
        .in('status', ['sent', 'overdue'])
        // À encaisser = ventes clients uniquement (les factures consultant
        // sont un décaissement, pas une créance).
        .eq('party', 'client')
        .eq('archived', false)
        .order('amount_ht', { ascending: false })
        .limit(5);
      if (error || !rows) return [];

      const now = Date.now();
      return rows.map((r) => {
        const mission = Array.isArray(r.mission) ? r.mission[0] : r.mission;
        const missionCompany = mission?.company
          ? Array.isArray(mission.company)
            ? mission.company[0]
            : mission.company
          : null;
        const directClient = Array.isArray(r.client) ? r.client[0] : r.client;
        const clientName =
          (missionCompany?.name as string) ?? (directClient?.name as string) ?? null;
        const due = r.due_date ? new Date(r.due_date as string).getTime() : null;
        const daysOverdue = due != null ? Math.floor((now - due) / 86_400_000) : 0;
        return {
          id: r.id as string,
          invoice_number: (r.invoice_number as string) ?? '—',
          client_name: clientName,
          amount_ht: Number(r.amount_ht) || 0,
          due_date: (r.due_date as string) ?? null,
          days_overdue: Math.max(0, daysOverdue),
        };
      });
    },
    { enabled: !!activeOrgId },
  );

  useRealtimeReload(['invoices', 'invoice_items'], () => reload(), { debounceMs: 500 });

  const items = data ?? [];
  const totalOutstanding = items.reduce((s, i) => s + i.amount_ht, 0);

  return (
    <AppCard variant="luminous" tone="violet" className="h-full">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.dashboard.invoices_to_collect_title}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.dashboard.invoices_to_collect_sub}
              </div>
            </div>
          </div>
          <Link
            href="/invoices?status=sent"
            className="group text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition"
          >
            {t.dashboard.see_invoices}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg surface-1 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs italic text-center px-3 text-success font-medium">
            {t.dashboard.invoices_to_collect_empty}
          </div>
        ) : (
          <>
            <ul className="space-y-1.5 flex-1">
              {items.map((inv, i) => {
                const isOverdue = inv.days_overdue > 0;
                return (
                  <motion.li
                    key={inv.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
                  >
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-hairline hover-surface px-2.5 py-2 text-xs transition-all hover:translate-x-0.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground/90 truncate">
                          {inv.client_name ?? '—'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate font-mono">
                          {inv.invoice_number}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-foreground">
                          {formatCurrency(inv.amount_ht)}
                        </div>
                        {isOverdue ? (
                          <div
                            className={cn(
                              'text-[10px] font-medium',
                              inv.days_overdue > 30
                                ? 'text-destructive'
                                : inv.days_overdue > 7
                                  ? 'text-warning'
                                  : 'text-muted-foreground',
                            )}
                          >
                            +{inv.days_overdue}{isEn ? 'd' : 'j'} {t.dashboard.overdue_short}
                          </div>
                        ) : inv.due_date ? (
                          <div className="text-[10px] text-muted-foreground">
                            {t.dashboard.due_in} {new Date(inv.due_date).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-2 pt-2 border-t border-hairline text-[10px] text-muted-foreground flex justify-end">
              {isEn ? 'Total:' : 'Total :'} <span className="ml-1 font-semibold text-foreground/80">{formatCurrency(totalOutstanding)}</span>
            </div>
          </>
        )}
      </div>
    </AppCard>
  );
}
