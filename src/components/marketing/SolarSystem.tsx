'use client';

import { useEffect, useRef } from 'react';

/**
 * Vrai système solaire stylisé en Canvas 2D — 60 fps fluide.
 *
 * Métaphore : Centrium est le soleil (core). Chaque module métier
 * (Consultants, Missions, CV, Pipeline, CRA, Factures) est une planète
 * qui orbite à sa propre vitesse. Quelques lunes orbitent autour des
 * grosses planètes. Des connexions data pulsent entre planètes
 * proches.
 *
 * Implémenté en Canvas 2D pour :
 *   - 60 fps garantis (vs SVG + CSS keyframes qui peut bugger)
 *   - Trails légers (motion blur cumulé via fillRect alpha)
 *   - Connexions dynamiques calculées à chaque frame
 *   - Particules glow avec compositing 'lighter'
 *
 * Respecte prefers-reduced-motion (rendu statique).
 * Pause auto si onglet en arrière-plan.
 */

type Planet = {
  // Orbite elliptique (a = semi-axe horizontal, b = semi-axe vertical)
  a: number;
  b: number;
  /** Vitesse angulaire (rad/s) */
  speed: number;
  /** Phase initiale (rad) */
  phase: number;
  /** Rayon de la planète */
  r: number;
  /** Couleur principale */
  color: string;
  /** Accent (rose magenta) */
  accent: boolean;
  /** Label discret (module métier) */
  label: string;
  /** Lunes (optionnel) — orbites circulaires autour de la planète */
  moons?: { dist: number; speed: number; phase: number; r: number }[];
};

const PLANETS: Planet[] = [
  {
    a: 140,
    b: 110,
    speed: 0.22,
    phase: 0,
    r: 5,
    color: 'rgba(255,255,255,0.95)',
    accent: false,
    label: 'CONSULTANTS',
  },
  {
    a: 210,
    b: 175,
    speed: 0.15,
    phase: 1.4,
    r: 7,
    color: '#ec4899',
    accent: true,
    label: 'MISSIONS',
    moons: [{ dist: 14, speed: 2.4, phase: 0, r: 1.6 }],
  },
  {
    a: 290,
    b: 240,
    speed: 0.11,
    phase: 2.9,
    r: 4.5,
    color: 'rgba(255,255,255,0.9)',
    accent: false,
    label: 'CV OPTIMIZER',
  },
  {
    a: 360,
    b: 295,
    speed: 0.085,
    phase: 0.8,
    r: 9,
    color: '#a855f7',
    accent: true,
    label: 'PIPELINE',
    moons: [
      { dist: 16, speed: 1.8, phase: 0, r: 1.8 },
      { dist: 22, speed: -1.2, phase: 1.5, r: 1.3 },
    ],
  },
  {
    a: 430,
    b: 350,
    speed: 0.065,
    phase: 4.2,
    r: 5.5,
    color: 'rgba(255,255,255,0.9)',
    accent: false,
    label: 'CRA',
  },
  {
    a: 510,
    b: 410,
    speed: 0.05,
    phase: 5.6,
    r: 8,
    color: '#22d3ee',
    accent: true,
    label: 'FACTURATION',
    moons: [{ dist: 17, speed: -1.6, phase: 0, r: 1.6 }],
  },
];

