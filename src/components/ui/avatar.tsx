import { cn } from '@/lib/utils';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-lg',
} as const;

// Teintes douces dérivées de la palette, attribuées de façon stable.
const TINTS = [
  'bg-brand-100 text-brand-800',
  'bg-sand-200 text-sand-800',
  'bg-steel-100 text-steel-800',
  'bg-[#E6EFE9] text-[#2F5D47]',
  'bg-[#F3E9D7] text-[#7A5A1F]',
];

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name ?? '';
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden={!label}
      title={label || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        SIZES[size],
        tintFor(label),
        className,
      )}
    >
      {initialsOf(label)}
    </span>
  );
}
