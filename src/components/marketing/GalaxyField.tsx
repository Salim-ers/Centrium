'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond cosmique contemplatif — Canvas 2D 60fps avec :
 *
 *   - 5 NÉBULEUSES colorées (rose, violet, bleu profond, cyan, indigo)
 *     en grands radial-gradients qui drift très lentement (60-120s)
 *   - 280 ÉTOILES fixes blanches et accentuées rose/violet/bleu/cyan
 *     avec scintillation lente (3-9 s cycle)
 *   - 12 CONSTELLATIONS : groupes de 3-6 étoiles reliées par lignes
 *     très fines blanches/violettes, opacity qui fade in/out lentement
 *   - 3 SHOOTING STARS actives à la fois (apparitions toutes les 6-14s)
 *     traversant l'écran en diagonale avec trail
 *   - Poussière cosmique : 50 particules qui dérivent imperceptiblement
 *
 * Mouvement lent et contemplatif — pas chaotique. Sensation d'espace
 * infini, pas d'urgence.
 *
 * Couleurs alignées sur l'identité Centrium + élargissement vers bleu/
 * cyan/indigo pour la richesse cosmique.
 *
 * Performance : ~300 ops par frame, blending mixte, 60fps stable.
 * Respecte prefers-reduced-motion (étoiles fixes, pas de shooting stars).
 */

type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string; // 'rgba(R,G,B' tronqué
  bright: boolean;
};

type ConstellationGroup = {
  starIndices: number[];
  /** Phase d'apparition de la constellation (cycle long) */
  phase: number;
  /** Couleur de liaison */
  color: string;
};

type Shooting = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  maxTtl: number;
};

type Dust = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };

const NEBULAE = [
  { hue: '236, 72, 153', alpha: 0.16, scale: 0.55, ax: 0.18, ay: 0.25, speed: 0.012 }, // rose
  { hue: '168, 85, 247', alpha: 0.14, scale: 0.5,  ax: 0.78, ay: 0.18, speed: 0.009 }, // violet
  { hue: '59, 130, 246', alpha: 0.13, scale: 0.6,  ax: 0.62, ay: 0.78, speed: 0.011 }, // bleu
  { hue: '34, 211, 238', alpha: 0.10, scale: 0.4,  ax: 0.12, ay: 0.72, speed: 0.014 }, // cyan
  { hue: '99, 102, 241', alpha: 0.12, scale: 0.55, ax: 0.45, ay: 0.45, speed: 0.008 }, // indigo
];

const STAR_COUNT = 280;
const CONSTELLATION_COUNT = 12;

function pickStarColor(): { color: string; bright: boolean } {
  const r = Math.random();
  if (r < 0.65) return { color: '255, 255, 255', bright: r < 0.08 };
  if (r < 0.78) return { color: '236, 72, 153', bright: false }; // rose
  if (r < 0.88) return { color: '168, 85, 247', bright: false }; // violet
  if (r < 0.95) return { color: '59, 130, 246', bright: false };  // bleu
  return { color: '34, 211, 238', bright: false }; // cyan
}

