import Link from 'next/link';

import { cn } from '@/lib/utils';
import { CentriumLogo, CentriumType } from './CentriumLogo';

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

const SIZES: Record<Size, { logo: string; type: string; editor: string; gap: string }> = {
  sm: { logo: 'h-6 w-6', type: 'h-[11px]', editor: 'text-[10px]', gap: 'gap-2' },
  md: { logo: 'h-8 w-8', type: 'h-[14px]', editor: 'text-[10px]', gap: 'gap-2.5' },
  lg: { logo: 'h-10 w-10', type: 'h-[17px]', editor: 'text-[11px]', gap: 'gap-3' },
  xl: { logo: 'h-14 w-14', type: 'h-[24px]', editor: 'text-[12px]', gap: 'gap-3.5' },
};

/** Logo officiel : symbole + mot-symbole « CENTRIUM ». */
export function CentriumWordmark({ size = 'md', orientation = 'horizontal', showEditor = false, href, className }: Props) {
  const s = SIZES[size];
  const content = (
    <span className={cn('inline-flex select-none items-center text-[#A84B37]', orientation === 'vertical' ? 'flex-col gap-3 text-center' : s.gap, className)}>
      <CentriumLogo className={s.logo} />
      <span className={cn('flex flex-col leading-none', orientation === 'vertical' && 'items-center')}>
        <CentriumType className={s.type} title="Centrium" />
        {showEditor && <span className={cn('mt-1.5 font-medium text-muted-foreground', s.editor)}>par QuadCore</span>}
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
