import type { Metadata } from 'next';

import { LegalShell } from '@/components/marketing/legal/LegalShell';
import { DPA } from '@/components/marketing/legal/DPA';

export const metadata: Metadata = {
  title: 'Accord de sous-traitance (DPA)',
  description:
    'Accord de sous-traitance (DPA) au sens de l’article 28 du RGPD entre Centrium et ses clients.',
};

export default function DpaPage() {
  return (
    <LegalShell
      title="Accord de sous-traitance (DPA)"
      updatedAt="mai 2026"
      currentSlug="dpa"
    >
      <DPA />
    </LegalShell>
  );
}
