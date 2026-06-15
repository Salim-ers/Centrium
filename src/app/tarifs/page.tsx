import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Building2, Shield } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Tarifs Centrium — 3 plans transparents pour ESN',
  description:
    "Tarifs publics Centrium : Starter 890 €/mois, Growth 1 690 €/mois, Enterprise sur devis. 20 consultants inclus, prix unitaire au-delà. 30-40 % moins cher que Boondmanager.",
  keywords: [
    'tarif centrium',
    'prix logiciel ESN',
    'prix PSA staffing',
    'tarif boondmanager',
    'prix gestion consultants',
  ],
  alternates: { canonical: '/tarifs' },
  openGraph: {
    title: 'Tarifs Centrium — 3 plans publics',
    description:
      'Pricing transparent par paliers, 30-40 % moins cher que Boondmanager. Démo + devis 48h sans engagement.',
    url: '/tarifs',
    type: 'website',
  },
};

type Plan = {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  tagline: string;
  monthly: number | null; // null = sur devis
  annual: number | null;
  consultantsIncluded: number;
  perExtraConsultant: number | null;
  highlight?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Pour ESN 10 à 30 consultants',
    monthly: 890,
    annual: 12_000,
    consultantsIncluded: 20,
    perExtraConsultant: 39,
    cta: { label: 'Commencer', href: '/devis?plan=starter' },
    features: [
      '20 consultants inclus',
      '3 utilisateurs administrateurs',
      'Bibliothèque consultants illimitée',
      'CV Optimizer (Claude API)',
      'Matching IA + extraction AO depuis screenshot',
      'CRM kanban realtime',
      'CRA + facturation PDF auto',
      'Dashboard pilotage (intercontrat, CA M+1, TJM)',
      'Branding (logo + couleurs auto)',
      'Hébergement EU + RGPD',
      'Support email (réponse 24h ouvrées)',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Pour ESN 30 à 100 consultants',
    monthly: 1_690,
    annual: 20_000,
    consultantsIncluded: 20,
    perExtraConsultant: 29,
    highlight: true,
    cta: { label: 'Demander une démo', href: '/devis?plan=growth' },
    features: [
      'Tout Starter inclus',
      '10 utilisateurs administrateurs',
      'Portail consultant dédié (CRA mobile-friendly)',
      'Intégration Pennylane (export factures, à venir Q3 2026)',
      'Signature électronique Yousign (à venir Q4 2026)',
      'API publique REST + Webhooks (à venir Q1 2027)',
      'MFA TOTP + politique mot de passe configurable',
      'Audit log cross-tenant + export RGPD',
      'Support email prioritaire (réponse 8h ouvrées)',
      'Onboarding accompagné J0 → J+30',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Pour ESN 100+ consultants ou groupes',
    monthly: null,
    annual: null,
    consultantsIncluded: 0,
    perExtraConsultant: null,
    cta: { label: 'Contacter les ventes', href: '/devis?plan=enterprise' },
    features: [
      'Tout Growth inclus',
      'Utilisateurs admin illimités',
      'SSO SAML/OIDC (à venir Q3 2026)',
      'SLA 99,95 % contractuel + crédits SLA',
      'Multi-organisations (groupes, holdings, filiales)',
      'Intégrations sur mesure (Sage, Cegid, LinkedIn Recruiter, etc.)',
      'Account Manager dédié',
      'Hotline support 24/7 (à venir Q3 2026)',
      'Audit de sécurité personnalisé',
      'Migration de données accompagnée',
      'Roadmap produit co-construite',
    ],
  },
];

const FAQ = [
  {
    q: "Pourquoi un palier de 20 consultants inclus ?",
    a: "Notre logique : la plupart des ESN dépensent du temps fixe sur les 20 premiers consultants (setup, branding, formation BMs). Au-delà, le coût marginal par consultant est faible. On packagé cette logique pour que vous payiez la valeur réelle, pas une licence par poste.",
  },
  {
    q: "Comment se passe la facturation des consultants additionnels (au-delà de 20) ?",
    a: "Facturation à la fin de chaque mois sur le compte consultants ACTIF (ni archivés, ni en intercontrat depuis plus de 60 jours). Pas de facturation pendant l'intercontrat court. Vous voyez le compteur live dans votre dashboard admin.",
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Engagement annuel sur la 1ère année (paiement mensuel ou annuel au choix). Renouvellement automatique mois par mois après. Résiliation libre avec préavis 30 jours. Vous gardez vos données exportées en JSON/CSV sous 7 jours.",
  },
  {
    q: "Comment savoir quel plan choisir ?",
    a: "Si vous gérez moins de 30 consultants : Starter. Entre 30 et 100 : Growth (sweet spot pour la plupart des ESN). Au-dessus de 100 ou groupe multi-orgs : Enterprise. Demandez-nous une simulation par email contact@centrium-platform.com, on vous aide à choisir sans engagement.",
  },
  {
    q: "Centrium est-il moins cher que Boondmanager ?",
    a: "Pour 30 consultants, Centrium revient à ~14-20 k€/an (Starter ou Growth selon engagement annuel). Boondmanager (selon retours utilisateurs publics) facture 25-50 k€/an pour le même périmètre. Centrium = 30-40 % moins cher en moyenne, à scope fonctionnel équivalent (et UI plus moderne).",
  },
  {
    q: "Le tarif inclut-il l'IA générative (CV Optimizer, matching) ?",
    a: "Oui, l'IA est incluse dans tous les plans avec un quota mensuel (1000 générations CV/mois sur Starter, 3000 sur Growth, illimité sur Enterprise). Au-delà, surcharge à 0,15 € par génération supplémentaire.",
  },
  {
    q: "Période d'essai ou démo ?",
    a: "Nous offrons une démo personnalisée de 30 minutes avec vos vraies données. Si le fit est bon, devis chiffré sous 48h. Aucune carte de crédit demandée tant que vous n'avez pas signé. Réservez votre créneau via /devis.",
  },
];

function PriceDisplay({ plan }: { plan: Plan }) {
  if (plan.monthly === null) {
    return (
      <div>
        <div className="font-display text-3xl font-semibold text-white">Sur devis</div>
        <div className="mt-1 text-xs text-white/55">Tarification personnalisée</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-white tabular-nums">
          {plan.monthly.toLocaleString('fr-FR')}
        </span>
        <span className="text-white/55 text-sm">€ HT / mois</span>
      </div>
      <div className="mt-1 text-xs text-white/55">
        soit {plan.annual!.toLocaleString('fr-FR')} € HT/an (paiement annuel : -10%)
      </div>
      {plan.perExtraConsultant && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/70">
          <Sparkles className="h-3 w-3 text-magenta" />
          {plan.consultantsIncluded} consultants inclus · puis {plan.perExtraConsultant} €/consultant additionnel
        </div>
      )}
    </div>
  );
}

export default function TarifsPage() {
  return (
    <MarketingShell>
      <BreadcrumbJsonLd crumbs={[{ name: 'Tarifs', path: '/tarifs' }]} />

      <main className="relative pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-3">
              Tarifs publics · transparent
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white">
              3 plans clairs.{' '}
              <span className="qc-italic-accent font-editorial italic">
                Pas de surprise.
              </span>
            </h1>
            <p className="mt-5 text-lg text-white/65 leading-relaxed">
              Centrium publie ses tarifs. Pour 30 consultants, comptez{' '}
              <strong className="text-white">~14-20 k€/an</strong> — soit{' '}
              <strong className="text-white">30-40 % moins cher</strong> que Boondmanager
              à scope équivalent.
            </p>
            <p className="mt-3 text-sm text-white/45">
              Démo 30 min · Devis sous 48h · Aucun engagement avant signature
            </p>
          </div>

          {/* 3 plans */}
          <section className="mt-16 grid md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`relative rounded-3xl border p-7 flex flex-col ${
                  plan.highlight
                    ? 'border-magenta/40 bg-gradient-to-b from-magenta/[0.06] to-transparent shadow-[0_0_50px_-10px_rgba(225,29,116,0.3)]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-magenta px-3 py-1 text-[10px] font-semibold text-white uppercase tracking-wider">
                      Le plus populaire
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">{plan.tagline}</p>
                  <div className="mt-6">
                    <PriceDisplay plan={plan} />
                  </div>
                </div>
                <Link
                  href={plan.cta.href}
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    plan.highlight
                      ? 'qc-cta'
                      : 'border border-white/15 text-white/85 hover:border-white/30'
                  }`}
                >
                  {plan.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <ul className="mt-7 space-y-2.5 text-sm flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-white/75">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          {/* Comparaison avec Boondmanager */}
          <section className="mt-20 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-magenta/15 p-2.5 text-magenta shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-white">
                  Comparaison rapide avec Boondmanager
                </h2>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">
                  Pour 30 consultants gérés sur 12 mois, retours utilisateurs publics et
                  fourchettes éditeurs :
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-magenta/30 bg-magenta/[0.06] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-magenta">
                      Centrium Growth
                    </div>
                    <div className="mt-2 text-white text-lg font-display font-semibold">
                      14-20 k€/an
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      Tout inclus · pricing public
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Boondmanager
                    </div>
                    <div className="mt-2 text-white/85 text-lg font-display font-semibold">
                      25-50 k€/an
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      Selon modules · sur devis
                    </div>
                  </div>
                </div>
                <Link
                  href="/centrium-vs-boondmanager"
                  className="mt-5 inline-flex items-center gap-2 text-sm text-magenta hover:underline"
                >
                  Voir le comparatif complet (50+ critères)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Trust / sécu */}
          <section className="mt-12 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-emerald-500/15 p-2.5 text-emerald-400 shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Inclus dans tous les plans : sécurité et conformité
                </h2>
                <ul className="mt-4 grid md:grid-cols-2 gap-2 text-sm">
                  {[
                    'Hébergement 100 % Europe (Vercel Paris + Supabase EU)',
                    'RLS multi-tenant forcée sur 38 tables',
                    'MFA TOTP + politique mot de passe NIST',
                    'Audit log cross-tenant',
                    'Export RGPD self-service + droit à l\'oubli',
                    'Trust Center public',
                    'DPA signable immédiatement',
                    'Sauvegardes chiffrées quotidiennes',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-white/75">
                      <Check className="h-3.5 w-3.5 text-emerald-400 mt-1 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/trust"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-magenta hover:underline"
                >
                  Voir le Trust Center
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight text-center">
              Questions{' '}
              <span className="qc-italic-accent font-editorial italic">fréquentes</span>
            </h2>
            <div className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition"
                >
                  <summary className="cursor-pointer font-medium text-white text-sm flex items-center justify-between gap-3">
                    {item.q}
                    <ArrowRight className="h-4 w-4 text-white/40 group-open:rotate-90 transition" />
                  </summary>
                  <p className="mt-3 text-sm text-white/65 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="mt-20 rounded-3xl border border-magenta/20 bg-gradient-to-br from-magenta/[0.08] via-violet-glow/[0.04] to-transparent p-10 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Prêt à{' '}
              <span className="qc-italic-accent font-editorial italic">essayer</span>{' '}
              Centrium ?
            </h2>
            <p className="mt-4 text-white/65 max-w-2xl mx-auto leading-relaxed">
              Démo personnalisée 30 min · Devis chiffré sous 48h · Aucun engagement.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/devis"
                className="qc-cta inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-sm"
              >
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:contact@centrium-platform.com"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 transition px-7 py-3 font-semibold text-sm text-white/85"
              >
                Nous contacter
              </a>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
