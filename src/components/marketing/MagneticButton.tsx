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
 * Bouton premium dynamique avec :
 *   - effet magnétique (suit le pointer)
 *   - tilt 3D perspective (rotateX/Y selon position pointer dans bouton)
 *   - shine sweep diagonal au hover (gradient blanc qui glisse)
 *   - glow radial qui suit le pointer
 *   - bordure conic-gradient au repos
 *
 * Respecte prefers-reduced-motion (magnétisme + tilt désactivés).
 */
export function MagneticButton({
  href,
  onClick,
  variant = 'primary',
  className,
  children,
  strength = 12,
}: Props) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Throttle handleMove via requestAnimationFrame : pointermove tire à
  // ~120 Hz sur certains trackpads, et 3 setState par event = 360 re-
  // renders/sec. On batche tout dans un rAF → 60 renders/sec max,
  // gain INP ~-80 à -150ms sur mobile bas de gamme.
  const rafRef = useRef(0);
  const pendingEventRef = useRef<{ clientX: number; clientY: number } | null>(null);

  function handleMove(e: React.PointerEvent<HTMLElement>) {
    if (!ref.current) return;
    pendingEventRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const evt = pendingEventRef.current;
      if (!evt || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const relX = evt.clientX - rect.left;
      const relY = evt.clientY - rect.top;
      const px = (relX / rect.width) * 100;
      const py = (relY / rect.height) * 100;
      setPointer({ x: px, y: py });
      if (!reducedMotion) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = (relX - cx) / cx;
        const dy = (relY - cy) / cy;
        setTranslate({ x: dx * strength, y: dy * strength });
        setTilt({ x: -dy * 8, y: dx * 8 });
      }
    });
  }

  function handleLeave() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setTranslate({ x: 0, y: 0 });
    setTilt({ x: 0, y: 0 });
    setHovering(false);
  }
  function handleEnter() {
    setHovering(true);
  }

  const baseClasses = cn(
    'relative inline-flex items-center justify-center gap-2',
    'h-12 px-7 rounded-full font-medium text-[15px] tracking-tight',
    'transition-transform duration-[320ms] ease-out will-change-transform',
    'overflow-hidden select-none',
    className,
  );

  const variantClasses =
    variant === 'primary'
      ? 'text-white bg-foreground/40 border border-border shadow-[0_22px_60px_-22px_rgba(225,29,116,0.65)] '
      : 'text-foreground border border-border bg-card ';

  const style: React.CSSProperties = {
    transform: `perspective(800px) translate3d(${translate.x}px, ${translate.y}px, 0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transformStyle: 'preserve-3d',
  };

  const content = (
    <>
      {/* bordure conic au repos */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-80"
        style={{
          background:
            variant === 'primary'
              ? 'conic-gradient(from 90deg at 50% 50%, rgba(236,72,153,0.55), rgba(168,85,247,0.4), rgba(236,72,153,0.55))'
              : 'conic-gradient(from 90deg at 50% 50%, rgba(255,255,255,0.16), rgba(255,255,255,0.05), rgba(255,255,255,0.16))',
          padding: '1px',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* fond gradient pour primary */}
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/20"
        />
      )}

      {/* glow radial qui suit le pointer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          opacity: hovering ? 1 : 0,
          background:
            variant === 'primary'
              ? `radial-gradient(150px circle at ${pointer.x}% ${pointer.y}%, rgba(236,72,153,0.55), transparent 70%)`
              : `radial-gradient(150px circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.22), transparent 70%)`,
        }}
      />

      {/* shine sweep diagonal au hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
      >
        <span
          className="absolute top-0 -left-1/2 h-full w-1/2 transition-transform duration-700 ease-out"
          style={{
            transform: hovering ? 'translateX(280%) skewX(-18deg)' : 'translateX(0) skewX(-18deg)',
            background:
              'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)',
          }}
        />
      </span>

      <span
        className="relative z-10 inline-flex items-center gap-2"
        style={{ transform: 'translateZ(20px)' }}
      >
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        onPointerMove={handleMove}
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
        className={cn(baseClasses, variantClasses)}
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
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      className={cn(baseClasses, variantClasses)}
      style={style}
    >
      {content}
    </button>
  );
}
