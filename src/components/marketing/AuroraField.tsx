'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond Canvas premium type Linear / Stripe : 5 blobs gradient géants
 * qui glissent et se mélangent en mode 'lighter', avec une grille
 * subtile par-dessus et un grain noise.
 *
 * Pas d'humains, pas d'objets reconnaissables — pure abstraction
 * fluide qui donne immédiatement un feeling premium.
 *
 * - Performance : Canvas 2D, max ~60 fps, devicePixelRatio cappé à 2,
 *   pause auto si l'onglet est en arrière-plan, désactivation totale
 *   si prefers-reduced-motion.
 * - Couleurs : palette restreinte (rose, magenta, violet, indigo deep,
 *   bleu nuit) pour rester chic, pas saturée.
 *
 * Utilisation : monter en position absolue / fixed derrière le contenu.
 */
type Props = {
  className?: string;
  /** Intensité globale des blobs (0..1). Default 0.9. */
  intensity?: number;
};

type Blob = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
};

const PALETTE = [
  'rgba(236, 72, 153, 0.55)', // pink
  'rgba(225, 29, 116, 0.45)', // magenta
  'rgba(168, 85, 247, 0.40)', // violet
  'rgba(99, 102, 241, 0.30)', // indigo
  'rgba(30, 27, 75, 0.45)', // indigo deep
];

export function AuroraField({ className, intensity = 0.9 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let lastTs = performance.now();
    let running = true;

    function resize() {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Initialise blobs avec position pseudo-random déterministe par
    // index (pour stabilité au resize, pas de Math.random à chaque mount).
    const w0 = canvas.clientWidth || 800;
    const h0 = canvas.clientHeight || 600;
    const seed = (i: number, s: number) =>
      ((Math.sin(i * 12.9898 + s * 78.233) + 1) / 2) || 0.5;

    const blobs: Blob[] = PALETTE.map((color, i) => ({
      x: seed(i, 1) * w0,
      y: seed(i, 2) * h0,
      vx: (seed(i, 3) - 0.5) * 0.15,
      vy: (seed(i, 4) - 0.5) * 0.15,
      r: (0.45 + seed(i, 5) * 0.4) * Math.max(w0, h0),
      color,
    }));

    function step(now: number) {
      if (!running) return;
      const dt = Math.min(50, now - lastTs);
      lastTs = now;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = 'lighter';

      for (const b of blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // wrap doux
        if (b.x < -b.r) b.x = w + b.r;
        else if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        else if (b.y > h + b.r) b.y = -b.r;

        const grad = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = grad;
        ctx!.globalAlpha = intensity;
        ctx!.fillRect(0, 0, w, h);
      }

      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(step);
    }

    // Rendu unique en reduce-motion
    if (reduce) {
      requestAnimationFrame(step);
    } else {
      raf = requestAnimationFrame(step);
    }

    function onVisibility() {
      running = document.visibilityState === 'visible';
      if (running && !reduce) {
        lastTs = performance.now();
        raf = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(raf);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensity]);

  return (
    <div
      className={className}
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ filter: 'blur(40px) saturate(115%)' }}
      />
      {/* grain subtil pour casser l'effet "lisse digital" et donner du chic */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
      {/* grille très subtile, façon plan d'architecte */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
    </div>
  );
}
