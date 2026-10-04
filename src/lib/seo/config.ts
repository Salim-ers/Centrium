/**
 * Configuration SEO centralisée pour Centrium.
 *
 * URL canonique pilotée par NEXT_PUBLIC_SITE_URL (Vercel) avec fallback
 * sur le domaine officiel. Toutes les métadonnées OG/Twitter/sitemap
 * lisent depuis cette constante pour éviter les divergences.
 */

export const SITE = {
  name: 'Centrium',
  legalName: 'QuadCore SAS',
  publisher: 'QuadCore',
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://www.centrium-platform.com',
  defaultLocale: 'fr_FR',
  alternateLocales: ['en_US'],
  twitterHandle: '@centrium_platform',
  contactEmail: 'contact@centrium-platform.com',
  // Description courte (155 chars max — Google SERP)
  descriptionFr:
    'Le cockpit de gestion des ESN et cabinets de conseil : CRM, staffing, consultants, missions, CRA, devis et rentabilité dans un seul espace. Hébergé dans l’UE.',
  descriptionEn:
    'The operating cockpit for IT services and consulting firms: CRM, staffing, consultants, missions, timesheets, quotes and profitability in one place. EU-hosted.',
  // Keywords pour metadata (Google les ignore depuis 2009, mais Bing
  // et certains moteurs les utilisent encore)
  keywordsFr: [
    'ESN',
    'plateforme ESN',
    'logiciel ESN',
    'gestion consultants',
    'CRM ESN',
    'staffing consultants',
    'CRA ESN',
    'rentabilité ESN',
    'cabinet de conseil',
    'logiciel staffing',
    'SaaS ESN',
    'RGPD',
  ],
  keywordsEn: [
    'staffing agency software',
    'consultant management platform',
    'consultant staffing',
    'consultant matching',
    'timesheets and pre-invoicing',
    'consulting firm CRM',
    'SaaS for staffing',
    'GDPR compliant',
    'EU-hosted',
  ],
} as const;

export const ogImage = (path = '/opengraph-image') => `${SITE.url}${path}`;
