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
    discover: string;
  };
  pillars: {
    title: string;
    architecture: string;
    items: { title: string; label: string; desc: string }[];
    principles: { n: string; title: string; desc: string }[];
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
    engagementsLabel: string;
    legal: {
      ariaLabel: string;
      privacy: string;
      mentions: string;
      cgu: string;
      cookies: string;
      dpa: string;
      cookieManage: string;
    };
    rights: string;
  };
  liveDemos: {
    kicker: string;
    titleA: string;
    titleB: string;
    sub: string;
    aria: {
      steps: string;
      stepOf: (i: number, total: number) => string;
      resume: string;
      pause: string;
    };
    cta: { resume: string; pause: string };
    cvDraft: {
      title: string;
      dropAccepted: string;
      cvReady: string;
      noInvention: string;
    };
    matching: {
      title: string;
      mission: string;
      profile: string;
      available: string;
    };
    cra: {
      title: string;
      craMonth: string;
      invoiceGenerated: string;
      ref: string;
      amount: string;
      sentTo: string;
    };
  };
  metrics: {
    kicker: string;
    titleA: string;
    titleB: string;
    items: { label: string }[];
  };
  testimonials: {
    kicker: string;
    titleA: string;
    titleB: string;
    items: { quote: string; role: string; org: string }[];
    privacy: string;
  };
  shaderShowcase: {
    kicker: string;
    titleA: string;
    titleB: string;
    sub: string;
    centriumLine: string;
    flowLine: string;
    live: string;
  };
  cookies: {
    bannerTitle: string;
    bannerDesc: string;
    learnMore: string;
    refuse: string;
    customize: string;
    acceptAll: string;
    closeAria: string;
    bannerAria: string;
    prefsTitle: string;
    prefsDesc: string;
    closeBtn: string;
    essentialTitle: string;
    essentialAlways: string;
    essentialDesc: string;
    analyticsTitle: string;
    analyticsDesc: string;
    note1: string;
    note2: string;
    cookiePolicy: string;
    refuseAll: string;
    saveChoice: string;
    acceptAllBtn: string;
  };
  home: {
    trio: {
      kicker: string;
      titleA: string;
      titleB: string;
      discover: string;
      doors: { eyebrow: string; title: string; body: string }[];
    };
    finalCta: {
      titleA: string;
      titleB: string;
      sub: string;
      primary: string;
      secondary: string;
    };
  };
  plateforme: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
  };
  engagements: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    titleC: string;
    quote: string;
    para1: string;
    para2: string;
    para3: string;
    para3Highlight: string;
    principles: { n: string; title: string; desc: string }[];
    securityKicker: string;
    securityTitleA: string;
    securityTitleB: string;
    securityItems: { title: string; desc: string }[];
    complianceKicker: string;
    complianceTitleA: string;
    complianceTitleB: string;
    complianceItems: { title: string; bullets: string[] }[];
    ctaTitleA: string;
    ctaTitleB: string;
    ctaAuthor: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  pricingPage: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    estimateCta: string;
    badges: { security: string; response: string; commitment: string; hosting: string };
    factorsKicker: string;
    factorsTitleA: string;
    factorsTitleB: string;
    factorsSub: string;
    factors: { title: string; desc: string }[];
    personasKicker: string;
    personasTitleA: string;
    personasTitleB: string;
    personas: { title: string; desc: string; bullets: string[] }[];
    faqKicker: string;
    faqTitleA: string;
    faqTitleB: string;
    faq: { q: string; a: string }[];
    ctaTitle: string;
    ctaSub: string;
    ctaPrimary: string;
    contactEmail: string;
  };
  devis: {
    success: {
      title: string;
      received1: string;
      received2: string;
      followUp: string;
      question: string;
      back: string;
    };
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    repliesSentBy: string;
    section: {
      company: string;
      contact: string;
      help: string;
      logo: string;
      message: string;
    };
    fields: {
      companyName: string;
      companyNamePh: string;
      sector: string;
      sectorPh: string;
      teamSize: string;
      consultants: string;
      contactName: string;
      contactNamePh: string;
      role: string;
      rolePh: string;
      email: string;
      emailPh: string;
      phone: string;
      phonePh: string;
    };
    teamSizes: string[];
    consultantsRanges: string[];
    helpIntro: string;
    helpOptions: { full: string; short: string }[];
    logoIntro: string;
    logoReceived: string;
    logoRemove: string;
    logoUploading: string;
    logoChoose: string;
    logoFormats: string;
    messageLabel: string;
    messagePh: string;
    messageHint: string;
    legalNote: string;
    submit: string;
    errors: {
      tooLarge: string;
      unsupported: string;
      uploadFailed: string;
      uploadImpossible: string;
      required: string;
    };
  };
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    remember: string;
    emailOnly: string;
    submit: string;
    submitting: string;
    noAccount: string;
    createAccount: string;
    errors: {
      generic: string;
      invalid: string;
    };
  };
  productShowcase: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    sub: string;
    dashboard: {
      hello: string;
      role: string;
      ok: string;
      activeConsultants: string;
      openMissions: string;
      benchRate: string;
      revenueNext: string;
      revenue: string;
      growth: string;
      aiSuggestion: string;
      aiSuggestionBody: string;
      seeSelection: string;
    };
    cvOptimizer: {
      label: string;
      aligning: string;
      ready: string;
      readyDesc: string;
    };
    matching: {
      title: string;
      sub: string;
      desc: string;
    };
    grid: {
      directory: { t: string; d: string };
      pipeline: { t: string; d: string };
      cv: { t: string; d: string };
      reporting: { t: string; d: string };
    };
  };
  trustedBy: {
    kicker: string;
    title: string;
    stats: { label: string }[];
    badges: string[];
  };
  pricingPreview: {
    highlights: { title: string; desc: string }[];
  };
  ctaCommon: {
    contactDemo: string;
    seePlatform: string;
    requestQuote: string;
  };
};

// Helper exporté pour les composants qui veulent un labellisateur d'étapes
// localisé tout en gardant un format pluriel léger.
const frStepLabel = (i: number, total: number) => `Étape ${i + 1} sur ${total}`;
const enStepLabel = (i: number, total: number) => `Step ${i + 1} of ${total}`;

