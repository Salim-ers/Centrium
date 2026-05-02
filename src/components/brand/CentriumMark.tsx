import { cn } from '@/lib/utils';

type Props = {
  /** small : badge sidebar / footer ; md : header onboarding ; lg : page d'accueil. */
  size?: 'sm' | 'md' | 'lg';
  /** Affiche "by QuadCore" en sous-titre. */
  showEditor?: boolean;
  className?: string;
};

/**
 * Identité visuelle de la plateforme Centrium (l'éditeur du SaaS), à
 * placer en co-branding avec le logo de l'ESN cliente. Volontairement
 * petit et discret : il ne doit jamais voler la vedette au branding
 * du tenant — juste signaler que la plateforme est éditée par QuadCore.
 */
export function CentriumMark({ size = 'sm', showEditor = true, className }: Props) {
  const sizes = {
    sm: { name: 'text-[11px]', editor: 'text-[9px]', dot: 'h-1 w-1' },
    md: { name: 'text-base', editor: 'text-[10px]', dot: 'h-1.5 w-1.5' },
    lg: { name: 'text-2xl', editor: 'text-xs', dot: 'h-2 w-2' },
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-1.5 select-none', className)}>
      <span
        aria-hidden
        className={cn(
          'rounded-full bg-gradient-to-br from-violet-glow to-magenta',
          sizes.dot,
        )}
      />
      <div className="leading-none">
        <span
          className={cn(
            'font-semibold tracking-tight bg-clip-text text-transparent',
            'bg-gradient-to-r from-violet-glow to-magenta',
            sizes.name,
          )}
        >
          Centrium
        </span>
        {showEditor && (
          <span
            className={cn(
              'ml-1 uppercase tracking-[0.18em] text-white/35 font-medium',
              sizes.editor,
            )}
          >
            by QuadCore
          </span>
        )}
      </div>
    </div>
  );
}
