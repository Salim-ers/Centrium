'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Users,
  Building2,
  ShieldCheck,
  Cog,
  Bot,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MarketingShell } from '@/components/marketing/MarketingShell';

/**
 * Page /pricing — plan unique "Sur devis".
 *
 * Décision produit : pas de grille de prix publique. La facturation dépend
 * du volume de consultants, du nombre d'utilisateurs ESN, des modules
 * activés (IA, signature, intégrations) et de l'accompagnement.
 *
 * Toute la page pousse vers /devis pour qualifier la demande. Le code
 * Stripe + la table `plans` restent en backend pour facturation interne
 * une fois la négociation close.
 */

type Factor = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const FACTORS: Factor[] = [
  {
    icon: Users,
    title: 'Volume de consultants gérés',
    body: 'Bibliothèque interne, freelances, portage — chaque profil compte pour calibrer la plateforme.',
  },
  {
    icon: Building2,
    title: 'Nombre d’utilisateurs ESN',
    body: 'Business managers, recruteurs, finance, viewers. Tarification dégressive au-delà de 20 sièges.',
  },
  {
    icon: Bot,
    title: 'Modules IA activés',
    body: 'CV Optimizer, matching, assistant comptable. Volume d’appels et niveau de fine-tuning ajustables.',
  },
  {
    icon: Cog,
    title: 'Intégrations & options',
    body: 'SSO, signature électronique, exports comptables, API publique, white-label, SLA renforcé.',
  },
  {
    icon: ShieldCheck,
    title: 'Conformité & accompagnement',
    body: 'DPA personnalisé, audit sécurité, onboarding équipe, support dédié, formation sur site.',
  },
];

type Persona = {
  title: string;
  pitch: string;
  bullets: string[];
};

