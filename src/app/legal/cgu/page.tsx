import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { TermsOfService } from '@/components/marketing/legal/TermsOfService';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation',
  description:
    'Conditions générales d’utilisation et de service (CGU / CGS) de la plateforme Centrium.',
};

export default function CguPage() {
  return (
    <LegalShell title="CGU / CGS" updatedAt="mai 2026" currentSlug="cgu">
      <TermsOfService />
    </LegalShell>
  );
}
