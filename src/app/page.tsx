'use client';

import { useEffect, useState } from 'react';

import { DICT, type Locale } from '@/lib/i18n/landing';
import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { Pillars } from '@/components/marketing/Pillars';
import { Modules } from '@/components/marketing/Modules';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { PricingPreview } from '@/components/marketing/PricingPreview';
import { Contact } from '@/components/marketing/Contact';
import { Footer } from '@/components/marketing/Footer';
import { LoadingSplash } from '@/components/marketing/LoadingSplash';

const LOCALE_KEY = 'quadcore-landing-locale';

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>('fr');
  // Splash affiché à chaque montage (initial load + refresh)
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === 'fr' || stored === 'en') setLocale(stored);
  }, []);

  function handleLocaleChange(l: Locale) {
    setLocale(l);
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_KEY, l);
  }

  const t = DICT[locale];

  return (
    <div className="min-h-screen bg-midnight-300 text-white relative overflow-x-hidden">
      {showSplash && <LoadingSplash />}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22><rect width=%221%22 height=%221%22 fill=%22%23ffffff%22 fill-opacity=%220.015%22/></svg>')] pointer-events-none" />
      <Header t={t} locale={locale} onLocaleChange={handleLocaleChange} />
      <main className="relative">
        <Hero t={t} />
        <Pillars t={t} />
        <Modules t={t} />
        <HowItWorks t={t} />
        <PricingPreview t={t} />
        <Contact t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
