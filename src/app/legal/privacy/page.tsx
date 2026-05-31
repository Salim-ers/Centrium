import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { PrivacyPolicy } from '@/components/marketing/legal/PrivacyPolicy';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Comment Centrium collecte, utilise et protège vos données personnelles, conformément au RGPD et à la loi Informatique et Libertés.',
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      updatedAt="mai 2026"
      currentSlug="privacy"
    >
      <PrivacyPolicy />
    </LegalShell>
  );
}
