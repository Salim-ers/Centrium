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
    name: 'Centrium',
    legalName: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/brand/centrium-logo.svg`,
    description: SITE.descriptionEn,
    foundingDate: '2025',
    founders: [{ '@type': 'Person', name: 'Salim El Rahmani' }],
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
    operatingSystem: 'Web',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'StaffingManagementSoftware',
    description: SITE.descriptionEn,
    url: SITE.url,
    image: `${SITE.url}/opengraph-image`,
    publisher: { '@id': `${SITE.url}#organization` },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'EUR',
        description: 'Custom quote within 48h. No public grid. EU-hosted, GDPR-compliant.',
      },
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}/devis`,
    },
    featureList: [
      'Consultant library with AI CV parsing',
      'CV Optimizer with branded templates (PDF + DOCX)',
      'AI matching consultant ↔ mission',
      'RFP extraction from screenshot or text',
      'Timesheets and automated invoicing',
      'Multi-tenant Row Level Security',
      'EU hosting, GDPR-compliant',
    ],
    inLanguage: ['fr', 'en'],
    softwareVersion: '1.0',
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
