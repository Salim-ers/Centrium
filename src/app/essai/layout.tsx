import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Essai gratuit 7 jours',
  description:
    "Créez votre espace ESN sur Centrium en 2 minutes. 7 jours d'essai gratuit, sans engagement. Votre carte n'est débitée qu'à la fin de l'essai.",
  alternates: {
    canonical: '/essai',
    languages: {
      'fr-FR': '/essai',
      'en-US': '/essai',
      'x-default': '/essai',
    },
  },
  openGraph: {
    title: 'Essai gratuit 7 jours — Centrium',
    description:
      "Lancez votre ESN sur Centrium. 7 jours d'essai gratuit, prélèvement automatique seulement à la fin.",
    url: '/essai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Essai gratuit 7 jours — Centrium',
    description: "7 jours pour tout tester. Sans engagement avant la fin de l'essai.",
  },
  robots: { index: true, follow: true },
};

export default function EssaiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
