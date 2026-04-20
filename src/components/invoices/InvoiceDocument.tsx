import type { Invoice, Company, Mission, Consultant, Timesheet } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

type Props = {
  invoice: Invoice;
  company: Company | null;
  mission: Mission | null;
  consultant: Consultant | null;
  timesheet: Timesheet | null;
};

export function InvoiceDocument({ invoice, company, mission, consultant, timesheet }: Props) {
  const ht = Number(invoice.amount_ht);
  const vat = Number(invoice.amount_vat);
  const ttc = Number(invoice.amount_ttc);

  return (
    <div
      className="qc-print-doc bg-white text-neutral-900 shadow-2xl mx-auto"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Georgia, serif' }}
    >
      <header className="px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo size="md" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Facture</div>
            <div className="font-mono text-lg font-bold mt-1">{invoice.invoice_number}</div>
          </div>
        </div>
        <div
          className="mt-5 h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, #6d28d9 0%, #e11d74 55%, transparent 100%)' }}
        />
      </header>

      <section className="px-12 py-6 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">Émetteur</div>
          <div className="text-sm font-semibold text-neutral-900">QuadCore SAS</div>
          <div className="text-xs text-neutral-600 leading-relaxed mt-1">
            5 Rue du Docteur Roux<br />
            60180 Nogent Sur Oise<br />
            SIREN 101 694 016
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">Client</div>
          <div className="text-sm font-semibold text-neutral-900">{company?.name ?? '—'}</div>
          <div className="text-xs text-neutral-600 leading-relaxed mt-1">
            {company?.address && (
              <>
                {company.address}
                <br />
              </>
            )}
            {company?.city}
            {company?.country && company?.country !== 'FR' ? `, ${company.country}` : ''}
          </div>
        </div>
      </section>

      <section className="px-12 pb-4 grid grid-cols-3 gap-6 text-xs">
        <InvoiceField label="Date d'émission" value={formatDate(invoice.issue_date)} />
        <InvoiceField label="Date d'échéance" value={formatDate(invoice.due_date)} />
        <InvoiceField label="Période" value={invoice.period_label ?? '—'} />
      </section>

      <section className="px-12 py-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-900">
              <th className="text-left py-2 text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
                Prestation
              </th>
              <th className="text-right py-2 text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
                Détail
              </th>
              <th className="text-right py-2 text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
                Montant HT
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-3">
                <div className="font-medium">
                  {mission?.title ?? 'Prestation de services IT'}
                </div>
                {consultant && (
                  <div className="text-xs text-neutral-500 mt-1">
                    Consultant : {consultant.first_name} {consultant.last_name}
                    {consultant.job_title ? ` — ${consultant.job_title}` : ''}
                  </div>
                )}
                {invoice.period_label && (
                  <div className="text-xs text-neutral-500">Période : {invoice.period_label}</div>
                )}
              </td>
              <td className="py-3 text-right text-xs text-neutral-500">
                {timesheet && (
                  <>
                    {timesheet.days_validated} j × {formatCurrency(mission?.daily_rate_eur ?? null)}
                  </>
                )}
              </td>
              <td className="py-3 text-right font-medium">{formatCurrency(ht)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="px-12 py-4 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">Total HT</span>
            <span className="font-medium">{formatCurrency(ht)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-neutral-600">TVA ({Number(invoice.vat_rate)}%)</span>
            <span className="font-medium">{formatCurrency(vat)}</span>
          </div>
          <div
            className="flex justify-between py-2 border-t-2 text-base font-bold"
            style={{ borderColor: '#6d28d9' }}
          >
            <span>Total TTC</span>
            <span style={{ color: '#e11d74' }}>{formatCurrency(ttc)}</span>
          </div>
        </div>
      </section>

      {invoice.notes && (
        <section className="px-12 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Notes</div>
          <p className="text-xs text-neutral-700 whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}

      <section className="px-12 py-6 border-t border-neutral-100 bg-neutral-50/40">
        <div className="grid grid-cols-2 gap-8 items-end">
          <div className="text-[10px] text-neutral-500 leading-relaxed">
            <div className="font-semibold text-neutral-700 mb-1">Modalités de paiement</div>
            Paiement à réception. Pénalité de retard : 3× le taux légal. Indemnité forfaitaire de
            recouvrement : 40 €. TVA acquittée sur les débits.
          </div>
          <div className="flex justify-end">
            <QuadCoreSignature
              signerName="QuadCore SAS"
              signerRole="Direction commerciale"
              date={formatDate(invoice.issue_date)}
            />
          </div>
        </div>
      </section>

      <footer className="px-12 py-4 text-center">
        <div
          className="h-[2px] w-full mb-3"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #e11d74 45%, #6d28d9 100%)' }}
        />
        <div className="text-[9px] text-neutral-400 tracking-wider">
          QuadCore · IT Services &amp; Consulting · SIREN 101 694 016
        </div>
      </footer>
    </div>
  );
}

function InvoiceField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-0.5">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}
