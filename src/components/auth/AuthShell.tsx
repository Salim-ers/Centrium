'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { NetworkCanvas } from '@/components/marketing/NetworkCanvas';

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Lien secondaire affiché sous le formulaire (ex: "Pas encore de compte ?") */
  footer?: React.ReactNode;
};

export function AuthShell({ children, title, subtitle, footer }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Réseau animé en fond, très atténué */}
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none">
        <NetworkCanvas />
      </div>

      {/* Auras ambiantes */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(225,29,116,0.22),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,11,20,0.6),transparent_70%)] pointer-events-none" />

      {/* Retour accueil */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour
      </Link>

      {/* Contenu centré */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Wordmark Centrium grand format avec aura rose */}
          <div className="relative flex justify-center mb-8">
            <span className="absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.5),rgba(139,92,246,0.25),transparent_70%)] blur-2xl pointer-events-none" />
            <div className="relative">
              <CentriumWordmark size="lg" href="/" />
            </div>
          </div>

          {/* Titre + sous-titre */}
          <div className="text-center mb-6 space-y-1.5">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Carte form avec bord lumineux */}
          <div className="relative rounded-2xl">
            {/* gradient border via double div */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-magenta/40 via-violet-brand/20 to-transparent opacity-60 blur-sm" />
            <div className="relative rounded-2xl border border-hairline bg-card/80 backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(225,29,116,0.35)] p-7">
              {children}
            </div>
          </div>

          {/* Footer sous la carte */}
          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
