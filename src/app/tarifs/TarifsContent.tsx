'use client';

import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Building2, Shield } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Plan = {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  maxUsers: number | null;
  maxConsultants: number | null;
  highlight?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

type Faq = { q: string; a: string };

type Copy = {
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  trialLine: string;
  perMonth: string;
  perYear: (annual: string) => string;
  usersConsultants: (u: number, c: number) => string;
  onQuote: string;
  onQuoteSub: string;
  popular: string;
  plans: Plan[];
  compareTitle: string;
  compareIntro: string;
  compareCentrium: string;
  compareCentriumPrice: string;
  compareCentriumSub: string;
  compareBoond: string;
  compareBoondPrice: string;
  compareBoondSub: string;
  compareLink: string;
  trustTitle: string;
  trustItems: string[];
  trustLink: string;
  faqTitleA: string;
  faqTitleB: string;
  faq: Faq[];
  finalTitleA: string;
  finalTitleB: string;
  finalSub: string;
  finalCta: string;
  finalContact: string;
};

const SHARED_FEATURES_FR = {
  starter: [
    '3 utilisateurs administrateurs',
    'Jusqu\'à 20 consultants',
    '100 opportunités CRM ouvertes',
    '500 contacts',
    '30 missions actives',
    'CV Optimizer (Claude API)',
    'Matching IA',
    'CRM Kanban + relances',
    'CRA + facturation PDF',
    'Dashboard pilotage',
    'Hébergement EU + RGPD',
    'Support email (24h ouvrées)',
  ],
  growth: [
    '10 utilisateurs administrateurs',
    'Jusqu\'à 100 consultants',
    '500 opportunités CRM ouvertes',
    '2 000 contacts',
    '100 missions actives',
    'Tout Starter inclus',
    'Portail consultant dédié',
    'Signature électronique',
    'MFA TOTP configurable',
    'Audit log cross-tenant + export RGPD',
    'Support prioritaire (8h ouvrées)',
    'Onboarding accompagné J0 → J+30',
  ],
  enterprise: [
    'Tout Medium inclus',
    'Utilisateurs & consultants illimités',
    'Opportunités, contacts & missions illimités',
    'SSO SAML/OIDC',
    'Multi-organisations (groupes, holdings)',
    'API publique REST + Webhooks',
    'Intégrations sur mesure (Sage, Cegid, LinkedIn Recruiter)',
    'Account Manager dédié',
    'Support prioritaire 24/7',
    'Migration de données accompagnée',
  ],
};

const SHARED_FEATURES_EN = {
  starter: [
    '3 admin users',
    'Up to 20 consultants',
    '100 open CRM opportunities',
    '500 contacts',
    '30 active missions',
    'CV Optimizer (Claude API)',
    'AI matching',
    'Kanban CRM + follow-ups',
    'Timesheets + PDF invoicing',
    'Steering dashboard',
    'EU hosting + GDPR',
    'Email support (24 business hours)',
  ],
  growth: [
    '10 admin users',
    'Up to 100 consultants',
    '500 open CRM opportunities',
    '2,000 contacts',
    '100 active missions',
    'Everything in Starter',
    'Dedicated consultant portal',
    'E-signature',
    'Configurable TOTP MFA',
    'Cross-tenant audit log + GDPR export',
    'Priority support (8 business hours)',
    'Guided onboarding D0 → D+30',
  ],
  enterprise: [
    'Everything in Medium',
    'Unlimited users & consultants',
    'Unlimited opportunities, contacts & missions',
    'SSO SAML/OIDC',
    'Multi-organization (groups, holdings)',
    'Public REST API + Webhooks',
    'Custom integrations (Sage, Cegid, LinkedIn Recruiter)',
    'Dedicated Account Manager',
    '24/7 priority support',
    'Guided data migration',
  ],
};

function buildPlans(isEn: boolean): Plan[] {
  const f = isEn ? SHARED_FEATURES_EN : SHARED_FEATURES_FR;
  return [
    {
      id: 'starter',
      name: 'Starter',
      tagline: isEn ? 'For small firms up to 20 consultants' : 'Pour petite ESN jusqu\'à 20 consultants',
      monthly: 74.99,
      annual: 720,
      maxUsers: 3,
      maxConsultants: 20,
      cta: { label: isEn ? 'Subscribe' : 'Souscrire', href: '/billing' },
      features: f.starter,
    },
    {
      id: 'growth',
      name: 'Medium',
      tagline: isEn ? 'For active firms up to 100 consultants' : 'Pour ESN active jusqu\'à 100 consultants',
      monthly: 149.99,
      annual: 1440,
      maxUsers: 10,
      maxConsultants: 100,
      highlight: true,
      cta: { label: isEn ? 'Subscribe' : 'Souscrire', href: '/billing' },
      features: f.growth,
    },
    {
      id: 'enterprise',
      name: isEn ? 'Unlimited' : 'Illimité',
      tagline: isEn ? 'Unlimited account — no limit, no cap' : 'Compte illimité — aucune limite, aucun plafond',
      monthly: 299.99,
      annual: 2880,
      maxUsers: null,
      maxConsultants: null,
      cta: { label: isEn ? 'Subscribe' : 'Souscrire', href: '/billing' },
      features: f.enterprise,
    },
  ];
}

const FAQ_FR: Faq[] = [
  {
    q: 'Comment se passe la souscription ?',
    a: "En 2 minutes depuis la page /billing. Choisissez votre plan, réglez avec CB (Stripe), l'accès est débloqué immédiatement. Le renouvellement est automatique chaque mois à la même date de calendrier. Pas d'engagement, annulation à tout moment self-service.",
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: "Depuis /billing → bouton « Annuler l'abonnement ». La résiliation est effective à la fin de la période déjà payée : vous gardez l'accès complet jusque-là. Aucun frais de résiliation, aucun préavis. Vous pouvez réactiver à tout moment avant la fin de période.",
  },
  {
    q: 'Que se passe-t-il si le renouvellement échoue ?',
    a: "Stripe retente automatiquement plusieurs fois. Pendant ce temps votre accès est suspendu temporairement (vous êtes redirigé vers /billing pour mettre à jour votre CB). Dès que le paiement passe, l'accès est rétabli automatiquement.",
  },
  {
    q: 'Comment savoir quel plan choisir ?',
    a: "Moins de 20 consultants : Starter. Entre 20 et 100 : Medium (le plus populaire). Au-dessus de 100, groupe multi-orgs ou zéro limite : Illimité. Vous pouvez changer de plan à tout moment depuis /billing, la différence de prix est calculée au prorata automatiquement.",
  },
  {
    q: 'Puis-je essayer avant de payer ?',
    a: "Oui, à la création de votre organisation vous bénéficiez de 7 jours d'essai gratuit sans CB requise. À la fin de l'essai, vous choisissez un plan pour continuer, ou l'accès est suspendu.",
  },
  {
    q: 'Comment sont facturées les factures Stripe ?',
    a: "Facture PDF envoyée par email automatiquement à chaque prélèvement. Historique complet accessible via le portail Stripe (bouton depuis /billing). Paiement par CB uniquement pour l'instant, virement SEPA sur demande pour le plan Illimité.",
  },
  {
    q: "Le tarif inclut-il l'IA générative ?",
    a: "Oui, l'IA (CV Optimizer, matching) est incluse dans tous les plans. Fair-use : usage raisonnable dans le cadre d'une activité ESN normale. Aucune surcharge cachée.",
  },
];

const FAQ_EN: Faq[] = [
  {
    q: 'How does subscribing work?',
    a: 'In 2 minutes from the /billing page. Choose your plan, pay by card (Stripe), access unlocks immediately. Renewal is automatic every month on the same calendar date. No commitment, cancel anytime self-service.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'From /billing → « Cancel subscription » button. Cancellation takes effect at the end of the period already paid: you keep full access until then. No cancellation fee, no notice period. You can reactivate anytime before the period ends.',
  },
  {
    q: 'What happens if renewal fails?',
    a: 'Stripe automatically retries several times. Meanwhile your access is temporarily suspended (you are redirected to /billing to update your card). As soon as payment goes through, access is restored automatically.',
  },
  {
    q: 'How do I know which plan to choose?',
    a: 'Fewer than 20 consultants: Starter. Between 20 and 100: Medium (the most popular). Above 100, multi-org group or zero limit: Unlimited. You can switch plans anytime from /billing, the price difference is prorated automatically.',
  },
  {
    q: 'Can I try before paying?',
    a: 'Yes — when you create your organization you get a 7-day free trial with no card required. At the end of the trial, you pick a plan to continue, or access is suspended.',
  },
  {
    q: 'How are Stripe invoices billed?',
    a: 'A PDF invoice is emailed automatically on each charge. Full history is available via the Stripe portal (button from /billing). Card payment only for now, SEPA transfer on request for the Unlimited plan.',
  },
  {
    q: 'Does the price include generative AI?',
    a: 'Yes, AI (CV Optimizer, matching) is included in every plan. Fair use: reasonable usage within a normal IT-services activity. No hidden surcharge.',
  },
];

function copyFor(isEn: boolean): Copy {
  if (isEn) {
    return {
      eyebrow: 'Public pricing · transparent',
      titleA: '3 clear plans.',
      titleB: 'No surprises.',
      intro:
        'Self-service subscription in 2 minutes. Secure monthly payment via Stripe. Cancel anytime, access kept until the end of the paid period.',
      trialLine: '7-day free trial · No card · Self-service cancellation',
      perMonth: '€ excl. VAT / month',
      perYear: (a) => `i.e. ${a} € excl. VAT/year (annual payment: -20%)`,
      usersConsultants: (u, c) => `${u} user${u > 1 ? 's' : ''} · ${c} consultants`,
      onQuote: 'On quote',
      onQuoteSub: 'Custom pricing',
      popular: 'Most popular',
      plans: buildPlans(true),
      compareTitle: 'Quick comparison with Boondmanager',
      compareIntro:
        'For a firm managing up to 100 consultants over 12 months, based on public user feedback and vendor ranges:',
      compareCentrium: 'Centrium Medium',
      compareCentriumPrice: '€1,800 excl. VAT/yr',
      compareCentriumSub: 'All-in · public pricing · self-service',
      compareBoond: 'Boondmanager',
      compareBoondPrice: '€25-50k/yr',
      compareBoondSub: 'Depending on modules · on quote',
      compareLink: 'See the full comparison (50+ criteria)',
      trustTitle: 'Included in every plan: security and compliance',
      trustItems: [
        '100% Europe hosting (Vercel Paris + Supabase EU)',
        'Multi-tenant RLS enforced on 38 tables',
        'TOTP MFA + NIST password policy',
        'Cross-tenant audit log',
        'Self-service GDPR export + right to erasure',
        'Public Trust Center',
        'DPA signable immediately',
        'Daily encrypted backups',
      ],
      trustLink: 'See the Trust Center',
      faqTitleA: 'Frequently asked',
      faqTitleB: 'questions',
      faq: FAQ_EN,
      finalTitleA: 'Ready to',
      finalTitleB: 'try',
      finalSub: 'Personalized 30-min demo · Quote within 48h · No commitment.',
      finalCta: 'Request a demo',
      finalContact: 'Contact us',
    };
  }
  return {
    eyebrow: 'Tarifs publics · transparent',
    titleA: '3 plans clairs.',
    titleB: 'Pas de surprise.',
    intro:
      'Souscription self-service en 2 minutes. Paiement mensuel sécurisé par Stripe. Annulation à tout moment, accès conservé jusqu\'à la fin de la période payée.',
    trialLine: 'Essai gratuit 7 jours · Sans CB · Annulation self-service',
    perMonth: '€ HT / mois',
    perYear: (a) => `soit ${a} € HT/an (paiement annuel : -20%)`,
    usersConsultants: (u, c) => `${u} utilisateur${u > 1 ? 's' : ''} · ${c} consultants`,
    onQuote: 'Sur devis',
    onQuoteSub: 'Tarification personnalisée',
    popular: 'Le plus populaire',
    plans: buildPlans(false),
    compareTitle: 'Comparaison rapide avec Boondmanager',
    compareIntro:
      'Pour une ESN gérant jusqu\'à 100 consultants sur 12 mois, retours utilisateurs publics et fourchettes éditeurs :',
    compareCentrium: 'Centrium Medium',
    compareCentriumPrice: '1 800 € HT/an',
    compareCentriumSub: 'Tout inclus · pricing public · self-service',
    compareBoond: 'Boondmanager',
    compareBoondPrice: '25-50 k€/an',
    compareBoondSub: 'Selon modules · sur devis',
    compareLink: 'Voir le comparatif complet (50+ critères)',
    trustTitle: 'Inclus dans tous les plans : sécurité et conformité',
    trustItems: [
      'Hébergement 100 % Europe (Vercel Paris + Supabase EU)',
      'RLS multi-tenant forcée sur 38 tables',
      'MFA TOTP + politique mot de passe NIST',
      'Audit log cross-tenant',
      'Export RGPD self-service + droit à l\'oubli',
      'Trust Center public',
      'DPA signable immédiatement',
      'Sauvegardes chiffrées quotidiennes',
    ],
    trustLink: 'Voir le Trust Center',
    faqTitleA: 'Questions',
    faqTitleB: 'fréquentes',
    faq: FAQ_FR,
    finalTitleA: 'Prêt à',
    finalTitleB: 'essayer',
    finalSub: 'Démo personnalisée 30 min · Devis chiffré sous 48h · Aucun engagement.',
    finalCta: 'Demander une démo',
    finalContact: 'Nous contacter',
  };
}

function PriceDisplay({ plan, c }: { plan: Plan; c: Copy }) {
  if (plan.monthly === null) {
    return (
      <div>
        <div className="font-display text-3xl font-semibold text-white">{c.onQuote}</div>
        <div className="mt-1 text-xs text-white/55">{c.onQuoteSub}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-white tabular-nums">
          {plan.monthly.toLocaleString('fr-FR')}
        </span>
        <span className="text-white/55 text-sm">{c.perMonth}</span>
      </div>
      <div className="mt-1 text-xs text-white/55">{c.perYear(plan.annual!.toLocaleString('fr-FR'))}</div>
      {plan.maxUsers !== null && plan.maxConsultants !== null && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/70">
          <Sparkles className="h-3 w-3 text-magenta" />
          {c.usersConsultants(plan.maxUsers, plan.maxConsultants)}
        </div>
      )}
    </div>
  );
}

export function TarifsContent() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const c = copyFor(isEn);

  return (
    <MarketingShell>
      <BreadcrumbJsonLd crumbs={[{ name: 'Tarifs', path: '/tarifs' }]} />

      <main className="relative pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-3">
              {c.eyebrow}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white">
              {c.titleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{c.titleB}</span>
            </h1>
            <p className="mt-5 text-lg text-white/65 leading-relaxed">{c.intro}</p>
            <p className="mt-3 text-sm text-white/45">{c.trialLine}</p>
          </div>

          {/* 3 plans */}
          <section className="mt-16 grid md:grid-cols-3 gap-5">
            {c.plans.map((plan) => (
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
                      {c.popular}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm text-white/55">{plan.tagline}</p>
                  <div className="mt-6">
                    <PriceDisplay plan={plan} c={c} />
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
                <h2 className="font-display text-xl font-semibold text-white">{c.compareTitle}</h2>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{c.compareIntro}</p>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-magenta/30 bg-magenta/[0.06] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-magenta">
                      {c.compareCentrium}
                    </div>
                    <div className="mt-2 text-white text-lg font-display font-semibold">
                      {c.compareCentriumPrice}
                    </div>
                    <div className="mt-1 text-xs text-white/55">{c.compareCentriumSub}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {c.compareBoond}
                    </div>
                    <div className="mt-2 text-white/85 text-lg font-display font-semibold">
                      {c.compareBoondPrice}
                    </div>
                    <div className="mt-1 text-xs text-white/55">{c.compareBoondSub}</div>
                  </div>
                </div>
                <Link
                  href="/centrium-vs-boondmanager"
                  className="mt-5 inline-flex items-center gap-2 text-sm text-magenta hover:underline"
                >
                  {c.compareLink}
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
                <h2 className="font-display text-xl font-semibold text-white">{c.trustTitle}</h2>
                <ul className="mt-4 grid md:grid-cols-2 gap-2 text-sm">
                  {c.trustItems.map((item) => (
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
                  {c.trustLink}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight text-center">
              {c.faqTitleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{c.faqTitleB}</span>
            </h2>
            <div className="mt-10 space-y-3">
              {c.faq.map((item) => (
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
              {c.finalTitleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{c.finalTitleB}</span>{' '}
              Centrium ?
            </h2>
            <p className="mt-4 text-white/65 max-w-2xl mx-auto leading-relaxed">{c.finalSub}</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/essai"
                className="qc-cta inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-sm"
              >
                {c.finalCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:contact@centrium-platform.com"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 transition px-7 py-3 font-semibold text-sm text-white/85"
              >
                {c.finalContact}
              </a>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
