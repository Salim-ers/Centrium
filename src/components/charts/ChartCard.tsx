import { cn } from '@/lib/utils';

export type LegendItem = { label: string; color: string; dashed?: boolean };

/** Carte de graphique : titre, sous-titre, légende, zone de tracé. */
export function ChartCard({
  title,
  subtitle,
  legend,
  actions,
  footer,
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  legend?: LegendItem[];
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('tile-surface flex flex-col p-4 sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {legend && legend.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-3 rounded-sm"
                style={
                  l.dashed
                    ? { backgroundImage: `repeating-linear-gradient(90deg, ${l.color} 0 3px, transparent 3px 5px)`, height: 2 }
                    : { backgroundColor: l.color }
                }
              />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <div className="min-h-0 flex-1">{children}</div>
      {footer && <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{footer}</div>}
    </section>
  );
}
