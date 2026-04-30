import type { Invoice, Company, Mission, Consultant, Timesheet } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

export type InvoiceIssuer = {
  brandName: string;
  legalName: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  siren: string | null;
  footerTagline: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
};

const DEFAULT_ISSUER: InvoiceIssuer = {
  brandName: 'QuadCore',
  legalName: 'QuadCore SAS',
  address: '5 Rue du Docteur Roux',
  city: 'Nogent Sur Oise',
  postalCode: '60180',
  siren: '101 694 016',
  footerTagline: 'IT Services & Consulting',
  logoUrl: null,
  signatureUrl: null,
  primaryColor: '#6d28d9',
  accentColor: '#e11d74',
  representativeName: 'QuadCore SAS',
  representativeTitle: 'Direction commerciale',
};

type Props = {
  invoice: Invoice;
  company: Company | null;
  mission: Mission | null;
  consultant: Consultant | null;
  timesheet: Timesheet | null;
  issuer?: InvoiceIssuer | null;
};

export function InvoiceDocument({
  invoice,
  company,
  mission,
  consultant,
  timesheet,
  issuer,
}: Props) {
  const iss = issuer ?? DEFAULT_ISSUER;
  const primary = iss.primaryColor || '#6d28d9';
  const accent = iss.accentColor || '#e11d74';
  const cityLine = [iss.postalCode, iss.city].filter(Boolean).join(' ');
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
          <QuadCoreLogo size="md" src={iss.logoUrl} alt={iss.brandName} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Facture</div>
            <div className="font-mono text-lg font-bold mt-1">{invoice.invoice_number}</div>
          </div>
        </div>
        <div
          className="mt-5 h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, ${primary} 0%, ${accent} 55%, transparent 100%)` }}
        />
      </header>

      <section className="px-12 py-6 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">Émetteur</div>
          <div className="text-sm font-semibold text-neutral-900">{iss.legalName}</div>
          <div className="text-xs text-neutral-600 leading-relaxed mt-1">
            {iss.address && (
              <>
                {iss.address}
                <br />
              </>
            )}
            {cityLine && (
              <>
                {cityLine}
                <br />
              </>
            )}
            {iss.siren && <>SIREN {iss.siren}</>}
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
            style={{ borderColor: primary }}
          >
            <span>Total TTC</span>
            <span style={{ color: accent }}>{formatCurrency(ttc)}</span>
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
              signerName={iss.representativeName ?? iss.legalName}
              signerRole={iss.representativeTitle ?? 'Direction commerciale'}
              date={formatDate(invoice.issue_date)}
              imageUrl={iss.signatureUrl}
              brandName={iss.brandName}
              logoUrl={iss.logoUrl}
              accentColor={accent}
            />
          </div>
        </div>
      </section>

      <footer className="px-12 py-4 text-center">
        <div
          className="h-[2px] w-full mb-3"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 45%, ${primary} 100%)` }}
        />
        <div className="text-[9px] text-neutral-400 tracking-wider">
          {iss.brandName}
          {iss.footerTagline ? ` · ${iss.footerTagline}` : ''}
          {iss.siren ? ` · SIREN ${iss.siren}` : ''}
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
