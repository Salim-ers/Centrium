import { cn } from '@/lib/utils';
import { CentriumLogo } from './CentriumLogo';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Affiche « par QuadCore » sous le nom. */
  showEditor?: boolean;
  /** Affiche le nom à côté du symbole. */
  showWordmark?: boolean;
  className?: string;
};

/**
 * Signature discrète « Centrium » en co-branding avec le logo de l'ESN
 * cliente (documents, portails). Ne doit jamais dominer la marque du tenant.
 */
export function CentriumMark({ size = 'sm', showEditor = true, showWordmark = true, className }: Props) {
  const sizes = {
    sm: { logo: 'h-5 w-5', name: 'text-[12px]', editor: 'text-[9px]' },
    md: { logo: 'h-8 w-8', name: 'text-[18px]', editor: 'text-[10px]' },
    lg: { logo: 'h-12 w-12', name: 'text-[26px]', editor: 'text-[11px]' },
    xl: { logo: 'h-20 w-20', name: 'text-[42px]', editor: 'text-[13px]' },
  }[size];

  return (
    <div className={cn('inline-flex select-none items-center gap-2', className)}>
      <CentriumLogo className={sizes.logo} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-display font-semibold tracking-tight text-foreground', sizes.name)}>
            Centrium
          </span>
          {showEditor && (
            <span className={cn('mt-0.5 text-muted-foreground', sizes.editor)}>par QuadCore</span>
          )}
        </div>
      )}
    </div>
  );
}
