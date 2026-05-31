'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost';
type Props = {
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
  /** Pixel translation cap when the cursor is near the button. */
  strength?: number;
};

/**
 * Bouton premium :
 *   - effet magnétique : suit légèrement le pointer quand il s'approche
 *   - glow gradient qui suit la position du pointer dans le bouton
 *   - dégradé conic subtil au repos sur la bordure
 *
 * Respecte prefers-reduced-motion (effet magnétique désactivé).
 *
 * Usage :
 *   <MagneticButton href="/devis" variant="primary">Demander une démo</MagneticButton>
 */
export function MagneticButton({
  href,
  onClick,
  variant = 'primary',
  className,
  children,
  strength = 14,
}: Props) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function handleMove(e: React.PointerEvent<HTMLElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setPointer({
      x: (relX / rect.width) * 100,
      y: (relY / rect.height) * 100,
    });
    if (!reducedMotion) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (relX - cx) / cx;
      const dy = (relY - cy) / cy;
      setTranslate({ x: dx * strength, y: dy * strength });
    }
  }

  function handleLeave() {
    setTranslate({ x: 0, y: 0 });
  }

  const baseClasses = cn(
    'relative inline-flex items-center justify-center gap-2',
    'h-12 px-7 rounded-full font-semibold text-[15px] tracking-tight',
    'transition-transform duration-300 ease-out will-change-transform',
    'overflow-hidden select-none',
    className,
  );

  const variantClasses =
    variant === 'primary'
      ? 'text-white bg-black/40 border border-white/15 shadow-[0_18px_60px_-20px_rgba(225,29,116,0.6)] backdrop-blur'
      : 'text-white/90 border border-white/15 bg-white/[0.04] backdrop-blur';

  const style: React.CSSProperties = {
    transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
  };

  const content = (
    <>
      {/* gradient conic au repos sur la bordure */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-70"
        style={{
          background:
            variant === 'primary'
              ? 'conic-gradient(from 90deg at 50% 50%, rgba(236,72,153,0.55), rgba(168,85,247,0.35), rgba(236,72,153,0.55))'
              : 'conic-gradient(from 90deg at 50% 50%, rgba(255,255,255,0.15), rgba(255,255,255,0.05), rgba(255,255,255,0.15))',
          padding: '1px',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* glow qui suit le pointer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            variant === 'primary'
              ? `radial-gradient(140px circle at ${pointer.x}% ${pointer.y}%, rgba(236,72,153,0.45), transparent 70%)`
              : `radial-gradient(140px circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.18), transparent 70%)`,
        }}
      />
      {/* fond rose/violet primary */}
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/30 via-magenta/20 to-violet-glow/20"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </>
  );

  const groupClass = 'group';

  if (href) {
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className={cn(groupClass, baseClasses, variantClasses)}
        style={style}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      ref={ref as React.Ref<HTMLButtonElement>}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(groupClass, baseClasses, variantClasses)}
      style={style}
    >
      {content}
    </button>
  );
}
