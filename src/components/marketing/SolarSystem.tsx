'use client';

import { useEffect, useRef } from 'react';

/**
 * Système solaire informatique "ultra haut de gamme" — Canvas 2D 60fps
 * avec relief Z, orbites inclinées 3D, glow halos doublés et trails
 * prononcés. Couleurs alignées sur l'identité Centrium (magenta +
 * violet + cyan).
 *
 * Métaphore : Centrium = soleil au centre. Chaque module métier
 * (Consultants, Missions, CV, Pipeline, CRA, Factures) est une planète
 * qui orbite à son propre rythme. Quelques lunes orbitent autour des
 * grosses planètes. Des connexions data pulsent entre planètes proches.
 *
 * Nouveau v2 :
 *   - Orbites inclinées d'un angle TILT (18°) — donne un vrai effet 3D
 *     façon système solaire vu de biais
 *   - Profondeur Z : les planètes "derrière" le soleil sont plus petites
 *     + opacity réduite + glow atténué (effet perspective)
 *   - Glow halos doublés : 2 layers radial, intérieur intense, extérieur
 *     diffus
 *   - Trails plus prononcés (alpha 0.22 au lieu de 0.35) → motion blur
 *     plus visible
 *   - Connexions data : pulse animation traversant la ligne de A vers B
 *   - Parallax pointer subtil sur le centre du système
 *
 * 60 fps, respecte prefers-reduced-motion.
 */

type Planet = {
  /** Orbite elliptique : a = horizontal, b = vertical */
  a: number;
  b: number;
  /** Vitesse angulaire (rad/s) */
  speed: number;
  /** Phase initiale (rad) */
  phase: number;
  /** Rayon de base */
  r: number;
  /** Couleur principale */
  color: string;
  /** Accent (couleur logo Centrium) */
  accent: 'magenta' | 'violet' | 'cyan' | 'white';
  /** Label discret (module métier) */
  label: string;
  /** Lunes (optionnel) — orbites circulaires */
  moons?: { dist: number; speed: number; phase: number; r: number }[];
};

const TILT_DEG = 18;
const TILT = (TILT_DEG * Math.PI) / 180;

const ACCENT_COLORS = {
  magenta: '#ec4899',
  violet: '#a855f7',
  cyan: '#22d3ee',
  white: '#ffffff',
} as const;

const PLANETS: Planet[] = [
  {
    a: 140, b: 110, speed: 0.24, phase: 0,
    r: 5, color: ACCENT_COLORS.white, accent: 'white',
    label: 'CONSULTANTS',
  },
  {
    a: 210, b: 175, speed: 0.16, phase: 1.4,
    r: 7, color: ACCENT_COLORS.magenta, accent: 'magenta',
    label: 'MISSIONS',
    moons: [{ dist: 15, speed: 2.5, phase: 0, r: 1.7 }],
  },
  {
    a: 290, b: 240, speed: 0.12, phase: 2.9,
    r: 4.8, color: ACCENT_COLORS.white, accent: 'white',
    label: 'CV OPTIMIZER',
  },
  {
    a: 360, b: 295, speed: 0.09, phase: 0.8,
    r: 9, color: ACCENT_COLORS.violet, accent: 'violet',
    label: 'PIPELINE',
    moons: [
      { dist: 17, speed: 1.9, phase: 0, r: 1.9 },
      { dist: 24, speed: -1.3, phase: 1.5, r: 1.4 },
    ],
  },
  {
    a: 430, b: 350, speed: 0.07, phase: 4.2,
    r: 5.8, color: ACCENT_COLORS.white, accent: 'white',
    label: 'CRA',
  },
  {
    a: 510, b: 410, speed: 0.055, phase: 5.6,
    r: 8, color: ACCENT_COLORS.cyan, accent: 'cyan',
    label: 'FACTURATION',
    moons: [{ dist: 18, speed: -1.7, phase: 0, r: 1.7 }],
  },
];

type Dust = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };

