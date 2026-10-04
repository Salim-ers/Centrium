import type { Metadata } from 'next';

import { Platform } from '@/components/site/pages/Platform';

export const metadata: Metadata = {
  title: 'Plateforme',
  description:
    'CRM, clients, devis, consultants, staffing, matching, missions, CRA, préfacturation, tableau de bord, analytics, automatisations et portails : quinze modules, un seul flux, tous inclus dans chaque offre.',
  alternates: { canonical: '/plateforme' },
  openGraph: { title: 'La plateforme Centrium', description: 'Un seul espace. Tout le cycle de votre ESN.', url: '/plateforme', type: 'website' },
};

export default function PlateformePage() {
  return <Platform />;
}
