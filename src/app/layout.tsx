import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { OrganizationProvider } from '@/lib/auth/context';

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
// de thème sans flash. Lit localStorage puis fallback préférence système.
const themeBootstrapScript = `
(function() {
  try {
    var stored = localStorage.getItem('centrium-theme');
    var theme = stored;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
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
        <OrganizationProvider>{children}</OrganizationProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4500,
          }}
        />
      </body>
    </html>
  );
}
