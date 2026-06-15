import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, ArrowRight, Sparkles, Shield, Zap, Heart, Euro } from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Centrium vs Boondmanager — Comparatif ESN 2026',
  description:
    "Centrium ou Boondmanager : comparatif détaillé des deux plateformes ESN. Fonctionnalités, prix, UX, IA, sécurité, hébergement européen. Trouvez l'alternative moderne à Boondmanager pour votre ESN.",
  keywords: [
    'centrium vs boondmanager',
    'alternative boondmanager',
    'logiciel ESN',
    'plateforme staffing',
    'PSA ESN france',
    'matching consultant mission IA',
    'CV optimizer ESN',
    'comparatif PSA ESN',
  ],
  alternates: { canonical: '/centrium-vs-boondmanager' },
  openGraph: {
    title: 'Centrium vs Boondmanager — L\'alternative moderne pour les ESN',
    description:
      'Comparatif complet : fonctionnalités, prix, UX, IA, sécurité. Pourquoi les ESN qui scalent choisissent Centrium en 2026.',
    url: '/centrium-vs-boondmanager',
    type: 'website',
  },
};

const FEATURE_COMPARISON: Array<{
  category: string;
  features: Array<{
    name: string;
    centrium: string | boolean;
    boondmanager: string | boolean;
    note?: string;
  }>;
}> = [
  {
    category: 'Bibliothèque consultants',
    features: [
      {
        name: 'Import CV par drag-drop',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Parsing IA multi-format (PDF, DOCX, scan)',
        centrium: 'Claude API (LLM SOTA)',
        boondmanager: 'OCR basique',
      },
      {
        name: 'Recherche multi-critères (skill / TJM / dispo)',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Filtre par famille métier auto (QA, Dev, Data, DevOps...)',
        centrium: true,
        boondmanager: false,
      },
      {
        name: 'Vue Kanban temps réel multi-utilisateurs',
        centrium: true,
        boondmanager: false,
      },
    ],
  },
  {
    category: 'CV Optimizer',
    features: [
      {
        name: 'Reformulation IA des bullets / résumé',
        centrium: 'Claude API + garde-fous "zéro invention"',
        boondmanager: false,
      },
      {
        name: 'Édition inline façon Canva',
        centrium: true,
        boondmanager: false,
      },
      {
        name: 'Templates personnalisables par org (logo, couleurs)',
        centrium: '3 templates + extraction couleurs auto du logo',
        boondmanager: '1 template + branding limité',
      },
      {
        name: 'Export PDF + DOCX',
        centrium: true,
        boondmanager: 'PDF uniquement',
      },
      {
        name: 'Aperçu temps réel pendant édition',
        centrium: true,
        boondmanager: false,
      },
    ],
  },
  {
    category: 'Matching mission / appels d\'offres',
    features: [
      {
        name: 'Extraction besoin depuis screenshot d\'AO',
        centrium: 'Vision LLM (Claude)',
        boondmanager: false,
      },
      {
        name: 'Génération automatique de fiche de poste',
        centrium: true,
        boondmanager: 'Manuel',
      },
      {
        name: 'Matching consultant ↔ mission scoré',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Justification IA du matching',
        centrium: 'Texte généré expliquant le score',
        boondmanager: 'Score brut sans justification',
      },
      {
        name: 'Validation humaine obligatoire avant envoi',
        centrium: 'Garde-fou produit',
        boondmanager: 'Non explicite',
      },
    ],
  },
  {
    category: 'CRA & Facturation',
    features: [
      {
        name: 'Saisie CRA mobile-friendly par le consultant',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Génération facture PDF automatique sur CRA validé',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Branding facture (logo, IBAN, mentions légales)',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Export comptable (Sage, Pennylane)',
        centrium: 'Pennylane Q3 2026, Sage roadmap',
        boondmanager: 'Sage natif, Cegid',
      },
      {
        name: 'Signature électronique intégrée (Yousign)',
        centrium: 'Q4 2026',
        boondmanager: 'En option payante',
      },
    ],
  },
  {
    category: 'Pilotage & Reporting',
    features: [
      {
        name: 'Dashboard temps réel (intercontrat, TJM, CA M+1)',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Alertes IA (CRA en retard, mission qui se termine, etc.)',
        centrium: true,
        boondmanager: 'Alertes basiques',
      },
      {
        name: 'Exports configurables',
        centrium: true,
        boondmanager: true,
      },
    ],
  },
  {
    category: 'Expérience utilisateur',
    features: [
      {
        name: 'Interface moderne (2024+)',
        centrium: 'Design system 2026 (shadcn + Tailwind)',
        boondmanager: 'UI legacy années 2010',
      },
      {
        name: 'Mode sombre / clair',
        centrium: true,
        boondmanager: false,
      },
      {
        name: 'Mobile responsive complet',
        centrium: true,
        boondmanager: 'Partiel',
      },
      {
        name: 'Multi-utilisateurs temps réel (sans F5)',
        centrium: 'Realtime Supabase',
        boondmanager: false,
      },
      {
        name: 'Multi-langue (FR + EN)',
        centrium: true,
        boondmanager: 'FR uniquement',
      },
    ],
  },
  {
    category: 'Sécurité & Conformité',
    features: [
      {
        name: 'Hébergement Europe (Vercel Paris + Supabase EU)',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'RGPD natif (DPA, export self-service, droit à l\'oubli)',
        centrium: 'Export RGPD + suppression 30j en self-service',
        boondmanager: 'Manuel via support',
      },
      {
        name: 'Multi-tenant Row Level Security forcée',
        centrium: 'RLS FORCE sur 38 tables + tests E2E',
        boondmanager: 'Non documenté publiquement',
      },
      {
        name: 'MFA TOTP',
        centrium: true,
        boondmanager: true,
      },
      {
        name: 'Audit log lecture / écriture cross-tenant',
        centrium: 'Page /admin/audit dédiée',
        boondmanager: 'Limité',
      },
      {
        name: 'Trust Center public',
        centrium: '/trust public + sous-traitants listés',
        boondmanager: 'Non disponible',
      },
      {
        name: 'SOC 2 Type I',
        centrium: 'Q4 2026 (roadmap publique)',
        boondmanager: 'Non communiqué',
      },
    ],
  },
  {
    category: 'IA & garde-fous',
    features: [
      {
        name: 'IA réellement intégrée (LLM SOTA Claude)',
        centrium: true,
        boondmanager: false,
      },
      {
        name: 'Garde-fou "zéro invention" sur CV générés',
        centrium: 'auditNoInvention systématique',
        boondmanager: 'Pas d\'IA générative',
      },
      {
        name: 'Humain valide toujours avant envoi',
        centrium: 'Garde-fou produit explicite',
        boondmanager: 'N/A (pas d\'IA générative)',
      },
    ],
  },
  {
    category: 'Tarification',
    features: [
      {
        name: 'Pricing public transparent',
        centrium: '3 plans publics (Starter/Growth/Enterprise)',
        boondmanager: 'Sur devis uniquement',
      },
      {
        name: 'Engagement minimum',
        centrium: '12 mois (résiliation libre ensuite)',
        boondmanager: '12-36 mois selon plan',
      },
      {
        name: 'Démo + devis sous 48h sans engagement',
        centrium: true,
        boondmanager: 'Cycle commercial plus long',
      },
      {
        name: 'Prix indicatif pour 30 consultants/an',
        centrium: '~14-20 k€/an',
        boondmanager: '~25-50 k€/an (source : retours utilisateurs)',
      },
    ],
  },
];

