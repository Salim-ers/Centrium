import type { Metadata } from 'next';

import { Analytics } from '@/components/site/home/Analytics';
import { Automations } from '@/components/site/home/Automations';
import { Closing } from '@/components/site/home/Closing';
import { Cockpit } from '@/components/site/home/Cockpit';
import { Cra } from '@/components/site/home/Cra';
import { Crm } from '@/components/site/home/Crm';
import { FlowStory } from '@/components/site/home/FlowStory';
import { Hero } from '@/components/site/home/Hero';
import { Interlude } from '@/components/site/home/Interlude';
import { Manifesto } from '@/components/site/home/Manifesto';
import { Matching } from '@/components/site/home/Matching';
import { Missions } from '@/components/site/home/Missions';
import { Portals } from '@/components/site/home/Portals';
import { Staffing } from '@/components/site/home/Staffing';

export const metadata: Metadata = {
  title: { absolute: 'Centrium — Le cockpit des ESN modernes' },
  description: 'CRM, staffing, consultants, missions, CRA et rentabilité réunis dans un seul espace. Pilotez votre ESN, pas vos tableurs. Essai de 7 jours, données hébergées dans l’Union européenne.',
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
    <>
      <Hero />
      <Manifesto />
      <Interlude />
      <FlowStory />
      <Cockpit />
      <Crm />
      <Staffing />
      <Matching />
      <Missions />
      <Cra />
      <Portals />
      <Automations />
      <Analytics />
      <Closing />
    </>
  );
}
