import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s — Centrium',
    default: 'Espace légal — Centrium',
  },
  description:
    'Mentions légales, politique de confidentialité, CGU, politique cookies et accord de sous-traitance (DPA) de la plateforme Centrium.',
  robots: { index: true, follow: true },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
