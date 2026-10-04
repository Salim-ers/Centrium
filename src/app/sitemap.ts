import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo/config';

/**
 * /sitemap.xml — pages publiques indexables.
 *
 * Pour chaque page on déclare les alternates FR/EN (même URL, locale
 * gérée client-side via toggle). Cela aide Google à comprendre que la
 * même URL sert deux locales, sans pénalité de contenu dupliqué.
 *
 * lastModified figé au build : Date.now() est interdit dans le code
 * runtime des metadata files, donc on stamp à la build via process.env
 * ou on prend un timestamp constant côté CI.
 */
const buildDate = process.env.VERCEL_GIT_COMMIT_DATE
  ? new Date(process.env.VERCEL_GIT_COMMIT_DATE)
  : new Date('2026-06-01');

type Page = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

const PAGES: Page[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/tarifs', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/security', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/demo', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/essai', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/legal/mentions', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/cgu', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/cookies', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/dpa', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE.url}${path}`,
    lastModified: buildDate,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        fr: `${SITE.url}${path}`,
        en: `${SITE.url}${path}`,
        'x-default': `${SITE.url}${path}`,
      },
    },
  }));
}
