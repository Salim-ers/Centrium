'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';

// =========================================================================
// SignaturePad — zone de signature manuscrite (canvas, souris + tactile).
// -------------------------------------------------------------------------
// Zéro dépendance : pointer events natifs, mise à l'échelle DPR pour un
// trait net sur écrans Retina, export PNG dataURL. Fond BLANC (le document
// contractuel est blanc) + encre bleu nuit type stylo.
// =========================================================================

export type SignaturePadHandle = {
  /** PNG dataURL du tracé, ou null si rien n'a été dessiné. */
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
};

type Props = {
  /** Hauteur CSS de la zone (px). */
  height?: number;
  className?: string;
  /** Callback à chaque changement d'état vide/non-vide (active le bouton). */
  onDirtyChange?: (dirty: boolean) => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 180, className, onDirtyChange },
  ref,
) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#1e2a52'; // encre bleu nuit
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    setupCanvas();
    // Un resize invalide le bitmap (le trait serait déformé) → on repart
    // d'une zone propre, c'est le comportement le moins surprenant.
    const onResize = () => {
      setupCanvas();
      dirtyRef.current = false;
      onDirtyChange?.(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [setupCanvas, onDirtyChange]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      onDirtyChange?.(true);
    }
  }

  function onPointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      if (!dirtyRef.current) return null;
      return canvasRef.current?.toDataURL('image/png') ?? null;
    },
    clear: () => {
      setupCanvas();
      dirtyRef.current = false;
      onDirtyChange?.(false);
    },
    isEmpty: () => !dirtyRef.current,
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{ height, touchAction: 'none' }}
      className={
        'w-full rounded-xl border border-border bg-white cursor-crosshair ' +
        (className ?? '')
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      aria-label={isEn ? 'Handwritten signature area' : 'Zone de signature manuscrite'}
    />
  );
});
