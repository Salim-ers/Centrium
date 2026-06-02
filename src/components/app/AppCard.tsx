'use client';

import { cn } from '@/lib/utils';

type Variant = 'default' | 'luminous' | 'subtle';

type Props = {
  variant?: Variant;
  /** Halo de couleur en arrière-plan (gradient radial) au coin top-right */
  tone?: 'magenta' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'none';
  /** Active l'effet hover (translate + shadow) */
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
};

const TONE_GLOWS: Record<string, string> = {
  magenta: 'from-pink-500/22 via-magenta/10 to-transparent',
  violet: 'from-violet-500/22 via-indigo-500/10 to-transparent',
  emerald: 'from-emerald-500/20 via-green-500/10 to-transparent',
  amber: 'from-amber-500/20 via-orange-500/10 to-transparent',
  cyan: 'from-cyan-500/20 via-sky-500/10 to-transparent',
  rose: 'from-rose-500/22 via-pink-500/10 to-transparent',
};

/**
 * Carte standard pour l'app interne.
 *
 * Variants :
 *   - default  : glass + border-hairline + bg-card/60
 *   - luminous : avec halo qui pan en boucle (qc-luminous-static) — réservé
 *     aux cartes "héros" (KPI groupe, section principale)
 *   - subtle   : version plus discrète, fond transparent, juste border
 *
 * Tone : ajoute un halo radial de couleur au coin top-right.
 */
export function AppCard({
  variant = 'default',
  tone = 'none',
  interactive = false,
  className,
  children,
}: Props) {
  const base = 'relative overflow-hidden rounded-2xl';

  const variantClasses: Record<Variant, string> = {
    default: 'border border-hairline bg-card/60 backdrop-blur-md',
    luminous: 'qc-luminous-static border border-hairline bg-card/60 backdrop-blur-md',
    subtle: 'border border-hairline/60 bg-transparent',
  };

  const interactiveClasses = interactive
    ? 'group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_rgba(225,29,116,0.22)] hover:border-magenta/30'
    : '';

  return (
    <div className={cn(base, variantClasses[variant], interactiveClasses, className)}>
      {tone !== 'none' && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br blur-3xl',
            interactive ? 'opacity-30 group-hover:opacity-80 transition-opacity duration-500' : 'opacity-50',
            TONE_GLOWS[tone],
          )}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Padding helper : { p: 'sm' | 'md' | 'lg' } pour container body */
export function AppCardBody({
  size = 'md',
  className,
  children,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}) {
  const sizes = { sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };
  return <div className={cn(sizes[size], className)}>{children}</div>;
}
