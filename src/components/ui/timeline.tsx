import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineItem = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Horodatage déjà formaté (relatif ou absolu). */
  time?: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
};

const TONE: Record<NonNullable<TimelineItem['tone']>, string> = {
  neutral: 'bg-card text-muted-foreground border-border',
  brand: 'bg-brand-50 text-primary border-brand-100',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-destructive border-destructive/20',
};

/** Fil d'activité vertical (historique d'un client, d'une mission…). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const last = i === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />}
            <span
              className={cn(
                'relative z-[1] flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border',
                TONE[item.tone ?? 'neutral'],
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <div className="text-[13px] font-medium text-foreground">{item.title}</div>
                {item.time && <div className="text-xs text-muted-foreground">{item.time}</div>}
              </div>
              {item.description && (
                <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
