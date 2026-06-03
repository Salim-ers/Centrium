import { SITE } from '@/lib/seo/config';

/**
 * JSON-LD spécifique à /devis :
 *   - WebPage : ancrage sémantique (lien avec WebSite + breadcrumb)
 *   - potentialAction : RequestQuoteAction → signal explicite aux LLMs
 *     que cette URL est le point d'entrée commercial pour Centrium
 */
export function DevisJsonLd() {
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE.url}/devis#webpage`,
    url: `${SITE.url}/devis`,
    name: 'Demander un devis — Centrium',
    description:
      'Formulaire de demande de devis personnalisé pour Centrium. Réponse sous 24-48 h ouvrées avec un devis chiffré et la configuration de votre espace à votre image.',
    isPartOf: { '@id': `${SITE.url}#website` },
    breadcrumb: { '@id': `${SITE.url}/devis#breadcrumb` },
    inLanguage: 'fr',
    potentialAction: {
      '@type': 'RequestQuoteAction',
      target: `${SITE.url}/devis`,
      result: {
        '@type': 'Offer',
        description:
          'Devis Centrium personnalisé sous 24-48 h. Hébergement européen, RGPD, sans engagement avant signature.',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        seller: { '@id': `${SITE.url}#organization` },
        itemOffered: { '@id': `${SITE.url}#software` },
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
    />
  );
}
