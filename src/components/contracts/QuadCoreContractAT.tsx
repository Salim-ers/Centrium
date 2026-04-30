'use client';

import type { Contract } from '@/types';
import { formatDate } from '@/lib/utils';
import { QuadCoreLogo } from '@/components/brand/QuadCoreLogo';

export type ContractIssuer = {
  brandName: string;
  legalName: string;
  legalForm: string | null;
  capitalEur: number | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  rcs: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  logoUrl: string | null;
  footerTagline: string | null;
  signatureUrl: string | null;
  billingEmailFallback?: string | null;
};

const DEFAULT_ISSUER: ContractIssuer = {
  brandName: 'QuadCore',
  legalName: 'QuadCore',
  legalForm: 'SAS',
  capitalEur: 1000,
  address: '5 Rue du Docteur Roux',
  city: 'Nogent Sur Oise',
  postalCode: '60180',
  country: 'FR',
  rcs: '101 694 016 R.C.S. Compiègne',
  representativeName: 'MOUHAMAD Moustakine',
  representativeTitle: 'Président',
  logoUrl: null,
  footerTagline: 'IT Services & Consulting',
  signatureUrl: null,
};

type Props = { contract: Contract; issuer?: ContractIssuer | null };

export function QuadCoreContractAT({ contract, issuer }: Props) {
  const iss = issuer ?? DEFAULT_ISSUER;
  const issuerCityLine = [iss.postalCode, iss.city].filter(Boolean).join(', ');
  const issuerRcsLine = iss.rcs
    ? `Immatriculée sous le N° RCS ${iss.rcs}`
    : null;
  const issuerCapital =
    iss.capitalEur != null
      ? `${iss.legalForm ?? 'SAS'} au Capital de ${iss.capitalEur.toLocaleString('fr-FR')} €`
      : iss.legalForm ?? null;
  const signedIn = iss.city ?? 'Nogent Sur Oise';
  const {
    contract_number,
    supplier_company_name,
    supplier_address,
    supplier_postal_code,
    supplier_city,
    supplier_rcs,
    supplier_representative,
    mission_title,
    client_name,
    client_address,
    work_location,
    remote_days_per_week,
    start_date,
    duration_months,
    daily_rate_eur,
    payment_terms_days,
    billing_email,
    non_compete_months,
    non_compete_penalty,
    jurisdiction_city,
  } = contract;

  return (
    <div
      className="cv-print-page bg-white text-black mx-auto font-serif"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm 22mm',
        fontFamily: 'Georgia, serif',
        fontSize: '11pt',
        lineHeight: 1.5,
      }}
    >
      {/* Logo émetteur en haut à gauche */}
      <div className="mb-8 flex items-start justify-between">
        <QuadCoreLogo size="lg" variant="light" src={iss.logoUrl} alt={iss.brandName} />
      </div>

      {/* Titre */}
      <div className="text-center mb-10">
        <h1 className="text-[16pt] font-bold tracking-wide uppercase">
          Contrat d'Assistance Technique
        </h1>
        <p className="text-[12pt] font-bold mt-2">N° {contract_number || 'XXXXXXX'}</p>
      </div>

      {/* ENTRE */}
      <p className="mb-6">ENTRE :</p>

      <div className="ml-10 mb-6">
        <p>
          La Société <strong>{iss.legalName}</strong>
          {issuerCapital && (
            <>
              <br />
              {issuerCapital}
            </>
          )}
          <br />
          Ayant son Siège Social au :
        </p>
        {(iss.address || issuerCityLine) && (
          <p className="ml-6 my-2">
            {iss.address}
            {iss.address && issuerCityLine && <br />}
            {issuerCityLine}
          </p>
        )}
        {(issuerRcsLine || iss.representativeName) && (
          <p>
            {issuerRcsLine}
            {issuerRcsLine && iss.representativeName && <br />}
            {iss.representativeName && (
              <>
                Représentée par {iss.representativeName}
                {iss.representativeTitle ? `, ${iss.representativeTitle}` : ''}
              </>
            )}
          </p>
        )}
        <p className="mt-4">
          Désignée ci-après <strong>« {iss.brandName} »</strong>,
        </p>
      </div>

      <p className="text-right mb-6">d'une part,</p>

      {/* ET */}
      <p className="mb-6">ET</p>

      <div className="ml-10 mb-6">
        <p>
          La Société{' '}
          <strong>{supplier_company_name || '[Société du consultant]'}</strong>
          <br />
          Ayant son Siège Social au :
        </p>
        <p className="ml-6 my-2">
          <strong>{supplier_address || '[Adresse du siège]'}</strong>
          <br />
          <strong>
            {supplier_postal_code || '[Code postal]'}{' '}
            {supplier_city || '[Ville]'}
          </strong>
        </p>
        <p>
          Immatriculée sous le N° RCS de{' '}
          <strong>{supplier_rcs || '[RCS de la société du consultant]'}</strong>
          <br />
          Représentée par Mr{' '}
          <strong>{supplier_representative || '[Prénom + Nom]'}</strong>, agissant en
          qualité de Président,
        </p>
        <p className="mt-4">Désignée ci-après « le Fournisseur »,</p>
      </div>

      <p className="text-right mb-6">d'autre part,</p>

      <p className="mb-6">Il est convenu ce qui suit :</p>

      {/* Articles */}
      <Article num="1" title="OBJET DU PRÉSENT CONTRAT">
        <p>
          Le Fournisseur s'engage par le présent contrat {`à fournir à ${iss.brandName} son`}
          assistance technique dans le cadre de prestations définies ci-après.
        </p>
        <p className="mt-2">
          Ce contrat est exclusif de toute notion de marché à forfait et de mise à
          disposition de personnel entrant dans le cadre du travail temporaire.
        </p>
      </Article>

      <Article num="2" title="NATURE DES TRAVAUX">
        <p className="font-semibold">{mission_title || '[Intitulé de la mission]'}</p>
      </Article>

      <Article num="3" title="LIEU D'EXÉCUTION">
        <p>
          La prestation est matériellement exécutée dans les locaux de la société{' '}
          <strong>{client_name || '[Nom du client]'}</strong>,{' '}
          <strong>{work_location || client_address || '[Adresse]'}</strong> et remote{' '}
          <strong>{remote_days_per_week ?? 0}</strong>{' '}
          {remote_days_per_week && remote_days_per_week > 1 ? 'jours' : 'jour'} par semaine.
        </p>
      </Article>

      <Article num="4" title="DUREE">
        <p>
          Le contrat est conclu pour la durée nécessaire à l'accomplissement des
          prestations qui en sont l'objet.
        </p>
        <p className="mt-2">
          La date de début est fixée au{' '}
          <strong>{formatDate(start_date)}</strong> pour une durée de{' '}
          <strong>{duration_months}</strong> mois.
        </p>
        <p className="mt-2">En cas de besoin, ce contrat pourra être prolongé par avenant.</p>
      </Article>

      <Article num="5" title="OBLIGATIONS DU FOURNISSEUR">
        <p>
          Le Fournisseur s'engage à mettre en œuvre tous les moyens nécessaires à
          l'exécution de la mission ci-dessus définie et plus précisément à :
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Réaliser les travaux dans les délais,</li>
          <li>Affecter des équipes qualifiées en fonction de la nature des travaux à réaliser.</li>
        </ul>
        <p className="mt-3">
          Pendant toute la durée d'exécution des travaux, le Fournisseur s'engage à
          maintenir en place l'équipe initialement prévue sauf demande contraire expresse
          de {iss.brandName}.
        </p>
        <p className="mt-2">
          Le personnel du Fournisseur amené à exécuter des prestations dans les locaux de{' '}
          {client_name || '[Nom du client]'} se conformera aux horaires de travail en
          vigueur, au règlement intérieur et aux règles d'hygiène et de sécurité en vigueur
          dans ces locaux, à moins que les parties n'en soient autrement convenues par
          écrit.
        </p>
        <p className="mt-2">
          Toute prise de congé devra faire tenir compte des impératifs de service du
          Client final.
        </p>
        <p className="mt-2">
          Il est rappelé que le personnel affecté à la réalisation des prestations
          d'assistance technique, objet des présentes, reste en tout état de cause sous
          l'autorité hiérarchique et disciplinaire du Fournisseur qui assure l'autorité
          technique, la gestion administrative, comptable et sociale de son personnel.
        </p>
        <p className="mt-2">
          Conformément aux articles L. 324-13-1 et suivants et R. 324-1 et suivants du
          Code du Travail relatifs au travail clandestin, le Fournisseur remettra, à la
          signature de ce contrat, une copie de l'inscription au registre du commerce et
          des sociétés (extrait KBIS) ainsi qu'une attestation de fourniture des
          déclarations sociales émanant de l'organisme de protection sociale chargé du
          recouvrement des cotisations sociales incombant au Fournisseur et datant de
          moins d'un an.
        </p>
        <p className="mt-2">
          Le Fournisseur certifie sur l'honneur que les salariés qui exécuteront les
          Prestations seront employés régulièrement au regard des dispositions du Code du
          Travail.
        </p>
      </Article>

      <Article num="6" title="RESILIATION">
        <p>Le contrat sera résilié de plein droit et sans aucune formalité :</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Par l'une des deux parties, en cas de force majeure.</li>
          <li>
            Par la partie lésée en cas de manquement grave aux obligations contenues
            dans le présent Contrat une semaine après l'envoi d'une mise en demeure par
            LR/AR restée sans effet.
          </li>
          <li>
            L'interruption du contrat par {client_name || '[Nom du client]'} est
            considérée comme un cas de force majeure.
          </li>
        </ul>
        <p className="mt-2">
          Par ailleurs, et en dehors des cas précisés ci-dessus, il pourra être résilié
          par l'une ou l'autre des parties, sous réserve d'un délai de préavis d'un mois,
          notifié par courrier.
        </p>
      </Article>

      <Article num="7" title="CONTROLE DES TRAVAUX">
        <p>
          Le Fournisseur déclare être l'employeur du personnel affecté à la réalisation
          de la mission. À ce titre, il continue entre autres à assurer la gestion
          administrative.
        </p>
        <p className="mt-2">
          Le Fournisseur assure l'encadrement hiérarchique et le contrôle de ses
          collaborateurs qui lui rendent compte régulièrement de l'avancement des travaux
          qui lui sont confiés.
        </p>
      </Article>

      <Article num="8" title="PROPRIETE">
        <p>
          Les études, analyses, travaux et programmes apportés et réalisés par le
          Fournisseur dans le cadre du présent contrat sont la propriété exclusive de{' '}
          {client_name || '[Nom du client]'}.
        </p>
        <p className="mt-2">
          Les programmes, les techniques et les méthodes utilisés par le Fournisseur pour
          l'exécution des prestations, objet du présent contrat, demeurent la propriété du
          Fournisseur.
        </p>
      </Article>

      <Article num="9" title="CONFIDENTIALITE">
        <p>
          Le Fournisseur s'engage à respecter la confidentialité de l'ensemble des
          informations auxquelles il aura accès dans le cadre de l'exécution du présent
          contrat pendant toute sa durée ainsi qu'après son expiration, et à faire prendre
          le même engagement par tout son personnel.
        </p>
        <p className="mt-2">
          En particulier, le Fournisseur s'engage à observer et à faire observer par son
          personnel la plus grande discrétion quant aux techniques et méthodes appartenant
          au Client et dont elle aurait été amenée à partager la connaissance du fait même
          de l'exécution de la prestation.
        </p>
        <p className="mt-2">
          Tous les collaborateurs du Fournisseur sont soumis au secret professionnel,
          aussi toutes les informations auxquelles ils auront accès dans le cadre de
          l'exécution du présent contrat sont confidentielles.
        </p>
        <p className="mt-2">
          D'une manière générale, le Fournisseur s'engage à garder le secret le plus
          absolu sur les informations et documents qui lui seront remis ou qui lui ont
          déjà été remis par le Client et qui revêtent tous un caractère confidentiel,
          ainsi que sur les informations et documents auxquels il aurait accès dans le
          cadre de l'exécution de ses prestations. Le Fournisseur s'engage de plus, à
          empêcher par tous moyens, la reproduction et l'utilisation des documents ou
          informations non expressément liés aux travaux confiés.
        </p>
        <p className="mt-2">
          Le Fournisseur s'engage à n'utiliser que les logiciels dont la licence est
          détenue par le Client et à ne pas procéder à des copies non autorisées.
        </p>
        <p className="mt-2">
          {iss.brandName} serait fondé à engager des poursuites judiciaires à l'encontre
          du Fournisseur et de tous coauteurs et complices et à réclamer des dommages et
          intérêts pour le cas où ces engagements n'auraient pas été tenus pour quelque
          cause que ce soit.
        </p>
        <p className="mt-2">
          Chacune des parties se porte-fort, au sens de l'article 1120 du Code Civil, du
          respect par ses préposés, mandataires ou sous-traitants, dûment autorisés, de
          l'engagement de confidentialité exposé ci-dessus.
        </p>
      </Article>

      <Article num="10" title="NON CONCURRENCE">
        <p>
          Le Fournisseur reconnaît qu'il n'est pas actuellement fournisseur de{' '}
          {client_name || '[Nom du client]'}. Seul {iss.brandName} assure la relation avec
          le client final.
        </p>
        <p className="mt-2">
          Le Fournisseur ne pourra proposer ses services, ou ceux d'autres prestataires,
          à {client_name || '[Nom du client]'}, directement, pendant un délai de{' '}
          <strong>{non_compete_months}</strong> mois après la fin de ce contrat sauf
          accord écrit préalable de {iss.brandName}.
        </p>
        <p className="mt-2">
          En cas de manquement à ces obligations la partie en faute versera à l'autre une
          indemnité égale au total des 6 (six) dernières factures mensuelles émises par
          ses soins.
        </p>
      </Article>

      <Article num="11" title="PRIX - MODALITES DE REGLEMENT">
        <p>
          La prestation, objet du présent contrat, est exécutée sur la base d'un tarif
          journalier de <strong>{daily_rate_eur} € HT</strong>.
        </p>
        <p className="mt-2">
          Seules les journées ou demi-journées effectivement travaillées par le
          Collaborateur seront facturées.
        </p>
        <p className="mt-2">
          La facture devra être impérativement accompagnée du rapport d'activité signé
          par le responsable de l'intervention.
        </p>
        <p className="mt-2">
          Les factures seront établies tous les mois et donneront le détail des
          règlements demandés, par N° de contrat ; elles seront envoyées à l'adresse
          suivante :
        </p>
        <div className="ml-8 my-3">
          <p>{iss.brandName}</p>
          {iss.address && <p>{iss.address}</p>}
          {issuerCityLine && <p>{issuerCityLine}</p>}
          {billing_email && (
            <p className="mt-1">
              Ou par mail : <strong>{billing_email}</strong>
            </p>
          )}
        </div>
        <p>
          Les factures seront réglées à <strong>{payment_terms_days}</strong> jours, date
          de réception.
        </p>
      </Article>

      <Article num="12" title="ASSURANCE">
        <p>
          Le Fournisseur certifie qu'il est titulaire d'une police d'assurance
          garantissant les conséquences pécuniaires de la responsabilité civile
          professionnelle, qu'elles soient délictuelles, quasi-délictuelles,
          contractuelles, quasi-contractuelles.
        </p>
        <p className="mt-2">
          {iss.brandName} se réserve le droit de demander à tout moment la justification
          de cette assurance.
        </p>
      </Article>

      <Article num="13" title="ATTRIBUTION DE COMPETENCE">
        <p>
          Toute difficulté relative à l'interprétation ou à l'exécution du présent contrat
          relèvera exclusivement de la compétence exclusive des Tribunaux de{' '}
          <strong>{jurisdiction_city}</strong>.
        </p>
      </Article>

      {/* Signatures */}
      <div className="mt-10">
        <p>
          Fait à {signedIn}, le{' '}
          <strong>{formatDate(new Date().toISOString())}</strong>
        </p>
        <p className="mt-1">en double exemplaire.</p>

        <div className="grid grid-cols-2 gap-12 mt-10">
          <div className="border-t border-black pt-2">
            <p className="font-bold">Pour {iss.brandName}</p>
            {iss.representativeName && (
              <p className="text-[9pt] text-neutral-600 mt-0.5">{iss.representativeName}</p>
            )}
            {iss.signatureUrl ? (
              <div className="mt-2 h-[60px] flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iss.signatureUrl}
                  alt={`Signature ${iss.brandName}`}
                  className="max-h-[60px] max-w-[220px] object-contain select-none"
                  draggable={false}
                />
              </div>
            ) : (
              <div style={{ height: '60px' }} />
            )}
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">Pour {supplier_company_name || '[Fournisseur]'}</p>
            <p className="text-[9pt] text-neutral-600 mt-0.5">
              {supplier_representative || '[Représentant]'}
            </p>
            <div style={{ height: '60px' }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-3 border-t border-neutral-300 text-center text-[9px] text-neutral-400 font-sans">
        {[
          iss.footerTagline
            ? `${iss.brandName} — ${iss.footerTagline}`
            : iss.brandName,
          [iss.address, issuerCityLine].filter(Boolean).join(', ') || null,
          iss.rcs ? `RCS ${iss.rcs}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
    </div>
  );
}

function Article({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <h2 className="font-bold uppercase mb-2 text-[11pt]">
        ARTICLE {num} : {title}
      </h2>
      <div className="text-justify">{children}</div>
    </section>
  );
}
