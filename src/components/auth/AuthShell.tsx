'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { CentriumMark } from '@/components/brand/CentriumMark';
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
    <div className="min-h-screen bg-midnight-300 text-white relative overflow-hidden">
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
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition"
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
          {/* Logo Centrium avec aura rose */}
          <div className="relative flex justify-center mb-6">
            <span className="absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(225,29,116,0.5),rgba(139,92,246,0.25),transparent_70%)] blur-2xl pointer-events-none" />
            <Link
              href="/"
              className="relative rounded-2xl bg-[#0a0b14] border border-white/10 px-5 py-4 shadow-[0_0_40px_-10px_rgba(225,29,116,0.35)]"
            >
              <CentriumMark size="lg" />
            </Link>
          </div>

          {/* Titre + sous-titre */}
          <div className="text-center mb-6 space-y-1.5">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/60">{subtitle}</p>
            )}
          </div>

          {/* Carte form avec bord lumineux */}
          <div className="relative rounded-2xl">
            {/* gradient border via double div */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-magenta/40 via-violet-brand/20 to-transparent opacity-60 blur-sm" />
            <div className="relative rounded-2xl border border-white/10 bg-midnight-200/80 backdrop-blur-xl shadow-[0_0_60px_-20px_rgba(225,29,116,0.35)] p-7">
              {children}
            </div>
          </div>

          {/* Footer sous la carte */}
          {footer && (
            <div className="mt-6 text-center text-sm text-white/60">{footer}</div>
          )}

          {/* Mark plateforme — discret, en bas de l'écran auth */}
          <div className="mt-8 flex justify-center">
            <CentriumMark size="sm" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
