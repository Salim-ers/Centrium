export function DPA() {
  return (
    <div>
      <p>
        Le présent <strong>Accord de sous-traitance des données personnelles</strong> (« DPA » pour <em>Data Processing
        Agreement</em>) encadre les traitements de données personnelles effectués par{' '}
        <strong>QuadCore SAS</strong>, immatriculée au RCS de Compiègne sous le numéro 101 694 016, dont le siège
        social est situé 5 Rue du Docteur Roux, 60180 Nogent-sur-Oise (« le Sous-traitant »), pour le compte du
        Client (« le Responsable de traitement ») dans le cadre de la fourniture de la plateforme SaaS Centrium
        (éditée par QuadCore SAS).
      </p>
      <p>
        Il fait partie intégrante des <strong>Conditions Générales d&apos;Utilisation et de Services</strong> et est
        conclu conformément à l&apos;<strong>article 28 du RGPD</strong>.
      </p>

      <h2>1. Description du traitement</h2>
      <ul>
        <li><strong>Nature du traitement :</strong> hébergement, stockage, structuration, consultation, parsing par IA,
          restitution et suppression de données confiées par le Client.</li>
        <li><strong>Finalités :</strong> fournir le service décrit dans les CGU/CGS (gestion consultants, CV Optimizer,
          CRM, CRA, facturation).</li>
        <li><strong>Durée :</strong> pendant toute la durée de l&apos;abonnement, augmentée d&apos;une période de
          restitution de 30 jours.</li>
        <li><strong>Catégories de personnes concernées :</strong> consultants (internes et externes du Client), salariés
          du Client, contacts clients / recruteurs, prospects.</li>
        <li><strong>Catégories de données :</strong> identité, coordonnées professionnelles, CV, expériences, compétences,
          certifications, disponibilités, TJM, notes commerciales, temps saisis, factures.</li>
        <li><strong>Aucune donnée sensible</strong> n&apos;est traitée intentionnellement. Le Client s&apos;engage à ne
          pas importer de données relevant des catégories particulières (art. 9 RGPD : santé, opinions religieuses,
          orientation sexuelle, etc.) sauf cadrage contractuel explicite.</li>
      </ul>

      <h2>2. Obligations du Sous-traitant (QUADCORE)</h2>
      <p>QUADCORE s&apos;engage à :</p>
      <ul>
        <li>Traiter les données <strong>uniquement sur instruction documentée</strong> du Client, matérialisée par les
          CGU/CGS et les configurations choisies dans la Plateforme ;</li>
        <li>Garantir la <strong>confidentialité</strong> des données et imposer à ses personnels un engagement de
          confidentialité ;</li>
        <li>Mettre en œuvre les <strong>mesures techniques et organisationnelles</strong> décrites à l&apos;Annexe 1 ;</li>
        <li>Assister le Client dans la réponse aux demandes d&apos;exercice des droits des personnes concernées ;</li>
        <li>Aider le Client, compte tenu de la nature du traitement et des informations disponibles, à respecter ses
          obligations des articles 32 à 36 du RGPD, y compris pour la réalisation des <strong>analyses d&apos;impact
          (AIPD, art. 35)</strong> et, le cas échéant, la <strong>consultation préalable de la CNIL (art. 36)</strong> ;</li>
        <li>Informer <strong>immédiatement</strong> le Client si une instruction lui paraît constituer une violation du
          RGPD ou d&apos;une autre règle de protection des données, QUADCORE pouvant alors suspendre l&apos;exécution de
          l&apos;instruction litigieuse sans engager sa responsabilité (art. 28.3, dernier alinéa) ;</li>
        <li>Notifier au Client toute <strong>violation de données</strong> dans les meilleurs délais et, au plus tard,
          sous <strong>72 heures</strong> après en avoir pris connaissance, avec les informations nécessaires à sa
          propre notification CNIL ;</li>
        <li>Mettre à disposition toute information démontrant le respect des obligations et permettre au Client la
          réalisation d&apos;<strong>audits, y compris des inspections</strong>, à ses frais et sur préavis raisonnable,
          dans la limite d&apos;un audit par an — cette limite ne s&apos;appliquant pas en cas d&apos;incident de
          sécurité avéré ou de demande d&apos;une autorité de contrôle. Ce droit est ouvert à tout Client quel que soit
          son plan ; les modalités préservent la confidentialité des données des autres clients ;</li>
        <li>Ne traiter les données, y compris en cas de <strong>transfert hors UE</strong>, que sur instruction
          documentée, sauf obligation légale (le Client en étant alors informé, sauf interdiction d&apos;intérêt
          public) — voir article 5.</li>
      </ul>

      <h2>3. Obligations du Client (Responsable de traitement)</h2>
      <ul>
        <li>Déterminer les finalités et moyens du traitement ;</li>
        <li>S&apos;assurer de la licéité des données importées (<strong>base légale, consentements préalables</strong>,
          notamment pour les consultants et prospects) ;</li>
        <li>Informer les personnes concernées conformément aux articles 13 et 14 du RGPD ;</li>
        <li>Configurer la Plateforme (durées de conservation, accès, rôles) de manière conforme à ses obligations ;</li>
        <li>Payer les redevances dues pour la fourniture du service.</li>
      </ul>

      <h2>4. Sous-traitants ultérieurs</h2>
      <p>
        Le Client <strong>autorise</strong> QUADCORE à recourir aux sous-traitants ultérieurs listés ci-dessous. Toute
        modification substantielle (ajout, remplacement) sera notifiée par e-mail et via la Plateforme au moins
        <strong> 30 jours</strong> avant prise d&apos;effet, le Client pouvant s&apos;y opposer pour motif légitime.
      </p>
      <table className="w-full text-sm my-4 border-collapse">
        <thead>
          <tr className="text-left border-b border-hairline">
            <th className="py-2 pr-4 text-white">Sous-traitant</th>
            <th className="py-2 pr-4 text-white">Finalité</th>
            <th className="py-2 text-white">Localisation</th>
          </tr>
        </thead>
        <tbody className="text-white/75">
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Supabase, Inc.</td><td className="py-2 pr-4">Base de données, Auth, Storage</td><td className="py-2">UE (Stockholm, Suède — eu-north-1)</td></tr>
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Vercel, Inc.</td><td className="py-2 pr-4">Hébergement applicatif</td><td className="py-2">US / edge UE (CCT)</td></tr>
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Stripe Payments Europe Ltd.</td><td className="py-2 pr-4">Paiement abonnements</td><td className="py-2">UE (Irlande)</td></tr>
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Anthropic PBC</td><td className="py-2 pr-4">Moteur IA CV Optimizer</td><td className="py-2">US (CCT + DPF)</td></tr>
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Resend / Postmark</td><td className="py-2 pr-4">E-mails transactionnels</td><td className="py-2">UE / US (CCT)</td></tr>
          <tr className="border-b border-hairline"><td className="py-2 pr-4">Functional Software, Inc. (Sentry)</td><td className="py-2 pr-4">Supervision erreurs / observabilité</td><td className="py-2">US (CCT/SCC)</td></tr>
          <tr><td className="py-2 pr-4">Formspree, Inc.</td><td className="py-2 pr-4">Formulaire de contact</td><td className="py-2">US (CCT/SCC)</td></tr>
        </tbody>
      </table>
      <p>
        Conformément à l&apos;<strong>article 28.4 du RGPD</strong>, QUADCORE conclut avec chaque sous-traitant
        ultérieur un contrat écrit lui imposant les <strong>mêmes obligations de protection des données</strong> que
        celles prévues au présent DPA, notamment la mise en œuvre de mesures techniques et organisationnelles
        appropriées répondant aux exigences de l&apos;article 32. Lorsqu&apos;un sous-traitant ultérieur ne remplit pas
        ses obligations, <strong>QUADCORE demeure pleinement responsable</strong> à l&apos;égard du Client de
        l&apos;exécution par ce sous-traitant de ses obligations en matière de protection des données. En cas
        d&apos;opposition légitime du Client à un nouveau sous-traitant, les parties recherchent une solution
        proportionnée ; à défaut d&apos;accord sous 30 jours, le Client peut résilier sans pénalité les prestations
        affectées, avec remboursement au prorata des sommes payées d&apos;avance et non consommées.
      </p>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Lorsqu&apos;un transfert hors UE est nécessaire, QUADCORE met en place les garanties appropriées :
      </p>
      <ul>
        <li><strong>Clauses Contractuelles Types (CCT)</strong> de la Commission européenne (décision 2021/914) ;</li>
        <li><strong>EU-US Data Privacy Framework</strong> lorsque le sous-traitant y est certifié ;</li>
        <li>Mesures complémentaires : chiffrement TLS 1.2+, chiffrement au repos, minimisation, anonymisation lorsque
          possible.</li>
      </ul>

      <h2>6. Assistance du Sous-traitant</h2>
      <p>
        QUADCORE met à la disposition du Client des outils en libre-service pour l&apos;aider à respecter ses
        obligations : export des données (JSON / CSV), suppression d&apos;un compte utilisateur, purge sélective. Pour
        les demandes complexes non couvertes par les outils natifs, une assistance est fournie dans les conditions
        tarifaires du plan souscrit.
      </p>

      <h2>7. Violation de données</h2>
      <p>
        QUADCORE notifiera toute violation au Client par e-mail à l&apos;adresse de contact renseignée sur son compte
        dans un délai maximum de <strong>72 heures</strong>. La notification contiendra : description de la violation,
        catégories et volume approximatif de données concernées, conséquences probables, mesures prises ou proposées.
      </p>

      <h2>8. Fin du contrat — restitution et suppression</h2>
      <p>
        À la fin du contrat, le Client dispose d&apos;une période de <strong>30 jours</strong> pour exporter
        l&apos;intégralité de ses données via les outils natifs de la Plateforme. À l&apos;issue de cette période,
        QUADCORE procède à la <strong>suppression sécurisée</strong> des données, sauf obligation légale de conservation
        (facturation, logs de sécurité).
      </p>
      <p>
        <strong>Purge automatique des éléments archivés (en cours de contrat).</strong> Indépendamment de la restitution
        de fin de contrat décrite ci-dessus, la Plateforme applique une purge automatique mensuelle : les éléments
        archivés par le Client sont <strong>définitivement supprimés 30 jours après leur archivage</strong>. Ce mécanisme
        d&apos;hygiène des données, appliqué tout au long de la vie du compte, est distinct de la période de restitution
        de 30 jours applicable à la résiliation.
      </p>

      <h2>9. Audit</h2>
      <p>
        Le Client peut demander, à ses frais et avec un préavis raisonnable, la communication d&apos;une attestation
        de conformité. Les audits sur site ne sont réalisables que pour les plans Enterprise, dans des conditions
        définies contractuellement, et ne doivent pas perturber le fonctionnement du service.
      </p>

      <h2>Annexe 1 — Mesures techniques et organisationnelles</h2>
      <ul>
        <li>Chiffrement <strong>TLS 1.2+</strong> pour toutes les communications.</li>
        <li>Chiffrement au repos <strong>AES-256</strong> sur base de données et stockage.</li>
        <li>Authentification robuste, support SSO SAML/OIDC sur plan Enterprise.</li>
        <li>Isolation multi-tenant par <strong>Row Level Security (RLS)</strong> Supabase — aucune donnée ne peut
          transiter d&apos;une organisation à une autre.</li>
        <li>Principe du moindre privilège appliqué aux accès internes.</li>
        <li>Logs d&apos;audit, monitoring et alertes sur anomalies d&apos;accès.</li>
        <li>Sauvegardes chiffrées quotidiennes conservées 30 jours.</li>
        <li>Procédure de gestion des incidents de sécurité documentée.</li>
        <li>Revues de sécurité code / dépendances automatisées.</li>
        <li>Sensibilisation régulière des équipes.</li>
      </ul>

      <hr />
      <p className="text-sm text-white/50"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}
