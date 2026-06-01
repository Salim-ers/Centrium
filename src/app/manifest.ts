import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — PWA-ready (installation home screen sur mobile,
 * comportement standalone, theme color).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Centrium — la plateforme métier des ESN',
    short_name: 'Centrium',
    description:
      'Centrium by QuadCore : CV Optimizer IA, CRM commercial, matching consultants, CRA et facturation. Plateforme tout-en-un pour les ESN.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    lang: 'fr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
