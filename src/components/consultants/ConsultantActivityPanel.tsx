'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FileSignature, KeyRound, Receipt } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/app';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/lib/i18n/CurrencyProvider';

// =========================================================================
// Panneau "Activité" de la fiche consultant (côté organisation) :
//   - statut du compte portail (actif / aucun accès)
//   - ses CRA (statut + lien de validation)
//   - ses contrats
//   - ses factures (directes ou via ses missions)
// Comble le trou "l'org ne voyait les CRA que globalement, jamais par
// consultant". Lecture seule + liens de drill-down vers les pages métier.
// =========================================================================

const MONTHS = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

const CRA_TONE: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Brouillon', tone: 'pending' },
  submitted: { label: 'À valider', tone: 'warning' },
  client_validated: { label: 'Validé', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'danger' },
};

const CONTRACT_TONE: Record<string, StatusTone> = {
  draft: 'pending',
  pending_review: 'warning',
  sent: 'info',
  signed: 'success',
  active: 'success',
  ended: 'neutral',
  terminated: 'danger',
  cancelled: 'neutral',
};

const INVOICE_TONE: Record<string, StatusTone> = {
  draft: 'pending',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
};

type CraRow = {
  id: string;
  period_month: number;
  period_year: number;
  status: string;
  days_worked: number;
};
type ContractRow = { id: string; contract_number: string; title: string; status: string };
type InvoiceRow = { id: string; invoice_number: string; amount_ht: number; status: string };

export function ConsultantActivityPanel({ consultantId }: { consultantId: string }) {
  const { format: formatCurrency } = useCurrency();
  const [hasPortal, setHasPortal] = useState<boolean | null>(null);
  const [cras, setCras] = useState<CraRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const [profileRes, craRes, contractRes, invDirectRes, invMissionRes] =
        await Promise.all([
          supabase.from('profiles').select('id').eq('consultant_id', consultantId).limit(1),
          supabase
            .from('timesheets')
            .select('id, period_month, period_year, status, days_worked')
            .eq('consultant_id', consultantId)
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false })
            .limit(6),
          supabase
            .from('contracts')
            .select('id, contract_number, title, status')
            .eq('consultant_id', consultantId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('invoices')
            .select('id, invoice_number, amount_ht, status')
            .eq('consultant_id', consultantId)
            .limit(10),
          supabase
            .from('invoices')
            .select('id, invoice_number, amount_ht, status, mission:missions!inner(consultant_id)')
            .eq('mission.consultant_id', consultantId)
            .limit(10),
        ]);
      if (cancelled) return;
      setHasPortal((profileRes.data ?? []).length > 0);
      setCras((craRes.data ?? []) as CraRow[]);
      setContracts((contractRes.data ?? []) as ContractRow[]);
      // Fusion factures directes + via mission (dédup par id)
      const merged = new Map<string, InvoiceRow>();
      for (const row of [...(invDirectRes.data ?? []), ...(invMissionRes.data ?? [])]) {
        merged.set(row.id as string, row as InvoiceRow);
      }
      setInvoices(Array.from(merged.values()).slice(0, 6));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [consultantId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Activité</CardTitle>
          {hasPortal !== null && (
            <StatusBadge tone={hasPortal ? 'success' : 'neutral'} dot={hasPortal}>
              <KeyRound className="h-3 w-3 mr-0.5" />
              {hasPortal ? 'Portail actif' : 'Pas d\'accès portail'}
            </StatusBadge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 rounded-lg surface-1 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <SectionList
              icon={<ClipboardCheck className="h-3.5 w-3.5" />}
              title="CRA"
              emptyText="Aucun CRA"
              rows={cras.map((t) => ({
                key: t.id,
                href: `/timesheets/${t.id}`,
                label: `${MONTHS[t.period_month - 1]} ${t.period_year}`,
                meta: `${Number(t.days_worked)} j`,
                badge: CRA_TONE[t.status] ?? { label: t.status, tone: 'neutral' as StatusTone },
              }))}
            />
            <SectionList
              icon={<FileSignature className="h-3.5 w-3.5" />}
              title="Contrats"
              emptyText="Aucun contrat"
              rows={contracts.map((c) => ({
                key: c.id,
                href: `/contracts/${c.id}`,
                label: c.contract_number,
                meta: c.title,
                badge: { label: c.status, tone: CONTRACT_TONE[c.status] ?? 'neutral' },
              }))}
            />
            <SectionList
              icon={<Receipt className="h-3.5 w-3.5" />}
              title="Factures"
              emptyText="Aucune facture"
              rows={invoices.map((inv) => ({
                key: inv.id,
                href: `/invoices/${inv.id}`,
                label: inv.invoice_number,
                meta: formatCurrency(Number(inv.amount_ht)),
                badge: { label: inv.status, tone: INVOICE_TONE[inv.status] ?? 'neutral' },
              }))}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SectionList({
  icon,
  title,
  emptyText,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  emptyText: string;
  rows: {
    key: string;
    href: string;
    label: string;
    meta: string;
    badge: { label: string; tone: StatusTone };
  }[];
}) {
  return (
    <div>
      <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
        <span className="opacity-70">({rows.length})</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key}>
              <Link
                href={r.href}
                className="flex items-center justify-between gap-2 rounded-lg border border-hairline px-2.5 py-1.5 text-xs hover-surface transition"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground ml-2">{r.meta}</span>
                </span>
                <StatusBadge tone={r.badge.tone} dot={false} className="px-1.5 py-0.5 text-[9px]">
                  {r.badge.label}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
