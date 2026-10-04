'use client';

import { useLocale } from '@/lib/i18n/LocaleProvider';

export function PrivacyPolicy() {
  const { locale } = useLocale();
  if (locale === 'en') return <PrivacyEn />;
  return <PrivacyFr />;
}

function PrivacyFr() {
  return (
    <div>
      <p>
        La société <strong>QUADCORE SAS</strong> (ci-après « QUADCORE » ou « nous ») accorde une importance essentielle
        à la protection des données personnelles des utilisateurs de sa plateforme SaaS (ci-après « la Plateforme »).
      </p>
      <p>
        La présente Politique décrit la manière dont les données sont collectées, utilisées et protégées, conformément
        au <strong>Règlement (UE) 2016/679 du 27 avril 2016 (RGPD)</strong> et à la <strong>Loi n° 78-17 du 6 janvier
        1978 modifiée</strong> (« Informatique et Libertés »).
      </p>

      <h2>1. Responsable du traitement</h2>
      <ul>
        <li><strong>QuadCore SAS</strong>, représentée par Monsieur Mouhamad Moustakine, Président</li>
        <li><strong>Siège social :</strong> 5 Rue du Docteur Roux, 60180 Nogent-sur-Oise, France</li>
        <li><strong>SIREN :</strong> 101 694 016 — <strong>RCS :</strong> Compiègne</li>
        <li><strong>E-mail du responsable / DPO :</strong> contact@centrium-platform.com</li>
      </ul>
      <p>
        Concernant les données personnelles que vous nous confiez au sujet de <strong>vos consultants, contacts et
        clients</strong> dans le cadre de votre utilisation de la Plateforme, QUADCORE agit en qualité de{' '}
        <strong>sous-traitant au sens de l&apos;article 28 du RGPD</strong>. Les modalités sont détaillées dans notre{' '}
        <strong>Accord de sous-traitance (DPA)</strong>.
      </p>

      <h2>2. Données collectées</h2>

      <h3>2.1 Données du Client (compte ESN)</h3>
      <ul>
        <li>Identité du signataire : nom, prénom, fonction</li>
        <li>Coordonnées professionnelles : e-mail, téléphone</li>
        <li>Informations société : raison sociale, SIREN, adresse, pays</li>
        <li>Données de connexion : identifiants, logs d&apos;accès, adresse IP, user-agent</li>
        <li>Données de facturation et de paiement (traitées via Stripe — nous ne stockons pas de numéros de carte)</li>
      </ul>

      <h3>2.2 Données traitées pour le compte du Client (consultants, contacts, opportunités)</h3>
      <p>
        Le Client est responsable de traitement. QUADCORE agit comme sous-traitant. Ces données incluent : CV, parcours
        professionnel, compétences, certifications, disponibilités, TJM, contacts clients / recruteurs, opportunités
        commerciales, CRA, factures.
      </p>

      <h3>2.3 Données de navigation</h3>
      <ul>
        <li>Cookies strictement nécessaires (session, préférences)</li>
        <li>Mesure d&apos;audience anonymisée (si activée)</li>
        <li>Aucun cookie publicitaire ou de réseau social</li>
      </ul>

      <h2>3. Bases légales du traitement</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> (art. 6.1.b RGPD) — fournir l&apos;accès à la Plateforme, assurer le support, facturer</li>
        <li><strong>Intérêt légitime</strong> (art. 6.1.f RGPD) — sécurité, lutte contre la fraude, amélioration du service</li>
        <li><strong>Obligations légales</strong> (art. 6.1.c RGPD) — comptabilité, lutte anti-blanchiment, conservation des factures</li>
        <li><strong>Consentement</strong> (art. 6.1.a RGPD) — newsletters, communications commerciales non sollicitées</li>
      </ul>

      <h2>4. Finalités du traitement</h2>
      <ul>
        <li>Création, gestion et authentification de votre compte</li>
        <li>Exécution de l&apos;abonnement (mise à disposition de la Plateforme, support)</li>
        <li>Facturation et recouvrement</li>
        <li>Amélioration du service et résolution d&apos;incidents</li>
        <li>Sécurisation de la Plateforme (détection d&apos;intrusion, logs)</li>
        <li>Respect des obligations légales et comptables</li>
        <li>Communication commerciale (uniquement avec votre consentement ou dans le cadre d&apos;une relation contractuelle existante)</li>
      </ul>

      <h2>5. Destinataires & sous-traitants</h2>
      <p>Vos données peuvent être transmises à :</p>
      <ul>
        <li>Les équipes internes habilitées de QUADCORE (support, facturation, produit)</li>
        <li>Nos <strong>sous-traitants techniques</strong> listés dans la DPA, notamment :
          <ul>
            <li><strong>Supabase</strong> (Inc., Singapour — hébergement base de données, stockage, auth — région UE : Stockholm, eu-north-1)</li>
            <li><strong>Vercel</strong> (Inc., États-Unis — hébergement applicatif edge, transferts hors UE encadrés par CCT/SCC)</li>
            <li><strong>Stripe</strong> (Payments Europe Ltd., Irlande — paiement)</li>
            <li><strong>Anthropic</strong> (PBC, États-Unis — modèles IA pour CV Optimizer, sous CCT)</li>
            <li><strong>Resend / Postmark</strong> (envoi d&apos;e-mails transactionnels)</li>
            <li><strong>Sentry</strong> (Functional Software, Inc., États-Unis — supervision des erreurs et observabilité ; PII expurgées avant envoi, sous CCT/SCC)</li>
            <li><strong>Formspree</strong> (Formspree, Inc., États-Unis — réception du formulaire de contact, sous CCT/SCC)</li>
          </ul>
        </li>
        <li>Les autorités compétentes sur réquisition légale</li>
      </ul>
      <p>
        Vos données ne sont <strong>jamais vendues, louées ou cédées à des tiers</strong> à des fins commerciales.
      </p>

      <h2>6. Transferts hors Union européenne</h2>
      <p>
        Certains sous-traitants sont situés hors UE (États-Unis principalement). Ces transferts sont encadrés par :
      </p>
      <ul>
        <li>Les <strong>Clauses Contractuelles Types (CCT)</strong> de la Commission européenne (décision 2021/914)</li>
        <li>Le <strong>Data Privacy Framework (DPF)</strong> lorsque le sous-traitant y est certifié</li>
        <li>Des mesures techniques complémentaires : chiffrement en transit (TLS 1.2+), chiffrement au repos, minimisation des données</li>
      </ul>

      <h2>7. Durée de conservation</h2>
      <ul>
        <li><strong>Compte actif :</strong> pendant toute la durée du contrat</li>
        <li><strong>Données de facturation :</strong> 10 ans (obligation comptable — art. L.123-22 Code de commerce)</li>
        <li><strong>Données de prospection B2B :</strong> 3 ans à compter du dernier contact</li>
        <li><strong>Logs techniques / sécurité :</strong> 12 mois maximum</li>
        <li><strong>Données consultants & clients traitées pour votre compte :</strong> selon les instructions du Client, avec une durée maximale de 30 jours après résiliation pour la restitution, puis suppression</li>
        <li><strong>Éléments archivés :</strong> purge automatique et définitive 30 jours après leur archivage (traitement mensuel, en cours de contrat) — mécanisme distinct de la période de restitution de 30 jours applicable à la résiliation</li>
      </ul>

      <h2>8. Vos droits</h2>
      <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d&apos;accès</strong> — obtenir la copie des données vous concernant</li>
        <li><strong>Droit de rectification</strong> — corriger des données inexactes</li>
        <li><strong>Droit à l&apos;effacement</strong> (« droit à l&apos;oubli »)</li>
        <li><strong>Droit à la limitation</strong> du traitement</li>
        <li><strong>Droit d&apos;opposition</strong> pour motif légitime</li>
        <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré (JSON, CSV)</li>
        <li><strong>Droit de retirer votre consentement</strong> à tout moment</li>
        <li><strong>Droit de définir des directives post-mortem</strong> sur le sort de vos données</li>
      </ul>
      <p>
        Ces droits s&apos;exercent par e-mail à <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>,
        accompagné d&apos;un justificatif d&apos;identité. Nous répondons dans un délai maximum de <strong>30 jours</strong>
        (prolongeable de 2 mois pour les demandes complexes).
      </p>

      <h2>9. Sécurité</h2>
      <p>QUADCORE met en œuvre les mesures techniques et organisationnelles suivantes :</p>
      <ul>
        <li>Chiffrement <strong>TLS 1.2+</strong> de toutes les communications</li>
        <li>Chiffrement au repos (AES-256) sur base de données et stockage</li>
        <li>Authentification renforcée (mot de passe robuste, support SSO / MFA sur plans supérieurs)</li>
        <li>Isolation multi-tenant par <strong>Row Level Security (RLS)</strong> — aucune donnée ne fuite entre organisations</li>
        <li>Sauvegardes chiffrées quotidiennes</li>
        <li>Logs d&apos;audit et monitoring des accès</li>
        <li>Sensibilisation régulière des équipes aux bonnes pratiques</li>
        <li>Tests de sécurité (revues de code, dépendances, scans automatisés)</li>
      </ul>

      <h2>10. Violation de données</h2>
      <p>
        En cas de violation de données susceptible d&apos;engendrer un risque pour vos droits et libertés, QUADCORE
        s&apos;engage à notifier la <strong>CNIL sous 72 heures</strong> et, si le risque est élevé, à vous informer
        dans les meilleurs délais, conformément aux articles 33 et 34 du RGPD.
      </p>

      <h2>11. Réclamation auprès de la CNIL</h2>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une
        réclamation à la <strong>Commission Nationale de l&apos;Informatique et des Libertés (CNIL)</strong> :
      </p>
      <ul>
        <li>3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
        <li>Téléphone : 01 53 73 22 22</li>
        <li>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></li>
      </ul>

      <h2>12. Modifications</h2>
      <p>
        La présente Politique peut être amenée à évoluer. Toute modification sera publiée avec une date de mise à jour
        actualisée. Les modifications substantielles vous seront notifiées par e-mail ou via la Plateforme.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}

function PrivacyEn() {
  return (
    <div>
      <p>
        <em className="text-muted-foreground">
          This English version is provided for convenience. The French version prevails in the event of any
          discrepancy or dispute.
        </em>
      </p>
      <p>
        <strong>QUADCORE SAS</strong> (hereinafter &quot;QUADCORE&quot; or &quot;we&quot;) attaches essential importance
        to the protection of the personal data of users of its SaaS platform (hereinafter the &quot;Platform&quot;).
      </p>
      <p>
        This Policy describes how data is collected, used and protected, in accordance with{' '}
        <strong>Regulation (EU) 2016/679 of 27 April 2016 (GDPR)</strong> and the French{' '}
        <strong>Act No. 78-17 of 6 January 1978 as amended</strong> (&quot;Data Protection Act&quot;).
      </p>

      <h2>1. Data controller</h2>
      <ul>
        <li><strong>QuadCore SAS</strong>, represented by Mr Mouhamad Moustakine, President</li>
        <li><strong>Registered office:</strong> 5 Rue du Docteur Roux, 60180 Nogent-sur-Oise, France</li>
        <li><strong>SIREN:</strong> 101 694 016 — <strong>Trade register:</strong> Compiègne</li>
        <li><strong>Controller / DPO email:</strong> contact@centrium-platform.com</li>
      </ul>
      <p>
        Regarding the personal data you entrust to us about <strong>your consultants, contacts and clients</strong> as
        part of your use of the Platform, QUADCORE acts as a{' '}
        <strong>processor within the meaning of Article 28 of the GDPR</strong>. The terms are detailed in our{' '}
        <strong>Data Processing Agreement (DPA)</strong>.
      </p>

      <h2>2. Data collected</h2>

      <h3>2.1 Customer data (ESN account)</h3>
      <ul>
        <li>Signatory identity: last name, first name, role</li>
        <li>Professional contact details: email, phone</li>
        <li>Company information: legal name, SIREN, address, country</li>
        <li>Connection data: credentials, access logs, IP address, user-agent</li>
        <li>Billing and payment data (processed via Stripe — we do not store card numbers)</li>
      </ul>

      <h3>2.2 Data processed on behalf of the Customer (consultants, contacts, opportunities)</h3>
      <p>
        The Customer is the data controller. QUADCORE acts as processor. This data includes: CVs, professional
        background, skills, certifications, availability, day rates, client / recruiter contacts, sales opportunities,
        timesheets, invoices.
      </p>

      <h3>2.3 Browsing data</h3>
      <ul>
        <li>Strictly necessary cookies (session, preferences)</li>
        <li>Anonymized audience measurement (if enabled)</li>
        <li>No advertising or social-network cookies</li>
      </ul>

      <h2>3. Legal bases for processing</h2>
      <ul>
        <li><strong>Performance of the contract</strong> (Art. 6.1.b GDPR) — providing access to the Platform, support, billing</li>
        <li><strong>Legitimate interest</strong> (Art. 6.1.f GDPR) — security, fraud prevention, service improvement</li>
        <li><strong>Legal obligations</strong> (Art. 6.1.c GDPR) — accounting, anti-money laundering, invoice retention</li>
        <li><strong>Consent</strong> (Art. 6.1.a GDPR) — newsletters, unsolicited commercial communications</li>
      </ul>

      <h2>4. Purposes of processing</h2>
      <ul>
        <li>Creation, management and authentication of your account</li>
        <li>Performance of the subscription (making the Platform available, support)</li>
        <li>Billing and collection</li>
        <li>Service improvement and incident resolution</li>
        <li>Securing the Platform (intrusion detection, logs)</li>
        <li>Compliance with legal and accounting obligations</li>
        <li>Commercial communication (only with your consent or within an existing contractual relationship)</li>
      </ul>

      <h2>5. Recipients &amp; subprocessors</h2>
      <p>Your data may be transmitted to:</p>
      <ul>
        <li>QUADCORE&apos;s authorized internal teams (support, billing, product)</li>
        <li>Our <strong>technical subprocessors</strong> listed in the DPA, in particular:
          <ul>
            <li><strong>Supabase</strong> (Inc., Singapore — database hosting, storage, auth — EU region: Stockholm, eu-north-1)</li>
            <li><strong>Vercel</strong> (Inc., United States — edge application hosting, transfers outside the EU covered by SCCs)</li>
            <li><strong>Stripe</strong> (Payments Europe Ltd., Ireland — payment)</li>
            <li><strong>Anthropic</strong> (PBC, United States — AI models for CV Optimizer, under SCCs)</li>
            <li><strong>Resend / Postmark</strong> (transactional email delivery)</li>
            <li><strong>Sentry</strong> (Functional Software, Inc., United States — error supervision and observability; PII scrubbed before sending, under SCCs)</li>
            <li><strong>Formspree</strong> (Formspree, Inc., United States — contact form reception, under SCCs)</li>
          </ul>
        </li>
        <li>The competent authorities upon legal request</li>
      </ul>
      <p>
        Your data is <strong>never sold, rented or transferred to third parties</strong> for commercial purposes.
      </p>

      <h2>6. Transfers outside the European Union</h2>
      <p>
        Some subprocessors are located outside the EU (mainly the United States). These transfers are covered by:
      </p>
      <ul>
        <li>The <strong>Standard Contractual Clauses (SCCs)</strong> of the European Commission (decision 2021/914)</li>
        <li>The <strong>Data Privacy Framework (DPF)</strong> where the subprocessor is certified under it</li>
        <li>Additional technical measures: encryption in transit (TLS 1.2+), encryption at rest, data minimization</li>
      </ul>

      <h2>7. Retention period</h2>
      <ul>
        <li><strong>Active account:</strong> throughout the duration of the contract</li>
        <li><strong>Billing data:</strong> 10 years (accounting obligation — Art. L.123-22 French Commercial Code)</li>
        <li><strong>B2B prospecting data:</strong> 3 years from the last contact</li>
        <li><strong>Technical / security logs:</strong> 12 months maximum</li>
        <li><strong>Consultant &amp; client data processed on your behalf:</strong> per the Customer&apos;s instructions, with a maximum period of 30 days after termination for return, then deletion</li>
        <li><strong>Archived items:</strong> automatic and permanent purge 30 days after archiving (monthly processing, during the contract) — a mechanism distinct from the 30-day return period applicable at termination</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>In accordance with Articles 15 to 22 of the GDPR, you have the following rights:</p>
      <ul>
        <li><strong>Right of access</strong> — obtain a copy of the data concerning you</li>
        <li><strong>Right to rectification</strong> — correct inaccurate data</li>
        <li><strong>Right to erasure</strong> (&quot;right to be forgotten&quot;)</li>
        <li><strong>Right to restriction</strong> of processing</li>
        <li><strong>Right to object</strong> on legitimate grounds</li>
        <li><strong>Right to portability</strong> — receive your data in a structured format (JSON, CSV)</li>
        <li><strong>Right to withdraw your consent</strong> at any time</li>
        <li><strong>Right to set post-mortem directives</strong> on the fate of your data</li>
      </ul>
      <p>
        These rights are exercised by email at <a href="mailto:contact@centrium-platform.com">contact@centrium-platform.com</a>,
        together with proof of identity. We respond within a maximum of <strong>30 days</strong> (extendable by 2 months
        for complex requests).
      </p>

      <h2>9. Security</h2>
      <p>QUADCORE implements the following technical and organizational measures:</p>
      <ul>
        <li><strong>TLS 1.2+</strong> encryption of all communications</li>
        <li>Encryption at rest (AES-256) on database and storage</li>
        <li>Strengthened authentication (strong password, SSO / MFA support on higher plans)</li>
        <li>Multi-tenant isolation via <strong>Row Level Security (RLS)</strong> — no data leaks between organizations</li>
        <li>Daily encrypted backups</li>
        <li>Audit logs and access monitoring</li>
        <li>Regular team awareness of best practices</li>
        <li>Security testing (code reviews, dependencies, automated scans)</li>
      </ul>

      <h2>10. Data breach</h2>
      <p>
        In the event of a data breach likely to create a risk to your rights and freedoms, QUADCORE undertakes to notify
        the <strong>CNIL within 72 hours</strong> and, if the risk is high, to inform you as soon as possible, in
        accordance with Articles 33 and 34 of the GDPR.
      </p>

      <h2>11. Complaint to the CNIL</h2>
      <p>
        If, after contacting us, you consider that your rights are not respected, you may lodge a complaint with the
        French data protection authority (<strong>Commission Nationale de l&apos;Informatique et des Libertés — CNIL</strong>):
      </p>
      <ul>
        <li>3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France</li>
        <li>Phone: +33 1 53 73 22 22</li>
        <li>Website: <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></li>
      </ul>

      <h2>12. Changes</h2>
      <p>
        This Policy may change. Any modification will be published with an updated revision date. Substantial changes
        will be notified to you by email or via the Platform.
      </p>

      <hr />
      <p className="text-sm text-muted-foreground"><em>Last updated: April 2026</em></p>
    </div>
  );
}
