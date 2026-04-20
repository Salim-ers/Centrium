import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'QuadCore Platform — IT Services & Consulting',
  description:
    'Plateforme métier pour ESN : CV Optimizer, CRM, matching consultants, facturation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(15, 17, 25, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
