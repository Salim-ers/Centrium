import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Lock,
  Server,
  ShieldCheck,
  Eye,
  RefreshCw,
  AlertTriangle,
  FileCheck2,
  Users2,
  Globe2,
  KeyRound,
  ScrollText,
  HeartHandshake,
} from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';

export const metadata: Metadata = {
  title: 'Sécurité & conformité — Centrium',
  description:
    'Mesures techniques et organisationnelles, hébergement européen, chiffrement, isolation multi-tenant, conformité RGPD et procédures incident de la plateforme Centrium.',
  robots: { index: true, follow: true },
};

type Pillar = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: 'Chiffrement de bout en bout',
    body: 'TLS 1.2+ sur toutes les communications, AES-256 au repos sur base de données et stockage, gestion stricte des clés côté hébergeur certifié.',
  },
  {
    icon: Server,
    title: 'Hébergement européen',
    body: 'Base de données et stockage Supabase en région Europe. CDN edge Vercel pour la latence, avec données applicatives jamais répliquées hors UE.',
  },
  {
    icon: ShieldCheck,
    title: 'Isolation multi-tenant stricte',
    body: 'Row Level Security activée sur toutes les tables sensibles. Chaque ESN n’accède qu’à ses propres consultants, contacts, missions et documents.',
  },
  {
    icon: KeyRound,
    title: 'Authentification renforcée',
    body: 'Mots de passe robustes obligatoires, sessions cookie-only (purge à la fermeture du navigateur), invitations par email signées, support SSO/MFA prévu.',
  },
  {
    icon: Eye,
    title: 'Journalisation & audit',
    body: 'Connexions, actions sensibles et accès aux données sont horodatés et associés à l’utilisateur responsable. Page admin dédiée à l’audit en cours de déploiement.',
  },
  {
    icon: RefreshCw,
    title: 'Sauvegardes & restauration',
    body: 'Sauvegardes chiffrées quotidiennes côté hébergeur, PITR (Point-in-Time Recovery) disponible, procédures de restauration testées régulièrement.',
  },
];

type Compliance = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
};

