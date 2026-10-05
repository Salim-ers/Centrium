'use client';

import { cn } from '@/lib/utils';

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; count?: number; title?: string };

/**
 * Contrôle segmenté terracotta pour filtrer un écran (périmètre, échelle,
 * échéance) : même langage que les onglets de section, en boutons.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('no-scrollbar inline-flex h-9 max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-app-terra/20 bg-card p-1', className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-terra/50',
              on ? 'bg-app-terra text-white' : 'text-app-terra-dark hover:bg-app-peach-light',
            )}
          >
            {o.label}
            {o.count != null && <span className={cn('num text-[11px] font-medium', on ? 'text-white/80' : 'text-muted-foreground')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
