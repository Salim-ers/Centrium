'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CentriumWordmark } from '@/components/brand/CentriumWordmark';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { FadeIn } from '@/components/site/Motion';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Lien secondaire affiché sous le formulaire (ex: "Pas encore de compte ?") */
  footer?: React.ReactNode;
};

/**
 * Shell des pages d'authentification (connexion, inscription, mot de
 * passe…) : même langage visuel que le site et l'application — fond
 * clair, carte sobre, aucune animation décorative.
 */
export function AuthShell({ children, title, subtitle, footer }: Props) {
  const { locale } = useLocale();
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sand-100 to-transparent" aria-hidden />
      <div className="relative flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          {locale === 'en' ? 'Back' : 'Retour'}
        </Link>
        <LocaleToggle variant="compact" />
      </div>
      <div className="relative flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 pb-12 pt-6 sm:items-center sm:px-6 sm:pt-0">
        <FadeIn className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <CentriumWordmark size="md" href="/" />
          </div>
          <div className="mb-5 space-y-1.5 text-center">
            <h1 className="font-display text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-[14px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">{children}</div>
          {footer && <div className="mt-5 text-center text-[14px] text-muted-foreground">{footer}</div>}
        </FadeIn>
      </div>
    </div>
  );
}
