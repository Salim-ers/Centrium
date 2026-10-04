'use client';

import Link from 'next/link';
import { Code2, FileLock2, Globe2, KeyRound, Network, ScrollText, ShieldCheck, Webhook } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { FadeIn } from '@/components/site/Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Lang = 'fr' | 'en';
type Block = { icon: React.ElementType; title: { fr: string; en: string }; items: { fr: string[]; en: string[] } };

// Uniquement des protections présentes dans le code ou la configuration
// d'infrastructure du dépôt. Toute nouvelle ligne doit pouvoir être vérifiée.
const BLOCKS: Block[] = [
  {
    icon: Globe2,
    title: { fr: 'Hébergement et réseau', en: 'Hosting and network' },
    items: {
      fr: [
        'Base de données, fichiers et serveurs applicatifs situés en Suède (Union européenne).',
        'HTTPS obligatoire, avec HSTS.',
        'En-têtes de sécurité : Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy.',
      ],
      en: [
        'Database, files and application servers located in Sweden (European Union).',
        'HTTPS enforced, with HSTS.',
        'Security headers: Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy.',
      ],
    },
  },
  {
    icon: ShieldCheck,
    title: { fr: 'Isolation des organisations', en: 'Organisation isolation' },
    items: {
      fr: [
        'Cloisonnement au niveau de la base de données (Row Level Security) sur les tables métier.',
        'Les accès sont vérifiés par des tests automatisés de non-régression (rôles, organisations, portails).',
        'Un client ne voit que les données de sa société ; un consultant ne voit ni TJM de vente, ni marge, ni notes internes.',
      ],
      en: [
        'Database-level isolation (Row Level Security) on business tables.',
        'Access is checked by automated regression tests (roles, organisations, portals).',
        'A client only sees their company’s data; a consultant never sees sale rates, margins or internal notes.',
      ],
    },
  },
  {
    icon: KeyRound,
    title: { fr: 'Rôles, comptes et sessions', en: 'Roles, accounts and sessions' },
    items: {
      fr: [
        'Permissions par rôle contrôlées côté serveur (API et base), pas seulement masquées à l’écran.',
        'Double authentification (TOTP) obligatoire pour les administrateurs.',
        'Mots de passe de 12 caractères minimum ; session fermée à la fermeture du navigateur.',
        'Invitations par lien personnel avec date d’expiration ; accès portail révocable à tout moment.',
      ],
      en: [
        'Role permissions enforced server-side (API and database), not just hidden on screen.',
        'Two-factor authentication (TOTP) required for administrators.',
        'Passwords of at least 12 characters; session ends when the browser closes.',
        'Invitations via personal links with an expiry date; portal access revocable at any time.',
      ],
    },
  },
  {
    icon: FileLock2,
    title: { fr: 'Documents', en: 'Documents' },
    items: {
      fr: [
        'Stockage privé : aucun fichier n’est public.',
        'Téléchargement par lien signé valable 60 secondes, délivré après vérification des droits.',
        'Type réel du fichier contrôlé (signature) et taille limitée à 25 Mo.',
      ],
      en: [
        'Private storage: no file is public.',
        'Downloads via signed links valid for 60 seconds, issued after a permission check.',
        'Actual file type checked (signature) and size limited to 25 MB.',
      ],
    },
  },
  {
    icon: ScrollText,
    title: { fr: 'Traçabilité et abus', en: 'Traceability and abuse' },
    items: {
      fr: [
        'Journal des actions sensibles : rôles, invitations, accès portail, documents, devis, préfacturation.',
        'Limitation du nombre de requêtes sur les routes sensibles (dépôts, invitations, formulaires publics, assistant).',
      ],
      en: [
        'Log of sensitive actions: roles, invitations, portal access, documents, quotes, pre-invoicing.',
        'Rate limiting on sensitive routes (uploads, invitations, public forms, assistant).',
      ],
    },
  },
  {
    icon: Webhook,
    title: { fr: 'Intégrations', en: 'Integrations' },
    items: {
      fr: [
        'Webhooks sortants en HTTPS uniquement, signés (HMAC-SHA256), secret affiché une seule fois.',
        'Adresses internes ou privées refusées pour les webhooks.',
        'Aucune clé privée exposée au navigateur.',
      ],
      en: [
        'Outgoing webhooks over HTTPS only, signed (HMAC-SHA256), secret shown once.',
        'Internal or private addresses refused for webhooks.',
        'No private key exposed to the browser.',
      ],
    },
  },
  {
    icon: Code2,
    title: { fr: 'Développement', en: 'Development' },
    items: {
      fr: [
        'Validation des entrées côté serveur (schémas Zod).',
        'Intégration continue : typage strict, lint, tests et build à chaque modification ; audit des dépendances (npm audit).',
        'Mises à jour de dépendances surveillées (Dependabot).',
      ],
      en: [
        'Server-side input validation (Zod schemas).',
        'Continuous integration: strict typing, lint, tests and build on every change; dependency audit (npm audit).',
        'Dependency updates monitored (Dependabot).',
      ],
    },
  },
];

const LINKS = [
  { href: '/legal/privacy', label: { fr: 'Politique de confidentialité', en: 'Privacy policy' } },
  { href: '/legal/dpa', label: { fr: 'Accord de traitement des données (DPA)', en: 'Data processing agreement (DPA)' } },
  { href: '/legal/subprocessors', label: { fr: 'Sous-traitants', en: 'Subprocessors' } },
  { href: '/legal/responsible-disclosure', label: { fr: 'Signaler une vulnérabilité', en: 'Report a vulnerability' } },
  { href: '/status', label: { fr: 'État du service', en: 'Service status' } },
];

export function SecurityContent() {
  const { locale } = useLocale();
  const lang: Lang = locale === 'en' ? 'en' : 'fr';
  const fr = lang === 'fr';
  return (
    <MarketingShell>
      <main>
        <section className="bg-gradient-to-b from-sand-100 to-transparent">
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 sm:px-6 md:pt-20">
            <FadeIn>
              <div className="text-[13px] font-medium text-primary-deep">{fr ? 'Sécurité' : 'Security'}</div>
              <h1 className="mt-2 font-display text-[clamp(2.1rem,4.6vw,3.3rem)] font-semibold leading-[1.05] tracking-tight">
                {fr ? 'Ce qui protège vos données, concrètement.' : 'What protects your data, concretely.'}
              </h1>
              <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                {fr
                  ? 'Cette page ne liste que des protections effectivement déployées dans Centrium. Pas de promesse générale, pas de certification que nous n’avons pas.'
                  : 'This page only lists protections actually deployed in Centrium. No vague promise, no certification we don’t hold.'}
              </p>
            </FadeIn>
          </div>
        </section>
        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-16 sm:px-6">
          {BLOCKS.map((b, i) => (
            <FadeIn key={b.title.fr} delay={i * 0.04} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-primary-deep">
                  <b.icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-[18px] font-semibold tracking-tight">{b.title[lang]}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-[15px] leading-relaxed">
                {b.items[lang].map((it) => (
                  <li key={it} className="flex gap-2.5">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {it}
                  </li>
                ))}
              </ul>
            </FadeIn>
          ))}
        </section>
        <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-sand-100/60 p-6">
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <Network className="h-4 w-4 text-primary-deep" />
              {fr ? 'Documents et contacts' : 'Documents and contacts'}
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[15px] text-primary-deep hover:underline">
                    {l.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] text-muted-foreground">
              {fr ? 'Une question de sécurité ? ' : 'A security question? '}
              <a href="mailto:contact@centrium-platform.com" className="text-primary-deep hover:underline">
                contact@centrium-platform.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
