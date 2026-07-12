import type { Metadata } from 'next';

import { TarifsContent } from './TarifsContent';

export const metadata: Metadata = {
  title: 'Tarifs Centrium — 3 plans transparents pour ESN',
  description:
    "Tarifs publics Centrium : Starter 74,99 €/mois, Medium 149,99 €/mois, Illimité 299,99 €/mois. Souscription self-service en 2 minutes, annulation à tout moment.",
  keywords: [
    'tarif centrium',
    'prix logiciel ESN',
    'prix PSA staffing',
    'tarif boondmanager',
    'prix gestion consultants',
  ],
  alternates: { canonical: '/tarifs' },
  openGraph: {
    title: 'Tarifs Centrium — 3 plans publics',
    description:
      'Pricing transparent par paliers. Souscription et annulation self-service. Démo + devis 48h sans engagement.',
    url: '/tarifs',
    type: 'website',
  },
};

export default function TarifsPage() {
  return <TarifsContent />;
}
