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
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
