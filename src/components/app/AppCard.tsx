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
    // qc-premium : gradient bg + inner highlight + shadow profonde
    // → rendu "haut de gamme" en dark (objet sculpté), crème opaque en light
    default: 'qc-premium border backdrop-blur-md',
    luminous: 'qc-luminous-static qc-premium border backdrop-blur-md',
    subtle: 'border border-hairline/60 bg-transparent',
  };

  const interactiveClasses = interactive
    ? // qc-premium-interactive applique le hover (border + shadow) sur les
      // variants qc-premium (default + luminous). subtle reste avec son
      // propre comportement.
      'group transition-all duration-300 hover:-translate-y-0.5 qc-premium-interactive hover:border-magenta/30'
    : '';

  return (
    <div className={cn(base, variantClasses[variant], interactiveClasses, className)}>
      {tone !== 'none' && (
        <div
          aria-hidden
          className={cn(
            // Halo coloré DARK-ONLY (pas d'aura rose en light).
            'pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br blur-3xl opacity-0',
            interactive
              ? 'dark:opacity-30 dark:group-hover:opacity-80 transition-opacity duration-500'
              : 'dark:opacity-50',
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
