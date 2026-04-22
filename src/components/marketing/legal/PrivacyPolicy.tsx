export function PrivacyPolicy() {
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
        <li><strong>E-mail du responsable / DPO :</strong> contact@quad-core.fr</li>
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
            <li><strong>Supabase</strong> (Inc., Singapour — hébergement base de données, stockage, auth — région UE)</li>
            <li><strong>Vercel</strong> (Inc., États-Unis — hébergement applicatif edge)</li>
            <li><strong>Stripe</strong> (Payments Europe Ltd., Irlande — paiement)</li>
            <li><strong>Anthropic</strong> (PBC, États-Unis — modèles IA pour CV Optimizer, sous CCT)</li>
            <li><strong>Resend / Postmark</strong> (envoi d&apos;e-mails transactionnels)</li>
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
        Ces droits s&apos;exercent par e-mail à <a href="mailto:contact@quad-core.fr">contact@quad-core.fr</a>,
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
      <p className="text-sm text-white/50"><em>Dernière mise à jour : avril 2026</em></p>
    </div>
  );
}
