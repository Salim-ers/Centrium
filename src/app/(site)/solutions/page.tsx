import type { Metadata } from 'next';

import { Solutions } from '@/components/site/pages/Solutions';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'Direction, business managers, recrutement, ADV et finance, consultants, clients : ce que Centrium apporte à chaque rôle de votre ESN.',
  alternates: { canonical: '/solutions' },
  openGraph: { title: 'Solutions — Centrium', description: 'Un rôle. Une réponse.', url: '/solutions', type: 'website' },
};

export default function SolutionsPage() {
  return <Solutions />;
}
