'use client';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Sub = {
  name: string;
  purpose: string;
  purposeEn: string;
  data: string;
  dataEn: string;
  location: string;
  locationEn: string;
  transfer: string;
  transferEn: string;
  dpa: string;
  cert: string;
};

const SUBPROCESSORS: Sub[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Hébergement de la base de données PostgreSQL, authentification, stockage des fichiers.',
    purposeEn: 'Hosting of the PostgreSQL database, authentication, file storage.',
    data: 'Toutes les données de l\'application (consultants, contacts, factures, fichiers).',
    dataEn: 'All application data (consultants, contacts, invoices, files).',
    location: 'Union Européenne (Stockholm, Suède — région eu-north-1)',
    locationEn: 'European Union (Stockholm, Sweden — region eu-north-1)',
    transfer: 'Aucun transfert hors UE.',
    transferEn: 'No transfer outside the EU.',
    dpa: 'https://supabase.com/legal/dpa',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Hébergement de l\'application web (frontend Next.js + Edge Functions).',
    purposeEn: 'Hosting of the web application (Next.js frontend + Edge Functions).',
    data: 'Logs d\'accès (IP, user-agent), métadonnées des requêtes. Pas de données métier persistées.',
    dataEn: 'Access logs (IP, user-agent), request metadata. No business data persisted.',
    location: 'États-Unis (Vercel Inc.) — réseau edge mondial, calcul primaire en région européenne.',
    locationEn: 'United States (Vercel Inc.) — global edge network, primary compute in a European region.',
    transfer: 'Transfert hors UE possible via le réseau edge, encadré par des Clauses Contractuelles Types (CCT/SCC).',
    transferEn: 'Transfer outside the EU possible via the edge network, covered by Standard Contractual Clauses (SCCs).',
    dpa: 'https://vercel.com/legal/dpa',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Anthropic PBC',
    purpose: 'Traitement IA (optimisation de CV, matching consultants ↔ offres, assistant comptable).',
    purposeEn: 'AI processing (CV optimization, consultant ↔ offer matching, accounting assistant).',
    data: 'Texte des CV, briefs d\'offres et questions formulées par l\'utilisateur. Pas de stockage : Anthropic n\'entraîne pas ses modèles sur les requêtes API et ne conserve pas les prompts au-delà de 30 jours (politique API standard).',
    dataEn: 'CV text, offer briefs and questions formulated by the user. No storage: Anthropic does not train its models on API requests and does not retain prompts beyond 30 days (standard API policy).',
    location: 'États-Unis',
    locationEn: 'United States',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT) version 2021/914.',
    transferEn: 'Transfer outside the EU covered by Standard Contractual Clauses (SCCs) version 2021/914.',
    dpa: 'https://www.anthropic.com/legal/dpa',
    cert: 'SOC 2 Type II',
  },
  {
    name: 'Stripe Payments Europe Ltd.',
    purpose: 'Traitement des paiements clients (abonnements Centrium).',
    purposeEn: 'Processing of customer payments (Centrium subscriptions).',
    data: 'Email facturation, infos carte (tokenisées par Stripe, jamais reçues par Centrium), historique paiements.',
    dataEn: 'Billing email, card details (tokenized by Stripe, never received by Centrium), payment history.',
    location: 'Union Européenne (Irlande, siège européen)',
    locationEn: 'European Union (Ireland, European headquarters)',
    transfer: 'Stripe maintient des serveurs EU pour les marchands européens.',
    transferEn: 'Stripe maintains EU servers for European merchants.',
    dpa: 'https://stripe.com/legal/dpa',
    cert: 'PCI DSS Level 1 · SOC 2 Type II',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Envoi d\'emails transactionnels (invitations, notifications, alertes sécurité).',
    purposeEn: 'Sending transactional emails (invitations, notifications, security alerts).',
    data: 'Email destinataire + contenu de l\'email (textuel uniquement).',
    dataEn: 'Recipient email + email content (text only).',
    location: 'États-Unis (avec relais EU)',
    locationEn: 'United States (with EU relay)',
    transfer: 'Transfert hors UE encadré par CCT.',
    transferEn: 'Transfer outside the EU covered by SCCs.',
    dpa: 'https://resend.com/legal/dpa',
    cert: 'SOC 2 Type II',
  },
  {
    name: 'Functional Software, Inc. (Sentry)',
    purpose: 'Supervision des erreurs et observabilité applicative (monitoring, performance).',
    purposeEn: 'Error supervision and application observability (monitoring, performance).',
    data: 'Rapports d\'erreurs techniques (traces, métadonnées de requête). Les PII sont expurgées avant envoi (e-mails, cookies, en-têtes d\'authentification, tokens) et l\'option sendDefaultPii est désactivée.',
    dataEn: 'Technical error reports (traces, request metadata). PII is scrubbed before sending (emails, cookies, authentication headers, tokens) and the sendDefaultPii option is disabled.',
    location: 'États-Unis',
    locationEn: 'United States',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT/SCC).',
    transferEn: 'Transfer outside the EU covered by Standard Contractual Clauses (SCCs).',
    dpa: 'https://sentry.io/legal/dpa/',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Formspree, Inc.',
    purpose: 'Réception et acheminement des messages du formulaire de contact.',
    purposeEn: 'Reception and routing of contact-form messages.',
    data: 'Nom, e-mail professionnel, société et message saisis dans le formulaire de contact.',
    dataEn: 'Name, professional email, company and message entered in the contact form.',
    location: 'États-Unis',
    locationEn: 'United States',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT/SCC).',
    transferEn: 'Transfer outside the EU covered by Standard Contractual Clauses (SCCs).',
    dpa: 'https://formspree.io/legal/dpa/',
    cert: 'Conformité RGPD · Chiffrement TLS',
  },
];

