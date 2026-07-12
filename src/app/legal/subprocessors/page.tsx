import type { Metadata } from 'next';

import { SubprocessorsContent } from './SubprocessorsContent';

export const metadata: Metadata = {
  title: 'Sous-traitants',
  description:
    'Liste publique et versionnée des sous-traitants utilisés par Centrium pour fournir le service. Conforme article 28 RGPD.',
  alternates: { canonical: '/legal/subprocessors' },
};

export default function SubprocessorsPage() {
  return <SubprocessorsContent />;
}
