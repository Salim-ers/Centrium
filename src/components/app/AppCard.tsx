'use client';

import { cn } from '@/lib/utils';

type Variant = 'default' | 'luminous' | 'subtle';

type Props = {
  variant?: Variant;
  /** Conservé pour compatibilité : sans effet visuel en V2. */
  tone?: 'magenta' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'none';
  /** Survol marqué (carte cliquable). */
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Carte standard de l'application : fond blanc, bordure fine, ombre très
 * légère. `subtle` = carte sans fond (sur surface sable).
 */
export function AppCard({ variant = 'default', interactive = false, className, children }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        variant === 'subtle' ? 'rounded-xl border border-border bg-transparent' : 'tile-surface',
        interactive && 'group transition-transform duration-300 hover:-translate-y-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppCardBody({
  size = 'md',
  className,
  children,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}) {
  const sizes = { sm: 'p-4', md: 'p-5', lg: 'p-6 sm:p-8' };
  return <div className={cn(sizes[size], className)}>{children}</div>;
}
