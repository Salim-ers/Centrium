'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { Starfield } from '@/components/ui/starfield-1';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PageReveal } from '@/components/marketing/PageReveal';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

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

      {/* Toggle FR/EN — symétrique au lien Retour, en haut à droite */}
      <div className="absolute top-6 right-6 z-20">
        <LocaleToggle variant="default" />
      </div>

      {/* PageReveal : sweep gradient rose + fade + scale + blur,
          identique aux pages marketing pour cohérence des transitions */}
      <PageReveal>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
          <div className="w-full max-w-md">
            {/* Wordmark Centrium — taille md (au lieu de lg) pour que le
                centre de gravité visuel descende vers la card et que
                l'ensemble paraisse vraiment centré */}
            <div className="relative flex justify-center mb-6">
              <span className="absolute inset-[-25%] rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.4),rgba(139,92,246,0.18),transparent_70%)] blur-2xl pointer-events-none" />
              <div className="relative">
                <CentriumWordmark size="md" href="/" />
              </div>
            </div>

            {/* Titre + sous-titre — espacements resserrés */}
            <div className="text-center mb-5 space-y-1.5">
              <h1 className="font-display font-light tracking-[-0.03em] text-[clamp(1.6rem,3vw,2.1rem)] text-white">
                {title}
              </h1>
              {subtitle && <p className="text-[13px] text-white/55">{subtitle}</p>}
            </div>

            {/* Carte form en qc-luminous-static */}
            <div className="qc-luminous-static relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-6 sm:p-7">
              {children}
            </div>

            {/* Footer sous la carte */}
            {footer && (
              <div className="mt-5 text-center text-sm text-white/55">
                {footer}
              </div>
            )}
          </div>
        </div>
      </PageReveal>
    </div>
  );
}
