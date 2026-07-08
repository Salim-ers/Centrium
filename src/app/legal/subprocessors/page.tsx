import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';

export const metadata: Metadata = {
  title: 'Sous-traitants',
  description:
    'Liste publique et versionnée des sous-traitants utilisés par Centrium pour fournir le service. Conforme article 28 RGPD.',
  alternates: { canonical: '/legal/subprocessors' },
};

const SUBPROCESSORS = [
  {
    name: 'Supabase Inc.',
    purpose: 'Hébergement de la base de données PostgreSQL, authentification, stockage des fichiers.',
    data: 'Toutes les données de l\'application (consultants, contacts, factures, fichiers).',
    location: 'Union Européenne (Stockholm, Suède — région eu-north-1)',
    transfer: 'Aucun transfert hors UE.',
    dpa: 'https://supabase.com/legal/dpa',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Hébergement de l\'application web (frontend Next.js + Edge Functions).',
    data: 'Logs d\'accès (IP, user-agent), métadonnées des requêtes. Pas de données métier persistées.',
    location: 'États-Unis (Vercel Inc.) — réseau edge mondial, calcul primaire en région européenne.',
    transfer: 'Transfert hors UE possible via le réseau edge, encadré par des Clauses Contractuelles Types (CCT/SCC).',
    dpa: 'https://vercel.com/legal/dpa',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Anthropic PBC',
    purpose: 'Traitement IA (optimisation de CV, matching consultants ↔ offres, assistant comptable).',
    data: 'Texte des CV, briefs d\'offres et questions formulées par l\'utilisateur. Pas de stockage : Anthropic n\'entraîne pas ses modèles sur les requêtes API et ne conserve pas les prompts au-delà de 30 jours (politique API standard).',
    location: 'États-Unis',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT) version 2021/914.',
    dpa: 'https://www.anthropic.com/legal/dpa',
    cert: 'SOC 2 Type II',
  },
  {
    name: 'Stripe Payments Europe Ltd.',
    purpose: 'Traitement des paiements clients (abonnements Centrium).',
    data: 'Email facturation, infos carte (tokenisées par Stripe, jamais reçues par Centrium), historique paiements.',
    location: 'Union Européenne (Irlande, siège européen)',
    transfer: 'Stripe maintient des serveurs EU pour les marchands européens.',
    dpa: 'https://stripe.com/legal/dpa',
    cert: 'PCI DSS Level 1 · SOC 2 Type II',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Envoi d\'emails transactionnels (invitations, notifications, alertes sécurité).',
    data: 'Email destinataire + contenu de l\'email (textuel uniquement).',
    location: 'États-Unis (avec relais EU)',
    transfer: 'Transfert hors UE encadré par CCT.',
    dpa: 'https://resend.com/legal/dpa',
    cert: 'SOC 2 Type II',
  },
  {
    name: 'Functional Software, Inc. (Sentry)',
    purpose: 'Supervision des erreurs et observabilité applicative (monitoring, performance).',
    data: 'Rapports d\'erreurs techniques (traces, métadonnées de requête). Les PII sont expurgées avant envoi (e-mails, cookies, en-têtes d\'authentification, tokens) et l\'option sendDefaultPii est désactivée.',
    location: 'États-Unis',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT/SCC).',
    dpa: 'https://sentry.io/legal/dpa/',
    cert: 'SOC 2 Type II · ISO 27001',
  },
  {
    name: 'Formspree, Inc.',
    purpose: 'Réception et acheminement des messages du formulaire de contact.',
    data: 'Nom, e-mail professionnel, société et message saisis dans le formulaire de contact.',
    location: 'États-Unis',
    transfer: 'Transfert hors UE encadré par des Clauses Contractuelles Types (CCT/SCC).',
    dpa: 'https://formspree.io/legal/dpa/',
    cert: 'Conformité RGPD · Chiffrement TLS',
  },
];

export default function SubprocessorsPage() {
  return (
    <LegalShell
      title="Sous-traitants"
      updatedAt="4 juin 2026"
      currentSlug="privacy"
    >
      <p>
        En tant que sous-traitant au sens de l&apos;article 28 du RGPD, QuadCore SAS
        (éditeur de Centrium) recourt à un nombre limité de sous-traitants
        ultérieurs pour fournir son service. Cette page liste publiquement ces
        sous-traitants et les conditions de leur intervention.
      </p>

      <p>
        <strong>Notification de changement.</strong> Toute modification de cette
        liste (ajout, retrait, changement de localisation) sera notifiée aux
        clients par email au moins 30 jours avant prise d&apos;effet. Les clients
        disposent d&apos;un droit d&apos;objection raisonné pendant cette période.
      </p>

      {SUBPROCESSORS.map((sp) => (
        <section key={sp.name} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-white">{sp.name}</h2>
          <dl className="mt-3 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-white/50">Finalité</dt>
            <dd className="text-white/85">{sp.purpose}</dd>
            <dt className="text-white/50">Données traitées</dt>
            <dd className="text-white/85">{sp.data}</dd>
            <dt className="text-white/50">Localisation</dt>
            <dd className="text-white/85">{sp.location}</dd>
            <dt className="text-white/50">Transfert hors UE</dt>
            <dd className="text-white/85">{sp.transfer}</dd>
            <dt className="text-white/50">Certifications</dt>
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

      <h2>Notre engagement</h2>
      <p>
        Tous nos sous-traitants présentent des garanties de sécurité appropriées
        à la sensibilité des données traitées (selon le prestataire : SOC 2,
        ISO 27001, chiffrement au repos et en transit, audits réguliers). Aucun de nos
        sous-traitants n&apos;accède aux données pour autre chose que la
        fourniture de son service strictement défini ci-dessus.
      </p>

      <p>
        Pour toute question : <a href="mailto:dpo@centrium-platform.com" className="text-magenta hover:underline">dpo@centrium-platform.com</a>
      </p>
    </LegalShell>
  );
}
