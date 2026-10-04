import type { Metadata } from 'next';

import { Closing } from '@/components/site/home/Closing';
import { FlowStory } from '@/components/site/home/FlowStory';
import { Hero } from '@/components/site/home/Hero';
import { Interlude } from '@/components/site/home/Interlude';
import { Manifesto } from '@/components/site/home/Manifesto';
import { Matching } from '@/components/site/home/Matching';
import { Modules } from '@/components/site/home/Modules';

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
      <Modules />
      <Matching />
      <Closing />
    </>
  );
}