const COMPLIANCE: Compliance[] = [
  {
    icon: ScrollText,
    title: 'RGPD & loi Informatique et Libertés',
    items: [
      'Registre des activités de traitement maintenu',
      'Bases légales documentées pour chaque finalité',
      'Conservation des données limitée et justifiée',
      'Notification CNIL sous 72 h en cas de violation',
    ],
  },
  {
    icon: Users2,
    title: 'Sous-traitance encadrée (DPA)',
    items: [
      'Liste des sous-traitants techniques publiée',
      'Clauses Contractuelles Types pour les transferts hors UE',
      'Audit fournisseurs annuel',
      'Engagement à notifier tout changement de sous-traitant',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'Droits des personnes',
    items: [
      'Accès, rectification, effacement, opposition, portabilité',
      'Procédure simple depuis le compte utilisateur',
      'Réponse sous 30 jours maximum',
      'Référent dédié : contact@centrium-platform.com',
    ],
  },
  {
    icon: FileCheck2,
    title: 'Pratiques de développement',
    items: [
      'Revue de code et validation Zod sur toutes les entrées',
      'Scan automatique des dépendances',
      'Variables d’environnement isolées, secrets jamais commités',
      'Tests d’isolation multi-tenant',
    ],
  },
];

const SUBPROCESSORS = [
  {
    name: 'Supabase',
    role: 'Base de données, stockage, authentification',
    region: 'UE (hébergement)',
  },
  { name: 'Vercel', role: 'Hébergement applicatif edge', region: 'États-Unis (CCT)' },
  { name: 'Stripe', role: 'Paiement et facturation', region: 'Union européenne' },
  {
    name: 'Anthropic',
    role: 'Modèles IA pour le CV Optimizer',
    region: 'États-Unis (CCT)',
  },
  {
    name: 'Resend / Postmark',
    role: 'Envoi d’emails transactionnels',
    region: 'Union européenne',
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <main className="relative pt-20">
        <section className="relative overflow-hidden">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-20 text-center">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-4">
              Sécurité &amp; conformité
            </div>
            <h1 className="font-display font-light tracking-[-0.035em] leading-[1] text-[clamp(2.2rem,5.5vw,4.5rem)] text-white max-w-4xl mx-auto">
              Une plateforme conçue pour
              <span className="block mt-2 font-editorial italic font-normal">
                la confiance des ESN.
              </span>
            </h1>
            <p className="mt-6 sm:mt-8 text-white/65 text-[15px] sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Vos consultants, vos contacts et vos missions sont des données
              critiques. Centrium applique les standards attendus en B2B :
              isolation stricte par organisation, chiffrement de bout en bout,
              hébergement européen et conformité RGPD documentée.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-white/5">
                <Globe2 className="h-3.5 w-3.5 text-violet-300" />
                Données hébergées en UE
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-white/5">
                <Lock className="h-3.5 w-3.5 text-pink-300" />
                Chiffrement TLS 1.2+ / AES-256
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-white/5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                Conformité RGPD
              </span>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-10">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
              Architecture
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Les 6 piliers de notre sécurité
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-hairline bg-white/[0.02] p-6 hover:bg-white/[0.04] transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-magenta/15 border border-magenta/30 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-magenta" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="qc-section-divider max-w-6xl mx-auto px-6 py-16">
          <div className="mb-10">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
              Conformité
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Cadre réglementaire et engagements
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {COMPLIANCE.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-hairline bg-white/[0.02] p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-violet-glow/15 border border-violet-glow/30 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-violet-300" />
                    </div>
                    <h3 className="font-semibold text-white">{c.title}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-white/70">
                    {c.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-emerald-300 mt-1">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="qc-section-divider max-w-6xl mx-auto px-6 py-16">
          <div className="mb-10">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
              Sous-traitants techniques
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Qui héberge et traite vos données
            </h2>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">
              Liste tenue à jour. Toute évolution est notifiée à nos clients
              conformément à notre{' '}
              <Link href="/legal/dpa" className="text-magenta hover:underline">
                accord de sous-traitance (DPA)
              </Link>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-hairline overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-white/60 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Sous-traitant</th>
                  <th className="text-left px-5 py-3 font-medium">Rôle</th>
                  <th className="text-left px-5 py-3 font-medium">Région</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-5 py-3 text-white/70">{s.role}</td>
                    <td className="px-5 py-3 text-white/70">{s.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="qc-section-divider max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                </div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Réponse à incident
                </h2>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                En cas d’incident de sécurité ou de violation de données
                personnelles, notre engagement est clair :
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <span className="text-amber-300 mt-1">→</span>
                  <span>
                    Notification à la <strong className="text-white">CNIL sous 72 heures</strong>{' '}
                    quand l’article 33 RGPD le requiert
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-300 mt-1">→</span>
                  <span>
                    Information directe des clients impactés dans les meilleurs
                    délais (article 34)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-300 mt-1">→</span>
                  <span>Analyse de cause racine et mesures correctives documentées</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-300 mt-1">→</span>
                  <span>Revue post-incident partagée avec les clients concernés</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-hairline bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-3">Signaler un problème</h3>
              <p className="text-sm text-white/65 leading-relaxed mb-4">
                Vous avez identifié une faille ou un comportement anormal ?
                Contactez-nous immédiatement, nous prenons toutes les
                signalisations au sérieux.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-hairline">
                  <span className="text-white/60">Sécurité</span>
                  <a
                    href="mailto:security@centrium-platform.com"
                    className="text-magenta hover:underline font-medium"
                  >
                    security@centrium-platform.com
                  </a>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-hairline">
                  <span className="text-white/60">Données personnelles</span>
                  <a
                    href="mailto:contact@centrium-platform.com"
                    className="text-magenta hover:underline font-medium"
                  >
                    contact@centrium-platform.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-3xl border border-hairline bg-gradient-to-br from-violet-glow/10 via-transparent to-magenta/10 p-10 md:p-14 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Une question, un audit, un appel d’offres ?
            </h2>
            <p className="mt-3 text-white/65 max-w-xl mx-auto">
              Nous fournissons sur demande notre documentation sécurité étendue,
              le DPA signé et la liste détaillée des mesures techniques.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/devis"
                className="inline-flex items-center h-11 px-5 rounded-full bg-qc-gradient text-white text-sm font-semibold shadow-[0_0_25px_rgba(225,29,116,0.4)] hover:brightness-110 transition"
              >
                Parler à un expert
              </Link>
              <Link
                href="/legal/dpa"
                className="inline-flex items-center h-11 px-5 rounded-full border border-hairline text-sm text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                Lire le DPA
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
