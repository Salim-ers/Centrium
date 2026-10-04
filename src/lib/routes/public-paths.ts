// =========================================================================
// Routes publiques — source unique partagée par le middleware (routing
// serveur) et le script de présence de session (layout racine).
// Toute page accessible sans session doit figurer ici.
// =========================================================================

export const PUBLIC_PATHS: string[] = [
  '/',
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/pricing',
  '/tarifs',
  '/demo',
  '/devis',
  '/essai',
  '/security',
  '/securite',
  '/plateforme',
  '/solutions',
  '/status',
  '/manifesto',
  '/engagements',
  '/centrium-vs-boondmanager',
];

export const PUBLIC_PREFIXES: string[] = ['/invite/', '/auth/', '/legal/'];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
