export type Locale = 'fr' | 'en';

export type PricingPlan = {
  name: string;
  price: string;
  desc: string;
  features: string[];
  popular?: boolean;
  isQuote?: boolean;
  ctaLabel: string;
};

export type FooterLink = { label: string; href: string };

export type LandingDict = {
  nav: {
    home: string;
    product: string;
    features: string;
    pricing: string;
    contact: string;
    login: string;
    signup: string;
    bookMeeting: string;
  };
  hero: {
    badge: string;
    title1: string;
    titleGradient: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trial: string;
  };
  pillars: {
    title: string;
    items: { title: string; label: string; desc: string }[];
  };
  modules: {
    kicker: string;
    title: string;
    subtitle: string;
    items: { tag: string; title: string; desc: string; bullets: string[] }[];
  };
  how: {
    kicker: string;
    title: string;
    steps: { n: string; title: string; desc: string }[];
  };
  pricing: {
    kicker: string;
    title: string;
    subtitle: string;
    ctaView: string;
    plans: PricingPlan[];
    monthSuffix: string;
  };
  contact: {
    kicker: string;
    title: string;
    subtitle: string;
    form: {
      name: string;
      email: string;
      company: string;
      message: string;
      submit: string;
      sending: string;
      success: string;
      error: string;
    };
  };
  footer: {
    tagline: string;
    cols: {
      product: { title: string; links: FooterLink[] };
      company: { title: string; links: FooterLink[] };
    };
    rights: string;
  };
};

