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
    'Centrium by QuadCore : la plateforme métier des ESN. CV Optimizer IA, CRM commercial, matching consultants, CRA et facturation. Hébergement européen RGPD.',
  descriptionEn:
    'Centrium by QuadCore: the operating system for modern staffing agencies. AI CV Optimizer, sales CRM, consultant matching, timesheets and billing. EU-hosted, GDPR.',
  // Keywords pour metadata (Google les ignore depuis 2009, mais Bing
  // et certains moteurs les utilisent encore)
  keywordsFr: [
    'ESN',
    'plateforme ESN',
    'logiciel ESN',
    'gestion consultants',
    'CV Optimizer',
    'matching consultants missions',
    'CRA facturation ESN',
    'cabinet de conseil',
    'logiciel staffing',
    'SaaS ESN',
    'RGPD',
  ],
  keywordsEn: [
    'staffing agency software',
    'consultant management platform',
    'AI CV optimizer',
    'consultant matching',
    'timesheet and billing',
    'consulting firm CRM',
    'SaaS for staffing',
    'GDPR compliant',
    'EU-hosted',
  ],
} as const;

export const ogImage = (path = '/opengraph-image') => `${SITE.url}${path}`;
