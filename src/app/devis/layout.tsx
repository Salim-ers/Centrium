import type { Metadata } from 'next';

import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { DevisJsonLd } from '@/components/seo/DevisJsonLd';

export const metadata: Metadata = {
  title: 'Demander un devis',
  description:
    'Décrivez votre ESN en quelques minutes. Réponse sous 24-48 h avec un devis personnalisé. Configuration de votre espace à votre image (logo, couleurs, mentions légales) avant activation.',
  alternates: {
    canonical: '/devis',
    languages: {
      'fr-FR': '/devis',
      'en-US': '/devis',
      'x-default': '/devis',
    },
  },
  openGraph: {
    title: 'Demander un devis — Centrium',
    description:
      'Devis personnalisé sous 24-48 h. Configuration de votre espace à votre image avant activation.',
    url: '/devis',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demander un devis — Centrium',
    description: 'Devis personnalisé sous 24-48 h. Sans engagement avant signature.',
  },
  robots: { index: true, follow: true },
};

export default function DevisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Devis', path: '/devis' }]} />
      <DevisJsonLd />
      {children}
    </>
  );
}