export const DICT: Record<Locale, LandingDict> = {
  fr: {
    nav: {
      home: 'Accueil',
      product: 'Produit',
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      contact: 'Contact',
      login: 'Se connecter',
      signup: 'Créer un compte',
      bookMeeting: 'Prendre un rendez-vous',
    },
    hero: {
      badge: 'La plateforme métier tout-en-un des ESN',
      title1: 'Votre ESN,',
      titleGradient: 'pilotée par un seul outil.',
      subtitle:
        'Centrium centralise vos consultants, votre CRM, vos CV et vos CRA. Une plateforme unique pour mobiliser les bons profils, suivre vos missions, facturer sans friction.',
      ctaPrimary: 'Voir les tarifs',
      ctaSecondary: 'Voir le produit',
      trial: 'Sans engagement · résiliation en 1 clic',
    },
    pillars: {
      title: 'Une plateforme pensée pour les ESN modernes',
      items: [
        {
          title: 'Consultants',
          label: 'BIBLIOTHÈQUE',
          desc: 'Centralisée, enrichie par IA',
        },
        {
          title: 'CV IA',
          label: 'OPTIMIZER',
          desc: 'Template Centrium propriétaire',
        },
        {
          title: 'CRM',
          label: 'PIPELINE',
          desc: 'Opportunités & matching',
        },
        {
          title: 'CRA & Facturation',
          label: 'AUTOMATISÉ',
          desc: 'De la saisie au paiement',
        },
      ],
    },
    modules: {
      kicker: 'LE PRODUIT',
      title: 'Quatre modules. Un flux unique.',
      subtitle:
        'Chaque étape de votre activité ESN — du sourcing à la facturation — dans une interface cohérente et rapide.',
      items: [
        {
          tag: 'CONSULTANTS',
          title: 'Bibliothèque de talents',
          desc: 'Importez vos CV, l\'IA extrait compétences, expériences et certifications. Disponibilité, TJM, filtres avancés, export en un clic.',
          bullets: ['Parsing CV multi-format', 'Recherche par skill + seniorité', 'Disponibilité temps réel'],
        },
        {
          tag: 'CV OPTIMIZER',
          title: 'Vos CV au standard Centrium, en 30 secondes',
          desc: 'Transformez vos CV bruts en template Centrium propriétaire, prêt à envoyer au client. Gain de temps, cohérence brand sur toute votre bibliothèque, format professionnel.',
          bullets: [
            'Template Centrium propriétaire',
            'Brand cohérent sur toute l\'équipe',
            'Export PDF & DOCX prêt à envoyer',
          ],
        },
        {
          tag: 'CRM',
          title: 'Pipeline commercial visuel',
          desc: 'Kanban des opportunités, matching consultant/mission, suivi client et relances automatiques. Pas besoin d\'un CRM externe.',
          bullets: ['Kanban drag & drop', 'Matching IA consultant/mission', 'Historique client unifié'],
        },
        {
          tag: 'CRA & FACTURATION',
          title: 'Du temps saisi à la facture émise',
          desc: 'Les consultants saisissent leur CRA depuis leur portail. Facturation automatique, PDF conforme, export comptable.',
          bullets: ['Portail consultant dédié', 'Génération de facture en 1 clic', 'Export Sage / Pennylane'],
        },
      ],
    },
    how: {
      kicker: 'COMMENT ÇA MARCHE',
      title: 'Opérationnel en 15 minutes',
      steps: [
        {
          n: '01',
          title: 'Créez votre organisation',
          desc: 'Inscription en 30 secondes. Invitez vos business managers et recruteurs par email.',
        },
        {
          n: '02',
          title: 'Importez vos consultants',
          desc: 'Glissez-déposez vos CV. L\'IA remplit les fiches automatiquement. Vérifiez, publiez.',
        },
        {
          n: '03',
          title: 'Mobilisez en un clic',
          desc: 'Une opportunité arrive ? Le matching propose les meilleurs profils. Générez un CV, envoyez.',
        },
      ],
    },
    pricing: {
      kicker: 'TARIFS',
      title: 'Un plan pour chaque taille d\'ESN',
      subtitle: 'Tarification mensuelle, sans engagement. Changez ou résiliez votre plan à tout moment.',
      ctaView: 'Voir tous les plans',
      plans: [
        {
          name: 'Starter',
          price: '99€',
          desc: 'Pour démarrer',
          features: [
            'Jusqu\'à 10 consultants',
            '3 utilisateurs internes',
            'CV Optimizer IA (Claude)',
            'Matching consultant ↔ offre',
            'CRM pipeline',
            'Templates CV Centrium',
            'Support email',
          ],
          ctaLabel: 'Souscrire',
        },
        {
          name: 'Growth',
          price: '299€',
          desc: 'Le plus populaire',
          features: [
            'Jusqu\'à 30 consultants',
            '10 utilisateurs internes',
            'Tout Starter, plus :',
            'Réponses AO IA (pitch commercial)',
            'Analyse skills IA',
            'CRA + validation workflow',
            'Factures automatiques',
            'Support prioritaire',
          ],
          popular: true,
          ctaLabel: 'Souscrire',
        },
        {
          name: 'Scale',
          price: '699€',
          desc: 'ESN établies',
          features: [
            'Jusqu\'à 100 consultants',
            '30 utilisateurs internes',
            'Tout Growth, plus :',
            'Exports avancés (Excel, API)',
            'Intégrations webhook sortants',
            'Onboarding personnalisé',
            'Success manager dédié',
            'SLA 99.5%',
          ],
          ctaLabel: 'Souscrire',
        },
        {
          name: 'Enterprise',
          price: 'Sur devis',
          desc: 'Grandes organisations',
          features: [
            'Consultants & utilisateurs illimités',
            'SSO (SAML / OIDC)',
            'SLA 99.9% contractuel',
            'Data residency dédiée',
            'Audit logs exportables',
            'Support 24/7 + CSM dédié',
            'Contractuel annuel ≥ 1 500 €/mois',
          ],
          isQuote: true,
          ctaLabel: 'Nous contacter',
        },
      ],
      monthSuffix: '/ mois',
    },
    contact: {
      kicker: 'CONTACT',
      title: 'Parlons de votre ESN',
      subtitle: 'Une question, une démo, un besoin spécifique ? Écrivez-nous, on répond sous 24h.',
      form: {
        name: 'Nom',
        email: 'Email professionnel',
        company: 'Entreprise',
        message: 'Votre message',
        submit: 'Envoyer',
        sending: 'Envoi…',
        success: 'Message envoyé. On vous répond vite.',
        error: 'Erreur réseau. Réessayez.',
      },
    },
    footer: {
      tagline: 'La plateforme ESN nouvelle génération.',
      cols: {
        product: {
          title: 'Produit',
          links: [
            { label: 'Fonctionnalités', href: '#features' },
            { label: 'Tarifs', href: '/pricing' },
            { label: 'Essai gratuit', href: '/signup' },
          ],
        },
        company: {
          title: 'Société',
          links: [
            { label: 'Contact', href: '#contact' },
            { label: 'Se connecter', href: '/login' },
            { label: 'Créer un compte', href: '/signup' },
          ],
        },
      },
      rights: '© 2026 QuadCore. Tous droits réservés.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      product: 'Product',
      features: 'Features',
      pricing: 'Pricing',
      contact: 'Contact',
      login: 'Log in',
      signup: 'Create account',
      bookMeeting: 'Book a meeting',
    },
    hero: {
      badge: 'The all-in-one platform for staffing agencies',
      title1: 'Run your staffing agency',
      titleGradient: 'from a single platform.',
      subtitle:
        'Centrium centralizes your consultants, CRM, CVs and timesheets. One platform to staff the right people, track missions, invoice without friction.',
      ctaPrimary: 'See pricing',
      ctaSecondary: 'See the product',
      trial: 'No commitment · cancel anytime',
    },
    pillars: {
      title: 'Built for modern staffing agencies',
      items: [
        { title: 'Consultants', label: 'LIBRARY', desc: 'Centralized, AI-enriched' },
        { title: 'AI CV', label: 'OPTIMIZER', desc: 'Proprietary Centrium template' },
        { title: 'CRM', label: 'PIPELINE', desc: 'Opportunities & matching' },
        { title: 'Timesheets', label: 'AUTOMATED', desc: 'From entry to payment' },
      ],
    },
    modules: {
      kicker: 'THE PRODUCT',
      title: 'Four modules. One workflow.',
      subtitle:
        'Every step of your staffing operation — from sourcing to invoicing — in one cohesive, fast interface.',
      items: [
        {
          tag: 'CONSULTANTS',
          title: 'Talent library',
          desc: 'Upload CVs, AI extracts skills, experiences and certifications. Availability, day rates, advanced filters, one-click export.',
          bullets: ['Multi-format CV parsing', 'Skill + seniority search', 'Real-time availability'],
        },
        {
          tag: 'CV OPTIMIZER',
          title: 'Your CVs in Centrium format, in 30 seconds',
          desc: 'Turn raw CVs into a unified Centrium template, ready to send to the client. Time savings, brand consistency across your library, professional format.',
          bullets: [
            'Proprietary Centrium template',
            'Consistent branding across your team',
            'Ready-to-send PDF & DOCX export',
          ],
        },
        {
          tag: 'CRM',
          title: 'Visual sales pipeline',
          desc: 'Opportunity kanban, consultant/mission matching, client follow-up and automated reminders. No external CRM needed.',
          bullets: ['Drag & drop kanban', 'AI consultant/mission matching', 'Unified client history'],
        },
        {
          tag: 'TIMESHEETS & INVOICING',
          title: 'From time entry to invoice',
          desc: 'Consultants log time from their portal. Automated invoicing, compliant PDF, accounting export.',
          bullets: ['Dedicated consultant portal', 'One-click invoice generation', 'Sage / Pennylane export'],
        },
      ],
    },
    how: {
      kicker: 'HOW IT WORKS',
      title: 'Up and running in 15 minutes',
      steps: [
        { n: '01', title: 'Create your organization', desc: 'Sign up in 30 seconds. Invite your BMs and recruiters by email.' },
        { n: '02', title: 'Import your consultants', desc: 'Drop your CVs. AI fills the profiles automatically. Review, publish.' },
        { n: '03', title: 'Staff in one click', desc: 'An opportunity comes in? Matching suggests the best profiles. Generate a CV, send.' },
      ],
    },
    pricing: {
      kicker: 'PRICING',
      title: 'A plan for every agency size',
      subtitle: 'Monthly billing, no commitment. Change or cancel your plan anytime.',
      ctaView: 'See all plans',
      plans: [
        {
          name: 'Starter',
          price: '€99',
          desc: 'To get started',
          features: [
            'Up to 10 consultants',
            '3 internal users',
            'AI CV Optimizer (Claude)',
            'Consultant ↔ mission matching',
            'CRM pipeline',
            'Centrium CV templates',
            'Email support',
          ],
          ctaLabel: 'Subscribe',
        },
        {
          name: 'Growth',
          price: '€299',
          desc: 'Most popular',
          features: [
            'Up to 30 consultants',
            '10 internal users',
            'Everything in Starter, plus:',
            'AI RFP responses (commercial pitch)',
            'AI skills analysis',
            'Timesheet + validation workflow',
            'Automated invoicing',
            'Priority support',
          ],
          popular: true,
          ctaLabel: 'Subscribe',
        },
        {
          name: 'Scale',
          price: '€699',
          desc: 'Established agencies',
          features: [
            'Up to 100 consultants',
            '30 internal users',
            'Everything in Growth, plus:',
            'Advanced exports (Excel, API)',
            'Outbound webhook integrations',
            'Custom onboarding',
            'Dedicated success manager',
            '99.5% SLA',
          ],
          ctaLabel: 'Subscribe',
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          desc: 'Large organizations',
          features: [
            'Unlimited consultants & users',
            'SSO (SAML / OIDC)',
            'Contractual 99.9% SLA',
            'Dedicated data residency',
            'Exportable audit logs',
            '24/7 support + dedicated CSM',
            'Annual contract ≥ €1,500/month',
          ],
          isQuote: true,
          ctaLabel: 'Contact us',
        },
      ],
      monthSuffix: '/ month',
    },
    contact: {
      kicker: 'CONTACT',
      title: 'Let\'s talk about your agency',
      subtitle: 'Question, demo, specific need? Write to us, we reply within 24h.',
      form: {
        name: 'Name',
        email: 'Work email',
        company: 'Company',
        message: 'Your message',
        submit: 'Send',
        sending: 'Sending…',
        success: 'Message sent. We\'ll reply soon.',
        error: 'Network error. Try again.',
      },
    },
    footer: {
      tagline: 'The next-gen staffing agency platform.',
      cols: {
        product: {
          title: 'Product',
          links: [
            { label: 'Features', href: '#features' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Free trial', href: '/signup' },
          ],
        },
        company: {
          title: 'Company',
          links: [
            { label: 'Contact', href: '#contact' },
            { label: 'Log in', href: '/login' },
            { label: 'Create account', href: '/signup' },
          ],
        },
      },
      rights: '© 2026 QuadCore. All rights reserved.',
    },
  },
};