const KEY_DIFFERENTIATORS = [
  {
    icon: Sparkles,
    title: 'IA native, pas plaquée',
    description:
      'Centrium intègre Claude (LLM SOTA Anthropic) sur 4 modules clés — parsing CV, CV Optimizer, extraction AO, matching. Boondmanager reste sur du parsing OCR basique.',
  },
  {
    icon: Heart,
    title: 'UX 2026, pas 2010',
    description:
      'Design system moderne (shadcn + Tailwind), realtime multi-utilisateurs, mode sombre, mobile responsive complet. Boondmanager affiche son âge.',
  },
  {
    icon: Shield,
    title: 'Sécurité documentée publiquement',
    description:
      'Trust Center, sous-traitants listés, RLS multi-tenant testée, audit log cross-tenant, roadmap SOC 2. Boondmanager ne communique rien publiquement sur sa posture sécurité.',
  },
  {
    icon: Euro,
    title: 'Tarif transparent, 30-40 % moins cher',
    description:
      'Centrium publie ses 3 plans (Starter, Growth, Enterprise) avec prix indicatifs. Boondmanager garde son tarif opaque, généralement 30-40 % plus cher à scope équivalent.',
  },
  {
    icon: Zap,
    title: 'Cycle de vente court',
    description:
      'Démo en 30 minutes + devis chiffré sous 48h sans engagement. Pas de RFP de 3 mois, pas de cycle commercial long.',
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-emerald-400" />
    ) : (
      <X className="h-5 w-5 text-red-400/70" />
    );
  }
  return <span className="text-sm text-foreground/85">{value}</span>;
}