export const DICT: Record<Locale, LandingDict> = {
  fr: {
    nav: {
      home: 'Accueil',
      product: 'Plateforme',
      features: 'Engagements',
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
      discover: 'Découvrir',
    },
    pillars: {
      title: 'Une plateforme pensée pour les ESN modernes',
      architecture: 'L’ARCHITECTURE',
      items: [
        { title: 'Consultants', label: 'BIBLIOTHÈQUE', desc: 'Centralisée, enrichie par IA' },
        { title: 'CV IA', label: 'OPTIMIZER', desc: 'Template Centrium propriétaire' },
        { title: 'Matching & AO', label: 'IA', desc: 'Fiches de poste auto + profils suggérés' },
        { title: 'CRA & Facturation', label: 'AUTOMATISÉ', desc: 'De la saisie au paiement' },
      ],
      principles: [
        { n: '01', title: 'Le métier d’abord', desc: 'Chaque écran a été dessiné avec une ESN en main. Pas un Figma envoyé par un consultant qui n’a jamais staffé.' },
        { n: '02', title: 'L’IA assistée, pas autonome', desc: 'Aucune décision n’est prise sans vous. L’IA propose, suggère, accélère — vous validez. Jamais d’invention.' },
        { n: '03', title: 'Conformité par défaut', desc: 'Hébergement EU, RLS multi-tenant, audit trail. Votre client le plus exigeant peut auditer demain.' },
      ],
    },
    modules: {
      kicker: 'LE PRODUIT',
      title: 'Quatre modules. Un flux unique.',
      subtitle: 'Chaque étape de votre activité ESN — du sourcing à la facturation — dans une interface cohérente et rapide.',
      items: [
        { tag: 'CONSULTANTS', title: 'Bibliothèque de talents centralisée', desc: 'Importez vos CV en glisser-déposer. L’IA Claude extrait compétences, expériences, certifications et années d’XP. Filtrez par stack (Java + Spring + AWS), disponibilité, TJM cible, ville, mobilité.', bullets: ['Parsing CV multi-format (DOCX, PDF, scan)', 'Recherche par skill + séniorité + ville', 'Vivier de prospection séparé de la bibliothèque active', 'Disponibilité temps réel + alerte intercontrat'] },
        { tag: 'CV OPTIMIZER', title: 'Vos CV au standard Centrium, en 30 secondes', desc: 'Un CV brut → un CV final au template Centrium en moins d’une minute. Cohérence brand sur toute votre bibliothèque, format professionnel envoyable directement au client.', bullets: ['3 variantes de template (Standard / Dense / Executive)', 'Édition inline façon Canva, sans toucher au PDF', 'Brand cohérent sur toute l’équipe', 'Export PDF + DOCX prêt à envoyer'] },
        { tag: 'MATCHING & AO', title: 'De l’AO reçu à la fiche de poste envoyée', desc: 'Glissez le screenshot d’un AO. L’IA extrait intitulé, skills, TJM, lieu, dates → fiche de poste PDF prête. Le matching propose les 3 meilleurs profils.', bullets: ['Extraction IA depuis screenshot ou texte brut', 'Fiche de poste PDF générée automatiquement', 'Matching consultant ↔ mission par score', 'Carnet de contacts intégré (recruteurs, ESN partenaires)'] },
        { tag: 'CRA & FACTURATION', title: 'Du temps saisi à la facture encaissée', desc: 'Vos consultants saisissent leur CRA en 1 minute. Vous validez. Facture générée automatiquement avec votre branding, IBAN, TVA, mentions légales.', bullets: ['Portail consultant avec calendrier CRA jour par jour', 'Facture PDF en 1 clic avec IBAN + TVA + mentions légales', 'Alertes auto : facture en retard, CRA en attente, mission qui se termine', 'Export Sage / Pennylane pour la compta'] },
      ],
    },
    how: {
      kicker: 'COMMENT ÇA MARCHE',
      title: 'Opérationnel en 15 minutes',
      steps: [
        { n: '01', title: 'Créez votre organisation', desc: 'Inscription en 30 secondes. Invitez vos business managers et recruteurs par email.' },
        { n: '02', title: 'Importez vos consultants', desc: 'Glissez-déposez vos CV. L’IA remplit les fiches automatiquement. Vérifiez, publiez.' },
        { n: '03', title: 'Mobilisez en un clic', desc: 'Une opportunité arrive ? Le matching propose les meilleurs profils. Générez un CV, envoyez.' },
      ],
    },
    pricing: {
      kicker: 'TARIFICATION',
      title: 'Un prix. Le vôtre.',
      subtitle: 'Centrium s’adapte à votre volume, vos modules, votre accompagnement. Pas de grille publique — un devis chiffré sous 48 h, lisible et sans engagement avant signature.',
      ctaView: 'Voir le détail',
      plans: [
        { name: 'Sur devis', price: 'Sur mesure', desc: 'Calibré à votre ESN', features: ['Volume consultants & utilisateurs au choix', 'Modules IA activables à la carte', 'Onboarding accompagné inclus', 'Hébergement européen RGPD', 'Support dédié, SLA contractuel'], isQuote: true, ctaLabel: 'Demander un devis' },
      ],
      monthSuffix: '',
    },
    contact: {
      kicker: 'CONTACT',
      title: 'Parlons de votre ESN',
      subtitle: 'Une question, une démo, un besoin spécifique ? Écrivez-nous, on répond sous 24h.',
      form: { name: 'Nom', email: 'Email professionnel', company: 'Entreprise', message: 'Votre message', submit: 'Envoyer', sending: 'Envoi…', success: 'Message envoyé. On vous répond vite.', error: 'Erreur réseau. Réessayez.' },
    },
    footer: {
      tagline: 'La plateforme ESN nouvelle génération.',
      cols: {
        product: { title: 'Produit', links: [{ label: 'Plateforme', href: '/plateforme' }, { label: 'Tarifs', href: '/pricing' }, { label: 'Demander une démo', href: '/devis' }] },
        company: { title: 'Société', links: [{ label: 'Engagements', href: '/engagements' }, { label: 'Se connecter', href: '/login' }, { label: 'Contact', href: 'mailto:contact@centrium-platform.com' }] },
      },
      engagementsLabel: 'Engagements & sécurité',
      legal: { ariaLabel: 'Liens légaux', privacy: 'Confidentialité', mentions: 'Mentions légales', cgu: 'CGU', cookies: 'Cookies', dpa: 'DPA', cookieManage: 'Gérer les cookies' },
      rights: '© 2026 Centrium — édité par QuadCore SAS. Tous droits réservés.',
    },
    liveDemos: {
      kicker: 'Démos vivantes',
      titleA: 'Trois usages,',
      titleB: 'en direct.',
      sub: 'Pas de slides, pas de promesses. Centrium tourne. Cliquez sur les étapes pour piloter, ou laissez défiler.',
      aria: { steps: 'Étapes de la démo', stepOf: frStepLabel, resume: 'Reprendre la démo', pause: 'Mettre la démo en pause' },
      cta: { resume: 'Reprendre', pause: 'Pause' },
      cvDraft: { title: 'Du brouillon au CV brandé.', dropAccepted: 'Glisser-déposer accepté', cvReady: 'CV prêt', noInvention: '0 invention' },
      matching: { title: 'Les bons profils. Tout de suite.', mission: 'Mission Capgemini', profile: 'Tech Lead React · Paris · TJM 650 €', available: 'Disponible sous 7j' },
      cra: { title: 'Le temps devient cash.', craMonth: 'CRA · mai 2026', invoiceGenerated: 'Facture générée', ref: 'FAC-2026-0048', amount: '13 000 €', sentTo: 'Envoyée à Capgemini · échéance 30 j' },
    },
    metrics: {
      kicker: 'En chiffres',
      titleA: 'Centrium en',
      titleB: 'quelques mesures.',
      items: [
        { label: 'Pour qualifier un besoin client' },
        { label: 'Pour recevoir votre devis détaillé' },
        { label: 'Des données hébergées en Europe' },
        { label: 'Engagement avant signature' },
      ],
    },
    testimonials: {
      kicker: 'Ils en parlent mieux que nous',
      titleA: 'La voix',
      titleB: 'de nos clients.',
      items: [
        { quote: 'Avant Centrium, on jonglait avec quatre outils et Excel. On a tout migré en deux semaines. Les BMs ont gagné une demi-journée par semaine.', role: 'Directeur général', org: 'ESN · 38 consultants · Île-de-France' },
        { quote: 'Le CV Optimizer nous a fait passer de 3 jours à 30 minutes pour répondre à un appel d’offres. Et zéro invention — chaque ligne est traçable.', role: 'Business Manager Senior', org: 'Cabinet de conseil · 62 consultants' },
      ],
      privacy: 'Témoignages clients · noms et organisations préservés à leur demande.',
    },
    shaderShowcase: {
      kicker: 'En mouvement',
      titleA: 'Une plateforme',
      titleB: 'vivante.',
      sub: 'Chaque flux de données, chaque mission, chaque CV — orchestré en temps réel. Centrium ne dort jamais.',
      centriumLine: 'Centrium,',
      flowLine: 'en flux continu.',
      live: 'live · 60 fps',
    },
    cookies: {
      bannerTitle: 'Nous respectons votre vie privée',
      bannerDesc: 'Centrium utilise uniquement les cookies essentiels au fonctionnement de la plateforme. Vous pouvez accepter la mesure d’audience anonymisée pour nous aider à améliorer le produit.',
      learnMore: 'En savoir plus',
      refuse: 'Refuser',
      customize: 'Personnaliser',
      acceptAll: 'Tout accepter',
      closeAria: 'Fermer',
      bannerAria: 'Bandeau de consentement aux cookies',
      prefsTitle: 'Préférences cookies',
      prefsDesc: 'Choisissez les catégories de cookies que vous acceptez sur Centrium.',
      closeBtn: 'Fermer',
      essentialTitle: 'Cookies essentiels',
      essentialAlways: 'Toujours actifs',
      essentialDesc: 'Nécessaires au fonctionnement de la plateforme : session de connexion, sécurité, préférences d’affichage. Ils ne peuvent pas être désactivés.',
      analyticsTitle: 'Mesure d’audience anonymisée',
      analyticsDesc: 'Statistiques agrégées pour comprendre comment Centrium est utilisé et améliorer le produit. Aucune donnée personnelle exportée vers un tiers.',
      note1: 'Vous pouvez revenir sur ce choix à tout moment via le lien « Gérer les cookies » dans le footer, ou consulter notre',
      note2: '.',
      cookiePolicy: 'politique de cookies',
      refuseAll: 'Tout refuser',
      saveChoice: 'Enregistrer mon choix',
      acceptAllBtn: 'Tout accepter',
    },
    home: {
      trio: {
        kicker: 'Explorer',
        titleA: 'Trois portes,',
        titleB: 'une plateforme.',
        discover: 'Découvrir',
        doors: [
          { eyebrow: 'Le produit', title: 'La plateforme', body: 'Modules, fonctionnalités, parcours métier de A à Z.' },
          { eyebrow: 'Nos engagements', title: 'Vision & confiance', body: 'Pourquoi Centrium, sécurité, conformité RGPD, réponse incident.' },
          { eyebrow: 'Tarification', title: 'Sur mesure', body: 'Pas de grille publique — devis chiffré sous 48 h, sans engagement.' },
        ],
      },
      finalCta: {
        titleA: 'Prêt à voir',
        titleB: 'ce que ça change ?',
        sub: '30 minutes de démo, un devis sous 48 h, zéro engagement avant signature. C’est notre seule promesse.',
        primary: 'Demander une démo',
        secondary: 'Voir la plateforme',
      },
    },
    plateforme: {
      eyebrow: 'La plateforme',
      titleA: 'Tout votre cycle ESN,',
      titleB: 'dans un seul flux.',
      sub: 'Du sourcing à la facture, sans rupture. Chaque module est pensé pour s’articuler aux autres — vous ne ressaisissez rien, vous ne jonglez plus entre 4 outils.',
    },
    engagements: {
      eyebrow: 'Engagements',
      titleA: 'Une plateforme',
      titleB: 'pensée pour celles et ceux',
      titleC: 'qui font tourner les ESN.',
      quote: '« Le staffing ne devrait pas être un sport d’endurance Excel. »',
      para1: 'Nous avons passé des années à voir des business managers brillants perdre 30 % de leur temps à recoller des morceaux — un CV dans Word, un pipeline dans Notion, un CRA sur WhatsApp, une facture sur un PDF retouché à la main.',
      para2: 'Pendant ce temps, les vrais sujets — qualifier finement un besoin, sentir un intercontrat qui se profile, soigner la relation avec un client — passaient au second plan. Pas par paresse. Par fatigue d’outil.',
      para3: 'Centrium est notre réponse. Une seule plateforme, qui couvre tout le cycle, et qui s’efface devant le métier. Pas un tableau de bord de plus.',
      para3Highlight: 'L’outil',
      principles: [
        { n: '01', title: 'Le métier d’abord', desc: 'Chaque écran a été dessiné avec une ESN en main. Pas un Figma envoyé par un consultant qui n’a jamais staffé.' },
        { n: '02', title: 'L’IA assistée, pas autonome', desc: 'Aucune décision n’est prise sans vous. L’IA propose, suggère, accélère — vous validez. Jamais d’invention.' },
        { n: '03', title: 'Conformité par défaut', desc: 'Hébergement EU, RLS multi-tenant, audit trail. Votre client le plus exigeant peut auditer demain.' },
      ],
      securityKicker: 'Architecture',
      securityTitleA: 'Les 6 piliers de notre',
      securityTitleB: 'sécurité.',
      securityItems: [
        { title: 'Chiffrement de bout en bout', desc: 'TLS 1.2+ sur toutes les communications, AES-256 au repos sur base de données et stockage, gestion stricte des clés côté hébergeur certifié.' },
        { title: 'Hébergement européen', desc: 'Base de données et stockage en région Europe. CDN edge pour la latence, avec données applicatives jamais répliquées hors UE.' },
        { title: 'Isolation multi-tenant stricte', desc: 'Row Level Security activée sur toutes les tables sensibles. Chaque ESN n’accède qu’à ses propres consultants, contacts, missions et documents.' },
        { title: 'Authentification renforcée', desc: 'Mots de passe robustes obligatoires, sessions cookie-only (purge à la fermeture du navigateur), invitations par email signées, support SSO/MFA prévu.' },
        { title: 'Journalisation & audit', desc: 'Connexions, actions sensibles et accès aux données sont horodatés et associés à l’utilisateur responsable. Page admin dédiée à l’audit en cours de déploiement.' },
        { title: 'Sauvegardes & restauration', desc: 'Sauvegardes chiffrées quotidiennes côté hébergeur, PITR (Point-in-Time Recovery) disponible, procédures de restauration testées régulièrement.' },
      ],
      complianceKicker: 'Conformité',
      complianceTitleA: 'Cadre réglementaire',
      complianceTitleB: 'et engagements.',
      complianceItems: [
        { title: 'RGPD & loi Informatique et Libertés', bullets: ['Registre des activités de traitement maintenu', 'Bases légales documentées pour chaque finalité', 'Conservation des données limitée et justifiée', 'Notification CNIL sous 72 h en cas de violation'] },
        { title: 'Sous-traitance encadrée (DPA)', bullets: ['Clauses Contractuelles Types pour les transferts hors UE', 'Audit fournisseurs annuel', 'Engagement à notifier tout changement de sous-traitant', 'DPA signable sur demande'] },
        { title: 'Droits des personnes', bullets: ['Accès, rectification, effacement, opposition, portabilité', 'Procédure simple depuis le compte utilisateur', 'Réponse sous 30 jours maximum', 'Référent dédié : contact@centrium-platform.com'] },
        { title: 'Pratiques de développement', bullets: ['Revue de code et validation Zod sur toutes les entrées', 'Scan automatique des dépendances', 'Variables d’environnement isolées, secrets jamais commités', 'Tests d’isolation multi-tenant'] },
      ],
      ctaTitleA: 'Vous ne devriez pas avoir à choisir',
      ctaTitleB: 'entre rapidité et rigueur.',
      ctaAuthor: '— L’équipe Centrium',
      ctaPrimary: 'Demander une démo',
      ctaSecondary: 'Voir la plateforme',
    },
    pricingPage: {
      eyebrow: 'Tarification personnalisée',
      titleA: 'Un seul prix :',
      titleB: 'le vôtre.',
      sub: 'Chaque ESN est unique. Centrium s’adapte à votre volume de consultants, vos modules IA, vos intégrations et votre accompagnement — pas l’inverse. On chiffre ensemble en 20 minutes.',
      estimateCta: 'Obtenir une estimation',
      badges: { security: 'Sécurité & conformité', response: 'Réponse sous 24-48 h', commitment: 'Aucun engagement avant signature', hosting: 'Hébergement européen' },
      factorsKicker: 'Comment on calcule',
      factorsTitleA: '5 critères, une',
      factorsTitleB: 'proposition claire.',
      factorsSub: 'On vous remet un devis détaillé, ligne par ligne, sans surprise et sans engagement avant que vous l’ayez signé.',
      factors: [
        { title: 'Volume de consultants gérés', desc: 'Bibliothèque interne, freelances, portage — chaque profil compte pour calibrer la plateforme.' },
        { title: 'Nombre d’utilisateurs ESN', desc: 'Business managers, recruteurs, finance, viewers. Tarification dégressive au-delà de 20 sièges.' },
        { title: 'Modules IA activés', desc: 'CV Optimizer, matching, assistant comptable. Volume d’appels et niveau de fine-tuning ajustables.' },
        { title: 'Intégrations & options', desc: 'SSO, signature électronique, exports comptables, API publique, white-label, SLA renforcé.' },
        { title: 'Conformité & accompagnement', desc: 'DPA personnalisé, audit sécurité, onboarding équipe, support dédié, formation sur site.' },
      ],
      personasKicker: 'Pour qui',
      personasTitleA: 'Pensé pour',
      personasTitleB: 'votre profil.',
      personas: [
        { title: 'ESN en croissance', desc: '10 à 100 consultants, plusieurs business managers, besoin de structurer.', bullets: ['CV Optimizer + bibliothèque', 'Pipeline CRM commercial', 'CRA + facturation', 'Onboarding accompagné'] },
        { title: 'Cabinet de conseil', desc: 'Staffing exigeant, suivi rentabilité, intercontrat à minimiser.', bullets: ['Matching consultant ↔ mission', 'Vue intercontrat temps réel', 'Reporting marge & TJM', 'Templates contrats personnalisés'] },
        { title: 'Groupe / ETI', desc: 'Multi-entités, SSO, audit, conformité renforcée.', bullets: ['Multi-organisation', 'SSO + MFA', 'Audit & traçabilité', 'SLA + support dédié'] },
      ],
      faqKicker: 'Questions fréquentes',
      faqTitleA: 'Ce que les ESN nous',
      faqTitleB: 'demandent souvent.',
      faq: [
        { q: 'Pourquoi pas de grille de prix publique ?', a: 'Parce qu’une ESN de 12 consultants et un groupe de 500 personnes n’ont ni les mêmes besoins, ni les mêmes coûts. On préfère cadrer ensemble en 20 minutes plutôt que de vous laisser deviner.' },
        { q: 'Combien de temps prend une démo ?', a: 'En général 30 minutes : 10 min de découverte de votre setup actuel, 15 min de démo ciblée, 5 min pour répondre à vos questions. Vous repartez avec une estimation chiffrée.' },
        { q: 'Y a-t-il un engagement ?', a: 'Engagement minimum 12 mois pour permettre l’accompagnement et la configuration sur mesure. Au-delà, renouvellement mensuel ou annuel à votre choix.' },
        { q: 'Que comprend l’onboarding ?', a: 'Création de votre espace à votre image (logo, couleurs, mentions, signature), import de vos consultants et contacts, formation de votre équipe, configuration des templates CV et contrats.' },
      ],
      ctaTitle: 'Prêt à obtenir votre estimation ?',
      ctaSub: '30 minutes, zéro pression, un devis chiffré à la sortie.',
      ctaPrimary: 'Demander un devis',
      contactEmail: 'contact@centrium-platform.com',
    },
    devis: {
      success: {
        title: 'Demande envoyée ✓',
        received1: 'On a bien reçu ta demande pour',
        received2: 'Tu vas recevoir une réponse à',
        followUp: 'sous 24 à 48 h ouvrées avec un devis personnalisé et la prochaine étape pour activer ton espace.',
        question: 'Une question entre-temps ?',
        back: 'Retour à l’accueil',
      },
      eyebrow: 'Devis personnalisé',
      titleA: 'Parlons de',
      titleB: 'votre ESN.',
      sub: 'Décris-nous ton ESN en quelques minutes. On revient vers toi sous 24-48 h avec un devis personnalisé et on configure ensemble ton espace à ton image (logo, couleurs, mentions légales, signature) avant l’activation.',
      repliesSentBy: 'Réponses envoyées par',
      section: { company: 'Ton entreprise', contact: 'Ton contact', help: 'Avec quoi peut-on t’aider ?', logo: 'Logo de la société (optionnel)', message: 'Quel est ton besoin ?' },
      fields: {
        companyName: 'Nom de la société *',
        companyNamePh: 'ACME Consulting',
        sector: 'Secteur',
        sectorPh: 'ESN, conseil IT…',
        teamSize: 'Taille équipe',
        consultants: 'Nb consultants gérés',
        contactName: 'Nom complet *',
        contactNamePh: 'John Doe',
        role: 'Fonction',
        rolePh: 'Dirigeant, BM, RH…',
        email: 'Email pro *',
        emailPh: 'john.doe@acme.com',
        phone: 'Téléphone',
        phonePh: '+33 1 23 45 67 89',
      },
      teamSizes: ['1 à 5 personnes', '6 à 15', '16 à 50', '51 à 200', '200+'],
      consultantsRanges: ['Moins de 10', '10 à 30', '30 à 100', '100 à 500', '500+'],
      helpIntro: 'On peut t’accompagner sur la création de tes templates et de ton identité visuelle. Coche tout ce dont tu veux qu’on s’occupe :',
      helpOptions: [
        { full: 'Template CV à notre image', short: 'Template CV' },
        { full: 'Template de contrat à notre image', short: 'Template contrat' },
        { full: 'Création / refonte de logo', short: 'Logo' },
        { full: 'Charte graphique (couleurs)', short: 'Charte couleurs' },
        { full: 'Aide rédaction mentions légales', short: 'Mentions légales' },
        { full: 'Signature numérique', short: 'Signature' },
        { full: 'Template fiche de poste', short: 'Fiche de poste' },
        { full: 'Autre (voir message)', short: 'Autre' },
      ],
      logoIntro: 'Joins ton logo si tu en as un — on l’intégrera directement dans ton espace, tes CV, contrats et factures. PNG/SVG fond transparent idéalement, 5 Mo max.',
      logoReceived: 'Bien reçu',
      logoRemove: 'Retirer le logo',
      logoUploading: 'Envoi en cours…',
      logoChoose: 'Choisir un fichier',
      logoFormats: 'PNG, JPG, SVG, WebP — 5 Mo max',
      messageLabel: 'Décris ton besoin',
      messagePh: 'Ex: On gère 25 consultants en freelance + portage, on cherche une solution pour le matching, la facturation et la génération de CV personnalisés à notre charte.',
      messageHint: 'Plus tu donnes de contexte, plus on peut ajuster le devis et la configuration de ton espace à ton image.',
      legalNote: 'En soumettant ce formulaire, tu acceptes qu’on te recontacte par email à l’adresse fournie. Aucune création de compte ni prélèvement à ce stade.',
      submit: 'Envoyer la demande',
      errors: {
        tooLarge: 'Logo trop lourd (max 5 Mo).',
        unsupported: 'Format non supporté. Utilise PNG, JPG, SVG ou WebP.',
        uploadFailed: 'Upload échoué.',
        uploadImpossible: 'Upload impossible.',
        required: 'Le nom de la société, ton nom et ton email sont requis.',
      },
    },
    login: {
      title: 'Bon retour',
      subtitle: 'Connecte-toi à ton espace Centrium',
      email: 'Email',
      password: 'Mot de passe',
      remember: 'Se souvenir de moi',
      emailOnly: 'Email uniquement',
      submit: 'Se connecter',
      submitting: 'Connexion…',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'Créer une organisation',
      errors: {
        generic: 'Connexion impossible. Réessaie.',
        invalid: 'Email ou mot de passe incorrect.',
      },
    },
    productShowcase: {
      eyebrow: 'Aperçu produit',
      titleA: 'La salle de pilotage',
      titleB: 'de votre ESN.',
      sub: 'Toute votre activité — consultants, missions, intercontrat, CA — visible en 3 secondes. L’IA travaille en arrière-plan, vous décidez.',
      dashboard: {
        hello: 'Bonjour,',
        role: 'Marc, BM senior',
        ok: 'Tout va bien · 0 alerte',
        activeConsultants: 'Consultants actifs',
        openMissions: 'Missions ouvertes',
        benchRate: 'Taux d’intercontrat',
        revenueNext: 'CA M+1',
        revenue: 'CA mensuel',
        growth: '+18 %',
        aiSuggestion: 'Suggestion IA —',
        aiSuggestionBody: '3 consultants correspondent à la mission « Tech Lead React » de Capgemini.',
        seeSelection: 'Voir la sélection',
      },
      cvOptimizer: {
        label: 'CV Optimizer',
        aligning: 'en train d’aligner sur l’offre…',
        ready: 'CV prêt',
        readyDesc: '4 sections optimisées, 0 invention détectée, conforme contraintes Centrium.',
      },
      matching: {
        title: 'Matching consultant ↔ mission',
        sub: 'scoring multi-critères',
        desc: 'Le matching combine compétences déclarées, expériences extraites, disponibilité et TJM cible — avec un niveau de confiance affiché et des justifications cliquables. Jamais d’invention.',
      },
      grid: {
        directory: { t: 'Annuaire consultants', d: 'Bibliothèque interne + freelances + portage.' },
        pipeline: { t: 'Pipeline AO', d: 'CRM commercial, opportunités, ROI par client.' },
        cv: { t: 'Templates CV', d: '3 variantes brandées, export PDF/DOCX.' },
        reporting: { t: 'Reporting', d: 'TJM, marge, intercontrat, CA prévisionnel.' },
      },
    },
    trustedBy: {
      kicker: 'Confiance & conformité',
      title: 'Pensé pour la confiance des ESN exigeantes.',
      stats: [
        { label: 'Données en Union européenne' },
        { label: 'Disponibilité applicative cible' },
        { label: 'Délai notification CNIL en cas d’incident' },
        { label: 'Délai max de réponse RGPD' },
      ],
      badges: ['RGPD', 'AES-256', 'Hébergement UE', 'Multi-tenant RLS', 'DPA fourni'],
    },
    pricingPreview: {
      highlights: [
        { title: '30 min de cadrage', desc: 'Découverte, démo, questions. Sans pression commerciale agressive.' },
        { title: 'Devis chiffré 48 h', desc: 'Ligne par ligne, lisible. Vous décidez en toute connaissance de cause.' },
        { title: 'Aucun engagement avant signature', desc: 'Vous gardez la main jusqu’à validation contractuelle.' },
      ],
    },
    ctaCommon: { contactDemo: 'Demander une démo', seePlatform: 'Voir la plateforme', requestQuote: 'Demander un devis' },
  },

  en: {
    nav: {
      home: 'Home',
      product: 'Platform',
      features: 'Engagements',
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
      subtitle: 'The cockpit of demanding consulting firms and staffing agencies. Consultants, missions, CVs, billing — one stream, no friction, EU-hosted.',
      ctaPrimary: 'Request a demo',
      ctaSecondary: 'See the platform',
      trial: 'Guided onboarding · European hosting',
      discover: 'Discover',
    },
    pillars: {
      title: 'Built for modern staffing agencies',
      architecture: 'THE ARCHITECTURE',
      items: [
        { title: 'Consultants', label: 'LIBRARY', desc: 'Centralized, AI-enriched' },
        { title: 'AI CV', label: 'OPTIMIZER', desc: 'Proprietary Centrium template' },
        { title: 'Matching & RFP', label: 'AI', desc: 'Auto job specs + suggested profiles' },
        { title: 'Timesheets', label: 'AUTOMATED', desc: 'From entry to payment' },
      ],
      principles: [
        { n: '01', title: 'Operations first', desc: 'Every screen was drawn with a real staffing agency in mind. Not a Figma sent by a consultant who never staffed anyone.' },
        { n: '02', title: 'AI-assisted, not autonomous', desc: 'No decision is made without you. AI suggests, accelerates — you approve. Never makes things up.' },
        { n: '03', title: 'Compliance by default', desc: 'EU hosting, multi-tenant RLS, audit trail. Your most demanding client could audit tomorrow.' },
      ],
    },
    modules: {
      kicker: 'THE PRODUCT',
      title: 'Four modules. One workflow.',
      subtitle: 'Every step of your staffing operation — from sourcing to invoicing — in one cohesive, fast interface.',
      items: [
        { tag: 'CONSULTANTS', title: 'Centralized talent library', desc: 'Drag and drop CVs. Claude AI extracts skills, experience, certifications and years of work. Filter by stack, availability, target day rate, city, mobility.', bullets: ['Multi-format CV parsing (DOCX, PDF, scan)', 'Skill + seniority + city search', 'Prospecting pool separate from active library', 'Real-time availability + bench alert'] },
        { tag: 'CV OPTIMIZER', title: 'Your CVs in Centrium format, in 30 seconds', desc: 'A raw CV → a polished Centrium-branded CV in under a minute. Brand consistency across your entire library, send-ready format.', bullets: ['3 template variants (Standard / Dense / Executive)', 'Canva-style inline editing, no PDF tinkering', 'Consistent branding across your team', 'Ready-to-send PDF + DOCX export'] },
        { tag: 'MATCHING & RFP', title: 'From RFP received to job spec sent', desc: 'Drop a screenshot of an RFP. AI extracts title, skills, day rate, location, dates → polished PDF job spec ready. Matching surfaces the top 3 profiles.', bullets: ['AI extraction from screenshot or raw text', 'Job spec PDF auto-generated', 'Consultant ↔ mission matching by score', 'Built-in contact book (recruiters, partner agencies)'] },
        { tag: 'TIMESHEETS & INVOICING', title: 'From time entry to paid invoice', desc: 'Consultants log time in 1 minute. You approve. Client invoice is generated automatically with your branding, IBAN, VAT, legal mentions.', bullets: ['Consultant portal with day-by-day timesheet calendar', 'One-click invoice PDF with IBAN + VAT + legal mentions', 'Auto alerts: overdue invoice, pending timesheet, mission ending', 'Sage / Pennylane export for accounting'] },
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
      subtitle: 'Centrium adapts to your volume, your modules, your onboarding. No public grid — a costed quote within 48 h, transparent, no commitment before signature.',
      ctaView: 'See details',
      plans: [
        { name: 'Tailored quote', price: 'Custom', desc: 'Calibrated to your firm', features: ['Consultant & user volume of your choice', 'AI modules à la carte', 'Guided onboarding included', 'European hosting, GDPR-compliant', 'Dedicated support with SLA'], isQuote: true, ctaLabel: 'Request a quote' },
      ],
      monthSuffix: '',
    },
    contact: {
      kicker: 'CONTACT',
      title: 'Let’s talk about your agency',
      subtitle: 'Question, demo, specific need? Write to us, we reply within 24h.',
      form: { name: 'Name', email: 'Work email', company: 'Company', message: 'Your message', submit: 'Send', sending: 'Sending…', success: 'Message sent. We’ll reply soon.', error: 'Network error. Try again.' },
    },
    footer: {
      tagline: 'The next-gen staffing agency platform.',
      cols: {
        product: { title: 'Product', links: [{ label: 'Platform', href: '/plateforme' }, { label: 'Pricing', href: '/pricing' }, { label: 'Request a demo', href: '/devis' }] },
        company: { title: 'Company', links: [{ label: 'Engagements', href: '/engagements' }, { label: 'Log in', href: '/login' }, { label: 'Contact', href: 'mailto:contact@centrium-platform.com' }] },
      },
      engagementsLabel: 'Engagements & security',
      legal: { ariaLabel: 'Legal links', privacy: 'Privacy', mentions: 'Legal notice', cgu: 'Terms', cookies: 'Cookies', dpa: 'DPA', cookieManage: 'Manage cookies' },
      rights: '© 2026 Centrium — published by QuadCore SAS. All rights reserved.',
    },
    liveDemos: {
      kicker: 'Live demos',
      titleA: 'Three use cases,',
      titleB: 'live.',
      sub: 'No slides, no promises. Centrium is running. Click steps to drive, or let it auto-play.',
      aria: { steps: 'Demo steps', stepOf: enStepLabel, resume: 'Resume demo', pause: 'Pause demo' },
      cta: { resume: 'Resume', pause: 'Pause' },
      cvDraft: { title: 'From draft to branded CV.', dropAccepted: 'Drag-and-drop accepted', cvReady: 'CV ready', noInvention: '0 invention' },
      matching: { title: 'The right profiles. Instantly.', mission: 'Capgemini mission', profile: 'Tech Lead React · Paris · €650/day', available: 'Available in 7 days' },
      cra: { title: 'Time becomes cash.', craMonth: 'Timesheet · May 2026', invoiceGenerated: 'Invoice generated', ref: 'INV-2026-0048', amount: '€13,000', sentTo: 'Sent to Capgemini · 30-day terms' },
    },
    metrics: {
      kicker: 'In numbers',
      titleA: 'Centrium in a few',
      titleB: 'measured points.',
      items: [
        { label: 'To qualify a client need' },
        { label: 'To receive your detailed quote' },
        { label: 'Of data hosted in Europe' },
        { label: 'Commitment before signature' },
      ],
    },
    testimonials: {
      kicker: 'They say it better than us',
      titleA: 'The voice',
      titleB: 'of our clients.',
      items: [
        { quote: 'Before Centrium, we juggled four tools and Excel. We migrated everything in two weeks. BMs gained half a day per week.', role: 'CEO', org: 'Staffing agency · 38 consultants · Île-de-France' },
        { quote: 'CV Optimizer took us from 3 days to 30 minutes to respond to an RFP. And zero invention — every line is traceable.', role: 'Senior Business Manager', org: 'Consulting firm · 62 consultants' },
      ],
      privacy: 'Client testimonials · names and organizations withheld on request.',
    },
    shaderShowcase: {
      kicker: 'In motion',
      titleA: 'A platform',
      titleB: 'alive.',
      sub: 'Every data flow, every mission, every CV — orchestrated in real time. Centrium never sleeps.',
      centriumLine: 'Centrium,',
      flowLine: 'in continuous flow.',
      live: 'live · 60 fps',
    },
    cookies: {
      bannerTitle: 'We respect your privacy',
      bannerDesc: 'Centrium only uses cookies essential to platform operation. You may opt in to anonymized analytics to help us improve the product.',
      learnMore: 'Learn more',
      refuse: 'Refuse',
      customize: 'Customize',
      acceptAll: 'Accept all',
      closeAria: 'Close',
      bannerAria: 'Cookie consent banner',
      prefsTitle: 'Cookie preferences',
      prefsDesc: 'Choose the cookie categories you accept on Centrium.',
      closeBtn: 'Close',
      essentialTitle: 'Essential cookies',
      essentialAlways: 'Always on',
      essentialDesc: 'Required for platform operation: login session, security, display preferences. They cannot be disabled.',
      analyticsTitle: 'Anonymized analytics',
      analyticsDesc: 'Aggregated statistics to understand how Centrium is used and improve the product. No personal data exported to a third party.',
      note1: 'You can revisit this choice anytime via the “Manage cookies” link in the footer, or consult our',
      note2: '.',
      cookiePolicy: 'cookie policy',
      refuseAll: 'Refuse all',
      saveChoice: 'Save my choice',
      acceptAllBtn: 'Accept all',
    },
    home: {
      trio: {
        kicker: 'Explore',
        titleA: 'Three doors,',
        titleB: 'one platform.',
        discover: 'Discover',
        doors: [
          { eyebrow: 'The product', title: 'The platform', body: 'Modules, features, business journey from A to Z.' },
          { eyebrow: 'Our engagements', title: 'Vision & trust', body: 'Why Centrium, security, GDPR compliance, incident response.' },
          { eyebrow: 'Pricing', title: 'Custom', body: 'No public grid — costed quote within 48 h, no commitment.' },
        ],
      },
      finalCta: {
        titleA: 'Ready to see',
        titleB: 'what changes?',
        sub: '30-minute demo, quote within 48 h, zero commitment before signature. That’s our only promise.',
        primary: 'Request a demo',
        secondary: 'See the platform',
      },
    },
    plateforme: {
      eyebrow: 'The platform',
      titleA: 'Your entire staffing cycle,',
      titleB: 'in one stream.',
      sub: 'From sourcing to invoicing, no breakage. Each module is designed to flow into the next — you never re-enter anything, you never juggle 4 tools.',
    },
    engagements: {
      eyebrow: 'Engagements',
      titleA: 'A platform',
      titleB: 'built for the people',
      titleC: 'who actually run staffing agencies.',
      quote: '"Staffing shouldn’t be an Excel endurance sport."',
      para1: 'We spent years watching brilliant business managers lose 30% of their time gluing things back together — a CV in Word, a pipeline in Notion, a timesheet on WhatsApp, an invoice on a hand-edited PDF.',
      para2: 'Meanwhile, the real stuff — properly qualifying a need, sensing an incoming bench risk, nurturing a client relationship — slipped to second place. Not from laziness. From tool fatigue.',
      para3: 'Centrium is our answer. One platform that covers the whole cycle, and that gets out of the way of the work itself. Not another dashboard.',
      para3Highlight: 'The tool',
      principles: [
        { n: '01', title: 'Operations first', desc: 'Every screen was drawn with a real staffing agency in mind. Not a Figma sent by a consultant who never staffed anyone.' },
        { n: '02', title: 'AI-assisted, not autonomous', desc: 'No decision is made without you. AI suggests, accelerates — you approve. Never makes things up.' },
        { n: '03', title: 'Compliance by default', desc: 'EU hosting, multi-tenant RLS, audit trail. Your most demanding client could audit tomorrow.' },
      ],
      securityKicker: 'Architecture',
      securityTitleA: 'The 6 pillars of our',
      securityTitleB: 'security.',
      securityItems: [
        { title: 'End-to-end encryption', desc: 'TLS 1.2+ on all communications, AES-256 at rest on database and storage, strict key management at certified hosting provider.' },
        { title: 'European hosting', desc: 'Database and storage in European region. Edge CDN for latency, with application data never replicated outside the EU.' },
        { title: 'Strict multi-tenant isolation', desc: 'Row Level Security on all sensitive tables. Each agency only accesses its own consultants, contacts, missions and documents.' },
        { title: 'Strong authentication', desc: 'Strong passwords required, cookie-only sessions (cleared on browser close), signed email invitations, SSO/MFA planned.' },
        { title: 'Logging & audit', desc: 'Logins, sensitive actions and data access are timestamped and tied to the responsible user. A dedicated admin audit page is rolling out.' },
        { title: 'Backups & restore', desc: 'Daily encrypted backups at hosting provider, PITR (Point-in-Time Recovery) available, restore procedures regularly tested.' },
      ],
      complianceKicker: 'Compliance',
      complianceTitleA: 'Regulatory framework',
      complianceTitleB: 'and engagements.',
      complianceItems: [
        { title: 'GDPR & data protection laws', bullets: ['Records of processing activities maintained', 'Legal bases documented for each purpose', 'Limited and justified data retention', 'CNIL notification within 72 h on breach'] },
        { title: 'Managed sub-processing (DPA)', bullets: ['Standard Contractual Clauses for transfers outside the EU', 'Annual supplier audit', 'Commitment to notify any sub-processor change', 'DPA signable on request'] },
        { title: 'Data subject rights', bullets: ['Access, rectification, erasure, objection, portability', 'Simple procedure from user account', 'Response within 30 days maximum', 'Dedicated contact: contact@centrium-platform.com'] },
        { title: 'Development practices', bullets: ['Code review and Zod validation on all inputs', 'Automatic dependency scanning', 'Isolated environment variables, secrets never committed', 'Multi-tenant isolation tests'] },
      ],
      ctaTitleA: 'You shouldn’t have to choose',
      ctaTitleB: 'between speed and rigor.',
      ctaAuthor: '— The Centrium team',
      ctaPrimary: 'Request a demo',
      ctaSecondary: 'See the platform',
    },
    pricingPage: {
      eyebrow: 'Custom pricing',
      titleA: 'One price:',
      titleB: 'yours.',
      sub: 'Every agency is unique. Centrium adapts to your consultant volume, your AI modules, your integrations and your onboarding — not the other way around. We size it together in 20 minutes.',
      estimateCta: 'Get an estimate',
      badges: { security: 'Security & compliance', response: 'Reply within 24-48 h', commitment: 'No commitment before signature', hosting: 'European hosting' },
      factorsKicker: 'How we price it',
      factorsTitleA: '5 criteria, one',
      factorsTitleB: 'clear proposal.',
      factorsSub: 'We hand you a detailed quote, line by line, with no surprises and no commitment until you sign it.',
      factors: [
        { title: 'Managed consultant volume', desc: 'Internal library, freelancers, umbrella — every profile counts to calibrate the platform.' },
        { title: 'Number of agency users', desc: 'Business managers, recruiters, finance, viewers. Degressive pricing beyond 20 seats.' },
        { title: 'Active AI modules', desc: 'CV Optimizer, matching, accounting assistant. Call volume and fine-tuning level adjustable.' },
        { title: 'Integrations & options', desc: 'SSO, e-signature, accounting exports, public API, white-label, enhanced SLA.' },
        { title: 'Compliance & onboarding', desc: 'Custom DPA, security audit, team onboarding, dedicated support, on-site training.' },
      ],
      personasKicker: 'Who it’s for',
      personasTitleA: 'Built for',
      personasTitleB: 'your profile.',
      personas: [
        { title: 'Growing staffing agency', desc: '10 to 100 consultants, several business managers, need to structure.', bullets: ['CV Optimizer + library', 'Commercial CRM pipeline', 'Timesheets + invoicing', 'Guided onboarding'] },
        { title: 'Consulting firm', desc: 'Demanding staffing, profitability tracking, bench to minimize.', bullets: ['Consultant ↔ mission matching', 'Real-time bench view', 'Margin & day rate reporting', 'Custom contract templates'] },
        { title: 'Group / Mid-cap', desc: 'Multi-entity, SSO, audit, enhanced compliance.', bullets: ['Multi-organization', 'SSO + MFA', 'Audit & traceability', 'SLA + dedicated support'] },
      ],
      faqKicker: 'Frequently asked',
      faqTitleA: 'What agencies',
      faqTitleB: 'ask us most.',
      faq: [
        { q: 'Why no public pricing grid?', a: 'Because a 12-consultant agency and a 500-person group don’t have the same needs or costs. We’d rather scope it together in 20 minutes than leave you guessing.' },
        { q: 'How long does a demo take?', a: 'Usually 30 minutes: 10 min discovery of your current setup, 15 min focused demo, 5 min for your questions. You leave with a costed estimate.' },
        { q: 'Is there a commitment?', a: 'Minimum 12-month commitment to enable the onboarding and custom configuration. Beyond that, monthly or annual renewal at your choice.' },
        { q: 'What does onboarding include?', a: 'Setup of your branded workspace (logo, colors, legal mentions, signature), import of your consultants and contacts, team training, configuration of CV and contract templates.' },
      ],
      ctaTitle: 'Ready to get your estimate?',
      ctaSub: '30 minutes, zero pressure, a costed quote at the end.',
      ctaPrimary: 'Request a quote',
      contactEmail: 'contact@centrium-platform.com',
    },
    devis: {
      success: {
        title: 'Request sent ✓',
        received1: 'We received your request for',
        received2: 'You’ll receive a reply at',
        followUp: 'within 24-48 business hours with a custom quote and the next step to activate your workspace.',
        question: 'Question in the meantime?',
        back: 'Back to home',
      },
      eyebrow: 'Custom quote',
      titleA: 'Let’s talk about',
      titleB: 'your agency.',
      sub: 'Describe your agency in a few minutes. We get back to you within 24-48 h with a custom quote and we configure your branded workspace together (logo, colors, legal mentions, signature) before activation.',
      repliesSentBy: 'Replies sent from',
      section: { company: 'Your company', contact: 'Your contact', help: 'How can we help?', logo: 'Company logo (optional)', message: 'What do you need?' },
      fields: {
        companyName: 'Company name *',
        companyNamePh: 'ACME Consulting',
        sector: 'Sector',
        sectorPh: 'Staffing, IT consulting…',
        teamSize: 'Team size',
        consultants: 'Managed consultants',
        contactName: 'Full name *',
        contactNamePh: 'John Doe',
        role: 'Role',
        rolePh: 'CEO, BM, HR…',
        email: 'Work email *',
        emailPh: 'john.doe@acme.com',
        phone: 'Phone',
        phonePh: '+33 1 23 45 67 89',
      },
      teamSizes: ['1 to 5 people', '6 to 15', '16 to 50', '51 to 200', '200+'],
      consultantsRanges: ['Fewer than 10', '10 to 30', '30 to 100', '100 to 500', '500+'],
      helpIntro: 'We can help you build your templates and visual identity. Check anything you want us to handle:',
      helpOptions: [
        { full: 'CV template in your branding', short: 'CV template' },
        { full: 'Contract template in your branding', short: 'Contract template' },
        { full: 'Logo creation / redesign', short: 'Logo' },
        { full: 'Visual identity (colors)', short: 'Color palette' },
        { full: 'Help drafting legal mentions', short: 'Legal mentions' },
        { full: 'Digital signature', short: 'Signature' },
        { full: 'Job spec template', short: 'Job spec' },
        { full: 'Other (see message)', short: 'Other' },
      ],
      logoIntro: 'Attach your logo if you have one — we’ll embed it directly in your workspace, CVs, contracts and invoices. PNG/SVG transparent background ideally, 5 MB max.',
      logoReceived: 'Received',
      logoRemove: 'Remove logo',
      logoUploading: 'Uploading…',
      logoChoose: 'Choose a file',
      logoFormats: 'PNG, JPG, SVG, WebP — 5 MB max',
      messageLabel: 'Describe your need',
      messagePh: 'E.g. We manage 25 freelance + umbrella consultants, we’re looking for a solution for matching, invoicing and branded CV generation.',
      messageHint: 'The more context you give, the more we can tune the quote and the configuration of your branded workspace.',
      legalNote: 'By submitting this form, you agree to be contacted by email at the address provided. No account creation or charges at this stage.',
      submit: 'Send request',
      errors: {
        tooLarge: 'Logo too heavy (5 MB max).',
        unsupported: 'Format not supported. Use PNG, JPG, SVG or WebP.',
        uploadFailed: 'Upload failed.',
        uploadImpossible: 'Upload impossible.',
        required: 'Company name, your name and email are required.',
      },
    },
    login: {
      title: 'Welcome back',
      subtitle: 'Sign in to your Centrium workspace',
      email: 'Email',
      password: 'Password',
      remember: 'Remember me',
      emailOnly: 'Email only',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: 'No account yet?',
      createAccount: 'Create an organization',
      errors: {
        generic: 'Cannot sign in. Try again.',
        invalid: 'Wrong email or password.',
      },
    },
    productShowcase: {
      eyebrow: 'Product preview',
      titleA: 'The cockpit',
      titleB: 'of your agency.',
      sub: 'Your whole activity — consultants, missions, bench, revenue — visible in 3 seconds. AI works in the background, you decide.',
      dashboard: {
        hello: 'Hi,',
        role: 'Marc, senior BM',
        ok: 'All good · 0 alert',
        activeConsultants: 'Active consultants',
        openMissions: 'Open missions',
        benchRate: 'Bench rate',
        revenueNext: 'Revenue M+1',
        revenue: 'Monthly revenue',
        growth: '+18%',
        aiSuggestion: 'AI suggestion —',
        aiSuggestionBody: '3 consultants match the Capgemini "Tech Lead React" mission.',
        seeSelection: 'See selection',
      },
      cvOptimizer: {
        label: 'CV Optimizer',
        aligning: 'aligning with the brief…',
        ready: 'CV ready',
        readyDesc: '4 sections optimized, 0 invention detected, compliant with Centrium rules.',
      },
      matching: {
        title: 'Consultant ↔ mission matching',
        sub: 'multi-criteria scoring',
        desc: 'Matching combines declared skills, extracted experience, availability and target day rate — with a confidence level shown and clickable justifications. Never invents.',
      },
      grid: {
        directory: { t: 'Consultant directory', d: 'Internal library + freelancers + umbrella.' },
        pipeline: { t: 'RFP pipeline', d: 'Commercial CRM, opportunities, per-client ROI.' },
        cv: { t: 'CV templates', d: '3 branded variants, PDF/DOCX export.' },
        reporting: { t: 'Reporting', d: 'Day rate, margin, bench, forecast revenue.' },
      },
    },
    trustedBy: {
      kicker: 'Trust & compliance',
      title: 'Built for the trust of demanding agencies.',
      stats: [
        { label: 'Of data in the European Union' },
        { label: 'Target application uptime' },
        { label: 'CNIL notification time on incident' },
        { label: 'Max GDPR response time' },
      ],
      badges: ['GDPR', 'AES-256', 'EU hosting', 'Multi-tenant RLS', 'DPA provided'],
    },
    pricingPreview: {
      highlights: [
        { title: '30-min scoping', desc: 'Discovery, demo, questions. No aggressive sales pressure.' },
        { title: '48 h costed quote', desc: 'Line by line, readable. You decide with full information.' },
        { title: 'No commitment before signature', desc: 'You stay in control until contractual approval.' },
      ],
    },
    ctaCommon: { contactDemo: 'Request a demo', seePlatform: 'See the platform', requestQuote: 'Request a quote' },
  },
};