/** Particules cosmiques d'arrière-plan qui dérivent doucement */
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

    /** Buffer pour effet trail : on ne clear pas complètement mais on
     *  superpose un fillRect noir semi-transparent pour fade le précédent. */
    let dust: Dust[] = [];

    function rebuild() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cx = w / 2;
      cy = h / 2;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Échelle adaptative : on veut que l'orbite la plus grande tienne
      // largement dans la vue. ref = 600 px de demi-axe.
      const maxA = 510;
      scale = Math.min(w * 0.42, h * 0.5) / maxA;
      scale = Math.max(0.45, Math.min(1.05, scale));

      // Poussière cosmique : ~80 particules selon la taille
      dust = [];
      const dustCount = 80;
      for (let i = 0; i < dustCount; i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.06,
          vy: (Math.random() - 0.5) * 0.06,
          r: 0.3 + Math.random() * 0.9,
          alpha: 0.15 + Math.random() * 0.35,
        });
      }
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    /** Position d'une planète à l'instant t (rad) */
    function planetPos(p: Planet, time: number): { x: number; y: number } {
      const angle = p.phase + time * p.speed;
      return {
        x: cx + Math.cos(angle) * p.a * scale,
        y: cy + Math.sin(angle) * p.b * scale,
      };
    }

    function drawOrbits() {
      // Anneaux orbitaux très subtils (ellipse)
      ctx!.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([2, 6]);
      for (const p of PLANETS) {
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, p.a * scale, p.b * scale, 0, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.setLineDash([]);
    }

    function drawSun(time: number) {
      const pulse = 1 + Math.sin(time * 1.2) * 0.08;
      const baseR = 14 * scale;
      const r = baseR * pulse;

      // Halo large
      const haloGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 8);
      haloGrad.addColorStop(0, 'rgba(236,72,153,0.45)');
      haloGrad.addColorStop(0.4, 'rgba(236,72,153,0.18)');
      haloGrad.addColorStop(1, 'rgba(236,72,153,0)');
      ctx!.fillStyle = haloGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 8, 0, Math.PI * 2);
      ctx!.fill();

      // Noyau dégradé
      const coreGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, '#fce7f3');
      coreGrad.addColorStop(1, '#ec4899');
      ctx!.fillStyle = coreGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawConnections(positions: { x: number; y: number; planet: Planet }[]) {
      // Lignes entre planètes proches (distance ratio < threshold)
      const threshold = 220 * scale;
      ctx!.globalCompositeOperation = 'lighter';
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < threshold) {
            const alpha = (1 - d / threshold) * 0.35;
            ctx!.strokeStyle = `rgba(236,72,153,${alpha})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawPlanet(p: Planet, pos: { x: number; y: number }, time: number) {
      const r = p.r * scale;

      // Halo
      const halo = ctx!.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 6);
      halo.addColorStop(0, p.accent ? p.color : 'rgba(255,255,255,0.6)');
      halo.addColorStop(1, p.accent ? 'rgba(236,72,153,0)' : 'rgba(255,255,255,0)');
      ctx!.globalAlpha = 0.4;
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(pos.x, pos.y, r * 6, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.globalAlpha = 1;

      // Planète
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx!.fill();

      // Pulse ring (expansion lente, opacité décroissante)
      const pulsePhase = (time * 0.5 + p.phase) % 3;
      if (pulsePhase < 2.2) {
        const ringR = r + pulsePhase * r * 2;
        const ringAlpha = (1 - pulsePhase / 2.2) * 0.4;
        ctx!.strokeStyle = p.accent ? p.color : 'rgba(255,255,255,0.8)';
        ctx!.globalAlpha = ringAlpha;
        ctx!.lineWidth = 0.8;
        ctx!.beginPath();
        ctx!.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      }

      // Lunes
      if (p.moons) {
        for (const m of p.moons) {
          const mAngle = m.phase + time * m.speed;
          const mx = pos.x + Math.cos(mAngle) * m.dist * scale;
          const my = pos.y + Math.sin(mAngle) * m.dist * scale;
          ctx!.fillStyle = 'rgba(255,255,255,0.85)';
          ctx!.beginPath();
          ctx!.arc(mx, my, m.r * scale, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawLabels(positions: { x: number; y: number; planet: Planet }[]) {
      ctx!.font = `${10 * Math.max(0.8, scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx!.textBaseline = 'middle';
      for (const { x, y, planet } of positions) {
        const r = planet.r * scale;
        const offsetX = r + 8;
        ctx!.fillStyle = planet.accent
          ? 'rgba(236,72,153,0.85)'
          : 'rgba(255,255,255,0.65)';
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

      // Clear avec léger fade pour effet trail très discret
      ctx.fillStyle = 'rgba(5, 6, 12, 0.35)';
      ctx.fillRect(0, 0, w, h);

      drawDust();
      drawOrbits();

      const positions = PLANETS.map((p) => ({ ...planetPos(p, t), planet: p }));
      drawConnections(positions);

      for (const { x, y, planet } of positions) {
        drawPlanet(planet, { x, y }, t);
      }

      drawSun(t);
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
      {/* Coordonnées mission control en coins (HTML pour être nettes,
          pas affectées par les trails canvas) */}
      <div className="absolute top-6 left-6 font-mono text-[10px] tracking-[0.18em] text-white/30 select-none">
        <div>CENTRIUM // SYSTEM 01</div>
        <div className="mt-1">ORBITS: 6 · NODES: 10 · STATE: NOMINAL</div>
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.18em] text-white/30 select-none text-right">
        <div>UPLINK · 99.97 %</div>
        <div className="mt-1">SYNCED</div>
      </div>
    </div>
  );
}
