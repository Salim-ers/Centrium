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
      signup: 'Demande de devis',
      bookMeeting: 'Prendre un rendez-vous',
    },
    hero: {
      badge: '',
      title1: 'L’ESN moderne,',
      titleGradient: 'orchestrée.',
      subtitle:
        'La salle de pilotage des cabinets de conseil et ESN exigeants. Consultants, missions, CV, facturation — un seul flux, sans friction, hébergé en Europe.',
      ctaPrimary: 'Demander une démo',
      ctaSecondary: 'Voir la plateforme',
      trial: 'Onboarding accompagné · Hébergement européen',
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
      kicker: 'TARIFICATION',
      title: 'Un prix. Le vôtre.',
      subtitle:
        'Centrium s’adapte à votre volume, vos modules, votre accompagnement. Pas de grille publique — un devis chiffré sous 48 h, lisible et sans engagement avant signature.',
      ctaView: 'Voir le détail',
      plans: [
        {
          name: 'Sur devis',
          price: 'Sur mesure',
          desc: 'Calibré à votre ESN',
          features: [
            'Volume consultants & utilisateurs au choix',
            'Modules IA activables à la carte',
            'Onboarding accompagné inclus',
            'Hébergement européen RGPD',
            'Support dédié, SLA contractuel',
          ],
          isQuote: true,
          ctaLabel: 'Demander un devis',
        },
      ],
      monthSuffix: '',
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
      rights: '© 2026 Centrium — édité par QuadCore SAS. Tous droits réservés.',
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
      signup: 'Get a quote',
      bookMeeting: 'Book a meeting',
    },
    hero: {
      badge: '',
      title1: 'The modern staffing agency,',
      titleGradient: 'orchestrated.',
      subtitle:
        'The cockpit of demanding consulting firms and staffing agencies. Consultants, missions, CVs, billing — one stream, no friction, EU-hosted.',
      ctaPrimary: 'Request a demo',
      ctaSecondary: 'See the platform',
      trial: 'Guided onboarding · European hosting',
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
      title: 'One price. Yours.',
      subtitle:
        'Centrium adapts to your volume, your modules, your onboarding. No public grid — a costed quote within 48 h, transparent, no commitment before signature.',
      ctaView: 'See details',
      plans: [
        {
          name: 'Tailored quote',
          price: 'Custom',
          desc: 'Calibrated to your firm',
          features: [
            'Consultant & user volume of your choice',
            'AI modules à la carte',
            'Guided onboarding included',
            'European hosting, GDPR-compliant',
            'Dedicated support with SLA',
          ],
          isQuote: true,
          ctaLabel: 'Request a quote',
        },
      ],
      monthSuffix: '',
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
      rights: '© 2026 Centrium — published by QuadCore SAS. All rights reserved.',
    },
  },
};
