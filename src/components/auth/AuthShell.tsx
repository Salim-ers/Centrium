'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { Starfield } from '@/components/ui/starfield-1';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PageReveal } from '@/components/marketing/PageReveal';

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Lien secondaire affiché sous le formulaire (ex: "Pas encore de compte ?") */
  footer?: React.ReactNode;
};

/**
 * Shell des pages d'auth (login, signup, set-password, etc.) en
 * cohérence visuelle complète avec MarketingShell :
 *   - Starfield warp en fond global
 *   - PageReveal pour la transition d'entrée (sweep gradient rose +
 *     fade + scale + blur cinéma) — IDENTIQUE aux autres pages du site
 *   - Card centrale en .qc-luminous-static (glow rose/violet pan)
 *   - Wordmark grand format en haut avec halo rose
 *   - Bouton "Retour" discret en haut à gauche
 */
export function AuthShell({ children, title, subtitle, footer }: Props) {
  const isMobile = useIsMobile();
  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Fond Starfield warp (même que MarketingShell) */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: '#000' }}
      >
        <Starfield
          speed={isMobile ? 0.45 : 0.6}
          quantity={isMobile ? 180 : 420}
        />
      </div>

      {/* Retour accueil */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour
      </Link>

      {/* PageReveal : sweep gradient rose + fade + scale + blur,
          identique aux pages marketing pour cohérence des transitions */}
      <PageReveal>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Wordmark Centrium grand format avec aura rose */}
            <div className="relative flex justify-center mb-8">
              <span className="absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.45),rgba(139,92,246,0.2),transparent_70%)] blur-2xl pointer-events-none" />
              <div className="relative">
                <CentriumWordmark size="lg" href="/" />
              </div>
            </div>

            {/* Titre + sous-titre */}
            <div className="text-center mb-7 space-y-2">
              <h1 className="font-display font-light tracking-[-0.03em] text-[clamp(1.8rem,3.5vw,2.4rem)] text-white">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-white/55">{subtitle}</p>}
            </div>

            {/* Carte form en qc-luminous-static */}
            <div className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-7 sm:p-8">
              {children}
            </div>

            {/* Footer sous la carte */}
            {footer && (
              <div className="mt-6 text-center text-sm text-white/55">
                {footer}
              </div>
            )}
          </div>
        </div>
      </PageReveal>
    </div>
  );
}
