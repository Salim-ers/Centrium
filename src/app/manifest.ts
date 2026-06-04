import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — PWA-ready (installation home screen sur mobile,
 * comportement standalone, theme color).
 *
 * Enrichi 2026-06-04 : ajout `id`, `scope`, `dir`, icônes maskable
 * pour passer le checklist Lighthouse PWA et permettre les icônes
 * adaptatives Android (safe zone) sans déformation.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Centrium — la plateforme métier des ESN',
    short_name: 'Centrium',
    description:
      'Centrium by QuadCore : CV Optimizer IA, CRM commercial, matching consultants, CRA et facturation. Plateforme tout-en-un pour les ESN.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050610',
    theme_color: '#050610',
    orientation: 'portrait',
    lang: 'fr',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
