import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo/config';

/**
 * /robots.txt — directives crawlers.
 *
 * - Tout indexable par défaut sur les routes publiques
 * - Pages auth + app interne explicitement disallowées (pas indexables)
 * - Sitemap référencé pour Google/Bing
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/consultants',
          '/consultants/',
          '/contracts',
          '/contracts/',
          '/invoices',
          '/invoices/',
          '/timesheets',
          '/timesheets/',
          '/opportunities',
          '/opportunities/',
          '/templates',
          '/templates/',
          '/settings',
          '/settings/',
          '/auth/',
          '/invite/',
          '/onboarding',
          '/login',
          '/register',
          '/signup',
          '/todos',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
