import type { Metadata } from 'next';

import { SecurityContent } from './SecurityContent';

export const metadata: Metadata = {
  title: 'Sécurité',
  description:
    'Les protections réellement déployées dans Centrium : hébergement dans l’Union européenne, isolation des organisations, permissions vérifiées côté serveur, double authentification des administrateurs, documents privés.',
  alternates: { canonical: '/security' },
  openGraph: { title: 'Sécurité — Centrium', url: '/security', type: 'website' },
};

export default function SecurityPage() {
  return <SecurityContent />;
}
