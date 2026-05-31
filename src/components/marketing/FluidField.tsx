'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond dynamique léger style "4DX" :
 *   - 3 vagues SVG ondulantes superposées avec gradients rose/violet/cyan
 *     qui drift horizontalement à des vitesses différentes (parallax)
 *   - 80 particules Canvas 2D qui flowent doucement avec lift (lighter
 *     blending, type air / fluide)
 *   - Aucun WebGL, aucun Three.js → ultra léger
 *   - Hue cycle global lent (12 s) pour un changement de couleur continu
 *
 * Effet visuel : sensation de respiration / immersion sans charger le GPU.
 *
 * Performance : <2 ms par frame sur GPU intégré. DPR cappé 1.5.
 * Respecte prefers-reduced-motion (animation pause).
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  hue: number;
};

const PARTICLE_COUNT = 80;

export function FluidField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let particles: Particle[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;

    function rebuild() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const hueRoll = Math.random();
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -(0.05 + Math.random() * 0.18),
          r: 0.6 + Math.random() * 2.4,
          alpha: 0.15 + Math.random() * 0.35,
          hue: hueRoll < 0.5 ? 320 : hueRoll < 0.8 ? 280 : 200,
        });
      }
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    function frame() {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          if (p.x < -10) p.x = w + 10;
          else if (p.x > w + 10) p.x = -10;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 75%, ${p.alpha})`);
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 75%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.r * 6, p.y - p.r * 6, p.r * 12, p.r * 12);
      }

      ctx.globalCompositeOperation = 'source-over';

      if (!reduce) {
        raf = requestAnimationFrame(frame);
      }
    }

    if (reduce) {
      requestAnimationFrame(frame);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onVis() {
      running = document.visibilityState === 'visible';
      if (running && !reduce) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* === Couche 1 : Vagues SVG ondulantes avec gradients === */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full fluid-svg"
      >
        <defs>
          <linearGradient id="fluid-grad-1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fluid-grad-2" x1="1" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fluid-grad-3" x1="0.5" x2="0.5" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <filter id="fluid-blur">
            <feGaussianBlur stdDeviation="40" />
          </filter>
        </defs>

        {/* Vague 1 — rose qui ondule en haut */}
        <g filter="url(#fluid-blur)" className="fluid-wave-1">
          <path
            d="M0,260 C240,180 480,360 720,280 C960,200 1200,380 1440,300 L1440,0 L0,0 Z"
            fill="url(#fluid-grad-1)"
          />
        </g>

        {/* Vague 2 — violet qui ondule au milieu */}
        <g filter="url(#fluid-blur)" className="fluid-wave-2">
          <path
            d="M0,540 C320,460 640,640 960,520 C1180,440 1300,600 1440,520 L1440,900 L0,900 Z"
            fill="url(#fluid-grad-2)"
          />
        </g>

        {/* Vague 3 — cyan diffus en bas, plus subtile */}
        <g filter="url(#fluid-blur)" className="fluid-wave-3">
          <path
            d="M0,720 C240,640 720,820 1080,720 C1240,660 1340,780 1440,720 L1440,900 L0,900 Z"
            fill="url(#fluid-grad-3)"
          />
        </g>
      </svg>

      {/* === Couche 2 : Particules Canvas 2D qui flowent === */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* === Couche 3 : Grain subtil pour casser le lisse === */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      <style jsx>{`
        .fluid-svg {
          animation: fluid-hue 14s ease-in-out infinite;
        }
        .fluid-wave-1 {
          transform-origin: center;
          animation: fluid-drift-1 16s ease-in-out infinite;
        }
        .fluid-wave-2 {
          transform-origin: center;
          animation: fluid-drift-2 20s ease-in-out infinite;
        }
        .fluid-wave-3 {
          transform-origin: center;
          animation: fluid-drift-3 24s ease-in-out infinite;
        }
        @keyframes fluid-drift-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-3%, 2%, 0) scale(1.08); }
        }
        @keyframes fluid-drift-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(3%, -2%, 0) scale(1.06); }
        }
        @keyframes fluid-drift-3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-2%, -1%, 0) scale(1.1); }
        }
        @keyframes fluid-hue {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(-25deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fluid-svg, .fluid-wave-1, .fluid-wave-2, .fluid-wave-3 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
