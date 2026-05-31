import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { CookiePolicy } from '@/components/marketing/legal/CookiePolicy';

export const metadata: Metadata = {
  title: 'Politique de cookies',
  description:
    'Quels cookies utilise Centrium, comment ils sont utilisés et comment vous pouvez gérer votre consentement.',
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Politique de cookies"
      updatedAt="mai 2026"
      currentSlug="cookies"
    >
      <CookiePolicy />
    </LegalShell>
  );
}
