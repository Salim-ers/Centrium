import type { Metadata } from 'next';

import { Pricing } from '@/components/site/pages/Pricing';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Starter 49 € HT/mois, Team 99 €, Growth 179 €, Scale à partir de 299 €. Tous les modules dans chaque offre, portails client et consultant sans licence, 2 mois offerts en annuel.',
  keywords: ['tarif centrium', 'prix logiciel ESN', 'logiciel staffing prix', 'gestion consultants prix'],
  alternates: { canonical: '/tarifs' },
  openGraph: {
    title: 'Tarifs Centrium',
    description: 'Choisissez votre échelle : tous les modules dans chaque offre, seul le nombre de managers et de consultants change.',
    url: '/tarifs',
    type: 'website',
  },
};

export default function TarifsPage() {
  return <Pricing />;
}
