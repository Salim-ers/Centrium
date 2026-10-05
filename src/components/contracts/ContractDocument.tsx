import type { Contract } from '@/types';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';
import { QuadCoreSignature } from '@/components/brand/QuadCoreSignature';
import { formatCurrency, formatDate } from '@/lib/utils';

const KIND_LABEL: Record<Contract['kind'], string> = {
  assistance_technique: "Contrat d'assistance technique",
  apport_affaire: "Contrat d'apport d'affaires",
  sous_traitance: 'Contrat de sous-traitance',
  freelance_mission: 'Contrat de mission freelance',
  prestation_client: 'Contrat de prestation de services',
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
  const primary = iss.primaryColor || '#23201d';
  const accent = iss.accentColor || '#8a7a66';
  // Contrat CLIENT : l'ESN est le PRESTATAIRE et l'entreprise cliente la
  // contrepartie. Contrat CONSULTANT (historique) : l'ESN est le DONNEUR
  // D'ORDRE et la société du freelance le prestataire.
  const isClient = c.party === 'client';

  return (
    <div
      className="qc-print-doc bg-white text-foreground shadow-2xl mx-auto"
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
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
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
        <h1 className="text-2xl font-bold text-foreground mb-2">{c.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(c.start_date)} — {c.end_date ? formatDate(c.end_date) : 'durée indéterminée'}
          {' · '}
          {c.duration_months} mois
        </p>
      </section>

      <section className="px-12 py-4 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {isClient ? 'Le prestataire' : "Donneur d'ordre"}
          </div>
          <div className="text-sm font-semibold">{iss.brandName}</div>
          <div className="text-xs text-muted-foreground leading-relaxed mt-1">
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

        {isClient ? (
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Le client
            </div>
            <div className="text-sm font-semibold">{c.client_name ?? '—'}</div>
            <div className="text-xs text-muted-foreground leading-relaxed mt-1">
              {c.client_address && (
                <>
                  {c.client_address}
                  <br />
                </>
              )}
              {c.billing_email && <>Contact facturation : {c.billing_email}</>}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Prestataire
            </div>
            <div className="text-sm font-semibold">{c.supplier_company_name ?? '—'}</div>
            <div className="text-xs text-muted-foreground leading-relaxed mt-1">
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
        )}
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Mission
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {!isClient && <Field label="Client final" value={c.client_name ?? '—'} />}
          <Field label="Intitulé de mission" value={c.mission_title ?? '—'} />
          <Field label="Lieu d'exécution" value={c.work_location ?? '—'} />
          <Field label="Télétravail" value={`${c.remote_days_per_week} j / semaine`} />
        </div>
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Conditions financières
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Field label="TJM HT" value={formatCurrency(Number(c.daily_rate_eur))} />
          <Field label="Délai de paiement" value={`${c.payment_terms_days} jours`} />
          <Field label="Email facturation" value={c.billing_email ?? '—'} />
        </div>
      </section>

      <section className="px-12 py-4">
        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
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
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            <span className="font-semibold">Clause pénale :</span> {c.non_compete_penalty}
          </p>
        )}
      </section>

      {c.notes && (
        <section className="px-12 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Notes complémentaires
          </div>
          <p className="text-xs text-foreground whitespace-pre-line">{c.notes}</p>
        </section>
      )}

      {/* ---- Conditions générales — le CONTRAT à proprement parler.
           Deux corpus distincts selon la contrepartie :
           · CLIENT : contrat de prestation de services (l'ESN est prestataire)
           · CONSULTANT : contrat de sous-traitance freelance (l'ESN est
             donneur d'ordre). Hors NDA / avenant (objets juridiques différents). ---- */}
      {c.kind !== 'nda' && c.kind !== 'amendment' &&
        (isClient ? (
          <ClientContractClauses contract={c} issuerName={iss.brandName} />
        ) : (
          <ContractClauses contract={c} issuerName={iss.brandName} />
        ))}

      <section className="px-12 py-6 border-t border-border bg-muted">
        <div className="text-[10px] text-muted-foreground leading-relaxed mb-5">
          <div className="font-semibold text-foreground mb-1">Signature des parties</div>
          Le présent contrat prend effet à compter de sa signature par les deux parties.
          Chaque partie conserve un exemplaire original.
        </div>
        <div className="grid grid-cols-2 gap-8 items-start">
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {isClient ? 'Pour le prestataire' : 'Pour le donneur d’ordre'}
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
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              {isClient ? 'Pour le client' : 'Pour le prestataire'}
            </div>
            {isClient ? (
              // Le client signe hors plateforme (papier / parapheur externe) :
              // cadre en attente au nom de l'entreprise cliente.
              <div className="inline-block">
                <div className="border border-dashed border-border rounded-lg bg-white px-6 py-4 min-w-[260px]">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Signature et cachet
                  </div>
                  <div className="h-16 flex items-center justify-center text-[10px] text-muted-foreground italic">
                    {isSigned ? 'Signé' : 'En attente de signature'}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-right">
                    <div className="text-[10px] font-semibold text-foreground">
                      {c.client_name ?? '—'}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Nom, qualité du signataire et cachet
                    </div>
                  </div>
                </div>
              </div>
            ) : c.consultant_signature_data ? (
              <div className="inline-block">
                <div className="border border-border rounded-lg bg-white px-6 py-4 min-w-[260px]">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
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
                  <div className="mt-3 pt-3 border-t border-border text-right">
                    <div className="text-[10px] font-semibold text-foreground">
                      {c.consultant_signed_name ?? c.supplier_representative ?? '—'}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {c.supplier_company_name ?? 'Prestataire'}
                    </div>
                  </div>
                </div>
                {c.consultant_signed_at && (
                  <div className="mt-2 text-center text-[11px] text-foreground">
                    Fait le{' '}
                    <span className="font-semibold text-foreground">
                      {formatDate(c.consultant_signed_at)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="inline-block">
                <div className="border border-dashed border-border rounded-lg bg-white px-6 py-4 min-w-[260px]">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    Signature
                  </div>
                  <div className="h-16 flex items-center justify-center text-[10px] text-muted-foreground italic">
                    En attente de signature
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-right">
                    <div className="text-[10px] font-semibold text-foreground">
                      {c.supplier_representative ?? '—'}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
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
        <div className="text-[9px] text-muted-foreground tracking-wider">
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
      <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground mt-0.5">{value}</div>
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

  return <ClausesLayout articles={articles} />;
}

/**
 * Conditions générales du contrat de PRESTATION DE SERVICES ESN ↔ client.
 * Ici l'ESN est LE PRESTATAIRE et l'entreprise cliente LE CLIENT — miroir
 * du contrat de sous-traitance. Clauses standard du marché AT/régie :
 * obligation de moyens, CRA mensuel, non-sollicitation du personnel,
 * plafond de responsabilité, réversibilité.
 */
function ClientContractClauses({
  contract: c,
  issuerName,
}: {
  contract: Contract;
  issuerName: string;
}) {
  const clientName = c.client_name ?? 'le Client';
  const durationLabel = c.end_date
    ? `du ${formatDate(c.start_date)} au ${formatDate(c.end_date)}`
    : `à compter du ${formatDate(c.start_date)}, pour une durée indéterminée`;
  const nonSollicit = c.non_compete_months > 0 ? c.non_compete_months : 12;

  const articles: { title: string; body: string }[] = [
    {
      title: 'Article 1 — Objet',
      body: `Le présent contrat a pour objet la réalisation par ${issuerName} (« le Prestataire »), au profit de ${clientName} (« le Client »), de la prestation « ${c.mission_title ?? c.title} », exécutée en assistance technique. Le Prestataire affecte à la prestation un ou plusieurs intervenants disposant des compétences requises.`,
    },
    {
      title: 'Article 2 — Durée',
      body: `Le contrat est conclu ${durationLabel}. Toute prolongation ou modification du périmètre fera l'objet d'un avenant écrit signé des deux parties ou d'un bon de commande complémentaire.`,
    },
    {
      title: "Article 3 — Modalités d'exécution",
      body: `La prestation est exécutée ${c.work_location ? `principalement à ${c.work_location}` : 'dans les locaux convenus entre les parties'}${c.remote_days_per_week > 0 ? `, avec ${c.remote_days_per_week} jour(s) de télétravail par semaine` : ''}. Le Client fournit à l'intervenant les accès, informations et environnements de travail nécessaires. Le pilotage opérationnel de la prestation est assuré conjointement lors de points de suivi réguliers.`,
    },
    {
      title: 'Article 4 — Obligations du Prestataire',
      body: `Le Prestataire s'engage à exécuter la prestation avec diligence et selon les règles de l'art (obligation de moyens), à affecter des intervenants qualifiés, à signaler sans délai toute difficulté et à respecter les procédures internes du Client applicables sur site. Il maintient pendant toute la durée du contrat une assurance responsabilité civile professionnelle.`,
    },
    {
      title: 'Article 5 — Personnel du Prestataire',
      body: `Les intervenants demeurent sous la responsabilité et l'autorité hiérarchique exclusives du Prestataire : le présent contrat ne crée aucun lien de subordination entre le Client et les intervenants (interdiction du prêt de main-d'œuvre illicite et du marchandage — art. L.8231-1 et L.8241-1 du Code du travail). En cas d'indisponibilité durable d'un intervenant, le Prestataire propose un remplaçant de compétence équivalente, soumis à l'accord du Client.`,
    },
    {
      title: 'Article 6 — Conditions financières',
      body: `La prestation est facturée au taux journalier de ${formatCurrency(Number(c.daily_rate_eur))} HT. La facturation est mensuelle, établie sur la base du compte rendu d'activité (CRA) validé par le Client. Les factures sont payables à ${c.payment_terms_days} jours${c.billing_email ? `, adressées à ${c.billing_email}` : ''}. TVA en sus au taux en vigueur. Tout retard de paiement entraîne l'application de pénalités au taux BCE majoré de 10 points et de l'indemnité forfaitaire de recouvrement de 40 €.`,
    },
    {
      title: "Article 7 — Comptes rendus d'activité",
      body: `L'intervenant établit chaque mois un CRA détaillant les jours travaillés, soumis à la validation du Client. À défaut de contestation écrite dans un délai de cinq (5) jours ouvrés suivant sa transmission, le CRA est réputé validé et la facturation correspondante exigible.`,
    },
    {
      title: 'Article 8 — Non-sollicitation du personnel',
      body: `Pendant la durée du contrat et ${nonSollicit} mois après son terme, le Client s'interdit de solliciter, d'embaucher ou de contracter directement ou indirectement avec les intervenants du Prestataire, sauf accord écrit préalable. ${c.non_compete_penalty ? `Toute violation ouvre droit à l'indemnité suivante : ${c.non_compete_penalty}.` : "Toute violation ouvre droit à une indemnité forfaitaire égale à douze (12) mois de facturation de l'intervenant concerné."}`,
    },
    {
      title: 'Article 9 — Confidentialité',
      body: `Chaque partie s'engage à conserver strictement confidentielles les informations de toute nature relatives à l'autre partie dont elle aurait connaissance à l'occasion du contrat, pendant sa durée et trois (3) ans après son terme.`,
    },
    {
      title: 'Article 10 — Propriété intellectuelle',
      body: `Les livrables et développements spécifiques réalisés dans le cadre de la prestation sont cédés au Client au fur et à mesure de leur réalisation et sous condition du complet paiement des factures correspondantes, pour la durée légale de protection et pour tous territoires. Le Prestataire conserve la propriété de ses méthodes, savoir-faire et outils préexistants.`,
    },
    {
      title: 'Article 11 — Responsabilité',
      body: `La responsabilité du Prestataire est limitée aux dommages directs et prévisibles, à l'exclusion de tout dommage indirect (perte d'exploitation, de données, de chiffre d'affaires). Elle est plafonnée, toutes causes confondues, au montant total des sommes facturées au titre des six (6) derniers mois précédant le fait générateur.`,
    },
    {
      title: 'Article 12 — Résiliation',
      body: `En cas de manquement grave de l'une des parties, non réparé quinze (15) jours après mise en demeure écrite restée sans effet, le contrat pourra être résilié de plein droit, sans préjudice de tous dommages et intérêts. Chaque partie peut par ailleurs mettre fin au contrat moyennant un préavis écrit de trente (30) jours ; les prestations réalisées jusqu'au terme effectif restent dues.`,
    },
    {
      title: 'Article 13 — Réversibilité',
      body: `Au terme du contrat, le Prestataire restitue au Client l'ensemble des livrables, documents et accès qui lui ont été confiés et apporte, sur demande, une assistance raisonnable au transfert de la prestation vers le Client ou un tiers désigné, facturée aux conditions du présent contrat.`,
    },
    {
      title: 'Article 14 — Données personnelles',
      body: `Chaque partie traite les données personnelles auxquelles elle accède conformément au RGPD et à la loi Informatique et Libertés, pour les seuls besoins de l'exécution du contrat, et met en œuvre les mesures de sécurité appropriées.`,
    },
    {
      title: 'Article 15 — Droit applicable et juridiction',
      body: `Le présent contrat est soumis au droit français. À défaut de résolution amiable dans un délai de trente (30) jours, tout litige relatif à sa formation, son interprétation ou son exécution relève de la compétence exclusive du Tribunal de ${c.jurisdiction_city}.`,
    },
  ];

  return <ClausesLayout articles={articles} />;
}

/** Rendu commun des conditions générales (grille d'articles justifiés). */
function ClausesLayout({ articles }: { articles: { title: string; body: string }[] }) {
  return (
    <section className="px-12 py-5 border-t border-border">
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Conditions générales
      </div>
      <div className="space-y-3">
        {articles.map((a) => (
          <div key={a.title}>
            <div className="text-[10px] font-bold text-foreground uppercase tracking-wide">
              {a.title}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground mt-0.5 text-justify">
              {a.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