export function SubprocessorsContent() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <LegalShell
      title={isEn ? 'Subprocessors' : 'Sous-traitants'}
      updatedAt={isEn ? 'June 4, 2026' : '4 juin 2026'}
      currentSlug="subprocessors"
    >
      {isEn ? (
        <>
          <p>
            This page publicly lists the third-party providers used by QuadCore SAS (publisher of Centrium), and
            constitutes the &quot;Subsequent subprocessors&quot; annex of the{' '}
            <a href="/legal/dpa" className="text-magenta hover:underline">Data Processing Agreement (DPA)</a> within the
            meaning of Article 28.3 of the GDPR.
          </p>
          <p>
            <strong>Roles.</strong> For the data its ESN clients enter into Centrium (consultants, contacts, contracts,
            invoices), QuadCore acts as a <strong>processor</strong> (Art. 28): the providers below are then{' '}
            <strong>subsequent subprocessors</strong>. For the account, billing and prospecting data of its own users,
            QuadCore acts as a <strong>data controller</strong> and these providers are its direct subprocessors. This
            page lists them all for transparency.
          </p>
          <p>
            <strong>Flow-down of obligations (Art. 28.4).</strong> QuadCore contractually imposes on each subsequent
            subprocessor the <strong>same data-protection obligations</strong> as those of its own DPA and{' '}
            <strong>remains fully liable</strong> to its clients for their performance.
          </p>
          <p>
            <strong>Notification &amp; objection.</strong> Any change to this list (addition, removal, change of
            location) is notified to clients by email (account address) and via the Platform at least{' '}
            <strong>30 days</strong> before it takes effect. The client may object on legitimate grounds during this
            period; failing agreement within 30 days after the objection, they may{' '}
            <strong>terminate without penalty</strong> the affected services, with a pro-rata refund of amounts paid in
            advance and not consumed. To subscribe to updates:{' '}
            <a href="mailto:dpo@centrium-platform.com" className="text-magenta hover:underline">dpo@centrium-platform.com</a>.
          </p>
        </>
      ) : (
        <>
          <p>
            Cette page liste publiquement les prestataires tiers auxquels QuadCore SAS
            (éditeur de Centrium) recourt, et constitue l&apos;annexe « Sous-traitants
            ultérieurs » de l&apos;<a href="/legal/dpa" className="text-magenta hover:underline">Accord de
            sous-traitance (DPA)</a> au sens de l&apos;article 28.3 du RGPD.
          </p>
          <p>
            <strong>Rôles.</strong> Pour les données que ses clients ESN saisissent dans
            Centrium (consultants, contacts, contrats, factures), QuadCore agit en{' '}
            <strong>sous-traitant</strong> (art. 28) : les prestataires ci-dessous sont
            alors des <strong>sous-traitants ultérieurs</strong>. Pour les données de
            compte, de facturation et de prospection de ses propres utilisateurs, QuadCore
            agit en <strong>responsable de traitement</strong> et ces prestataires sont ses
            sous-traitants directs. Cette page les recense tous par transparence.
          </p>
          <p>
            <strong>Répercussion des obligations (art. 28.4).</strong> QuadCore impose
            contractuellement à chaque sous-traitant ultérieur les <strong>mêmes obligations
            de protection des données</strong> que celles de son propre DPA et{' '}
            <strong>demeure pleinement responsable</strong> envers ses clients de leur
            exécution.
          </p>
          <p>
            <strong>Notification & objection.</strong> Toute modification de cette liste
            (ajout, retrait, changement de localisation) est notifiée aux clients par email
            (adresse du compte) et via la Plateforme au moins <strong>30 jours</strong> avant
            prise d&apos;effet. Le client peut s&apos;y opposer pour motif légitime pendant
            ce délai ; à défaut d&apos;accord sous 30 jours après l&apos;objection, il peut{' '}
            <strong>résilier sans pénalité</strong> les prestations affectées, avec
            remboursement au prorata des sommes payées d&apos;avance et non consommées. Pour
            s&apos;abonner aux mises à jour :{' '}
            <a href="mailto:dpo@centrium-platform.com" className="text-magenta hover:underline">dpo@centrium-platform.com</a>.
          </p>
        </>
      )}

      {SUBPROCESSORS.map((sp) => (
        <section key={sp.name} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-white">{sp.name}</h2>
          <dl className="mt-3 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-white/50">{isEn ? 'Purpose' : 'Finalité'}</dt>
            <dd className="text-white/85">{isEn ? sp.purposeEn : sp.purpose}</dd>
            <dt className="text-white/50">{isEn ? 'Data processed' : 'Données traitées'}</dt>
            <dd className="text-white/85">{isEn ? sp.dataEn : sp.data}</dd>
            <dt className="text-white/50">{isEn ? 'Location' : 'Localisation'}</dt>
            <dd className="text-white/85">{isEn ? sp.locationEn : sp.location}</dd>
            <dt className="text-white/50">{isEn ? 'Transfer outside the EU' : 'Transfert hors UE'}</dt>
            <dd className="text-white/85">{isEn ? sp.transferEn : sp.transfer}</dd>
            <dt className="text-white/50">{isEn ? 'Certifications' : 'Certifications'}</dt>
            <dd className="text-white/85">{sp.cert}</dd>
            <dt className="text-white/50">DPA</dt>
            <dd>
              <a
                href={sp.dpa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-magenta hover:underline"
              >
                {sp.dpa.replace(/^https?:\/\//, '')}
              </a>
            </dd>
          </dl>
        </section>
      ))}

      <hr className="my-10 border-white/10" />

      <h2>{isEn ? 'Our commitment' : 'Notre engagement'}</h2>
      <p>
        {isEn
          ? 'All our subprocessors provide security guarantees appropriate to the sensitivity of the data processed (depending on the provider: SOC 2, ISO 27001, encryption at rest and in transit, regular audits). None of our subprocessors accesses the data for anything other than providing its strictly defined service above.'
          : 'Tous nos sous-traitants présentent des garanties de sécurité appropriées à la sensibilité des données traitées (selon le prestataire : SOC 2, ISO 27001, chiffrement au repos et en transit, audits réguliers). Aucun de nos sous-traitants n\'accède aux données pour autre chose que la fourniture de son service strictement défini ci-dessus.'}
      </p>

      <p>
        {isEn ? 'For any question: ' : 'Pour toute question : '}
        <a href="mailto:dpo@centrium-platform.com" className="text-magenta hover:underline">dpo@centrium-platform.com</a>
      </p>
    </LegalShell>
  );
}
