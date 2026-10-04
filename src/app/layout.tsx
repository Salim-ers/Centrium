import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { GlobalToastBridge } from '@/components/ui/GlobalToastBridge';
import { AuthHashRecovery } from '@/components/auth/AuthHashRecovery';
import { OrganizationProvider } from '@/lib/auth/context';
import { CookieBanner } from '@/components/marketing/CookieBanner';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { CurrencyProvider } from '@/lib/i18n/CurrencyProvider';
import { SITE } from '@/lib/seo/config';
import { JsonLd } from '@/components/seo/JsonLd';
import { PUBLIC_PATHS, PUBLIC_PREFIXES } from '@/lib/routes/public-paths';

// Une seule famille pour le site et l'application : Inter pour le texte et
// les chiffres, Inter Tight (dessin resserré) pour les titres.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-inter-tight',
  display: 'swap',
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
    title: 'Centrium — le cockpit de gestion des ESN',
    description: SITE.descriptionFr,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Centrium — le cockpit de gestion des ESN',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Centrium — le cockpit de gestion des ESN',
    description: SITE.descriptionFr,
    images: ['/opengraph-image'],
    site: SITE.twitterHandle,
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
  themeColor: '#FBFAF8',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Script inline qui force la déconnexion IMMÉDIATE (avant tout rendu
// React) si l'utilisateur arrive sur une page protégée sans flag
// sessionStorage "centrium-session-active". Cas typique : Chrome a
// restauré les cookies via "Continue where you left off" mais
// sessionStorage est mort à la fermeture → on n'a pas été "présent"
// entre deux ouvertures.
//
// Synchrone et bloquant : envoie un beacon de logout serveur puis
// window.location.replace('/') → la page protégée n'est JAMAIS rendue.
const sessionGateScript = `
(function() {
  try {
    var path = window.location.pathname;
    // Pages publiques (vitrine + auth + invite + legal) : pas de check.
    var publicPaths = ${JSON.stringify(PUBLIC_PATHS)};
    var publicPrefixes = ${JSON.stringify(PUBLIC_PREFIXES)};
    var isPublic =
      publicPaths.indexOf(path) !== -1 ||
      publicPrefixes.some(function(p) { return path.indexOf(p) === 0; });
    if (isPublic) return;

    // Sur toute route non-publique : check du flag.
    var flag = sessionStorage.getItem('centrium-session-active');
    if (flag === '1') return;

    // Entrée légitime par LIEN EMAIL (invite, reset, magic link) : le
    // serveur vient d'établir la session (/auth/callback ou
    // /api/auth/session) et l'a signalé via un cookie court non-httpOnly.
    // On le convertit en flag de présence puis on le consomme — sans ça,
    // chaque invité était déconnecté ~1 s après avoir cliqué son lien.
    if (document.cookie.indexOf('centrium-fresh-auth=1') !== -1) {
      sessionStorage.setItem('centrium-session-active', '1');
      var d = window.location.hostname.replace(/^www\\./, '');
      document.cookie = 'centrium-fresh-auth=; Max-Age=0; Path=/';
      document.cookie = 'centrium-fresh-auth=; Max-Age=0; Path=/; Domain=.' + d;
      return;
    }

    // Pas de flag → on déco. Le serveur reçoit le beacon (purge cookies
    // httpOnly Supabase), et on redirige immédiatement vers / (page
    // d'accueil vitrine). La page protégée n'aura jamais le temps de
    // se rendre.
    if ('sendBeacon' in navigator) {
      try { navigator.sendBeacon('/api/auth/logout'); } catch (e) {}
    }
    window.location.replace('/');
  } catch (e) {
    // sessionStorage indisponible (mode incognito strict) → on laisse
    // passer pour ne pas bloquer l'utilisateur en boucle.
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <script dangerouslySetInnerHTML={{ __html: sessionGateScript }} />
        <JsonLd />
      </head>
      <body className="font-sans bg-background text-foreground">
        <LocaleProvider>
          <CurrencyProvider>
            <OrganizationProvider>{children}</OrganizationProvider>
            <CookieBanner />
          </CurrencyProvider>
        </LocaleProvider>
        <GlobalToastBridge />
        <AuthHashRecovery />
        {/* Bas-droite : ne chevauche jamais le header, lecture naturelle.
            unstyled : la carte est entièrement dessinée par BrandToast. */}
        <Toaster
          position="bottom-right"
          visibleToasts={3}
          expand={false}
          gap={10}
          offset={24}
          toastOptions={{
            duration: 2500,
            unstyled: true,
            classNames: { toast: 'pointer-events-auto' },
          }}
        />
      </body>
    </html>
  );
}
