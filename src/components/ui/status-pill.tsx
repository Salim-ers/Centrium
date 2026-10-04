import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONE: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground/70' },
  brand: { pill: 'bg-brand-50 text-primary-deep border-brand-100', dot: 'bg-primary' },
  success: { pill: 'bg-success-soft text-success border-success/15', dot: 'bg-success' },
  warning: { pill: 'bg-warning-soft text-warning border-warning/15', dot: 'bg-warning' },
  danger: { pill: 'bg-danger-soft text-destructive border-destructive/15', dot: 'bg-destructive' },
  info: { pill: 'bg-info-soft text-info border-info/15', dot: 'bg-info' },
};

/**
 * Pastille de statut : point coloré + libellé. La couleur n'est jamais le
 * seul vecteur d'information (le libellé est toujours présent).
 */
export function StatusPill({
  tone = 'neutral',
  children,
  className,
  dot = true,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-4',
        t.pill,
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