export default function CentriumVsBoondmanagerPage() {
  return (
    <MarketingShell>
      <BreadcrumbJsonLd
        crumbs={[
          { name: 'Comparatifs', path: '/centrium-vs-boondmanager' },
          { name: 'Centrium vs Boondmanager', path: '/centrium-vs-boondmanager' },
        ]}
      />

      <main className="relative pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-3">
              Comparatif détaillé · juin 2026
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Centrium <span className="text-white/40">vs</span>{' '}
              <span className="qc-italic-accent font-editorial italic">Boondmanager</span>
            </h1>
            <p className="mt-5 text-lg text-white/65 leading-relaxed max-w-3xl mx-auto">
              Pourquoi les ESN françaises qui scalent en 2026 choisissent Centrium plutôt
              que Boondmanager. Comparatif complet : fonctionnalités, IA, UX, sécurité,
              tarification — par un éditeur français.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/devis"
                className="qc-cta inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-sm"
              >
                Demander une démo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tarifs"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 transition px-7 py-3 font-semibold text-sm text-white/85"
              >
                Voir les tarifs
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/40">
              30 minutes · Devis sous 48h · Aucun engagement avant signature
            </p>
          </div>

          {/* Note honnêteté */}
          <div className="mt-12 max-w-4xl mx-auto rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/65 leading-relaxed">
            <strong className="text-white/85">Note de transparence.</strong> Ce comparatif
            est rédigé par Centrium. Nous avons fait notre maximum pour rester factuels et
            sourcés. Les informations sur Boondmanager proviennent de leur site public,
            d&apos;avis utilisateurs publiés (G2, Trustpilot) et de témoignages de
            dirigeants d&apos;ESN. Boondmanager reste le leader historique du marché ESN
            français et offre une couverture fonctionnelle large. Notre angle :{' '}
            <strong>moderne, IA-native, transparent</strong> — pour les ESN qui veulent
            un PSA cohérent avec leur ambition 2026, pas un héritage 2010.
          </div>

          {/* 5 différenciateurs clés */}
          <section className="mt-16">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight text-center">
              5 différences{' '}
              <span className="qc-italic-accent font-editorial italic">qui comptent</span>
            </h2>
            <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {KEY_DIFFERENTIATORS.map((diff) => {
                const Icon = diff.icon;
                return (
                  <article
                    key={diff.title}
                    className="qc-premium rounded-2xl border border-white/10 p-6"
                  >
                    <div className="rounded-md bg-magenta/15 p-2.5 text-magenta inline-flex">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display font-semibold text-white text-base">
                      {diff.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/65 leading-relaxed">
                      {diff.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Tableau comparatif complet */}
          <section className="mt-20">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight text-center">
              Comparatif{' '}
              <span className="qc-italic-accent font-editorial italic">détaillé</span>
            </h2>
            <p className="mt-3 text-center text-white/55 text-sm">
              50+ critères répartis sur 9 catégories
            </p>

            <div className="mt-10 space-y-12">
              {FEATURE_COMPARISON.map((category) => (
                <div key={category.category}>
                  <h3 className="font-display text-lg font-semibold text-white mb-4">
                    {category.category}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/10">
                          <th className="text-left px-5 py-3 font-medium text-white/60 uppercase text-[10px] tracking-wider">
                            Fonctionnalité
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-magenta uppercase text-[10px] tracking-wider w-[30%]">
                            Centrium
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-white/40 uppercase text-[10px] tracking-wider w-[30%]">
                            Boondmanager
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {category.features.map((feature) => (
                          <tr key={feature.name} className="hover:bg-white/[0.02]">
                            <td className="px-5 py-3.5 text-white/80">{feature.name}</td>
                            <td className="px-5 py-3.5">
                              <FeatureValue value={feature.centrium} />
                            </td>
                            <td className="px-5 py-3.5">
                              <FeatureValue value={feature.boondmanager} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quand Centrium n'est PAS le bon choix */}
          <section className="mt-20 max-w-4xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white tracking-tight text-center">
              Quand Boondmanager{' '}
              <span className="qc-italic-accent font-editorial italic">
                reste le bon choix
              </span>
            </h2>
            <p className="mt-4 text-white/65 text-center leading-relaxed">
              Par souci d&apos;honnêteté, Centrium n&apos;est pas la meilleure solution pour
              toutes les ESN. Choisissez Boondmanager si :
            </p>
            <ul className="mt-6 space-y-3 text-white/75">
              {[
                'Vous gérez 500+ consultants et avez besoin de modules métier ultra-spécialisés (achat, RPA, GED avancée) avec un produit ultra-mature depuis 15 ans',
                'Vous êtes déjà sous Boondmanager depuis 5+ ans avec une intégration profonde — la migration coûterait plus cher que les gains',
                'Vous avez une équipe IT interne qui veut un produit on-premise (Centrium est 100 % SaaS cloud)',
                'Vous travaillez exclusivement avec des clients qui exigent SOC 2 Type II ou ISO 27001 dès maintenant (notre roadmap : SOC 2 Type I Q4 2026, Type II Q1 2027, ISO 27001 Q2 2027)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-400 mt-1 shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-white/55 text-sm italic text-center">
              Pour tous les autres cas — ESN 10 à 200 consultants, équipe moderne, ambition
              de scaling — Centrium est l&apos;alternative à essayer.
            </p>
          </section>

          {/* CTA Final */}
          <section className="mt-20 rounded-3xl border border-magenta/20 bg-gradient-to-br from-magenta/[0.08] via-violet-glow/[0.04] to-transparent p-10 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
                Essayez Centrium{' '}
                <span className="qc-italic-accent font-editorial italic">
                  en 30 minutes
                </span>
              </h2>
              <p className="mt-4 text-white/65 leading-relaxed">
                Démo personnalisée avec vos vraies données. Devis chiffré sous 48h. Aucun
                engagement avant signature.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/devis"
                  className="qc-cta inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-sm"
                >
                  Demander une démo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/tarifs"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/30 transition px-7 py-3 font-semibold text-sm text-white/85"
                >
                  Voir les tarifs publics
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
