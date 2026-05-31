'use client';

import { useEffect, useRef } from 'react';

/**
 * Champ d'électrons libres — Canvas 2D, ~70 particules qui se déplacent
 * de façon chaotique avec :
 *   - vélocité aléatoire qui se réoriente progressivement (steering)
 *   - trail court derrière chaque particule (effet "zip" / éclair court)
 *   - scintillation rapide (alpha qui oscille)
 *   - quelques "sauts quantiques" : téléportation soudaine
 *     accompagnée d'un flash radial bref
 *   - lignes de liaison qui apparaissent et disparaissent rapidement
 *     entre particules très proches (effet d'arc électrique)
 *
 * Couleurs : majoritairement blanc + accents rose magenta / violet / cyan
 * alignés sur l'identité du logo Centrium.
 *
 * Performance :
 *   - Canvas 2D, ~70 entités, blending 'lighter' pour glow naturel
 *   - DPR cappé 2, pause auto si onglet en arrière-plan
 *   - Respecte prefers-reduced-motion (rendu statique)
 */

type Electron = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Couleur de l'électron (rgba sans alpha) */
  color: string;
  /** Phase de scintillation */
  phase: number;
  /** Vitesse de scintillation (Hz) */
  twinkleSpeed: number;
  /** Trail buffer : dernières N positions */
  trail: { x: number; y: number }[];
  /** Compteur avant prochain saut quantique (ms) */
  jumpIn: number;
  /** Flash actif après saut (ms restants) */
  flashTtl: number;
};

const ELECTRON_COUNT = 75;
const TRAIL_LEN = 8;
const PALETTE: Array<{ color: string; weight: number }> = [
  { color: '255,255,255', weight: 0.6 },
  { color: '236,72,153', weight: 0.2 }, // magenta
  { color: '168,85,247', weight: 0.12 }, // violet
  { color: '34,211,238', weight: 0.08 }, // cyan
];

function pickColor(): string {
  const r = Math.random();
  let acc = 0;
  for (const c of PALETTE) {
    acc += c.weight;
    if (r < acc) return c.color;
  }
  return PALETTE[0].color;
}

export function ElectronField({ className }: { className?: string }) {
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
    let electrons: Electron[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let lastTs = performance.now();

    function rebuild() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      electrons = [];
      for (let i = 0; i < ELECTRON_COUNT; i++) {
        electrons.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4,
          r: 0.5 + Math.random() * 1.6,
          color: pickColor(),
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 1.5 + Math.random() * 3,
          trail: [],
          jumpIn: 3000 + Math.random() * 8000,
          flashTtl: 0,
        });
      }
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    function step(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(50, now - lastTs);
      lastTs = now;

      // Clear avec un léger fade pour les trails
      ctx.fillStyle = 'rgba(5, 6, 12, 0.28)';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';

      const ts = now * 0.001;

      // 1) Mise à jour des positions
      for (const e of electrons) {
        if (!reduce) {
          // Steering aléatoire (petite perturbation de la vélocité)
          e.vx += (Math.random() - 0.5) * 0.08;
          e.vy += (Math.random() - 0.5) * 0.08;
          // Cap vitesse
          const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          const maxSpeed = 1.8;
          if (speed > maxSpeed) {
            e.vx = (e.vx / speed) * maxSpeed;
            e.vy = (e.vy / speed) * maxSpeed;
          }
          // Move
          e.x += e.vx;
          e.y += e.vy;
          // Bordures : wrap doux
          if (e.x < -5) e.x = w + 5;
          else if (e.x > w + 5) e.x = -5;
          if (e.y < -5) e.y = h + 5;
          else if (e.y > h + 5) e.y = -5;

          // Push trail
          e.trail.push({ x: e.x, y: e.y });
          if (e.trail.length > TRAIL_LEN) e.trail.shift();

          // Saut quantique ?
          e.jumpIn -= dt;
          if (e.jumpIn <= 0) {
            e.x = Math.random() * w;
            e.y = Math.random() * h;
            e.trail = [];
            e.flashTtl = 400;
            e.jumpIn = 3500 + Math.random() * 10000;
            // Nouvelle vélocité aléatoire
            const angle = Math.random() * Math.PI * 2;
            const v = 0.8 + Math.random() * 1.2;
            e.vx = Math.cos(angle) * v;
            e.vy = Math.sin(angle) * v;
          }
          if (e.flashTtl > 0) e.flashTtl -= dt;
        }

        // 2) Draw trail
        if (e.trail.length > 1) {
          for (let i = 0; i < e.trail.length - 1; i++) {
            const t1 = e.trail[i];
            const t2 = e.trail[i + 1];
            const a = ((i + 1) / e.trail.length) * 0.3;
            ctx.strokeStyle = `rgba(${e.color},${a})`;
            ctx.lineWidth = e.r * 0.4;
            ctx.beginPath();
            ctx.moveTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.stroke();
          }
        }

        // 3) Scintillation alpha
        const alpha = reduce
          ? 0.7
          : 0.45 + 0.5 * Math.abs(Math.sin(ts * e.twinkleSpeed + e.phase));

        // 4) Halo
        const haloR = e.r * 5;
        const halo = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, haloR);
        halo.addColorStop(0, `rgba(${e.color},${alpha * 0.6})`);
        halo.addColorStop(1, `rgba(${e.color},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(e.x, e.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        // 5) Cœur
        ctx.fillStyle = `rgba(${e.color},${alpha})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        // 6) Flash après saut quantique
        if (e.flashTtl > 0) {
          const fa = e.flashTtl / 400;
          const fR = e.r * 14 * (1 - fa) + e.r * 2;
          const flash = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, fR);
          flash.addColorStop(0, `rgba(${e.color},${fa * 0.5})`);
          flash.addColorStop(1, `rgba(${e.color},0)`);
          ctx.fillStyle = flash;
          ctx.beginPath();
          ctx.arc(e.x, e.y, fR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7) Arcs électriques : connexions entre paires de particules très proches
      if (!reduce) {
        const arcDist = 90;
        for (let i = 0; i < electrons.length; i++) {
          for (let j = i + 1; j < electrons.length; j++) {
            const a = electrons[i];
            const b = electrons[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < arcDist * arcDist) {
              const d = Math.sqrt(d2);
              const op = (1 - d / arcDist) * 0.35;
              ctx.strokeStyle = `rgba(236,72,153,${op})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      if (!reduce) raf = requestAnimationFrame(step);
    }

    if (reduce) {
      requestAnimationFrame(step);
    } else {
      raf = requestAnimationFrame(step);
    }

    function onVis() {
      running = document.visibilityState === 'visible';
      if (running && !reduce) {
        lastTs = performance.now();
        raf = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(raf);
      }
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
      <canvas ref={canvasRef} className="block w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}