export function GalaxyField({ className }: { className?: string }) {
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
    let constellations: ConstellationGroup[] = [];
    let shootings: Shooting[] = [];
    let dust: Dust[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let lastTs = performance.now();
    let lastShootingSpawn = 0;

    function rebuild() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Étoiles
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const { color, bright } = pickStarColor();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? 1.2 + Math.random() * 1.0 : 0.3 + Math.random() * 0.9,
          baseAlpha: bright ? 0.7 + Math.random() * 0.25 : 0.25 + Math.random() * 0.45,
          twinkleSpeed: 0.18 + Math.random() * 0.55,
          twinklePhase: Math.random() * Math.PI * 2,
          color,
          bright,
        });
      }

      // Constellations : 12 groupes de 3-6 étoiles proches
      constellations = [];
      const used = new Set<number>();
      for (let i = 0; i < CONSTELLATION_COUNT; i++) {
        // Choisir une étoile pivot pas encore utilisée
        let pivotIdx = -1;
        for (let tries = 0; tries < 30; tries++) {
          const candidate = Math.floor(Math.random() * stars.length);
          if (!used.has(candidate)) {
            pivotIdx = candidate;
            break;
          }
        }
        if (pivotIdx === -1) continue;

        // Chercher les 3-5 étoiles les plus proches
        const pivot = stars[pivotIdx];
        const candidates = stars
          .map((s, idx) => {
            const dx = s.x - pivot.x;
            const dy = s.y - pivot.y;
            return { idx, dist: dx * dx + dy * dy };
          })
          .filter((c) => c.idx !== pivotIdx && !used.has(c.idx))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3 + Math.floor(Math.random() * 3));

        const group = [pivotIdx, ...candidates.map((c) => c.idx)];
        group.forEach((idx) => used.add(idx));

        constellations.push({
          starIndices: group,
          phase: Math.random() * Math.PI * 2,
          color:
            Math.random() < 0.5
              ? 'rgba(168, 85, 247, '
              : 'rgba(236, 72, 153, ',
        });
      }

      // Poussière cosmique
      dust = [];
      for (let i = 0; i < 50; i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          r: 0.2 + Math.random() * 0.6,
          alpha: 0.08 + Math.random() * 0.18,
        });
      }

      shootings = [];
      lastShootingSpawn = performance.now();
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    function maybeSpawnShootingStar(now: number) {
      if (reduce) return;
      if (shootings.length >= 3) return;
      // Spawn toutes les 6-14s
      if (now - lastShootingSpawn < 6000 + Math.random() * 8000) return;
      lastShootingSpawn = now;

      // Trajectoire diagonale, depuis un coin haut-gauche / haut-droit
      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? -50 : w + 50;
      const y = Math.random() * (h * 0.7);
      const angle = fromLeft ? Math.PI / 6 + Math.random() * 0.3 : Math.PI - Math.PI / 6 - Math.random() * 0.3;
      const speed = 0.8 + Math.random() * 0.6;
      shootings.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl: 4500,
        maxTtl: 4500,
      });
    }

    function step(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(50, now - lastTs);
      lastTs = now;
      const ts = now * 0.001;

      // 1) Clear total (pas de trail global pour ne pas masquer les nébuleuses)
      ctx.clearRect(0, 0, w, h);

      // 2) Nébuleuses (drift très lent, paramétré en boucle sinusoïdale)
      for (const n of NEBULAE) {
        const cx = (n.ax + Math.sin(ts * n.speed) * 0.05) * w;
        const cy = (n.ay + Math.cos(ts * n.speed * 0.7) * 0.05) * h;
        const r = Math.max(w, h) * n.scale;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${n.hue}, ${n.alpha})`);
        grad.addColorStop(1, `rgba(${n.hue}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'lighter';

      // 3) Poussière cosmique
      for (const d of dust) {
        if (!reduce) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0) d.x = w;
          else if (d.x > w) d.x = 0;
          if (d.y < 0) d.y = h;
          else if (d.y > h) d.y = 0;
        }
        ctx.fillStyle = `rgba(255,255,255,${d.alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) Lignes de constellations (sous les étoiles)
      for (const c of constellations) {
        const opacity = reduce
          ? 0.35
          : 0.15 + 0.35 * Math.abs(Math.sin(ts * 0.08 + c.phase));
        ctx.strokeStyle = c.color + opacity + ')';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([1.5, 4]);
        ctx.beginPath();
        for (let i = 0; i < c.starIndices.length - 1; i++) {
          const a = stars[c.starIndices[i]];
          const b = stars[c.starIndices[i + 1]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5) Étoiles
      for (const s of stars) {
        const a = reduce
          ? s.baseAlpha
          : Math.max(
              0.08,
              s.baseAlpha * (0.45 + 0.55 * Math.sin(ts * s.twinkleSpeed + s.twinklePhase)),
            );
        // Étoiles brillantes : halo
        if (s.bright) {
          const haloR = s.r * 5;
          const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
          halo.addColorStop(0, `rgba(${s.color},${a * 0.6})`);
          halo.addColorStop(1, `rgba(${s.color},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${s.color},${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6) Shooting stars
      maybeSpawnShootingStar(now);
      for (let i = shootings.length - 1; i >= 0; i--) {
        const sh = shootings[i];
        if (!reduce) {
          sh.x += sh.vx * dt * 0.6;
          sh.y += sh.vy * dt * 0.6;
          sh.ttl -= dt;
        }
        if (
          sh.ttl <= 0 ||
          sh.x < -200 ||
          sh.x > w + 200 ||
          sh.y < -200 ||
          sh.y > h + 200
        ) {
          shootings.splice(i, 1);
          continue;
        }
        // Trail
        const trailLen = 80;
        const tailX = sh.x - sh.vx * trailLen;
        const tailY = sh.y - sh.vy * trailLen;
        const lifeFactor = Math.min(1, sh.ttl / sh.maxTtl);
        const lineGrad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        lineGrad.addColorStop(0, `rgba(255,255,255,${lifeFactor})`);
        lineGrad.addColorStop(0.4, `rgba(236,72,153,${lifeFactor * 0.6})`);
        lineGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        // Tête lumineuse
        const headGrad = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 8);
        headGrad.addColorStop(0, `rgba(255,255,255,${lifeFactor * 0.9})`);
        headGrad.addColorStop(1, 'rgba(236,72,153,0)');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 8, 0, Math.PI * 2);
        ctx.fill();
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
