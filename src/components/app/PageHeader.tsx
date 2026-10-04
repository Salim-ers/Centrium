'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

type Props = {
  /** Fil d'Ariane court au-dessus du titre (ex. section de navigation). */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions alignées à droite (bouton principal en dernier). */
  actions?: React.ReactNode;
  /** Lien retour affiché au-dessus du titre. */
  backHref?: string;
  backLabel?: string;
  /** Contenu sous le titre : onglets, filtres, méta-informations. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * En-tête standard des pages de l'application.
 * Titre net, description courte, actions à droite (en dessous sur mobile).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel,
  children,
  className,
}: Props) {
  const { locale } = useLocale();
  const resolvedBackLabel = backLabel ?? (locale === 'en' ? 'Back' : 'Retour');
  return (
    <header className={cn('mb-6', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="group -ml-1 mb-2 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {resolvedBackLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</div>
          )}
          <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
