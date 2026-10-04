import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CentriumLogo } from './CentriumLogo';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Orientation = 'horizontal' | 'vertical';

type Props = {
  size?: Size;
  orientation?: Orientation;
  /** Affiche « par QuadCore » sous le nom. */
  showEditor?: boolean;
  href?: string;
  className?: string;
};

const SIZES: Record<Size, { logo: string; name: string; editor: string; gap: string }> = {
  sm: { logo: 'h-6 w-6', name: 'text-[16px]', editor: 'text-[10px]', gap: 'gap-2' },
  md: { logo: 'h-8 w-8', name: 'text-[20px]', editor: 'text-[10px]', gap: 'gap-2.5' },
  lg: { logo: 'h-10 w-10', name: 'text-[24px]', editor: 'text-[11px]', gap: 'gap-3' },
  xl: { logo: 'h-14 w-14', name: 'text-[34px]', editor: 'text-[12px]', gap: 'gap-3.5' },
};

/** Logo + nom « Centrium ». Sobre : aucune animation, aucun dégradé. */
export function CentriumWordmark({
  size = 'md',
  orientation = 'horizontal',
  showEditor = false,
  href,
  className,
}: Props) {
  const s = SIZES[size];
  const content = (
    <span
      className={cn(
        'inline-flex select-none items-center',
        orientation === 'vertical' ? 'flex-col gap-2 text-center' : s.gap,
        className,
      )}
    >
      <CentriumLogo className={s.logo} />
      <span className={cn('flex flex-col leading-none', orientation === 'vertical' && 'items-center')}>
        <span className={cn('font-display font-semibold tracking-tight text-foreground', s.name)}>Centrium</span>
        {showEditor && (
          <span className={cn('mt-1 font-medium text-muted-foreground', s.editor)}>par QuadCore</span>
        )}
      </span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} aria-label="Centrium" className="inline-flex rounded-md">
        {content}
      </Link>
    );
  }
  return content;
}
