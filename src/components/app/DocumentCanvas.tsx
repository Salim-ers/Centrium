'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { Segmented } from '@/components/app/Segmented';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export type DocZoom = '50' | '75' | '100' | 'width' | 'page';

/** Page A4 à 96 ppp (210 × 297 mm). */
export const A4_PX = { w: 793.7, h: 1122.5 };

/** Échelle d'affichage d'une page A4 dans une zone donnée. */
export function docScale(zoom: DocZoom, box: { w: number; h: number }, max = 1.25): number {
  if (zoom === '50' || zoom === '75' || zoom === '100') return Number(zoom) / 100;
  if (!box.w) return 1;
  const fitW = (box.w - 48) / A4_PX.w;
  const raw = zoom === 'width' ? fitW : Math.min(fitW, (box.h - 48) / A4_PX.h);
  return Math.max(0.2, Math.min(max, raw));
}

/**
 * Aperçu de document A4 zoomable (50 / 75 / 100 %, largeur, page entière),
 * qui tient dans l'écran. `empty` remplace le document (chargement, état
 * vide) sans zoom. L'impression passe par un bloc `print-only` séparé.
 */
export function DocumentCanvas({
  children,
  title,
  extra,
  empty,
  defaultZoom = 'width',
  className,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  empty?: React.ReactNode;
  defaultZoom?: DocZoom;
  className?: string;
}) {
  const { locale } = useLocale();
  const fr = locale !== 'en';
  const [zoom, setZoom] = useState<DocZoom>(defaultZoom);
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className={cn('no-print tile-surface flex min-h-[70vh] flex-col overflow-hidden lg:min-h-0', className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">{title}</div>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          <Segmented<DocZoom>
            label="Zoom"
            value={zoom}
            onChange={setZoom}
            options={[
              { value: '50', label: '50 %' },
              { value: '75', label: '75 %' },
              { value: '100', label: '100 %' },
              { value: 'width', label: fr ? 'Largeur' : 'Fit width', title: fr ? 'Ajuster à la largeur' : 'Fit to width' },
              { value: 'page', label: fr ? 'Page' : 'Fit page', title: fr ? 'Page entière' : 'Whole page' },
            ]}
          />
        </div>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-auto bg-app-sand/50">
        {empty ?? (
          <div className="p-6">
            <div className="mx-auto w-fit" style={{ zoom: docScale(zoom, box) }}>
              {children}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
