'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export function TermsOfService() {
  const { locale } = useLocale();
  if (locale === 'en') return <TermsEn />;
  return <TermsFr />;
}

function TermsFr() {
  return (
    <div>
      <p>
        Les présentes <strong>Conditions Générales d&apos;Utilisation et de Services</strong> (« CGU/CGS ») régissent
        l&apos;accès et l&apos;utilisation de la plateforme SaaS <strong>Centrium</strong> éditée par
        <strong> QUADCORE SAS</strong> (ci-après « QUADCORE »), par toute personne morale abonnée (ci-après « le
        Client ») et ses utilisateurs autorisés.
      </p>
      <p>
        Toute souscription à un abonnement emporte <strong>acceptation sans réserve</strong> des présentes CGU/CGS.
      </p>

      <h2>1. Objet</h2>
      <p>
        QUADCORE met à disposition du Client, en mode <strong>SaaS (Software-as-a-Service)</strong>, une plateforme
        métier destinée aux Entreprises de Services du Numérique (ESN) permettant notamment :
      </p>
      <ul>
        <li>la gestion d&apos;une bibliothèque de consultants ;</li>
        <li>l&apos;optimisation de CV par intelligence artificielle (template QuadCore propriétaire) ;</li>
        <li>le matching consultant ↔ mission et la gestion d&apos;un pipeline commercial (CRM) ;</li>
        <li>la saisie des comptes rendus d&apos;activité (CRA) et la facturation ;</li>
        <li>la génération d&apos;alertes et le pilotage de l&apos;activité via un dashboard.</li>
      </ul>

      <h2>2. Accès au service</h2>
      <p>
        L&apos;accès à la Plateforme requiert un abonnement payant. Chaque utilisateur du Client reçoit des identifiants
        strictement personnels, confidentiels et incessibles. Le Client est responsable de la confidentialité des
        identifiants et de l&apos;usage qui en est fait.
      </p>
      <p>
        La Plateforme est accessible 7j/7, 24h/24, sous réserve des opérations de maintenance planifiées ou urgentes et
        des cas de force majeure.
      </p>

      <h2>3. Abonnement et plans tarifaires</h2>
      <p>
        Les abonnements sont souscrits selon les plans proposés (Starter, Medium, Enterprise). Les tarifs,
        limites (nombre de consultants, utilisateurs internes) et fonctionnalités incluses sont décrits sur la page
        tarifs et rappelés sur la facture.
      </p>
      <ul>
        <li><strong>Engagement :</strong> mensuel sans engagement (sauf plan Enterprise — engagement annuel).</li>
        <li><strong>Facturation :</strong> mensuelle d&apos;avance, par carte bancaire ou SEPA via Stripe.</li>
        <li><strong>Modification de plan :</strong> possible à tout moment ; ajustement au prorata.</li>
        <li><strong>Résiliation :</strong> par le Client depuis son espace de facturation, prise d&apos;effet à la fin
          de la période en cours.</li>
        <li><strong>Impayé :</strong> en cas de défaut de paiement, QUADCORE peut suspendre l&apos;accès après relance
          et mise en demeure restée infructueuse sous 15 jours.</li>
      </ul>

      <h2>4. Période d&apos;essai</h2>
      <p>
        Si une période d&apos;essai gratuite est proposée, elle est expressément limitée dans le temps. À son terme, le
        Client devra souscrire un abonnement payant ou son compte sera automatiquement clôturé ; les données pourront
        être exportées pendant 30 jours, puis supprimées.
      </p>

      <h2>5. Obligations du Client</h2>
      <p>Le Client s&apos;engage à :</p>
      <ul>
        <li>utiliser la Plateforme conformément à sa destination et aux lois applicables ;</li>
        <li>ne pas porter atteinte à la sécurité ou au bon fonctionnement de la Plateforme ;</li>
        <li>ne pas tenter d&apos;accéder à des données d&apos;autres organisations, ni contourner les mécanismes
          d&apos;isolation multi-tenant ;</li>
        <li>disposer de tous les droits et consentements nécessaires sur les données (consultants, clients, contacts)
          qu&apos;il confie à la Plateforme ;</li>
        <li>maintenir à jour les informations de son compte et l&apos;intégrité de ses identifiants ;</li>
        <li>signaler sans délai toute faille de sécurité ou usage frauduleux suspecté.</li>
      </ul>

      <h2>6. Obligations de QUADCORE</h2>
      <ul>
        <li>Mettre à disposition du Client une Plateforme conforme à la description du plan souscrit ;</li>
        <li>Assurer un niveau de disponibilité cible de <strong>99,5 %</strong> mensuel (99,9 % sur plan Enterprise,
          hors maintenance planifiée et cas de force majeure) ;</li>
        <li>Mettre en œuvre les mesures de sécurité décrites dans la Politique de confidentialité et la DPA ;</li>
        <li>Assurer un support selon le canal et le délai prévus au plan souscrit (e-mail, priorité, SLA dédié) ;</li>
        <li>Conserver et restituer les données du Client à la résiliation dans les conditions fixées par la DPA.</li>
      </ul>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        QUADCORE reste titulaire exclusive de l&apos;ensemble des droits de propriété intellectuelle sur la Plateforme,
        ses composants, le <strong>template CV QuadCore</strong> propriétaire, les algorithmes de matching, et tout
        élément associé. Le Client bénéficie d&apos;un droit d&apos;usage personnel, non exclusif, non cessible, limité
        à la durée de l&apos;abonnement.
      </p>
      <p>
        Les données du Client et de ses utilisateurs lui appartiennent. Le Client concède à QUADCORE une licence
        strictement limitée, gratuite et non exclusive, aux seules fins de lui fournir le service (hébergement,
        traitement, restitution).
      </p>

      <h2>8. Fonctionnalités d&apos;intelligence artificielle</h2>
      <p>
        Le module <strong>CV Optimizer</strong> s&apos;appuie sur des modèles d&apos;IA. Il est conçu pour reformuler,
        restructurer et mettre en forme des informations <strong>déjà présentes</strong> dans les documents sources. Il
        ne doit <strong>en aucun cas inventer</strong> d&apos;expériences, certifications, langues ou compétences. Le
        Client reste seul responsable de la vérification du résultat avant diffusion à un client final.
      </p>
      <p>
        QUADCORE n&apos;utilise pas les données du Client pour entraîner des modèles tiers sans consentement explicite.
      </p>

      <h2>9. Responsabilité et garanties</h2>
      <p>
        La Plateforme est fournie « en l&apos;état ». QUADCORE ne garantit pas que le service sera exempt de toute
        interruption ou anomalie. QUADCORE s&apos;efforce de corriger les anomalies signalées dans des délais
        raisonnables.
      </p>
      <p>
        La responsabilité de QUADCORE, quelle qu&apos;en soit la cause, est expressément limitée au montant HT des
        redevances effectivement perçues au titre des <strong>douze (12) derniers mois</strong> précédant le fait
        générateur. QUADCORE ne saurait être responsable des dommages indirects : perte d&apos;exploitation, perte de
        chance, atteinte à l&apos;image, perte de contrats.
      </p>

      <h2>10. Force majeure</h2>
      <p>
        Aucune partie ne pourra être tenue responsable d&apos;un manquement résultant d&apos;un cas de force majeure au
        sens de l&apos;article 1218 du Code civil (catastrophe naturelle, conflit armé, cyber-attaque massive, panne
        générale Internet, décision gouvernementale, etc.).
      </p>

      <h2>11. Confidentialité</h2>
      <p>
        Chaque partie s&apos;engage à préserver la confidentialité des informations échangées dans le cadre de
        l&apos;exécution des présentes, pendant toute leur durée et pour une période de <strong>3 ans</strong> après la
        fin du contrat.
      </p>

      <h2>12. Protection des données personnelles</h2>
      <p>
        Le traitement des données personnelles est régi par la <strong>Politique de confidentialité</strong> et
        l&apos;<strong>Accord de sous-traitance (DPA)</strong> accessibles depuis la Plateforme, qui font partie
        intégrante du contrat.
      </p>

      <h2>13. Sous-traitance</h2>
      <p>
        QUADCORE se réserve le droit de faire appel à des sous-traitants techniques listés dans la DPA. La liste est
        tenue à jour et le Client sera notifié de toute modification substantielle avec un préavis de 30 jours.
      </p>

      <h2>14. Évolution des CGU/CGS</h2>
      <p>
        QUADCORE peut faire évoluer les présentes CGU/CGS. Toute modification substantielle est notifiée par e-mail au
        moins 30 jours avant prise d&apos;effet. L&apos;utilisation continue de la Plateforme après cette date vaut
        acceptation.
      </p>

      <h2>15. Résiliation pour manquement</h2>
      <p>
        En cas de manquement grave ou répété d&apos;une partie, l&apos;autre partie pourra résilier le contrat de plein
        droit, après mise en demeure restée infructueuse sous 15 jours, sans préjudice de dommages et intérêts.
      </p>

      <h2>16. Droit applicable & juridiction</h2>
      <p>
        Les présentes CGU/CGS sont soumises au <strong>droit français</strong>. Tout litige relatif à leur formation,
        interprétation ou exécution, qui n&apos;aurait pu être résolu à l&apos;amiable dans un délai de 30 jours, sera
        soumis à la <strong>compétence exclusive des tribunaux du ressort du siège social de QUADCORE SAS</strong>,
        nonobstant pluralité de défendeurs ou appel en garantie.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}

function TermsEn() {
  return (
    <div>
      <p>
        <em className="text-muted-foreground">
          This English version is provided for convenience. The French version prevails in the event of any
          discrepancy or dispute.
        </em>
      </p>
      <p>
        These <strong>Terms of Use and Service</strong> (&quot;Terms&quot;) govern access to and use of the SaaS
        platform <strong>Centrium</strong>, published by <strong>QUADCORE SAS</strong> (hereinafter
        &quot;QUADCORE&quot;), by any subscribing legal entity (hereinafter the &quot;Customer&quot;) and its
        authorized users.
      </p>
      <p>
        Any subscription entails <strong>unreserved acceptance</strong> of these Terms.
      </p>

      <h2>1. Purpose</h2>
      <p>
        QUADCORE makes available to the Customer, on a <strong>SaaS (Software-as-a-Service)</strong> basis, a business
        platform for IT services firms (ESN) enabling in particular:
      </p>
      <ul>
        <li>management of a consultant library;</li>
        <li>AI-powered CV optimization (proprietary QuadCore template);</li>
        <li>consultant ↔ mission matching and management of a sales pipeline (CRM);</li>
        <li>entry of activity reports (timesheets) and invoicing;</li>
        <li>alert generation and activity steering via a dashboard.</li>
      </ul>

      <h2>2. Access to the service</h2>
      <p>
        Access to the Platform requires a paid subscription. Each of the Customer&apos;s users receives strictly
        personal, confidential and non-transferable credentials. The Customer is responsible for the confidentiality of
        the credentials and their use.
      </p>
      <p>
        The Platform is accessible 24/7, subject to planned or urgent maintenance operations and events of force
        majeure.
      </p>

      <h2>3. Subscription and pricing plans</h2>
      <p>
        Subscriptions are taken out according to the plans offered (Starter, Medium, Enterprise). Prices, limits (number
        of consultants, internal users) and included features are described on the pricing page and stated on the
        invoice.
      </p>
      <ul>
        <li><strong>Commitment:</strong> monthly, no commitment (except the Enterprise plan — annual commitment).</li>
        <li><strong>Billing:</strong> monthly in advance, by card or SEPA via Stripe.</li>
        <li><strong>Plan change:</strong> possible at any time; prorated adjustment.</li>
        <li><strong>Termination:</strong> by the Customer from their billing area, taking effect at the end of the
          current period.</li>
        <li><strong>Non-payment:</strong> in the event of default, QUADCORE may suspend access after a reminder and
          formal notice remaining unsuccessful within 15 days.</li>
      </ul>

      <h2>4. Trial period</h2>
      <p>
        If a free trial period is offered, it is expressly limited in time. At its end, the Customer must take out a paid
        subscription or their account will be automatically closed; data may be exported for 30 days, then deleted.
      </p>

      <h2>5. Customer&apos;s obligations</h2>
      <p>The Customer undertakes to:</p>
      <ul>
        <li>use the Platform in accordance with its purpose and applicable laws;</li>
        <li>not undermine the security or proper functioning of the Platform;</li>
        <li>not attempt to access data of other organizations, nor circumvent multi-tenant isolation mechanisms;</li>
        <li>hold all rights and consents necessary over the data (consultants, clients, contacts) it entrusts to the
          Platform;</li>
        <li>keep its account information up to date and preserve the integrity of its credentials;</li>
        <li>report without delay any security breach or suspected fraudulent use.</li>
      </ul>

      <h2>6. QUADCORE&apos;s obligations</h2>
      <ul>
        <li>Provide the Customer with a Platform conforming to the description of the subscribed plan;</li>
        <li>Ensure a target availability level of <strong>99.5%</strong> monthly (99.9% on the Enterprise plan,
          excluding planned maintenance and events of force majeure);</li>
        <li>Implement the security measures described in the Privacy Policy and the DPA;</li>
        <li>Provide support according to the channel and turnaround set out in the subscribed plan (email, priority,
          dedicated SLA);</li>
        <li>Retain and return the Customer&apos;s data upon termination under the conditions set by the DPA.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        QUADCORE remains the exclusive owner of all intellectual property rights over the Platform, its components, the
        proprietary <strong>QuadCore CV template</strong>, the matching algorithms, and any associated element. The
        Customer benefits from a personal, non-exclusive, non-transferable right of use, limited to the duration of the
        subscription.
      </p>
      <p>
        The data of the Customer and its users belong to it. The Customer grants QUADCORE a strictly limited, free and
        non-exclusive license, solely for the purpose of providing the service (hosting, processing, return).
      </p>

      <h2>8. Artificial intelligence features</h2>
      <p>
        The <strong>CV Optimizer</strong> module relies on AI models. It is designed to reformulate, restructure and
        format information <strong>already present</strong> in the source documents. It must{' '}
        <strong>under no circumstances fabricate</strong> experiences, certifications, languages or skills. The Customer
        remains solely responsible for verifying the result before sending it to an end client.
      </p>
      <p>
        QUADCORE does not use the Customer&apos;s data to train third-party models without explicit consent.
      </p>

      <h2>9. Liability and warranties</h2>
      <p>
        The Platform is provided &quot;as is&quot;. QUADCORE does not warrant that the service will be free of any
        interruption or anomaly. QUADCORE endeavors to correct reported anomalies within reasonable timeframes.
      </p>
      <p>
        QUADCORE&apos;s liability, whatever the cause, is expressly limited to the pre-tax amount of fees actually
        collected over the <strong>last twelve (12) months</strong> preceding the triggering event. QUADCORE shall not
        be liable for indirect damages: loss of business, loss of opportunity, reputational harm, loss of contracts.
      </p>

      <h2>10. Force majeure</h2>
      <p>
        No party may be held liable for a failure resulting from an event of force majeure within the meaning of Article
        1218 of the French Civil Code (natural disaster, armed conflict, massive cyber-attack, general Internet outage,
        governmental decision, etc.).
      </p>

      <h2>11. Confidentiality</h2>
      <p>
        Each party undertakes to preserve the confidentiality of information exchanged in the performance of these
        Terms, throughout their duration and for a period of <strong>3 years</strong> after the end of the contract.
      </p>

      <h2>12. Protection of personal data</h2>
      <p>
        The processing of personal data is governed by the <strong>Privacy Policy</strong> and the{' '}
        <strong>Data Processing Agreement (DPA)</strong> accessible from the Platform, which form an integral part of
        the contract.
      </p>

      <h2>13. Subprocessing</h2>
      <p>
        QUADCORE reserves the right to use technical subprocessors listed in the DPA. The list is kept up to date and
        the Customer will be notified of any substantial change with 30 days&apos; notice.
      </p>

      <h2>14. Changes to the Terms</h2>
      <p>
        QUADCORE may amend these Terms. Any substantial change is notified by email at least 30 days before it takes
        effect. Continued use of the Platform after that date constitutes acceptance.
      </p>

      <h2>15. Termination for breach</h2>
      <p>
        In the event of a serious or repeated breach by one party, the other party may terminate the contract as of
        right, after formal notice remaining unsuccessful within 15 days, without prejudice to damages.
      </p>

      <h2>16. Governing law &amp; jurisdiction</h2>
      <p>
        These Terms are governed by <strong>French law</strong>. Any dispute relating to their formation,
        interpretation or performance, which could not be resolved amicably within 30 days, shall be submitted to the{' '}
        <strong>exclusive jurisdiction of the courts of the registered office of QUADCORE SAS</strong>, notwithstanding
        multiple defendants or third-party proceedings.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground"><em>Last updated: April 2026</em></p>
    </div>
  );
}
