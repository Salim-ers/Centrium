'use client';

import {
  Lock,
  Server,
  ShieldCheck,
  Eye,
  RefreshCw,
  FileCheck2,
  Users2,
  KeyRound,
  ScrollText,
  HeartHandshake,
} from 'lucide-react';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MagneticButton } from '@/components/marketing/MagneticButton';
import { useLocale } from '@/lib/i18n/LocaleProvider';

/**
 * /engagements — page unifiée qui combine l'ancien manifeste (vision
 * produit) et l'ancienne page sécurité (architecture, conformité,
 * réponse incident). Pas de section sous-traitants techniques —
 * info disponible dans le DPA (lien depuis le footer / page légale).
 *
 * Structure :
 *   1. Hero éditorial (manifeste)
 *   2. Texte manifeste + 3 principes
 *   3. Architecture sécurité (6 piliers)
 *   4. Conformité (4 axes)
 *   5. Réponse à incident
 *   6. CTA finale
 */

const SECURITY_ICONS = [Lock, Server, ShieldCheck, KeyRound, Eye, RefreshCw] as const;
const COMPLIANCE_ICONS = [ScrollText, Users2, HeartHandshake, FileCheck2] as const;

export default function EngagementsPage() {
  const { t } = useLocale();
  const e = t.engagements;

  return (
    <MarketingShell>
      <main className="relative pt-28 sm:pt-32 pb-20">
        {/* ===== HERO ÉDITORIAL ===== */}
        <article className="max-w-3xl mx-auto px-6">
          <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-primary mb-6 text-center">
            {e.eyebrow}
          </div>

          <h1 className="font-display font-light tracking-[-0.04em] leading-[0.95] text-[clamp(2.4rem,6vw,5rem)] text-foreground text-center">
            {e.titleA}
            <span className="text-primary block mt-3 font-display font-normal">
              {e.titleB}
            </span>
            <span className="block mt-3">{e.titleC}</span>
          </h1>

          <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-10 text-[16px] sm:text-[17px] md:text-[18px] leading-[1.7] text-muted-foreground font-light">
            <p className="text-primary font-display text-[clamp(1.3rem,2.2vw,1.8rem)] leading-[1.5] text-center">
              {e.quote}
            </p>

            <p>{e.para1}</p>

            <p>{e.para2}</p>

            <p>
              {e.para3} <strong className="text-white">{e.para3Highlight}</strong>.
            </p>
          </div>

          {/* 3 principes */}
          <div className="qc-luminous-static mt-16 sm:mt-20 grid sm:grid-cols-3 gap-px bg-muted border border-border rounded-2xl overflow-hidden">
            {e.principles.map((p) => (
              <div key={p.n} className="bg-background p-7 sm:p-8">
                <div className="text-[11px] font-mono text-muted-foreground mb-4">{p.n}</div>
                <div className="text-primary font-display text-2xl mb-3">
                  {p.title}
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </article>

        {/* ===== ARCHITECTURE SÉCURITÉ ===== */}
        <section className="qc-section-divider relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24 mt-16">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-primary mb-3">
              {e.securityKicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-foreground">
              {e.securityTitleA}{' '}
              <span className="text-primary font-display ">{e.securityTitleB}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {e.securityItems.map((item, i) => {
              const Icon = SECURITY_ICONS[i] ?? Lock;
              return (
                <div
                  key={item.title}
                  className="qc-luminous-static rounded-2xl border border-border bg-card p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== CONFORMITÉ ===== */}
        <section className="qc-section-divider relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-primary mb-3">
              {e.complianceKicker}
            </div>
            <h2 className="font-display font-light tracking-[-0.03em] leading-[1] text-[clamp(1.8rem,3.8vw,3rem)] text-foreground">
              {e.complianceTitleA}{' '}
              <span className="text-primary font-display ">{e.complianceTitleB}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {e.complianceItems.map((c, i) => {
              const Icon = COMPLIANCE_ICONS[i] ?? ScrollText;
              return (
                <div
                  key={c.title}
                  className="qc-luminous-static rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {c.bullets.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-success mt-1">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== CTA FINALE ===== */}
        <section className="qc-section-divider relative max-w-3xl mx-auto px-6 pt-20 sm:pt-24 text-center">
          <p className="text-primary font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.4] mb-2">
            {e.ctaTitleA}
          </p>
          <p className="text-primary font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.4]">
            {e.ctaTitleB}
          </p>
          <p className="mt-6 text-muted-foreground text-[15px]">{e.ctaAuthor}</p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <MagneticButton href="/essai" variant="primary">
              {e.ctaPrimary}
            </MagneticButton>
            <MagneticButton href="/plateforme" variant="ghost">
              {e.ctaSecondary}
            </MagneticButton>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
