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

      {/* ---- Conditions générales — le CONTRAT à proprement parler.
           Un récapitulatif seul n'engage à rien : le prestataire freelance
           signe un vrai contrat de sous-traitance avec clauses complètes,
           auto-remplies depuis les données ci-dessus. Hors NDA / avenant
           (objets juridiques différents). ---- */}
      {c.kind !== 'nda' && c.kind !== 'amendment' && (
        <ContractClauses contract={c} issuerName={iss.brandName} />
      )}

      <section className="px-12 py-6 border-t border-neutral-100 bg-neutral-50/40">
        <div className="text-[10px] text-neutral-500 leading-relaxed mb-5">
          <div className="font-semibold text-neutral-700 mb-1">Signature des parties</div>
          Le présent contrat prend effet à compter de sa signature par les deux parties.
          Chaque partie conserve un exemplaire original.
        </div>
        <div className="grid grid-cols-2 gap-8 items-start">
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Pour le donneur d&apos;ordre
            </div>
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

          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Pour le prestataire
            </div>
            {c.consultant_signature_data ? (
              <div className="inline-block">
                <div className="border border-neutral-200 rounded-lg bg-white px-6 py-4 min-w-[260px]">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 mb-2">
                    Signature
                  </div>
                  <div className="h-16 flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.consultant_signature_data}
                      alt="Signature du prestataire"
                      className="max-h-full max-w-[200px] object-contain select-none"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-100 text-right">
                    <div className="text-[10px] font-semibold text-neutral-800">
                      {c.consultant_signed_name ?? c.supplier_representative ?? '—'}
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      {c.supplier_company_name ?? 'Prestataire'}
                    </div>
                  </div>
                </div>
                {c.consultant_signed_at && (
                  <div className="mt-2 text-center text-[11px] text-neutral-700">
                    Fait le{' '}
                    <span className="font-semibold text-neutral-900">
                      {formatDate(c.consultant_signed_at)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-block">
                <div className="border border-dashed border-neutral-300 rounded-lg bg-white px-6 py-4 min-w-[260px]">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 mb-2">
                    Signature
                  </div>
                  <div className="h-16 flex items-center justify-center text-[10px] text-neutral-400 italic">
                    En attente de signature
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-100 text-right">
                    <div className="text-[10px] font-semibold text-neutral-800">
                      {c.supplier_representative ?? '—'}
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      {c.supplier_company_name ?? 'Prestataire'}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

/**
 * Conditions générales du contrat de prestation / sous-traitance freelance.
 * Clauses standards du modèle ESN ↔ consultant indépendant, injectées avec
 * les données du contrat. Rédaction volontairement générale : les
 * particularités passent par « Notes complémentaires » ou un avenant.
 */
function ContractClauses({
  contract: c,
  issuerName,
}: {
  contract: Contract;
  issuerName: string;
}) {
  const supplier = c.supplier_company_name ?? 'le Prestataire';
  const durationLabel = c.end_date
    ? `du ${formatDate(c.start_date)} au ${formatDate(c.end_date)}`
    : `à compter du ${formatDate(c.start_date)}, pour une durée indéterminée`;

  const articles: { title: string; body: string }[] = [
    {
      title: 'Article 1 — Objet',
      body: `Le présent contrat a pour objet la réalisation par ${supplier} (« le Prestataire »), au profit de ${issuerName} (« le Donneur d'ordre »), de la prestation « ${c.mission_title ?? c.title} »${c.client_name ? `, exécutée pour le compte du client final ${c.client_name}` : ''}. Le Prestataire déclare disposer des compétences et des moyens nécessaires à son exécution.`,
    },
    {
      title: 'Article 2 — Durée',
      body: `Le contrat est conclu ${durationLabel}. Toute prolongation ou modification du périmètre fera l'objet d'un avenant écrit signé des deux parties.`,
    },
    {
      title: 'Article 3 — Conditions d\'exécution',
      body: `La prestation est exécutée ${c.work_location ? `principalement à ${c.work_location}` : 'sur le lieu convenu entre les parties'}${c.remote_days_per_week > 0 ? `, avec la possibilité de ${c.remote_days_per_week} jour(s) de télétravail par semaine` : ''}. Le Prestataire organise librement les modalités d'exécution de sa mission, dans le respect des contraintes opérationnelles du client final.`,
    },
    {
      title: 'Article 4 — Indépendance des parties',
      body: `Le Prestataire exécute la prestation en qualité de professionnel indépendant : aucun lien de subordination n'est créé par le présent contrat. Le Prestataire est seul responsable de ses obligations fiscales et sociales, déclare être régulièrement immatriculé et s'engage à fournir, à la signature puis tous les six mois, les attestations de vigilance prévues aux articles L.8222-1 et suivants du Code du travail.`,
    },
    {
      title: 'Article 5 — Conditions financières',
      body: `La prestation est facturée au taux journalier de ${formatCurrency(Number(c.daily_rate_eur))} HT. La facturation est mensuelle, établie sur la base du compte rendu d'activité (CRA) validé par le Donneur d'ordre. Les factures sont payables à ${c.payment_terms_days} jours${c.billing_email ? ` et adressées à ${c.billing_email}` : ''}. TVA en sus au taux en vigueur. Tout retard de paiement entraîne l'application des pénalités légales (taux BCE + 10 points) et de l'indemnité forfaitaire de recouvrement de 40 €.`,
    },
    {
      title: 'Article 6 — Obligations du Prestataire',
      body: `Le Prestataire s'engage à exécuter la prestation avec diligence et selon les règles de l'art (obligation de moyens), à signaler sans délai toute difficulté, et à maintenir pendant toute la durée du contrat une assurance responsabilité civile professionnelle couvrant les dommages susceptibles d'être causés dans le cadre de la mission.`,
    },
    {
      title: 'Article 7 — Confidentialité',
      body: `Chaque partie s'engage à conserver strictement confidentielles les informations de toute nature relatives à l'autre partie et au client final dont elle aurait connaissance à l'occasion du contrat, pendant sa durée et trois (3) ans après son terme.`,
    },
    {
      title: 'Article 8 — Propriété intellectuelle',
      body: `Les livrables et développements réalisés dans le cadre de la prestation sont cédés au Donneur d'ordre au fur et à mesure de leur réalisation et du paiement des factures correspondantes, pour la durée légale de protection et pour tous territoires, aux fins d'exploitation par le Donneur d'ordre et son client final.`,
    },
    {
      title: 'Article 9 — Non-concurrence et non-sollicitation',
      body:
        c.non_compete_months > 0
          ? `Pendant la durée du contrat et ${c.non_compete_months} mois après son terme, le Prestataire s'interdit de contracter directement, pour son compte ou celui d'un tiers, avec le client final au titre de prestations similaires, sauf accord écrit du Donneur d'ordre.${c.non_compete_penalty ? ` Clause pénale : ${c.non_compete_penalty}` : ''}`
          : `Les parties conviennent qu'aucune clause de non-concurrence spécifique ne s'applique au présent contrat. Chaque partie s'interdit toutefois de solliciter ou débaucher le personnel de l'autre pendant la durée du contrat et douze (12) mois après son terme.`,
    },
    {
      title: 'Article 10 — Résiliation',
      body: `En cas de manquement grave de l'une des parties, non réparé quinze (15) jours après mise en demeure écrite restée sans effet, le contrat pourra être résilié de plein droit, sans préjudice de tous dommages et intérêts. Chaque partie peut par ailleurs mettre fin au contrat moyennant un préavis écrit de quinze (15) jours ; les prestations réalisées jusqu'au terme effectif restent dues.`,
    },
    {
      title: 'Article 11 — Données personnelles',
      body: `Chaque partie traite les données personnelles auxquelles elle accède conformément au RGPD et à la loi Informatique et Libertés, pour les seuls besoins de l'exécution du contrat, et s'engage à mettre en œuvre les mesures de sécurité appropriées.`,
    },
    {
      title: 'Article 12 — Droit applicable et juridiction',
      body: `Le présent contrat est soumis au droit français. À défaut de résolution amiable dans un délai de trente (30) jours, tout litige relatif à sa formation, son interprétation ou son exécution relève de la compétence exclusive du Tribunal de ${c.jurisdiction_city}.`,
    },
  ];

  return (
    <section className="px-12 py-5 border-t border-neutral-100">
      <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
        Conditions générales
      </div>
      <div className="space-y-3">
        {articles.map((a) => (
          <div key={a.title}>
            <div className="text-[10px] font-bold text-neutral-800 uppercase tracking-wide">
              {a.title}
            </div>
            <p className="text-[10px] leading-relaxed text-neutral-600 mt-0.5 text-justify">
              {a.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
