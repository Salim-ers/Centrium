import { cn } from '@/lib/utils';

type Props = {
  /** Petit label CAPS letterspacing magenta */
  eyebrow?: string;
  /** Titre section (size moyen, avec support qc-italic-accent) */
  title: React.ReactNode;
  /** Description courte */
  description?: React.ReactNode;
  /** Actions à droite (Button "Voir tout", filtre…) */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Header de section intérieure (différent de PageHeader qui est H1).
 * À utiliser pour les sous-sections d'une page : "Activité récente",
 * "Top consultants", "Alertes prioritaires", etc.
 */
export function SectionHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] font-semibold tracking-[0.28em] uppercase text-magenta mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display font-light tracking-[-0.02em] text-[clamp(1.125rem,1.6vw,1.4rem)] text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
