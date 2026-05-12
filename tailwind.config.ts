import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // QuadCore palette
        midnight: {
          DEFAULT: '#0a0b14',
          50: '#1a1c2a',
          100: '#14161f',
          200: '#0f1119',
          300: '#0a0b14',
          400: '#07080f',
        },
        ink: {
          DEFAULT: '#0f1119',
          light: '#14161f',
          lighter: '#1a1c2a',
        },
        violet: {
          deep: '#2a1a4a',
          brand: '#6d28d9',
          glow: '#8b5cf6',
        },
        magenta: {
          DEFAULT: '#e11d74',
          neon: '#ec4899',
          muted: '#9d174d',
        },
        anthracite: {
          DEFAULT: '#2a2d3a',
          light: '#3a3d4a',
          lighter: '#4a4d5a',
        },
        // shadcn tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'qc-gradient': 'linear-gradient(135deg, #6d28d9 0%, #e11d74 100%)',
        'qc-dark-gradient': 'linear-gradient(180deg, #0a0b14 0%, #14161f 100%)',
        'qc-card-gradient':
          'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(225,29,116,0.04) 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.35)',
        'glow-magenta': '0 0 40px -10px rgba(225, 29, 116, 0.35)',
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
        // Gradient qui glisse de gauche à droite — utilisé pour le wordmark
        // Centrium et tout texte/border devant respirer dans la charte.
        'gradient-pan': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // Pulse lent pour les halos décoratifs (logo C, accent KPI).
        'pulse-slow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        // Glow shimmer pour les boutons primary et les cartes hover.
        'glow-shimmer': {
          '0%, 100%': { boxShadow: '0 0 24px -8px rgba(225, 29, 116, 0.45), 0 0 0 0 rgba(139, 92, 246, 0)' },
          '50%': { boxShadow: '0 0 40px -8px rgba(225, 29, 116, 0.55), 0 0 60px -20px rgba(139, 92, 246, 0.45)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gradient-pan': 'gradient-pan 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3.5s ease-in-out infinite',
        'glow-shimmer': 'glow-shimmer 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
