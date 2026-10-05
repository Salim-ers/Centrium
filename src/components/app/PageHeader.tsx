'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type Props = {
  /**
   * Ancien sur-titre de section. Le fil d'Ariane de la barre supérieure le
   * remplace : il n'est plus affiché (prop conservée pour compatibilité).
   */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions alignées à droite (bouton principal en dernier). */
  actions?: React.ReactNode;
  /** Onglets de la destination, sur la même ligne que le titre. */
  tabs?: React.ReactNode;
  /** Lien retour affiché au-dessus du titre. */
  backHref?: string;
  backLabel?: string;
  /** Contenu sous le titre : filtres, méta-informations. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * En-tête compact des pages de l'application : titre, description d'une
 * ligne, onglets et actions sur une seule rangée en desktop.
 */
export function PageHeader({ title, description, actions, tabs, backHref, backLabel, children, className }: Props) {
  const { locale } = useLocale();
  const resolvedBackLabel = backLabel ?? (locale === 'en' ? 'Back' : 'Retour');
  return (
    <header className={cn('mb-4 shrink-0', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="group -ml-1 mb-1.5 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {resolvedBackLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:max-w-[46%]">
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[24px]">{title}</h1>
          {description && <p className="mt-0.5 line-clamp-2 max-w-2xl text-[13px] leading-snug text-muted-foreground">{description}</p>}
        </div>
        {tabs && <div className="min-w-0 lg:ml-6">{tabs}</div>}
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
