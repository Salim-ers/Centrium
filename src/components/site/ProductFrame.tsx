import { cn } from '@/lib/utils';

/**
 * Cadre « fenêtre d'application » des captures produit du site. Les
 * contenus sont des reproductions de l'interface avec des données
 * d'exemple, signalées comme telles.
 */
export function ProductFrame({
  children,
  url = 'app.centrium-platform.com',
  className,
  caption,
}: {
  children: React.ReactNode;
  url?: string;
  className?: string;
  caption?: string;
}) {
  return (
    <figure className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_48px_-24px_rgba(25,24,23,0.18)]', className)}>
      <div className="flex items-center gap-3 border-b border-border bg-sand-50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand-300" />
        </div>
        <div className="mx-auto max-w-xs flex-1 truncate rounded-md border border-border bg-card px-3 py-0.5 text-center text-[11px] text-muted-foreground">{url}</div>
        <div className="w-10" aria-hidden />
      </div>
      <div className="relative">{children}</div>
      {caption && <figcaption className="border-t border-border bg-sand-50 px-4 py-1.5 text-[11px] text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

/** Pastille de statut des maquettes (même langage que l'application). */
export function MockPill({ tone = 'neutral', children }: { tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  const map = {
    neutral: 'bg-muted text-muted-foreground border-border',
    brand: 'bg-brand-50 text-primary-deep border-brand-100',
    success: 'bg-success-soft text-success border-success/15',
    warning: 'bg-warning-soft text-warning border-warning/15',
    danger: 'bg-danger-soft text-destructive border-destructive/15',
    info: 'bg-info-soft text-info border-info/15',
  } as const;
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-medium', map[tone])}>{children}</span>;
}
