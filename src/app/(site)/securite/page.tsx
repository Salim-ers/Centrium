import type { Metadata } from 'next';

import { Security } from '@/components/site/pages/Security';

export const metadata: Metadata = {
  title: 'Sécurité',
  description:
    'Les protections réellement déployées dans Centrium : hébergement dans l’Union européenne, isolation des organisations, permissions vérifiées côté serveur, double authentification des administrateurs, documents privés.',
  alternates: { canonical: '/securite' },
  openGraph: { title: 'Sécurité — Centrium', url: '/securite', type: 'website' },
};

export default function SecuritePage() {
  return <Security />;
}
