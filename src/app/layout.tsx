import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { OrganizationProvider } from '@/lib/auth/context';
import { RouteThemeManager } from '@/components/theme/RouteThemeManager';
import { CookieBanner } from '@/components/marketing/CookieBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Centrium — la plateforme métier des ESN',
  description:
    'Centrium by QuadCore : CV Optimizer, CRM, matching consultants, contrats, CRA et facturation. Une plateforme tout-en-un pour piloter ton ESN.',
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
    var forcedDarkPaths = ['/', '/login', '/signup', '/register', '/devis', '/pricing', '/security'];
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
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="font-sans">
        <RouteThemeManager />
        <OrganizationProvider>{children}</OrganizationProvider>
        <CookieBanner />
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
