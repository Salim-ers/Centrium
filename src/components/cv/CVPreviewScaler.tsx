'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const A4_WIDTH_PX = 794;

/**
 * Wrapper qui adapte la largeur d'un CV (rendu à 210mm = ~794px) à la
 * largeur de son conteneur. Quand l'écran est plus étroit que 794px, on
 * applique un `transform: scale()` proportionnel pour que tout le CV
 * reste visible sans scroll horizontal. La largeur logique reste à 210mm
 * → le PDF généré et l'aperçu sont identiques au pixel près.
 */
export function CVPreviewScaler({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const update = () => {
      const w = wrapper.clientWidth;
      const next = w > 0 ? Math.min(1, w / A4_WIDTH_PX) : 1;
      setScale(next);
      setHeight(inner.scrollHeight * next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="w-full" style={{ height: height ?? undefined }}>
      <div
        ref={innerRef}
        style={{
          width: A4_WIDTH_PX,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}