const PERSONAS: Persona[] = [
  {
    title: 'ESN en croissance',
    pitch: '10 à 100 consultants, plusieurs business managers, besoin de structurer.',
    bullets: [
      'CV Optimizer + bibliothèque',
      'Pipeline CRM commercial',
      'CRA + facturation',
      'Onboarding accompagné',
    ],
  },
  {
    title: 'Cabinet de conseil',
    pitch: 'Staffing exigeant, suivi rentabilité, intercontrat à minimiser.',
    bullets: [
      'Matching consultant ↔ mission',
      'Vue intercontrat temps réel',
      'Reporting marge & TJM',
      'Templates contrats personnalisés',
    ],
  },
  {
    title: 'Groupe / ETI',
    pitch: 'Multi-entités, SSO, audit, conformité renforcée.',
    bullets: [
      'Multi-organisation',
      'SSO + MFA',
      'Audit & traçabilité',
      'SLA + support dédié',
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Pourquoi pas de grille de prix publique ?',
    a: 'Parce qu’une ESN de 12 consultants et un groupe de 500 personnes n’ont ni les mêmes besoins, ni les mêmes coûts. On préfère cadrer ensemble en 20 minutes plutôt que de vous laisser deviner.',
  },
  {
    q: 'Combien de temps prend une démo ?',
    a: 'En général 30 minutes : 10 min de découverte de votre setup actuel, 15 min de démo ciblée, 5 min pour répondre à vos questions. Vous repartez avec une estimation chiffrée.',
  },
  {
    q: 'Y a-t-il un engagement ?',
    a: 'Engagement minimum 12 mois pour permettre l’accompagnement et la configuration sur mesure. Au-delà, renouvellement mensuel ou annuel à votre choix.',
  },
  {
    q: 'Que comprend l’onboarding ?',
    a: 'Création de votre espace à votre image (logo, couleurs, mentions, signature), import de vos consultants et contacts, formation de votre équipe, configuration des templates CV et contrats.',
  },
];

export default function PricingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { kill(): void } | undefined;
    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (!rootRef.current) return;
      ctx = gsap.context(() => {
        gsap.from('[data-anim="rise"]', {
          opacity: 0,
          y: 30,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: '[data-anim-root]',
            start: 'top 80%',
          },
        });
      }, rootRef);
    })();
    return () => ctx?.kill();
  }, []);

  return (
    <MarketingShell>
      <main ref={rootRef} className="pt-20">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(225,29,116,0.2),transparent_70%)]"
          />
          <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
            <div
              data-anim="rise"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-glow/40 bg-violet-glow/10 text-xs font-medium text-violet-200 mb-6"
            >
              <Sparkles className="h-3 w-3" />
              Tarification personnalisée
            </div>
            <h1
              data-anim="rise"
              className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]"
            >
              Un seul prix : <span className="qc-gradient-text">le vôtre.</span>
            </h1>
            <p
              data-anim="rise"
              className="mt-6 text-white/65 text-lg leading-relaxed max-w-2xl mx-auto"
            >
              Chaque ESN est unique. Centrium s’adapte à votre volume de
              consultants, vos modules IA, vos intégrations et votre
              accompagnement — pas l’inverse. On chiffre ensemble en 20 minutes.
            </p>

            <div
              data-anim="rise"
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Button
                asChild
                size="lg"
                className="h-12 px-6 bg-qc-gradient hover:opacity-95 shadow-[0_0_30px_rgba(225,29,116,0.45)]"
              >
                <Link href="/devis" className="inline-flex items-center gap-2">
                  Obtenir une estimation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-6 border-hairline"
              >
                <Link href="/security">Sécurité & conformité</Link>
              </Button>
            </div>

            <div
              data-anim="rise"
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Réponse sous 24-48 h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Aucun engagement avant signature
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Hébergement européen
              </span>
            </div>
          </div>
        </section>

        <section
          data-anim-root
          className="max-w-6xl mx-auto px-6 py-16 border-t border-hairline"
        >
          <div data-anim="rise" className="mb-10 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
              Comment on calcule
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              5 critères, une proposition claire
            </h2>
            <p className="mt-3 text-white/60">
              On vous remet un devis détaillé, ligne par ligne, sans surprise
              et sans engagement avant que vous l’ayez signé.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FACTORS.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  data-anim="rise"
                  className="rounded-2xl border border-hairline bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-magenta/30 transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-magenta/15 border border-magenta/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-magenta" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          data-anim-root
          className="max-w-6xl mx-auto px-6 py-16 border-t border-hairline"
        >
          <div data-anim="rise" className="mb-10 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2">
              Pour qui
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Pensé pour votre profil
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PERSONAS.map((p, i) => (
              <div
                key={p.title}
                data-anim="rise"
                className={`rounded-2xl border p-6 flex flex-col ${
                  i === 1
                    ? 'border-magenta/40 bg-gradient-to-b from-magenta/10 to-transparent shadow-glow-magenta'
                    : 'border-hairline bg-white/[0.02]'
                }`}
              >
                <div className="font-display text-lg font-bold text-white">
                  {p.title}
                </div>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{p.pitch}</p>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={i === 1 ? 'default' : 'outline'}
                  className={`mt-6 ${i === 1 ? 'bg-qc-gradient hover:opacity-95' : ''}`}
                >
                  <Link href="/devis">Parler à un expert</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section
          data-anim-root
          className="max-w-4xl mx-auto px-6 py-16 border-t border-hairline"
        >
          <div data-anim="rise" className="mb-10 text-center">
            <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-magenta mb-2 inline-flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5" />
              Questions fréquentes
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Ce que les ESN nous demandent souvent
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                data-anim="rise"
                className="group rounded-xl border border-hairline bg-white/[0.02] open:bg-white/[0.04] transition"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-medium text-white">
                  {item.q}
                  <span className="text-magenta transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm text-white/70 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="rounded-3xl border border-hairline bg-gradient-to-br from-violet-glow/10 via-transparent to-magenta/10 p-10 md:p-14 text-center relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(225,29,116,0.1),transparent_70%)]"
            />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                Prêt à obtenir votre estimation ?
              </h2>
              <p className="mt-3 text-white/65 max-w-xl mx-auto">
                30 minutes, zéro pression, un devis chiffré à la sortie.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 bg-qc-gradient hover:opacity-95 shadow-[0_0_30px_rgba(225,29,116,0.45)]"
                >
                  <Link href="/devis" className="inline-flex items-center gap-2">
                    Demander un devis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <a href="mailto:contact@centrium-platform.com">
                    contact@centrium-platform.com
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
