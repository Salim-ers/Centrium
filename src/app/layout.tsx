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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">
        <OrganizationProvider>{children}</OrganizationProvider>
        <Toaster
          position="top-right"
          theme="dark"
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
