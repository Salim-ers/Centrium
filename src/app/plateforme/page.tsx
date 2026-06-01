'use client';

import { Modules } from '@/components/marketing/Modules';
import { ProductShowcase } from '@/components/marketing/ProductShowcase';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { TrustedBy } from '@/components/marketing/TrustedBy';
import { PricingPreview } from '@/components/marketing/PricingPreview';
import { Contact } from '@/components/marketing/Contact';
import { MarketingShell, useLandingDict } from '@/components/marketing/MarketingShell';

export default function PlateformePage() {
  return (
    <MarketingShell>
      <Inner />
    </MarketingShell>
  );
}

function Inner() {
  const { t } = useLandingDict();
  return (
    <main className="relative pt-24">
      {/* Hero court de page intérieure */}
      <section className="relative max-w-5xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-4">
          {t.plateforme.eyebrow}
        </div>
        <h1 className="font-display font-light tracking-[-0.035em] leading-[1] text-[clamp(2.4rem,5.5vw,4.5rem)] text-white">
          {t.plateforme.titleA}
          <span className="qc-italic-accent block mt-2 font-editorial italic font-normal">
            {t.plateforme.titleB}
          </span>
        </h1>
        <p className="mt-8 mx-auto max-w-2xl text-[15px] md:text-base leading-relaxed text-white/60">
          {t.plateforme.sub}
        </p>
      </section>

      <Modules t={t} />
      <ProductShowcase />
      <HowItWorks t={t} />
      <TrustedBy />
      <PricingPreview t={t} />
      <Contact t={t} />
    </main>
  );
}
