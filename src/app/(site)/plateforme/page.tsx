import type { Metadata } from 'next';

import { Platform } from '@/components/site/pages/Platform';

export const metadata: Metadata = {
  title: 'Fonctionnalités',
  description:
    'CRM, clients, devis, consultants, staffing, matching, missions, CRA, préfacturation, tableau de bord, analytics, automatisations et portails : quinze modules, un seul flux, et ce que chaque fonction de l’ESN y trouve.',
  alternates: { canonical: '/plateforme' },
  openGraph: { title: 'Les fonctionnalités de Centrium', description: 'Un seul espace. Tout le cycle de votre ESN.', url: '/plateforme', type: 'website' },
};

export default function PlateformePage() {
  return <Platform />;
}
