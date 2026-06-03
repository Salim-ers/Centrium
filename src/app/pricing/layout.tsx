import type { Metadata } from 'next';

import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { PricingFaqJsonLd } from '@/components/seo/PricingFaqJsonLd';

export const metadata: Metadata = {
  title: 'Tarifs sur mesure',
  description:
    'Centrium s\'adapte à votre volume, vos modules et votre accompagnement. Pas de grille publique — devis chiffré sous 48 h, lisible et sans engagement avant signature. Hébergement européen, RGPD.',
  alternates: {
    canonical: '/pricing',
    languages: {
      'fr-FR': '/pricing',
      'en-US': '/pricing',
      'x-default': '/pricing',
    },
  },
  openGraph: {
    title: 'Tarifs sur mesure — Centrium',
    description:
      'Un prix. Le vôtre. Devis chiffré sous 48 h, transparent, sans engagement avant signature.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarifs sur mesure — Centrium',
    description:
      'Devis chiffré sous 48 h, lisible, sans engagement avant signature.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Tarifs', path: '/pricing' }]} />
      <PricingFaqJsonLd />
      {children}
    </>
  );
}
