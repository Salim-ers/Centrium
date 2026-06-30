import type { Contract } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

const KIND_LABEL: Record<Contract['kind'], string> = {
  assistance_technique: "Contrat d'assistance technique",
  apport_affaire: "Contrat d'apport d'affaires",
  sous_traitance: 'Contrat de sous-traitance',
  freelance_mission: 'Contrat de mission freelance',
  nda: 'Accord de confidentialité (NDA)',
  amendment: 'Avenant',
};

export type ContractDocIssuer = {
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
  /** Pour cache-buster du logo après upload. */
  version?: string | number | null;
};

/**
 * Fallback NEUTRE pour le 1er render avant que le branding context arrive
 * (pas de "QuadCore" hardcodé qui s'afficherait brièvement sur un compte
 * tenant). Tous les champs sont soit vides soit génériques.
 */
const FALLBACK_ISSUER: ContractDocIssuer = {
  brandName: '—',
  legalName: '—',
  address: null,
  city: null,
  postalCode: null,
  siren: null,
  footerTagline: null,
  logoUrl: null,
  signatureUrl: null,
  primaryColor: null,
  accentColor: null,
  representativeName: null,
  representativeTitle: null,
  version: null,
};

type Props = {
  contract: Contract;
  /** Émetteur du contrat (depuis branding context unifié). */
  issuer?: ContractDocIssuer | null;
};

export function ContractDocument({ contract, issuer }: Props) {
  const c = contract;
  const iss = issuer ?? FALLBACK_ISSUER;
  const isSigned = !!c.signed_at;
  const primary = iss.primaryColor || '#6d28d9';
  const accent = iss.accentColor || '#e11d74';

  return (
    <div
      className="qc-print-doc bg-white text-neutral-900 shadow-2xl mx-auto"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Georgia, serif' }}
    >
      <header className="px-12 pt-10 pb-6">
        <div className="flex items-start justify-between gap-6">
          <QuadCoreLogo
            size="md"
            src={iss.logoUrl}
            alt={iss.brandName}
            brandName={iss.brandName}
            primaryColor={iss.primaryColor}
            cacheKey={iss.version}
          />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              {KIND_LABEL[c.kind]}
            </div>
            <div className="font-mono text-lg font-bold mt-1">{c.contract_number}</div>
          </div>
        </div>
        <div
          className="mt-5 h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, ${primary} 0%, ${accent} 55%, transparent 100%)`,
          }}
        />
      </header>

      <section className="px-12 py-4">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">{c.title}</h1>
        <p className="text-sm text-neutral-600">
          {formatDate(c.start_date)} — {c.end_date ? formatDate(c.end_date) : 'durée indéterminée'}
          {' · '}
          {c.duration_months} mois
        </p>
      </section>

      <section className="px-12 py-4 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Donneur d&apos;ordre
          </div>
          <div className="text-sm font-semibold">{iss.brandName}</div>
          <div className="text-xs text-neutral-600 leading-relaxed mt-1">
            {iss.address && (
              <>
                {iss.address}
                <br />
              </>
            )}
            {(iss.postalCode || iss.city) && (
              <>
                {[iss.postalCode, iss.city].filter(Boolean).join(' ')}
                <br />
              </>
            )}
            {iss.siren && <>SIREN {iss.siren}</>}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Prestataire
          </div>
          <div className="text-sm font-semibold">{c.supplier_company_name ?? '—'}</div>
          <div className="text-xs text-neutral-600 leading-relaxed mt-1">
            {c.supplier_address && (
              <>
                {c.supplier_address}
                <br />
              </>
            )}
            {c.supplier_postal_code} {c.supplier_city}
            {c.supplier_rcs && (
              <>
                <br />
                RCS {c.supplier_rcs}
              </>
            )}
            {c.supplier_representative && (
              <>
                <br />
                Représenté par {c.supplier_representative}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
          Mission
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Client final" value={c.client_name ?? '—'} />
          <Field label="Intitulé de mission" value={c.mission_title ?? '—'} />
          <Field label="Lieu d'exécution" value={c.work_location ?? '—'} />
          <Field label="Télétravail" value={`${c.remote_days_per_week} j / semaine`} />
        </div>
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
          Conditions financières
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Field label="TJM HT" value={formatCurrency(Number(c.daily_rate_eur))} />
          <Field label="Délai de paiement" value={`${c.payment_terms_days} jours`} />
          <Field label="Email facturation" value={c.billing_email ?? '—'} />
        </div>
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
          Dispositions juridiques
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Juridiction" value={`Tribunal de ${c.jurisdiction_city}`} />
          <Field
            label="Non-concurrence"
            value={
              c.non_compete_months > 0
                ? `${c.non_compete_months} mois après la fin de mission`
                : 'Non applicable'
            }
          />
        </div>
        {c.non_compete_penalty && (
          <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
            <span className="font-semibold">Clause pénale :</span> {c.non_compete_penalty}
          </p>
        )}
      </section>

      {c.notes && (
        <section className="px-12 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-1">
            Notes complémentaires
          </div>
          <p className="text-xs text-neutral-700 whitespace-pre-line">{c.notes}</p>
        </section>
      )}

      <section className="px-12 py-6 border-t border-neutral-100 bg-neutral-50/40">
        <div className="grid grid-cols-2 gap-8 items-end">
          <div className="text-[10px] text-neutral-500 leading-relaxed">
            <div className="font-semibold text-neutral-700 mb-1">Signature des parties</div>
            Le présent contrat prend effet à compter de sa signature par les deux parties.
            Chaque partie conserve un exemplaire original.
          </div>
          <div className="flex justify-end">
            <QuadCoreSignature
              signerName={iss.representativeName ?? iss.brandName}
              signerRole={iss.representativeTitle ?? 'Signataire'}
              brandName={iss.brandName}
              logoUrl={iss.logoUrl}
              imageUrl={iss.signatureUrl}
              primaryColor={iss.primaryColor}
              cacheKey={iss.version}
              date={isSigned ? formatDate(c.signed_at) : formatDate(new Date().toISOString())}
            />
          </div>
        </div>
      </section>

      <footer className="px-12 py-4 text-center">
        <div
          className="h-[2px] w-full mb-3"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accent} 45%, ${primary} 100%)`,
          }}
        />
        <div className="text-[9px] text-neutral-400 tracking-wider">
          {iss.brandName}
          {iss.footerTagline ? ` · ${iss.footerTagline}` : ''} · {c.contract_number}
          {isSigned ? ` · Signé le ${formatDate(c.signed_at)}` : ' · Document à signer'}
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900 mt-0.5">{value}</div>
    </div>
  );
}
