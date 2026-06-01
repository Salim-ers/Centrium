'use client';

import { CheckCircle2, Sparkles, Calendar, FileText, ShieldCheck } from 'lucide-react';

import { MagneticButton } from './MagneticButton';
import { useGsapReveal } from '@/hooks/useGsapReveal';
import type { LandingDict } from '@/lib/i18n/landing';

const HIGHLIGHTS = [
  {
    icon: Calendar,
    title: '30 min de cadrage',
    body: 'Découverte, démo, questions. Sans pression commerciale agressive.',
  },
  {
    icon: FileText,
    title: 'Devis chiffré 48 h',
    body: 'Ligne par ligne, lisible. Vous décidez en toute connaissance de cause.',
  },
  {
    icon: ShieldCheck,
    title: 'Aucun engagement avant signature',
    body: 'Vous gardez la main jusqu’à validation contractuelle.',
  },
];

export function PricingPreview({ t }: { t: LandingDict }) {
  const ref = useGsapReveal<HTMLDivElement>();
  const plan = t.pricing.plans[0];

  return (
    <section id="pricing" ref={ref} className="qc-section-divider relative py-28">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16" data-reveal>
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-3">
            {t.pricing.kicker}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-medium tracking-[-0.03em] leading-[1.05]">
            {t.pricing.title}
          </h2>
          <p className="mt-6 text-white/60 leading-relaxed text-[15px] md:text-base">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Carte principale CENTRÉE (au lieu d'un grid 2 cols qui la
            mettait à gauche) — max-w contraint + mx-auto */}
        <div
          data-reveal
          className="qc-luminous-static relative mx-auto max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-8 sm:p-10 overflow-hidden"
        >
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[11px] uppercase tracking-[0.18em] text-white/75 mb-8">
              <Sparkles className="h-3 w-3 text-magenta" />
              {plan.desc}
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-display text-5xl md:text-6xl font-medium tracking-[-0.03em] text-white">
                {plan.price}
              </span>
            </div>
            <p className="text-white/55 text-sm mb-8 max-w-md">
              Tarification calibrée selon votre volume de consultants, vos modules
              IA et votre niveau d’accompagnement.
            </p>

            <ul className="space-y-3 mb-10">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-white/85 text-[15px]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0 mt-1" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <MagneticButton href="/devis" variant="primary">
                {plan.ctaLabel}
              </MagneticButton>
              <MagneticButton href="/pricing" variant="ghost">
                {t.pricing.ctaView}
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* 3 promesses EN DESSOUS, en grid 3 colonnes */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon;
            return (
              <div
                key={h.title}
                data-reveal
                className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 backdrop-blur-md p-6 transition"
              >
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center mb-4 group-hover:border-magenta/40 transition">
                  <Icon className="h-4 w-4 text-white/85 group-hover:text-magenta transition" />
                </div>
                <div className="font-medium text-white text-[15px]">{h.title}</div>
                <p className="text-white/55 text-sm leading-relaxed mt-1">{h.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
