'use client';

import Link from 'next/link';
import {
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
import { FaqItem } from '@/components/marketing/FaqItem';
import { useLocale } from '@/lib/i18n/LocaleProvider';

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

const FACTOR_ICONS = [Users, Building2, Bot, Cog, ShieldCheck] as const;

export default function PricingPage() {
  const { t } = useLocale();
  const p = t.pricingPage;
  const quoteCta = t.pricing.plans[0]?.ctaLabel ?? p.ctaPrimary;

  return (
    <MarketingShell>
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-20 text-center">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-4">
              {p.eyebrow}
            </div>
            <h1 className="font-display font-light tracking-[-0.035em] leading-[1] text-[clamp(2.2rem,5.5vw,4.5rem)] text-white max-w-4xl mx-auto">
              {p.titleA}
              <span className="qc-italic-accent block mt-2 font-editorial italic font-normal">
                {p.titleB}
              </span>
            </h1>
            <p className="mt-6 sm:mt-8 text-white/65 text-[15px] sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              {p.sub}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-12 px-6 bg-qc-gradient hover:opacity-95 shadow-[0_0_30px_rgba(225,29,116,0.45)]"
              >
                <Link href="/devis" className="inline-flex items-center gap-2">
                  {p.estimateCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 border-hairline"
              >
                <Link href="/engagements">{p.badges.security}</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {p.badges.response}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {p.badges.commitment}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {p.badges.hosting}
              </span>
            </div>
          </div>
        </section>

        <section className="qc-section-divider max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              {p.factorsKicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-white">
              {p.factorsTitleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{p.factorsTitleB}</span>
            </h2>
            <p className="mt-5 text-white/60 text-[15px] sm:text-base">{p.factorsSub}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {p.factors.map((f, i) => {
              const Icon = FACTOR_ICONS[i] ?? Users;
              return (
                <div
                  key={f.title}
                  className="qc-luminous-static rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition group"
                >
                  <div className="h-10 w-10 rounded-xl bg-magenta/15 border border-magenta/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-magenta" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="qc-section-divider max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              {p.personasKicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-white">
              {p.personasTitleA}{' '}
              <span className="qc-italic-accent font-editorial italic">{p.personasTitleB}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {p.personas.map((persona, i) => (
              <div
                key={persona.title}
                className={`qc-luminous-static rounded-2xl border p-6 flex flex-col ${
                  i === 1
                    ? 'border-magenta/40 bg-gradient-to-b from-magenta/10 to-transparent'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="font-display text-lg font-bold text-white">
                  {persona.title}
                </div>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{persona.desc}</p>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {persona.bullets.map((b) => (
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

        <section className="qc-section-divider max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-10 sm:mb-14 text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
              <HelpCircle className="h-3.5 w-3.5" />
              {p.faqKicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-white">
              {p.faqTitleA}
              <span className="qc-italic-accent block mt-1 font-editorial italic">
                {p.faqTitleB}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {p.faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
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
                {p.ctaTitle}
              </h2>
              <p className="mt-3 text-white/65 max-w-xl mx-auto">{p.ctaSub}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 bg-qc-gradient hover:opacity-95 shadow-[0_0_30px_rgba(225,29,116,0.45)]"
                >
                  <Link href="/devis" className="inline-flex items-center gap-2">
                    {quoteCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <a href={`mailto:${p.contactEmail}`}>{p.contactEmail}</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
