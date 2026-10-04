import { PLAN_CATALOG, PUBLIC_PLAN_IDS } from '@/lib/billing/plans';
import { SITE } from '@/lib/seo/config';

/**
 * Bloc JSON-LD Organization + SoftwareApplication injecté dans <head> du
 * root layout. Aide Google Knowledge Graph, AI Overviews et les moteurs
 * de recherche à comprendre que Centrium est un produit logiciel de
 * QuadCore SAS.
 *
 * Schema.org refs :
 *   - https://schema.org/Organization
 *   - https://schema.org/SoftwareApplication
 *   - https://schema.org/WebSite (avec SearchAction si on ouvrait la search)
 */
export function JsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}#organization`,
    name: 'Centrium by QuadCore',
    alternateName: ['Centrium', 'QuadCore SAS'],
    legalName: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/brand/centrium-logo.svg`,
    description: SITE.descriptionEn,
    foundingDate: '2025',
    founders: [{ '@type': 'Person', name: 'Salim El Rahmani' }],
    // Signal le plus fort pour le Knowledge Graph Google et la triangulation
    // d'entité par ChatGPT/Perplexity/Bing Copilot. À remplir au fur et à
    // mesure que les profils publics sont créés (LinkedIn, Crunchbase, etc.).
    sameAs: [
      'https://www.linkedin.com/company/centrium-platform',
      'https://www.linkedin.com/company/quadcore-sas',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: SITE.contactEmail,
        availableLanguage: ['French', 'English'],
        areaServed: ['FR', 'EU'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SITE.contactEmail,
        availableLanguage: ['French', 'English'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'FR',
      addressLocality: 'Paris',
    },
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE.url}#software`,
    name: 'Centrium',
    alternateName: 'Centrium by QuadCore',
    operatingSystem: 'Web',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'StaffingManagementSoftware',
    description: SITE.descriptionEn,
    url: SITE.url,
    image: `${SITE.url}/opengraph-image`,
    // Logo explicite sur SoftwareApplication (Google Rich Results recommandé).
    logo: `${SITE.url}/brand/centrium-logo.svg`,
    publisher: { '@id': `${SITE.url}#organization` },
    // Offres publiques : mêmes montants que la page Tarifs et Stripe.
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: Math.min(...PUBLIC_PLAN_IDS.map((id) => PLAN_CATALOG[id].monthlyEur)),
      offerCount: PUBLIC_PLAN_IDS.length,
      url: `${SITE.url}/tarifs`,
      offers: PUBLIC_PLAN_IDS.map((id) => ({
        '@type': 'Offer',
        name: PLAN_CATALOG[id].name,
        price: PLAN_CATALOG[id].monthlyEur,
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: PLAN_CATALOG[id].monthlyEur,
          priceCurrency: 'EUR',
          unitCode: 'MON',
          valueAddedTaxIncluded: false,
        },
        url: `${SITE.url}/tarifs`,
      })),
    },
    featureList: [
      'CRM: contacts, companies, opportunities, quotes',
      'Consultant profiles and staffing timeline',
      'Explainable consultant matching (score out of 100, seven criteria)',
      'Missions with sale rate, cost and margin',
      'Monthly timesheets, approval and pre-invoicing',
      'Client and consultant portals',
      'Automations and analytics',
      'Role-based permissions, organisation isolation (Row Level Security)',
      'Hosted in the European Union',
    ],
    inLanguage: ['fr', 'en'],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}#website`,
    url: SITE.url,
    name: 'Centrium',
    description: SITE.descriptionFr,
    inLanguage: ['fr', 'en'],
    publisher: { '@id': `${SITE.url}#organization` },
  };

  // Échappe "<" → < : empêche toute rupture de balise </script> si une
  // valeur dynamique venait un jour à être injectée dans le JSON-LD (XSS).
  const ld = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(software) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(website) }} />
    </>
  );
}
