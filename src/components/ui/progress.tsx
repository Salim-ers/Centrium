import { cn } from '@/lib/utils';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE: Record<Tone, string> = {
  brand: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

/** Barre de progression fine (occupation, complétude, quotas). */
export function Progress({
  value,
  max = 100,
  tone = 'brand',
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  /** Libellé accessible (lu par les lecteurs d'écran). */
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sand-200', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out-soft', TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
