'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CentriumLogo, CentriumType } from '@/components/brand/CentriumLogo';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { Appear, FlowLine } from '@/components/site/kit';
import { useLocale } from '@/lib/i18n/LocaleProvider';

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Lien secondaire affiché sous le formulaire (ex: "Pas encore de compte ?") */
  footer?: React.ReactNode;
};

const CYCLE_EN = ['Prospect', 'Opportunity', 'Mission', 'Timesheet', 'Margin'];

/**
 * Shell des pages d'authentification (connexion, inscription, essai, mot
 * de passe) : panneau terracotta à gauche sur grand écran, formulaire sur
 * fond ivoire. Même identité que le site.
 */
export function AuthShell({ children, title, subtitle, footer }: Props) {
  const { locale } = useLocale();
  const en = locale === 'en';
  return (
    <div className="grid min-h-screen bg-ivory text-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-terra-deep p-12 text-ivory lg:flex">
        <Link href="/" className="relative flex items-center gap-2.5" aria-label="Centrium — accueil">
          <CentriumLogo className="h-9 w-9" color="currentColor" />
          <CentriumType className="h-[14px]" />
        </Link>
        <div className="relative">
          <p className="text-[clamp(2.4rem,3.8vw,4.4rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.05em]">
            {en ? 'Run your firm.' : 'Pilotez votre ESN.'}
            <br />
            <em className="font-editorial font-normal normal-case italic tracking-[-0.02em] text-terra-peach">{en ? 'Not your spreadsheets.' : 'Pas vos tableurs.'}</em>
          </p>
          <FlowLine light active={4} steps={en ? CYCLE_EN : undefined} className="mt-14" />
        </div>
        <p className="relative text-[12px] text-ivory/60">{en ? 'Application hosted in the European Union' : 'Application hébergée dans l’Union européenne'}</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink/60 transition-colors hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" />
            {en ? 'Back' : 'Retour'}
          </Link>
          <LocaleToggle variant="compact" />
        </div>
        <main className="flex flex-1 items-start justify-center px-5 pb-12 pt-4 sm:items-center sm:px-8">
          <Appear className="w-full max-w-md">
            <Link href="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden" aria-label="Centrium — accueil">
              <span className="flex items-center gap-2.5 text-[#A84B37]">
                <CentriumLogo className="h-9 w-9" color="currentColor" />
                <CentriumType className="h-[14px]" />
              </span>
            </Link>
            <h1 className="text-[clamp(2rem,3.4vw,2.8rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]">{title}</h1>
            {subtitle && <p className="mt-3 text-[15px] leading-[1.5] text-taupe">{subtitle}</p>}
            <div className="mt-8 rounded-[24px] bg-warm p-6 ring-1 ring-ink/[0.06] sm:p-8">{children}</div>
            {footer && <div className="mt-6 text-[14px] text-taupe">{footer}</div>}
          </Appear>
        </main>
      </div>
    </div>
  );
}
