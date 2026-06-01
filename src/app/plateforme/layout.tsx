import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'La plateforme',
  description:
    'Tout votre cycle ESN dans un seul flux : bibliothèque consultants, CV Optimizer IA, matching mission, CRA et facturation. Sans rupture, sans ressaisie, hébergé en Europe.',
  alternates: { canonical: '/plateforme' },
  openGraph: {
    title: 'La plateforme — Centrium',
    description:
      'Quatre modules. Un flux unique. Du sourcing à la facture, chaque étape s\'articule sans rupture.',
    url: '/plateforme',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La plateforme — Centrium',
    description:
      'Quatre modules. Un flux unique. Du sourcing à la facture, sans rupture.',
  },
};

export default function PlateformeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
