import { SITE } from '@/lib/seo/config';

type Crumb = { name: string; path: string };

/**
 * BreadcrumbList JSON-LD — rich result Google supporté sans restriction
 * sectorielle. Affiche le fil d'Ariane sous le titre dans les SERP.
 *
 * Usage côté server (layout.tsx ou page.tsx server-component) :
 *   <BreadcrumbJsonLd crumbs={[{ name: 'Tarifs', path: '/pricing' }]} />
 *
 * La home est ajoutée automatiquement comme premier item.
 */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  // @id persistant pour permettre aux blocs WebPage de référencer ce
  // breadcrumb via `"breadcrumb": { "@id": "...#breadcrumb" }`.
  const lastPath = crumbs[crumbs.length - 1]?.path ?? '';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${SITE.url}${lastPath}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: SITE.url,
      },
      ...crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.name,
        item: `${SITE.url}${c.path}`,
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
