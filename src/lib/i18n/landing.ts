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
      badge: '',
      title1: 'Votre ESN,',
      titleGradient: 'pilotée par un seul outil.',
      subtitle:
        'Centrium centralise vos consultants, vos CV, vos appels d\'offres et vos CRA. Une plateforme unique pour mobiliser les bons profils, répondre aux AO en quelques minutes, facturer sans friction.',
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
          title: 'Matching & AO',
          label: 'IA',
          desc: 'Fiches de poste auto + profils suggérés',
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
          title: 'Bibliothèque de talents centralisée',
          desc: 'Importez vos CV en glisser-déposer. L\'IA Claude extrait compétences, expériences, certifications et années d\'XP. Filtrez par stack (Java + Spring + AWS), disponibilité, TJM cible, ville, mobilité. Exemple : « Lead Tech Backend confirmé, Paris, dispo sous 15 jours, < 700 €/jour » → 3 résultats en 2 secondes.',
          bullets: [
            'Parsing CV multi-format (DOCX, PDF, scan)',
            'Recherche par skill + séniorité + ville',
            'Vivier de prospection séparé de la bibliothèque active',
            'Disponibilité temps réel + alerte intercontrat',
          ],
        },
        {
          tag: 'CV OPTIMIZER',
          title: 'Vos CV au standard Centrium, en 30 secondes',
          desc: 'Un CV brut (Word, PDF, scan) → un CV final mis en forme au template Centrium propriétaire en moins d\'une minute : header gradient, sections numérotées, missions détaillées, stack technique en badges, QR code vCard intégré. Cohérence brand sur toute votre bibliothèque, format professionnel envoyable directement au client.',
          bullets: [
            '3 variantes de template (Standard / Dense / Executive)',
            'Édition inline façon Canva, sans toucher au PDF',
            'Brand cohérent sur toute l\'équipe',
            'Export PDF + DOCX prêt à envoyer',
          ],
        },
        {
          tag: 'MATCHING & AO',
          title: 'De l\'AO reçu à la fiche de poste envoyée',
          desc: 'Glissez le screenshot d\'un AO reçu par mail (ou collez le texte). L\'IA Claude extrait intitulé, skills, TJM, lieu, dates, et reformule un contexte + missions + profil → fiche de poste PDF prête à envoyer aux consultants. Le matching propose les 3 meilleurs profils de votre bibliothèque, classés par score d\'adéquation.',
          bullets: [
            'Extraction IA depuis screenshot ou texte brut',
            'Fiche de poste PDF générée automatiquement',
            'Matching consultant ↔ mission par score',
            'Carnet de contacts intégré (recruteurs, ESN partenaires)',
          ],
        },
        {
          tag: 'CRA & FACTURATION',
          title: 'Du temps saisi à la facture encaissée',
          desc: 'Vos consultants saisissent leur CRA en 1 minute depuis leur portail dédié (calendrier interactif, jours travaillés / RTT / maladie / fériés). Vous validez. Facture client générée automatiquement avec votre branding, IBAN, TVA, mentions légales. Exemple : CRA validé le 5 du mois → facture envoyée le 6 → alerte automatique si retard de paiement.',
          bullets: [
            'Portail consultant avec calendrier CRA jour par jour',
            'Facture PDF en 1 clic avec IBAN + TVA + mentions légales',
            'Alertes auto : facture en retard, CRA en attente, mission qui se termine',
            'Export Sage / Pennylane pour la compta',
          ],
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
          price: '149€',
          desc: 'Pour démarrer',
          features: [
            'Jusqu\'à 10 consultants',
            '3 utilisateurs internes',
            'CV Optimizer IA (Claude)',
            'Matching consultant ↔ offre',
            'Fiches de poste IA (depuis AO)',
            'Templates CV Centrium',
            'Support email',
          ],
          ctaLabel: 'Souscrire',
        },
        {
          name: 'Growth',
          price: '399€',
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
          price: '899€',
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
            'Contractuel annuel ≥ 1 900 €/mois',
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
      badge: '',
      title1: 'Run your staffing agency',
      titleGradient: 'from a single platform.',
      subtitle:
        'Centrium centralizes your consultants, CVs, RFPs and timesheets. One platform to staff the right people, respond to RFPs in minutes, invoice without friction.',
      ctaPrimary: 'See pricing',
      ctaSecondary: 'See the product',
      trial: 'No commitment · cancel anytime',
    },
    pillars: {
      title: 'Built for modern staffing agencies',
      items: [
        { title: 'Consultants', label: 'LIBRARY', desc: 'Centralized, AI-enriched' },
        { title: 'AI CV', label: 'OPTIMIZER', desc: 'Proprietary Centrium template' },
        { title: 'Matching & RFP', label: 'AI', desc: 'Auto job specs + suggested profiles' },
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
          title: 'Centralized talent library',
          desc: 'Drag and drop CVs. Claude AI extracts skills, experience, certifications and years of work. Filter by stack (Java + Spring + AWS), availability, target day rate, city, mobility. Example: "Senior Backend Lead, Paris, available within 15 days, < €700/day" → 3 results in 2 seconds.',
          bullets: [
            'Multi-format CV parsing (DOCX, PDF, scan)',
            'Skill + seniority + city search',
            'Prospecting pool separate from active library',
            'Real-time availability + bench alert',
          ],
        },
        {
          tag: 'CV OPTIMIZER',
          title: 'Your CVs in Centrium format, in 30 seconds',
          desc: 'A raw CV (Word, PDF, scan) → a polished Centrium-branded CV in under a minute: gradient header, numbered sections, detailed missions, tech stack as badges, embedded vCard QR code. Brand consistency across your entire library, send-ready format.',
          bullets: [
            '3 template variants (Standard / Dense / Executive)',
            'Canva-style inline editing, no PDF tinkering',
            'Consistent branding across your team',
            'Ready-to-send PDF + DOCX export',
          ],
        },
        {
          tag: 'MATCHING & RFP',
          title: 'From RFP received to job spec sent',
          desc: 'Drop a screenshot of an RFP from email (or paste the text). Claude AI extracts title, skills, day rate, location, dates, and rewrites context + missions + profile → a polished PDF job spec ready to send to consultants. Matching surfaces the top 3 profiles in your library, ranked by fit score.',
          bullets: [
            'AI extraction from screenshot or raw text',
            'Job spec PDF auto-generated',
            'Consultant ↔ mission matching by score',
            'Built-in contact book (recruiters, partner agencies)',
          ],
        },
        {
          tag: 'TIMESHEETS & INVOICING',
          title: 'From time entry to paid invoice',
          desc: 'Consultants log time in 1 minute from their dedicated portal (interactive calendar, worked / time off / sick / holidays). You approve. Client invoice is generated automatically with your branding, IBAN, VAT, legal mentions. Example: timesheet approved on the 5th → invoice sent on the 6th → automatic alert if payment is late.',
          bullets: [
            'Consultant portal with day-by-day timesheet calendar',
            'One-click invoice PDF with IBAN + VAT + legal mentions',
            'Auto alerts: overdue invoice, pending timesheet, mission ending',
            'Sage / Pennylane export for accounting',
          ],
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
          price: '€149',
          desc: 'To get started',
          features: [
            'Up to 10 consultants',
            '3 internal users',
            'AI CV Optimizer (Claude)',
            'Consultant ↔ mission matching',
            'AI job specs (from RFP)',
            'Centrium CV templates',
            'Email support',
          ],
          ctaLabel: 'Subscribe',
        },
        {
          name: 'Growth',
          price: '€399',
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
          price: '€899',
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
            'Annual contract ≥ €1,900/month',
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
