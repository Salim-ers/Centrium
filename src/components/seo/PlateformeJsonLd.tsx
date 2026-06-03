import { SITE } from '@/lib/seo/config';

/**
 * JSON-LD spécifique à /plateforme :
 *   - WebPage : ancrage sémantique de la page (lien avec WebSite + breadcrumb)
 *   - ItemList de Services : 4 modules Centrium (CV Optimizer, Matching,
 *     CRA/Facturation, Bibliothèque consultants) → couverture LLM des features
 *
 * Le @id du breadcrumb est aligné avec BreadcrumbJsonLd ({path}#breadcrumb).
 */
export function PlateformeJsonLd() {
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE.url}/plateforme#webpage`,
    url: `${SITE.url}/plateforme`,
    name: 'La plateforme — Centrium',
    description:
      'Tout votre cycle ESN dans un seul flux : bibliothèque consultants, CV Optimizer IA, matching mission, CRA et facturation. Hébergé en Europe.',
    isPartOf: { '@id': `${SITE.url}#website` },
    about: { '@id': `${SITE.url}#software` },
    breadcrumb: { '@id': `${SITE.url}/plateforme#breadcrumb` },
    inLanguage: 'fr',
  };

  const modulesItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE.url}/plateforme#modules`,
    name: 'Modules Centrium',
    description: 'Les quatre modules métier de Centrium pour piloter une ESN.',
    numberOfItems: 4,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'Service',
          '@id': `${SITE.url}/plateforme#consultants`,
          name: 'Bibliothèque consultants',
          description:
            'Bibliothèque de talents centralisée avec parsing CV multi-format (DOCX, PDF, scan), filtres par skill/séniorité/ville/disponibilité, vivier de prospection séparé, alerte intercontrat.',
          provider: { '@id': `${SITE.url}#organization` },
          serviceType: 'SoftwareAsAService',
          areaServed: ['FR', 'EU'],
          category: 'Talent Library Management',
        },
      },
      {
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'Service',
          '@id': `${SITE.url}/plateforme#cv-optimizer`,
          name: 'CV Optimizer IA',
          description:
            'Optimisation et mise en page automatique des CV consultants aux templates Centrium (3 variantes : Standard, Dense, Executive). Édition inline, export PDF + DOCX. Alignement wording avec les appels d\'offres. Zéro invention — chaque ligne traçable.',
          provider: { '@id': `${SITE.url}#organization` },
          serviceType: 'SoftwareAsAService',
          areaServed: ['FR', 'EU'],
          category: 'AI Document Optimization',
        },
      },
      {
        '@type': 'ListItem',
        position: 3,
        item: {
          '@type': 'Service',
          '@id': `${SITE.url}/plateforme#matching`,
          name: 'Matching & Appels d\'offres',
          description:
            'Extraction IA depuis screenshot ou texte d\'AO. Génération automatique de fiche de poste PDF. Matching consultant ↔ mission par score multi-critères avec justifications cliquables.',
          provider: { '@id': `${SITE.url}#organization` },
          serviceType: 'SoftwareAsAService',
          areaServed: ['FR', 'EU'],
          category: 'AI Matching',
        },
      },
      {
        '@type': 'ListItem',
        position: 4,
        item: {
          '@type': 'Service',
          '@id': `${SITE.url}/plateforme#cra-facturation`,
          name: 'CRA & Facturation automatisée',
          description:
            'Portail consultant avec calendrier CRA jour par jour. Facture PDF en un clic avec IBAN + TVA + mentions légales. Alertes auto pour facture en retard, CRA en attente, mission qui se termine. Export Sage / Pennylane.',
          provider: { '@id': `${SITE.url}#organization` },
          serviceType: 'SoftwareAsAService',
          areaServed: ['FR', 'EU'],
          category: 'Billing & Time Tracking',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(modulesItemList) }}
      />
    </>
  );
}
