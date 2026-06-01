import { DICT } from '@/lib/i18n/landing';

/**
 * FAQPage JSON-LD spécifique à /pricing.
 *
 * Note importante (2024+) : Google a restreint le rich result FAQ aux
 * sites gouvernementaux et santé. Mais le bloc reste utile pour les
 * LLMs (ChatGPT, Perplexity, Google AI Overviews) qui s'en servent pour
 * répondre directement aux questions des utilisateurs — particulièrement
 * pertinent pour un produit B2B où les acheteurs comparent via ces outils.
 *
 * On utilise la version FR du DICT (langue principale crawlée par Google)
 * — l'EN reste accessible via le toggle côté client mais ne sert pas le
 * crawl initial.
 */
export function PricingFaqJsonLd() {
  const faq = DICT.fr.pricingPage.faq;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
