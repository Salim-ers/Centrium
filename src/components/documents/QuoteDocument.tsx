'use client';

import type { OrgBranding } from '@/lib/auth/context';
import type { Quote, QuoteItem } from '@/types';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function eur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
}
function date(iso: string | null) {
  return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
}

/**
 * Devis au format A4, aux couleurs et mentions de l'ESN (branding des
 * Paramètres). Imprimable / exportable en PDF via l'impression du navigateur.
 */
export function QuoteDocument({
  quote,
  items,
  branding,
  client,
  contact,
}: {
  quote: Pick<Quote, 'number' | 'title' | 'issue_date' | 'valid_until' | 'vat_rate' | 'intro_text' | 'terms_text' | 'version'>;
  items: Array<Pick<QuoteItem, 'description' | 'quantity' | 'unit' | 'unit_price'>>;
  branding: OrgBranding | null;
  client: { name: string; address?: string | null; city?: string | null } | null;
  contact: { name: string; email?: string | null } | null;
}) {
  const accent = branding?.primaryColor && HEX.test(branding.primaryColor) ? branding.primaryColor : '#C65F46';
  const ht = items.reduce((s, i) => s + Math.round(Number(i.quantity) * Number(i.unit_price) * 100) / 100, 0);
  const vat = Math.round(ht * (Number(quote.vat_rate) / 100) * 100) / 100;
  const ttc = ht + vat;
  const orgName = branding?.brandName || branding?.name || '';
  const legal = [
    branding?.legalForm && branding?.name ? `${branding.name} — ${branding.legalForm}` : branding?.name,
    branding?.capitalEur ? `capital de ${eur(branding.capitalEur).replace(',00', '')}` : null,
    branding?.rcs ? `RCS ${branding.rcs}` : null,
    branding?.siren ? `SIREN ${branding.siren}` : null,
    branding?.vatNumber ? `TVA ${branding.vatNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="qc-print-doc mx-auto w-full max-w-[210mm] bg-white p-[14mm] print:max-w-none print:p-0 text-[12px] leading-relaxed text-[#191817] shadow-md print:shadow-none">
      <header className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={orgName} className="mb-3 max-h-14 max-w-[180px] object-contain" />
          ) : (
            <div className="mb-3 text-lg font-semibold" style={{ color: accent }}>
              {orgName}
            </div>
          )}
          <div className="text-[11px] text-[#706A66]">
            {branding?.address && <div>{branding.address}</div>}
            {(branding?.postalCode || branding?.city) && (
              <div>
                {branding?.postalCode} {branding?.city}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-tight" style={{ color: accent }}>
            DEVIS
          </div>
          <div className="mt-1 font-medium">{quote.number ?? 'Brouillon'}</div>
          <div className="mt-2 text-[11px] text-[#706A66]">
            <div>Date : {date(quote.issue_date)}</div>
            {quote.valid_until && <div>Valable jusqu’au : {date(quote.valid_until)}</div>}
            {quote.version > 1 && <div>Version {quote.version}</div>}
          </div>
        </div>
      </header>

      <section className="mt-8 flex justify-end">
        <div className="w-[85mm] rounded-md border border-[#E8E1DB] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#706A66]">Client</div>
          <div className="mt-1 font-medium">{client?.name ?? '—'}</div>
          {client?.address && <div className="text-[11px]">{client.address}</div>}
          {client?.city && <div className="text-[11px]">{client.city}</div>}
          {contact && (
            <div className="mt-1 text-[11px] text-[#706A66]">
              À l’attention de {contact.name}
              {contact.email ? ` · ${contact.email}` : ''}
            </div>
          )}
        </div>
      </section>

      <h1 className="mt-8 text-[15px] font-semibold">{quote.title}</h1>
      {quote.intro_text && <p className="mt-2 whitespace-pre-wrap">{quote.intro_text}</p>}

      <table className="mt-5 w-full border-collapse text-[11.5px]">
        <thead>
          <tr style={{ borderBottom: `2px solid ${accent}` }}>
            <th className="py-2 text-left font-semibold">Désignation</th>
            <th className="w-16 py-2 text-right font-semibold">Qté</th>
            <th className="w-16 py-2 text-left font-semibold">Unité</th>
            <th className="w-24 py-2 text-right font-semibold">PU HT</th>
            <th className="w-28 py-2 text-right font-semibold">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx} className="border-b border-[#E8E1DB] align-top">
              <td className="py-2 pr-3 whitespace-pre-wrap">{i.description}</td>
              <td className="py-2 text-right tabular-nums">{Number(i.quantity).toLocaleString('fr-FR')}</td>
              <td className="py-2">{i.unit}</td>
              <td className="py-2 text-right tabular-nums">{eur(Number(i.unit_price))}</td>
              <td className="py-2 text-right tabular-nums">{eur(Number(i.quantity) * Number(i.unit_price))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-[70mm] text-[12px]">
          <div className="flex justify-between py-1">
            <dt>Total HT</dt>
            <dd className="tabular-nums">{eur(ht)}</dd>
          </div>
          <div className="flex justify-between py-1 text-[#706A66]">
            <dt>TVA {Number(quote.vat_rate).toLocaleString('fr-FR')} %</dt>
            <dd className="tabular-nums">{eur(vat)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#E8E1DB] py-1.5 text-[14px] font-semibold" style={{ color: accent }}>
            <dt>Total TTC</dt>
            <dd className="tabular-nums">{eur(ttc)}</dd>
          </div>
        </dl>
      </div>

      {quote.terms_text && (
        <section className="mt-8">
          <div className="text-[10px] uppercase tracking-wider text-[#706A66]">Conditions</div>
          <p className="mt-1 whitespace-pre-wrap text-[11px]">{quote.terms_text}</p>
        </section>
      )}

      <section className="mt-10 grid grid-cols-2 gap-8 text-[11px]">
        <div className="rounded-md border border-dashed border-[#E8E1DB] p-3 text-[#706A66]">
          Bon pour accord — date, nom et signature du client
          <div className="h-16" />
        </div>
        <div className="text-[#706A66]">
          {branding?.paymentTermsDays ? <div>Paiement à {branding.paymentTermsDays} jours.</div> : null}
          {branding?.lateFeeRatePct ? (
            <div>
              Pénalités de retard : {branding.lateFeeRatePct} % ; indemnité forfaitaire pour frais de recouvrement : 40 €.
            </div>
          ) : null}
        </div>
      </section>

      {legal && <footer className="mt-10 border-t border-[#E8E1DB] pt-3 text-center text-[10px] text-[#706A66]">{legal}</footer>}
    </article>
  );
}
