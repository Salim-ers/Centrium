'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Affiche une scène produit dessinée à taille fixe (`width` × `height`) et
 * la met à l'échelle de son conteneur. Le ratio est porté par le CSS
 * (aspect-ratio) : aucune variation de hauteur au chargement (CLS nul).
 * La scène est une illustration : elle est inerte (ni focus ni clic).
 */
export function ScaleFrame({
  width,
  height,
  className,
  label,
  children,
}: {
  width: number;
  height: number;
  className?: string;
  /** Description accessible de l'illustration. */
  label: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    // `inert` n'est pas encore typé par React 18 : posé sur le DOM.
    inner.current?.setAttribute('inert', '');
  }, []);

  return (
    <div ref={box} role="img" aria-label={label} className={cn('relative w-full', className)} style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        ref={inner}
        aria-hidden
        className="absolute left-0 top-0 origin-top-left select-none"
        style={{ width, height, transform: `scale(${scale ?? 1})`, visibility: scale == null ? 'hidden' : 'visible' }}
      >
        {children}
      </div>
    </div>
  );
}
