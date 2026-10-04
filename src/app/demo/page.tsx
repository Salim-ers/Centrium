import type { Metadata } from 'next';

import { DemoContent } from './DemoContent';

export const metadata: Metadata = {
  title: 'Demander une démo',
  description: 'Une démonstration de Centrium sur vos cas : CRM, staffing, missions, CRA et rentabilité de votre ESN.',
  alternates: { canonical: '/demo' },
  openGraph: { title: 'Demander une démo — Centrium', url: '/demo', type: 'website' },
};

export default function DemoPage() {
  return <DemoContent />;
}
