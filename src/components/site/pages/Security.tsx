import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Appear, Kicker, Lead, MaskImage, Section, Title, Wide } from '../kit';

// Uniquement des protections présentes dans le code ou la configuration
// d'infrastructure du dépôt. Toute nouvelle ligne doit pouvoir être
// vérifiée : pas de certification, d'audit, de SLA ni de chiffrement
// particulier qui ne le seraient pas.
const BLOCKS: Array<{ title: string; items: string[] }> = [
  {
    title: 'Hébergement et réseau',
    items: [
      'Base de données, fichiers et serveurs applicatifs situés en Suède (Union européenne).',
      'HTTPS obligatoire, avec HSTS.',
      'En-têtes de sécurité : Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy.',
    ],
  },
  {
    title: 'Isolation des organisations',
    items: [
      'Cloisonnement au niveau de la base de données (Row Level Security) sur les tables métier.',
      'Les accès sont vérifiés par des tests automatisés de non-régression (rôles, organisations, portails).',
      'Un client ne voit que les données de sa société ; un consultant ne voit ni TJM de vente, ni marge, ni notes internes.',
    ],
  },
  {
    title: 'Rôles, comptes et sessions',
    items: [
      'Permissions par rôle contrôlées côté serveur (API et base), pas seulement masquées à l’écran.',
      'Double authentification (TOTP) obligatoire pour les administrateurs.',
      'Mots de passe de 12 caractères minimum ; session fermée à la fermeture du navigateur.',
      'Invitations par lien personnel avec date d’expiration ; accès portail révocable à tout moment.',
    ],
  },
  {
    title: 'Documents',
    items: [
      'Stockage privé : aucun fichier n’est public.',
      'Téléchargement par lien signé valable 60 secondes, délivré après vérification des droits.',
      'Type réel du fichier contrôlé (signature) et taille limitée à 25 Mo.',
    ],
  },
  {
    title: 'Traçabilité et abus',
    items: [
      'Journal des actions sensibles : rôles, invitations, accès portail, documents, devis, préfacturation.',
      'Limitation du nombre de requêtes sur les routes sensibles (dépôts, invitations, formulaires publics).',
    ],
  },
  {
    title: 'Intégrations',
    items: [
      'Webhooks sortants en HTTPS uniquement, signés (HMAC-SHA256), secret affiché une seule fois.',
      'Adresses internes ou privées refusées pour les webhooks.',
      'Aucune clé privée exposée au navigateur.',
    ],
  },
  {
    title: 'Développement',
    items: [
      'Validation des entrées côté serveur (schémas Zod).',
      'Intégration continue : typage strict, lint, tests et build à chaque modification ; audit des dépendances (npm audit).',
      'Mises à jour de dépendances surveillées (Dependabot).',
    ],
  },
];

const LINKS = [
  { href: '/legal/privacy', label: 'Politique de confidentialité' },
  { href: '/legal/dpa', label: 'Accord de traitement des données (DPA)' },
  { href: '/legal/subprocessors', label: 'Sous-traitants' },
  { href: '/legal/responsible-disclosure', label: 'Signaler une vulnérabilité' },
  { href: '/status', label: 'État du service' },
];

/** Page Sécurité : les protections réellement déployées, rien d'autre. */
export function Security() {
  return (
    <>
      <Section tone="ink" aria-label="Sécurité" className="overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
        <Wide className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <Kicker n="01">Sécurité</Kicker>
            <Title as="h1" size="xl" immediate className="mt-6 text-[clamp(2.6rem,7vw,8rem)]" lines={[['Vos données.'], ['', { em: 'Cloisonnées.' }]]} />
            <Lead className="mt-8 text-ivory/80">Cette page ne liste que des protections effectivement déployées dans Centrium. Pas de promesse générale, pas de certification que nous n’avons pas.</Lead>
          </div>
          <MaskImage src="/photos/it-server-rack.webp" alt="Baie de serveurs aux voyants allumés" sizes="(min-width: 1024px) 38vw, 100vw" priority className="aspect-[4/5] rounded-[28px] lg:aspect-[3/4]" />
        </Wide>
      </Section>

      <Section tone="ivory" aria-label="Protections" className="py-24 md:py-32">
        <Wide>
          <ol className="border-t border-ink/15">
            {BLOCKS.map((b, i) => (
              <li key={b.title} className="border-b border-ink/15">
                <Appear className="grid gap-6 py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
                  <div className="flex items-baseline gap-4">
                    <span className="text-[12px] font-semibold tabular-nums tracking-[0.2em] text-terra">{String(i + 1).padStart(2, '0')}</span>
                    <h2 className="text-[clamp(1.6rem,2.6vw,2.4rem)] font-extrabold uppercase leading-[1] tracking-[-0.035em]">{b.title}</h2>
                  </div>
                  <ul className="space-y-3">
                    {b.items.map((it) => (
                      <li key={it} className="flex gap-3 text-[16px] leading-[1.55]">
                        <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-terra" aria-hidden />
                        {it}
                      </li>
                    ))}
                  </ul>
                </Appear>
              </li>
            ))}
          </ol>
        </Wide>
      </Section>

      <Section tone="dune" aria-label="Documents et contacts" className="py-24 md:py-28">
        <Wide className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Kicker n="02">Documents</Kicker>
            <Title size="md" className="mt-6" lines={[['Tout est ', { em: 'écrit.' }]]} />
            <p className="mt-6 text-[15px] text-ink-soft/75">
              Une question de sécurité ?{' '}
              <a href="mailto:contact@centrium-platform.com" className="font-semibold text-terra-deep underline-offset-4 hover:underline">
                contact@centrium-platform.com
              </a>
            </p>
          </div>
          <ul className="border-t border-ink/15">
            {LINKS.map((l) => (
              <li key={l.href} className="border-b border-ink/15">
                <Link href={l.href} data-cursor="Ouvrir" className="group flex items-center justify-between gap-4 py-5 text-[18px] font-semibold">
                  {l.label}
                  <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Wide>
      </Section>
    </>
  );
}