export function SolarSystem({ className }: { className?: string }) {
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
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let scale = 1;
    let t = 0;
    let lastTs = performance.now();
    let dust: Dust[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let targetPx = 0;
    let targetPy = 0;

    function rebuild() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cx = w / 2;
      cy = h / 2;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxA = 510;
      scale = Math.min(w * 0.42, h * 0.5) / maxA;
      scale = Math.max(0.45, Math.min(1.05, scale));

      dust = [];
      for (let i = 0; i < 110; i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          r: 0.3 + Math.random() * 1.1,
          alpha: 0.12 + Math.random() * 0.4,
        });
      }
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    function onPointer(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      targetPx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetPy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    if (!reduce) window.addEventListener('pointermove', onPointer, { passive: true });

    /**
     * Position 3D d'une planète à l'instant t.
     * x, y = position 2D sur l'orbite tiltée
     * z = profondeur (positif = devant le soleil, négatif = derrière)
     */
    function planetPos(p: Planet, time: number): { x: number; y: number; z: number; depth: number } {
      const angle = p.phase + time * p.speed;
      // Position 3D de l'orbite (plan XY non tilté)
      const x0 = Math.cos(angle) * p.a * scale;
      const y0 = Math.sin(angle) * p.b * scale;
      // Tilt = rotation autour de l'axe X — Y' devient Y*cos - Z*sin, Z' = Y*sin + Z*cos
      const yT = y0 * Math.cos(TILT);
      const zT = y0 * Math.sin(TILT);
      // depth = facteur 0.6 (derrière, max éloigné) → 1.4 (devant, max proche)
      const depth = 1 + (zT / (p.b * scale)) * 0.4;
      return {
        x: cx + x0 + pointerX * 12,
        y: cy + yT + pointerY * 8,
        z: zT,
        depth,
      };
    }

    function drawOrbits() {
      ctx!.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([2, 6]);
      for (const p of PLANETS) {
        // Ellipse tiltée — on dessine en faisant varier l'angle de 0 à 2π
        ctx!.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const x0 = Math.cos(a) * p.a * scale;
          const y0 = Math.sin(a) * p.b * scale;
          const yT = y0 * Math.cos(TILT);
          if (i === 0) ctx!.moveTo(cx + x0 + pointerX * 12, cy + yT + pointerY * 8);
          else ctx!.lineTo(cx + x0 + pointerX * 12, cy + yT + pointerY * 8);
        }
        ctx!.stroke();
      }
      ctx!.setLineDash([]);
    }

    function drawSun(time: number) {
      const pulse = 1 + Math.sin(time * 1.4) * 0.1;
      const baseR = 14 * scale;
      const r = baseR * pulse;
      const sx = cx + pointerX * 12;
      const sy = cy + pointerY * 8;

      // Halo extérieur (très large)
      const haloOuter = ctx!.createRadialGradient(sx, sy, 0, sx, sy, r * 11);
      haloOuter.addColorStop(0, 'rgba(236,72,153,0.32)');
      haloOuter.addColorStop(0.4, 'rgba(168,85,247,0.18)');
      haloOuter.addColorStop(1, 'rgba(168,85,247,0)');
      ctx!.fillStyle = haloOuter;
      ctx!.beginPath();
      ctx!.arc(sx, sy, r * 11, 0, Math.PI * 2);
      ctx!.fill();

      // Halo intérieur (plus dense)
      const haloInner = ctx!.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
      haloInner.addColorStop(0, 'rgba(255,255,255,0.7)');
      haloInner.addColorStop(0.4, 'rgba(236,72,153,0.6)');
      haloInner.addColorStop(1, 'rgba(236,72,153,0)');
      ctx!.fillStyle = haloInner;
      ctx!.beginPath();
      ctx!.arc(sx, sy, r * 4, 0, Math.PI * 2);
      ctx!.fill();

      // Noyau dégradé
      const core = ctx!.createRadialGradient(sx, sy, 0, sx, sy, r);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.45, '#fce7f3');
      core.addColorStop(1, '#ec4899');
      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.arc(sx, sy, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawConnections(positions: Array<{ x: number; y: number; depth: number; planet: Planet }>, time: number) {
      const threshold = 240 * scale;
      ctx!.globalCompositeOperation = 'lighter';
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < threshold) {
            const baseAlpha = (1 - d / threshold) * 0.4;
            // Ligne de base
            ctx!.strokeStyle = `rgba(236,72,153,${baseAlpha * 0.6})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();

            // Pulse "data packet" qui traverse la ligne
            const pulseT = ((time * 0.6 + (i * 0.3) + (j * 0.13)) % 1);
            const px = a.x + dx * pulseT;
            const py = a.y + dy * pulseT;
            const fadeAlpha = Math.sin(pulseT * Math.PI) * baseAlpha * 2;
            const pulseGrad = ctx!.createRadialGradient(px, py, 0, px, py, 8);
            pulseGrad.addColorStop(0, `rgba(255,255,255,${fadeAlpha})`);
            pulseGrad.addColorStop(1, 'rgba(236,72,153,0)');
            ctx!.fillStyle = pulseGrad;
            ctx!.beginPath();
            ctx!.arc(px, py, 8, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawPlanet(p: Planet, pos: { x: number; y: number; depth: number }, time: number) {
      // Profondeur affecte la taille et l'opacity
      const depthScale = pos.depth; // 0.6 → 1.4
      const r = p.r * scale * depthScale;
      const opacity = 0.55 + (depthScale - 0.6) / 0.8 * 0.45; // 0.55 → 1.0

      const accentColor = ACCENT_COLORS[p.accent];

      // Halo extérieur
      ctx!.globalAlpha = opacity * 0.5;
      const haloOuter = ctx!.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 9);
      haloOuter.addColorStop(0, p.accent === 'white' ? 'rgba(255,255,255,0.35)' : `${accentColor}66`);
      haloOuter.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = haloOuter;
      ctx!.beginPath();
      ctx!.arc(pos.x, pos.y, r * 9, 0, Math.PI * 2);
      ctx!.fill();

      // Halo intérieur dense
      ctx!.globalAlpha = opacity * 0.8;
      const haloInner = ctx!.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 3.5);
      haloInner.addColorStop(0, p.accent === 'white' ? 'rgba(255,255,255,0.85)' : accentColor);
      haloInner.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = haloInner;
      ctx!.beginPath();
      ctx!.arc(pos.x, pos.y, r * 3.5, 0, Math.PI * 2);
      ctx!.fill();

      // Planète elle-même
      ctx!.globalAlpha = opacity;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.globalAlpha = 1;

      // Pulse ring expansif
      const pulsePhase = (time * 0.45 + p.phase) % 3;
      if (pulsePhase < 2.5) {
        const ringR = r + pulsePhase * r * 2.2;
        const ringAlpha = (1 - pulsePhase / 2.5) * 0.5 * opacity;
        ctx!.strokeStyle = p.accent === 'white' ? `rgba(255,255,255,${ringAlpha})` : `${accentColor}${Math.round(ringAlpha * 255).toString(16).padStart(2, '0')}`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Lunes
      if (p.moons) {
        for (const m of p.moons) {
          const mAngle = m.phase + time * m.speed;
          const mx = pos.x + Math.cos(mAngle) * m.dist * scale * depthScale;
          const my = pos.y + Math.sin(mAngle) * m.dist * scale * depthScale * Math.cos(TILT);
          ctx!.fillStyle = `rgba(255,255,255,${opacity * 0.85})`;
          ctx!.beginPath();
          ctx!.arc(mx, my, m.r * scale * depthScale, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawLabels(positions: Array<{ x: number; y: number; depth: number; planet: Planet }>) {
      ctx!.font = `${10 * Math.max(0.85, scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx!.textBaseline = 'middle';
      for (const { x, y, depth, planet } of positions) {
        const r = planet.r * scale * depth;
        const offsetX = r + 8;
        const opacity = 0.45 + (depth - 0.6) / 0.8 * 0.4;
        const color = planet.accent === 'white' ? `rgba(255,255,255,${opacity})` : `${ACCENT_COLORS[planet.accent]}${Math.round(opacity * 200).toString(16).padStart(2, '0')}`;
        ctx!.fillStyle = color;
        ctx!.textAlign = 'left';
        ctx!.fillText(planet.label, x + offsetX, y);
      }
    }

    function drawDust() {
      ctx!.globalCompositeOperation = 'lighter';
      for (const d of dust) {
        if (!reduce) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0) d.x = w;
          else if (d.x > w) d.x = 0;
          if (d.y < 0) d.y = h;
          else if (d.y > h) d.y = 0;
        }
        ctx!.fillStyle = `rgba(255,255,255,${d.alpha})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(50, now - lastTs);
      lastTs = now;
      if (!reduce) t += dt * 0.001;

      // Lissage parallax pointer
      pointerX += (targetPx - pointerX) * 0.04;
      pointerY += (targetPy - pointerY) * 0.04;

      // Trail prononcé (alpha 0.22)
      ctx.fillStyle = 'rgba(5, 6, 12, 0.22)';
      ctx.fillRect(0, 0, w, h);

      drawDust();
      drawOrbits();

      const positions = PLANETS.map((p) => {
        const pos = planetPos(p, t);
        return { ...pos, planet: p };
      });

      // Sort par depth pour que les "devant" soient dessinés en dernier
      const sorted = [...positions].sort((a, b) => a.depth - b.depth);

      drawConnections(positions, t);

      // Planètes "derrière" le soleil
      const behind = sorted.filter((p) => p.depth < 1);
      for (const item of behind) {
        drawPlanet(item.planet, { x: item.x, y: item.y, depth: item.depth }, t);
      }

      drawSun(t);

      // Planètes "devant" le soleil
      const front = sorted.filter((p) => p.depth >= 1);
      for (const item of front) {
        drawPlanet(item.planet, { x: item.x, y: item.y, depth: item.depth }, t);
      }

      drawLabels(positions);

      if (!reduce) raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      requestAnimationFrame(frame);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onVis() {
      running = document.visibilityState === 'visible';
      if (running && !reduce) {
        lastTs = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (!reduce) window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ display: 'block' }}
      />
      <div className="absolute top-6 left-6 font-mono text-[10px] tracking-[0.18em] text-white/35 select-none">
        <div>CENTRIUM // SYSTEM 01</div>
        <div className="mt-1">ORBITS: 6 · NODES: 10 · STATE: NOMINAL</div>
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.18em] text-white/35 select-none text-right">
        <div>UPLINK · 99.97 %</div>
        <div className="mt-1">SYNCED</div>
      </div>
    </div>
  );
}
