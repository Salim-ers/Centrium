import type { Config } from 'tailwindcss';

// =========================================================================
// Centrium V2 — design tokens
// -------------------------------------------------------------------------
// Mode clair uniquement. Les couleurs sémantiques (background, primary,
// muted…) sont des variables CSS définies dans globals.css ; les échelles
// ci-dessous servent aux nuances (tints de fond, textes d'accent).
//
// Filet de sécurité : les anciennes familles « néon » (violet, fuchsia,
// pink, indigo, purple) sont réalignées sur l'échelle terracotta et les
// bleus vifs (blue, sky, cyan) sur un bleu acier désaturé. Une classe
// historique oubliée ne peut donc plus afficher de violet ou de bleu
// électrique.
// =========================================================================

const brand = {
  50: '#FBF3EF',
  100: '#F6E3DA',
  200: '#EDC6B6',
  300: '#E0A28B',
  400: '#D47E64',
  500: '#C65F46',
  600: '#B0503A',
  700: '#9D4432',
  800: '#7C3628',
  900: '#5E2A20',
  950: '#3A1913',
};

const sand = {
  50: '#FDFBF9',
  100: '#F4ECE6',
  200: '#EBDFD6',
  300: '#DDCDC0',
  400: '#C4B0A1',
  500: '#A08C7D',
  600: '#7F6E62',
  700: '#625650',
  800: '#46403C',
  900: '#2C2927',
  950: '#191817',
};

const steel = {
  50: '#F1F5F8',
  100: '#E3EBF1',
  200: '#C8D7E2',
  300: '#A3BCCD',
  400: '#7397B0',
  500: '#527A96',
  600: '#3F6A8A',
  700: '#355872',
  800: '#2C485D',
  900: '#233A4B',
  950: '#16242F',
};

const red = {
  50: '#FDF1EF',
  100: '#FBE1DD',
  200: '#F5C2BA',
  300: '#EC998D',
  400: '#E06C5C',
  500: '#CF4733',
  600: '#B42318',
  700: '#971D14',
  800: '#7A1A13',
  900: '#621812',
  950: '#360A07',
};

const config: Config = {
  // Aucune variante sombre : `dark:` ne s'applique jamais (sélecteur inerte).
  darkMode: ['class', '[data-theme-never]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1360px' },
    },
    extend: {
      colors: {
        brand: { DEFAULT: brand[500], ...brand },
        // Palette de marque V2 (site et widgets de l'application).
        terra: {
          DEFAULT: '#C65F46', // terracotta signature
          deep: '#9D4432', // terracotta profond
          dark: '#713428', // terracotta sombre
          light: '#E4A08C', // terre cuite claire
          peach: '#F1C7BA',
          soft: '#F1D3C9', // terracotta doux (widgets)
          blush: '#F5E3DD', // peach clair (widgets)
        },
        // Palette de l'application V2 (docs/CENTRIUM_UX_AUDIT.md §4). Les
        // jetons terra-* restent ceux du site vitrine, qui n'est pas modifié.
        app: {
          bg: '#F7F4F1',
          card: '#FFFFFF',
          terra: '#C65F46',
          'terra-dark': '#A64735',
          'terra-deep': '#7E3528',
          peach: '#F2D8CF',
          'peach-light': '#F9EBE6',
          sand: '#EFE6E0',
          charcoal: '#191817',
          dock: '#1B1817',
          text: '#292522',
          muted: '#837A75',
        },
        ivory: '#FBF8F5',
        warm: '#FFFDFC', // blanc chaud
        dune: '#F2E9E3', // sable du site
        canvas: '#F7F5F2', // fond de l'application
        ink: { DEFAULT: '#191614', soft: '#282321', app: '#191817' },
        taupe: '#746B67',
        line: '#E8DDD6',
        sand: { DEFAULT: sand[100], ...sand },
        steel,
        // Familles historiques réalignées (filet de sécurité).
        violet: brand,
        purple: brand,
        fuchsia: brand,
        pink: brand,
        indigo: brand,
        magenta: { DEFAULT: brand[500], neon: brand[500], muted: brand[700] },
        blue: steel,
        sky: steel,
        cyan: steel,
        rose: red,
        red,

        sidebar: 'hsl(var(--sidebar))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          deep: 'hsl(var(--primary-deep))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          soft: 'hsl(var(--success-soft))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          soft: 'hsl(var(--warning-soft))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          soft: 'hsl(var(--info-soft))',
        },
        danger: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          soft: 'hsl(var(--danger-soft))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        // Cartes de l'application : 16 à 22 px ; contrôles : 8 à 12 px.
        card: '1.25rem',
        tile: '1rem',
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Accent éditorial (titres du site, italique).
        editorial: ['var(--font-editorial)', 'Georgia', 'serif'],
        // Serif de lecture des documents imprimables (contrats, CRA, factures).
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(25, 24, 23, 0.04)',
        sm: '0 1px 2px 0 rgba(25, 24, 23, 0.05), 0 1px 3px 0 rgba(25, 24, 23, 0.03)',
        md: '0 2px 6px -1px rgba(25, 24, 23, 0.06), 0 1px 3px -1px rgba(25, 24, 23, 0.04)',
        lg: '0 10px 24px -8px rgba(25, 24, 23, 0.10), 0 2px 6px -2px rgba(25, 24, 23, 0.05)',
        xl: '0 20px 40px -16px rgba(25, 24, 23, 0.14), 0 4px 10px -4px rgba(25, 24, 23, 0.05)',
        // Anciens « glow » neutralisés.
        glow: '0 1px 2px 0 rgba(25, 24, 23, 0.05)',
        'glow-magenta': '0 1px 2px 0 rgba(25, 24, 23, 0.05)',
        'glow-pink': '0 1px 2px 0 rgba(25, 24, 23, 0.05)',
        'glow-pink-strong': '0 1px 2px 0 rgba(25, 24, 23, 0.05)',
        focus: '0 0 0 3px hsl(var(--ring) / 0.18)',
      },
      backgroundImage: {
        // Anciens dégradés de marque : aplat terracotta.
        'qc-gradient': 'linear-gradient(0deg, hsl(var(--primary)), hsl(var(--primary)))',
        'qc-gradient-pink': 'linear-gradient(0deg, hsl(var(--primary)), hsl(var(--primary)))',
        'qc-gradient-aurora': 'linear-gradient(0deg, hsl(var(--primary)), hsl(var(--primary)))',
        'qc-dark-gradient': 'none',
        'qc-card-gradient': 'none',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 1.4s linear infinite',
        // Anciennes animations décoratives désactivées.
        'gradient-pan': 'none',
        'pulse-slow': 'none',
        'glow-shimmer': 'none',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
