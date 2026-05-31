'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond étoilé Canvas 2D, super léger (pas de Three.js) — pensé pour
 * être monté sur TOUTES les pages marketing en arrière-plan fixe.
 *
 *   - 220 étoiles distribuées aléatoirement, taille 0.4-2.2 px
 *   - Scintillation par modulation d'opacité (perlin-like via sin)
 *   - 8 "comètes" lentes qui dérivent en diagonale
 *   - 3 nébuleuses très diffuses en radial-gradient
 *   - Position fixed, z-index -1, pointer-events none
 *   - Respecte prefers-reduced-motion (rendu statique sans scintillation)
 */
type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hue: number;
};

type Comet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  alpha: number;
};

const STAR_COUNT = 220;
const COMET_COUNT = 8;

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let stars: Star[] = [];
    let comets: Comet[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;

    function rebuild() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = w + 'px';
      canvas!.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.4,
          baseAlpha: 0.35 + Math.random() * 0.55,
          twinkleSpeed: 0.4 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: pickHue(),
        });
      }
      comets = [];
      for (let i = 0; i < COMET_COUNT; i++) {
        comets.push(makeComet(w, h));
      }
    }

    function pickHue(): number {
      const r = Math.random();
      if (r < 0.65) return 0; // blanc
      if (r < 0.85) return 320; // rose
      return 270; // violet
    }

    function makeComet(width: number, height: number): Comet {
      const fromLeft = Math.random() > 0.5;
      const speed = 0.15 + Math.random() * 0.25;
      return {
        x: fromLeft ? -50 : width + 50,
        y: Math.random() * height,
        vx: fromLeft ? speed : -speed,
        vy: (Math.random() - 0.5) * 0.05,
        len: 60 + Math.random() * 120,
        alpha: 0.3 + Math.random() * 0.4,
      };
    }

    rebuild();
    const onResize = () => rebuild();
    window.addEventListener('resize', onResize);

    function drawNebulae() {
      // 3 grandes taches diffuses pour rompre l'uniformité
      const taches = [
        { x: w * 0.2, y: h * 0.3, r: Math.max(w, h) * 0.5, color: 'rgba(168,85,247,0.06)' },
        { x: w * 0.85, y: h * 0.15, r: Math.max(w, h) * 0.45, color: 'rgba(236,72,153,0.05)' },
        { x: w * 0.5, y: h * 0.95, r: Math.max(w, h) * 0.55, color: 'rgba(99,102,241,0.04)' },
      ];
      for (const t of taches) {
        const grad = ctx!.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
        grad.addColorStop(0, t.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }
    }

    function frame(now: number) {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, w, h);

      drawNebulae();

      // Étoiles
      const ts = now * 0.001;
      for (const s of stars) {
        const a = reduce
          ? s.baseAlpha
          : Math.max(
              0.05,
              s.baseAlpha * (0.5 + 0.5 * Math.sin(ts * s.twinkleSpeed + s.twinklePhase)),
            );
        const color =
          s.hue === 0
            ? `rgba(255,255,255,${a})`
            : `hsla(${s.hue}, 80%, 78%, ${a})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // halo
        if (s.r > 1.2) {
          ctx.fillStyle =
            s.hue === 0
              ? `rgba(255,255,255,${a * 0.18})`
              : `hsla(${s.hue}, 80%, 78%, ${a * 0.18})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Comètes (rendu uniquement hors reduce)
      if (!reduce) {
        for (let i = 0; i < comets.length; i++) {
          const c = comets[i];
          c.x += c.vx;
          c.y += c.vy;
          if (c.x < -100 || c.x > w + 100 || c.y < -100 || c.y > h + 100) {
            comets[i] = makeComet(w, h);
            continue;
          }
          const grad = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * c.len * 10, c.y - c.vy * c.len * 10);
          grad.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x - c.vx * c.len * 10, c.y - c.vy * c.len * 10);
          ctx.stroke();
        }
      }

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
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
