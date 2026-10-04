import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** En-tête de section intérieure (h2), sous le PageHeader. */
export function SectionHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
