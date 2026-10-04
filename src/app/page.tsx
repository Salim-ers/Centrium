import type { Metadata } from 'next';

import { MarketingShell } from '@/components/marketing/MarketingShell';
import { Landing } from '@/components/site/Landing';

export const metadata: Metadata = {
  title: { absolute: 'Centrium — Le cockpit de gestion des ESN et cabinets de conseil' },
  description: 'CRM, staffing, consultants, missions, CRA, devis et rentabilité réunis dans un seul espace. Essai de 7 jours, données hébergées dans l’Union européenne.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Centrium — Pilotez votre ESN. Pas vos tableurs.',
    description: 'CRM, staffing, consultants, missions, CRA et rentabilité réunis dans un seul espace.',
    url: '/',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <Landing />
    </MarketingShell>
  );
}
