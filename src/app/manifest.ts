import type { MetadataRoute } from 'next';

/**
 * Web App Manifest : Centrium s'installe sur l'écran d'accueil (mobile,
 * tablette, ordinateur) et s'ouvre en plein écran. Démarre sur /login :
 * une session active est aussitôt redirigée vers son accueil (tableau de
 * bord ESN, portail consultant ou portail client). Icônes 192 et 512 px
 * (dont « maskable » avec zone de sécurité) exigées pour l'installation.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Centrium — la plateforme métier des ESN',
    short_name: 'Centrium',
    description: 'CRM, talents, matching IA, missions, CRA et préfacturation : la plateforme métier des ESN.',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#FBF8F5',
    theme_color: '#FBF8F5',
    orientation: 'any',
    lang: 'fr',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/192?maskable=1', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
