export type Locale = 'fr' | 'en';

export type FooterLink = { label: string; href: string };

export type LandingDict = {
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
    forgotPassword: string;
    errors: {
      generic: string;
      invalid: string;
    };
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    email: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
    backToLogin: string;
    errors: { generic: string };
  };

};

// Helper exporté pour les composants qui veulent un labellisateur d'étapes
// localisé tout en gardant un format pluriel léger.

export const DICT: Record<Locale, LandingDict> = {
  fr: {
    footer: {
      tagline: 'La plateforme ESN nouvelle génération.',
      cols: {
        product: { title: 'Produit', links: [{ label: 'Plateforme', href: '/plateforme' }, { label: 'Tarifs', href: '/tarifs' }, { label: 'Demander une démo', href: '/demo' }] },
        company: { title: 'Société', links: [{ label: 'Engagements', href: '/engagements' }, { label: 'Se connecter', href: '/login' }, { label: 'Contact', href: 'mailto:contact@centrium-platform.com' }] },
      },
      engagementsLabel: 'Engagements & sécurité',
      legal: { ariaLabel: 'Liens légaux', privacy: 'Confidentialité', mentions: 'Mentions légales', cgu: 'CGU', cookies: 'Cookies', dpa: 'DPA', cookieManage: 'Gérer les cookies' },
      rights: '© 2026 Centrium — édité par QuadCore SAS. Tous droits réservés.',
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
      forgotPassword: 'Mot de passe oublié ?',
      errors: {
        generic: 'Connexion impossible. Réessaie.',
        invalid: 'Email ou mot de passe incorrect.',
      },
    },
    forgotPassword: {
      title: 'Mot de passe oublié',
      subtitle: 'On t\'envoie un lien pour en choisir un nouveau',
      email: 'Email',
      submit: 'Envoyer le lien',
      submitting: 'Envoi…',
      successTitle: 'Lien envoyé',
      successBody: 'Si un compte existe avec cette adresse, tu vas recevoir un email pour réinitialiser ton mot de passe.',
      backToLogin: 'Retour à la connexion',
      errors: { generic: 'Impossible d\'envoyer le lien. Réessaie.' },
    },
  },

  en: {
    footer: {
      tagline: 'The next-gen staffing agency platform.',
      cols: {
        product: { title: 'Product', links: [{ label: 'Platform', href: '/plateforme' }, { label: 'Pricing', href: '/tarifs' }, { label: 'Request a demo', href: '/demo' }] },
        company: { title: 'Company', links: [{ label: 'Engagements', href: '/engagements' }, { label: 'Log in', href: '/login' }, { label: 'Contact', href: 'mailto:contact@centrium-platform.com' }] },
      },
      engagementsLabel: 'Engagements & security',
      legal: { ariaLabel: 'Legal links', privacy: 'Privacy', mentions: 'Legal notice', cgu: 'Terms', cookies: 'Cookies', dpa: 'DPA', cookieManage: 'Manage cookies' },
      rights: '© 2026 Centrium — published by QuadCore SAS. All rights reserved.',
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
      forgotPassword: 'Forgot password?',
      errors: {
        generic: 'Cannot sign in. Try again.',
        invalid: 'Wrong email or password.',
      },
    },
    forgotPassword: {
      title: 'Forgot password',
      subtitle: 'We\'ll send you a link to pick a new one',
      email: 'Email',
      submit: 'Send link',
      submitting: 'Sending…',
      successTitle: 'Link sent',
      successBody: 'If an account exists for this address, you\'ll receive an email to reset your password.',
      backToLogin: 'Back to sign in',
      errors: { generic: 'Could not send the link. Try again.' },
    },
  },
};
