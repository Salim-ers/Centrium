import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, Instrument_Serif } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { OrganizationProvider } from '@/lib/auth/context';
import { RouteThemeManager } from '@/components/theme/RouteThemeManager';
import { CookieBanner } from '@/components/marketing/CookieBanner';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { SITE } from '@/lib/seo/config';
import { JsonLd } from '@/components/seo/JsonLd';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});
// Serif "noble" — italique éditoriale type Vogue / The New Yorker.
// Utilisé pour les titres XL hero, les nombres clés, les accents éditoriaux.
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Centrium',
    template: '%s · Centrium',
  },
  description: SITE.descriptionFr,
  applicationName: 'Centrium',
  authors: [{ name: 'QuadCore SAS', url: SITE.url }],
  generator: 'Next.js',
  keywords: [...SITE.keywordsFr],
  referrer: 'origin-when-cross-origin',
  creator: 'QuadCore SAS',
  publisher: 'QuadCore SAS',
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    canonical: '/',
    languages: { 'fr-FR': '/', 'en-US': '/', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: ['en_US'],
    url: SITE.url,
    siteName: 'Centrium',
    title: 'Centrium — la plateforme métier des ESN',
    description: SITE.descriptionFr,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Centrium — la plateforme métier des ESN',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centrium — la plateforme métier des ESN',
    description: SITE.descriptionFr,
    images: ['/opengraph-image'],
    creator: SITE.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  category: 'business software',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Script inline exécuté avant l'hydratation React pour appliquer la bonne classe
// de thème sans flash. Cas particulier : les pages publiques (landing, login,
// devis, pricing, auth/invite) sont FORCÉES en sombre indépendamment de la
// préférence utilisateur — seules les pages connectées de l'app proposent
// le clair/sombre.
const themeBootstrapScript = `
(function() {
  try {
    var path = window.location.pathname;
    var forcedDarkPaths = ['/', '/login', '/signup', '/register', '/devis', '/pricing', '/security', '/plateforme', '/manifesto', '/engagements'];
    var forcedDarkPrefixes = ['/auth/', '/invite/', '/legal/'];
    var isForcedDark =
      forcedDarkPaths.indexOf(path) !== -1 ||
      forcedDarkPrefixes.some(function (p) { return path.indexOf(p) === 0; });
    var theme;
    if (isForcedDark) {
      theme = 'dark';
    } else {
      var stored = localStorage.getItem('centrium-theme');
      theme = stored;
      if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
    }
    if (theme === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <JsonLd />
      </head>
      <body className="font-sans">
        <RouteThemeManager />
        <LocaleProvider>
          <OrganizationProvider>{children}</OrganizationProvider>
          <CookieBanner />
        </LocaleProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4500,
            // Pas de wrapper Sonner (background gris, padding, etc.) sur les
            // toasts custom — on a notre propre design (BrandToast).
            unstyled: true,
            classNames: { toast: 'pointer-events-auto' },
          }}
        />
      </body>
    </html>
  );
}
