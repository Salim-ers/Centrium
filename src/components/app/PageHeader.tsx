'use client';

import { cn } from '@/lib/utils';

type Props = {
  /** Petit label en haut (CAPS letterspacing) — ex: "Pilotage" */
  eyebrow?: string;
  /** Titre principal. Peut contenir <span className="qc-italic-accent font-editorial italic">…</span> */
  title: React.ReactNode;
  /** Description sous le titre */
  description?: React.ReactNode;
  /** Actions à droite (boutons, filtres rapides…) */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * En-tête standard pour toutes les pages de l'app interne.
 * Pattern vitrine appliqué :
 *   - eyebrow en CAPS letterspacing magenta
 *   - titre h1 en font-display tracking serré
 *   - support de span qc-italic-accent pour les mots emphase
 *   - sub en muted-foreground 15px
 *   - actions alignées à droite sur desktop, en dessous sur mobile
 *
 * Usage :
 *   <PageHeader
 *     eyebrow="Pilotage"
 *     title={<>Votre <span className="qc-italic-accent font-editorial italic">tableau de bord.</span></>}
 *     description="KPIs, alertes, missions ouvertes en un coup d'œil."
 *     actions={<Button>Exporter</Button>}
 *   />
 */
export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.3em] uppercase text-magenta mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display font-light tracking-[-0.03em] leading-[1.05] text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
