'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Info, Loader2, MousePointerClick } from 'lucide-react';

import { Segmented } from '@/components/app/Segmented';
import { CVRenderer } from '@/components/cv/CVRenderer';
import { CVPreviewBoundary } from '@/components/cv/CVPreviewBoundary';
import type { CVBrand } from '@/lib/cv/branding';
import type { DossierTemplateId } from '@/lib/cv/templates';
import type { CVContent } from '@/types';

type Zoom = '50' | '75' | '100' | 'width' | 'page';

/** Page A4 à 96 ppp (210 × 297 mm). */
const PAGE_W = 793.7;
const PAGE_H = 1122.5;
const ZOOM_KEY = 'centrium-dossier-zoom';

type Props = {
  content: CVContent | null;
  templateId: DossierTemplateId;
  brand: CVBrand;
  qrSrc: string | null;
  showConfidential: boolean;
  editable: boolean;
  onEdit: (path: string, value: string) => void;
  onResetEdits: () => void;
  lang: 'fr' | 'en';
  /** Aucun consultant choisi. */
  empty: { title: string; description: string } | null;
  /** Bandeau d'information au-dessus du document (profil incomplet…). */
  notice?: React.ReactNode;
  /** Badge à gauche de la barre (version ouverte…). */
  badge?: React.ReactNode;
};

/**
 * Aperçu du dossier : zoom (50 / 75 / 100 %, largeur, page entière),
 * repères de page A4 et nombre de pages, retouche du texte sur place.
 */
export function DossierCanvas({ content, templateId, brand, qrSrc, showConfidential, editable, onEdit, onResetEdits, lang, empty, notice, badge }: Props) {
  const fr = lang === 'fr';
  const [zoom, setZoomState] = useState<Zoom>('width');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [pages, setPages] = useState(1);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ZOOM_KEY) as Zoom | null;
      if (saved && ['50', '75', '100', 'width', 'page'].includes(saved)) setZoomState(saved);
    } catch {
      // stockage indisponible
    }
  }, []);
  function setZoom(z: Zoom) {
    setZoomState(z);
    try {
      window.localStorage.setItem(ZOOM_KEY, z);
    } catch {
      // stockage indisponible
    }
  }

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => entry && setCanvas({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale =
    zoom === 'width'
      ? Math.max(0.3, Math.min(1.5, (canvas.w - 48) / PAGE_W))
      : zoom === 'page'
        ? Math.max(0.2, Math.min((canvas.w - 48) / PAGE_W, (canvas.h - 48) / PAGE_H))
        : Number(zoom) / 100;

  // Nombre de pages A4 : hauteur réelle du document, ramenée à l'échelle 1.
  useEffect(() => {
    const el = docRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.getBoundingClientRect().height / (scale || 1);
      // Tolérance : le HTML et le PDF n'ont pas exactement les mêmes métriques
      // (le PDF peut tenir sur une page quand l'aperçu la dépasse de peu).
      setPages(Math.max(1, Math.ceil((h - 32) / PAGE_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, content, templateId]);

  return (
    <section className="tile-surface flex min-h-[70vh] min-w-0 flex-col overflow-hidden lg:min-h-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {badge}
          {content && (
            <span className="num text-[12px] text-muted-foreground" title={fr ? 'Repères A4 indicatifs : le PDF ne coupe jamais une mission entre deux pages.' : 'Indicative A4 guides: the PDF never splits a mission across pages.'}>
              {fr ? `≈ ${pages} page${pages > 1 ? 's' : ''} A4` : `≈ ${pages} A4 page${pages > 1 ? 's' : ''}`}
            </span>
          )}
          {editable && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-app-peach-light px-2.5 py-1 text-[12px] font-medium text-app-terra-dark">
              <MousePointerClick className="h-3.5 w-3.5" />
              {fr ? 'Cliquez un texte ou un titre pour le retoucher' : 'Click a text or a title to edit it'}
            </span>
          )}
        </div>
        <Segmented<Zoom>
          label="Zoom"
          value={zoom}
          onChange={setZoom}
          options={[
            { value: '50', label: '50 %' },
            { value: '75', label: '75 %' },
            { value: '100', label: '100 %' },
            { value: 'width', label: fr ? 'Largeur' : 'Width', title: fr ? 'Ajuster à la largeur' : 'Fit to width' },
            { value: 'page', label: fr ? 'Page' : 'Page', title: fr ? 'Page entière' : 'Whole page' },
          ]}
        />
      </div>
      <div ref={canvasRef} className="min-h-0 flex-1 overflow-auto bg-app-sand/50">
        {empty ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center text-muted-foreground">
            <FileText className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium text-foreground">{empty.title}</p>
            <p className="mt-1 max-w-sm text-xs">{empty.description}</p>
          </div>
        ) : !content ? (
          <div className="flex h-full min-h-[320px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6">
            {notice && (
              <p className="mx-auto mb-4 flex max-w-[700px] items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-[12.5px] text-warning">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </p>
            )}
            <div className="relative mx-auto w-fit" style={{ zoom: scale }}>
              <div ref={docRef}>
                <CVPreviewBoundary onReset={onResetEdits}>
                  <CVRenderer content={content} templateId={templateId} editable={editable} onEdit={onEdit} qrSrc={qrSrc} brand={brand} showConfidential={showConfidential} />
                </CVPreviewBoundary>
              </div>
              {Array.from({ length: pages - 1 }, (_, i) => (
                <div key={i} aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-app-terra/40" style={{ top: (i + 1) * PAGE_H }}>
                  <span className="absolute -top-3 right-2 rounded-full bg-app-terra px-2 py-0.5 text-[11px] font-semibold text-white">{fr ? `Page ${i + 2}` : `Page ${i + 2}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
