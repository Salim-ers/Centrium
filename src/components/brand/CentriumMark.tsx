import { cn } from '@/lib/utils';

type Props = {
  /** small : badge sidebar / footer ; md : header onboarding ; lg : page d'accueil. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Affiche "by QuadCore" en sous-titre. */
  showEditor?: boolean;
  /** Affiche le wordmark "Centrium" à côté du logo. */
  showWordmark?: boolean;
  className?: string;
};

/**
 * Identité visuelle de la plateforme Centrium (l'éditeur du SaaS), à
 * placer en co-branding avec le logo de l'ESN cliente. Volontairement
 * petit et discret : il ne doit jamais voler la vedette au branding
 * du tenant — juste signaler que la plateforme est éditée par QuadCore.
 */
export function CentriumMark({
  size = 'sm',
  showEditor = true,
  showWordmark = true,
  className,
}: Props) {
  const sizes = {
    sm: { logo: 'h-5 w-5', name: 'text-[12px]', editor: 'text-[9px]' },
    md: { logo: 'h-8 w-8', name: 'text-[18px]', editor: 'text-[10px]' },
    lg: { logo: 'h-12 w-12', name: 'text-[26px]', editor: 'text-[11px]' },
    xl: { logo: 'h-20 w-20', name: 'text-[42px]', editor: 'text-[13px]' },
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/centrium-logo.svg"
        alt="Centrium"
        className={cn('shrink-0', sizes.logo)}
        draggable={false}
      />
      {showWordmark && (
        <div className="leading-none">
          <span
            className={cn(
              'font-bold tracking-tight bg-clip-text text-transparent',
              'bg-gradient-to-r from-violet-glow via-violet-300 to-magenta',
              sizes.name,
            )}
          >
            Centrium
          </span>
          {showEditor && (
            <div
              className={cn(
                'mt-0.5 uppercase tracking-[0.2em] text-white/40 font-semibold',
                sizes.editor,
              )}
            >
              by <span className="text-magenta/80">QuadCore</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
