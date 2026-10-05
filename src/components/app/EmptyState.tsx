import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `compact` pour un état vide à l'intérieur d'une carte. */
  size?: 'default' | 'compact';
  className?: string;
};

/**
 * État vide : explique ce qui manque et propose l'action suivante.
 * Jamais de donnée fictive pour « remplir » une vue vide.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'default',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        size === 'default'
          ? 'tile-surface px-6 py-14'
          : 'px-4 py-8',
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            'mb-3 flex items-center justify-center rounded-lg bg-sand-100 text-sand-700',
            size === 'default' ? 'h-11 w-11' : 'h-9 w-9',
          )}
        >
          <Icon className={size === 'default' ? 'h-5 w-5' : 'h-4 w-4'} />
        </div>
      )}
      <h3 className={cn('font-display font-semibold text-foreground', size === 'default' ? 'text-base' : 'text-sm')}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
