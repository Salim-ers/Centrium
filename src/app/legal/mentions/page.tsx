import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { LegalNotice } from '@/components/marketing/legal/LegalNotice';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales obligatoires de la plateforme Centrium : éditeur, hébergement, propriété intellectuelle et contact.',
};

export default function MentionsPage() {
  return (
    <LegalShell
      title="Mentions légales"
      updatedAt="mai 2026"
      currentSlug="mentions"
    >
      <LegalNotice />
    </LegalShell>
  );
}
