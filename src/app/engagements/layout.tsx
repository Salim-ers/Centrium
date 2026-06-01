import type { Metadata } from 'next';

import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Engagements & sécurité',
  description:
    'Manifeste Centrium, 6 piliers de sécurité (TLS, AES-256, hébergement européen, RLS multi-tenant, journalisation, sauvegardes), conformité RGPD/CNIL et DPA signable sur demande.',
  alternates: { canonical: '/engagements' },
  openGraph: {
    title: 'Engagements & sécurité — Centrium',
    description:
      'Le manifeste Centrium, l\'architecture de sécurité et les engagements RGPD : conçu pour les ESN qui auditent leurs fournisseurs.',
    url: '/engagements',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engagements & sécurité — Centrium',
    description:
      'Manifeste, sécurité (TLS, AES-256, RLS, hébergement EU), conformité RGPD.',
  },
};

export default function EngagementsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Engagements', path: '/engagements' }]} />
      {children}
    </>
  );
}
