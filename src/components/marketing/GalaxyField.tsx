'use client';

import { useEffect, useRef } from 'react';

/**
 * GalaxyField v2 — fond NOIR cosmique + dynamisme renforcé.
 *
 *   - 8 ORBS colorés (rose, violet, bleu, cyan) en mini-nuages qui flowent
 *     en trajectoires de Lissajous (sin/cos avec fréquences différentes,
 *     mouvement complexe mais lisse, pas chaotique)
 *   - 200 ÉTOILES blanches/accent avec scintillation lente
 *   - 8 CONSTELLATIONS qui se TRACENT progressivement (effet stroke draw)
 *     puis fade
 *   - 1 SHOOTING STAR toutes les 3-6s (vs 6-14s avant) → bcp plus fréquent
 *   - 35 PARTICULES vives colorées qui dérivent rapidement en accent
 *   - PULSE SONAR : 2 cercles qui s'expansent depuis le centre en boucle
 *     (effet "ping" radar), rose et violet alternés
 *
 * Le fond reste noir (pas de gradient cover) pour rester cohérent avec
 * le StarField global discret. Les orbs et le pulse sonar sont des
 * accents lumineux par-dessus.
 *
 * 60 fps, respecte prefers-reduced-motion.
 */

type Star = {
  x: number; y: number; r: number;
  baseAlpha: number; twinkleSpeed: number; twinklePhase: number;
  color: string; bright: boolean;
};

type Orb = {
  /** Centre nominal (% écran) */
  cx: number; cy: number;
  /** Amplitude de mouvement (% écran) */
  ax: number; ay: number;
  /** Fréquences x/y différentes pour Lissajous */
  fx: number; fy: number;
  /** Phase */
  px: number; py: number;
  /** Rayon en px */
  r: number;
  /** Couleur rgba sans alpha */
  color: string;
  alpha: number;
};

type Constellation = {
  starIndices: number[];
  /** Phase de cycle vie : 0 = invisible, 0.4 = tracé en cours, 0.6-0.8 = full,
   *  0.9 = fade out, puis cache pendant interval */
  cycleStart: number;
  cycleDuration: number;
  color: string;
};

type Shooting = {
  x: number; y: number; vx: number; vy: number;
  ttl: number; maxTtl: number;
};

type LiveParticle = {
  x: number; y: number; vx: number; vy: number; r: number;
  color: string; alpha: number; twinkle: number;
};

const ORBS: Orb[] = [
  { cx: 0.18, cy: 0.30, ax: 0.06, ay: 0.05, fx: 0.07, fy: 0.05, px: 0, py: 1.2,
    r: 220, color: '236, 72, 153', alpha: 0.22 }, // rose
  { cx: 0.78, cy: 0.22, ax: 0.07, ay: 0.06, fx: 0.06, fy: 0.08, px: 1, py: 0,
    r: 200, color: '168, 85, 247', alpha: 0.20 }, // violet
  { cx: 0.50, cy: 0.70, ax: 0.10, ay: 0.04, fx: 0.05, fy: 0.07, px: 2, py: 0.5,
    r: 250, color: '59, 130, 246', alpha: 0.18 }, // bleu
  { cx: 0.85, cy: 0.78, ax: 0.05, ay: 0.05, fx: 0.08, fy: 0.06, px: 0.5, py: 1.8,
    r: 180, color: '34, 211, 238', alpha: 0.15 }, // cyan
  { cx: 0.15, cy: 0.75, ax: 0.06, ay: 0.07, fx: 0.07, fy: 0.05, px: 1.4, py: 0.8,
    r: 200, color: '99, 102, 241', alpha: 0.18 }, // indigo
  { cx: 0.62, cy: 0.18, ax: 0.05, ay: 0.06, fx: 0.06, fy: 0.07, px: 2.5, py: 1.3,
    r: 170, color: '236, 72, 153', alpha: 0.16 }, // rose 2
  { cx: 0.32, cy: 0.50, ax: 0.08, ay: 0.05, fx: 0.05, fy: 0.06, px: 0.3, py: 2.2,
    r: 190, color: '168, 85, 247', alpha: 0.15 }, // violet 2
  { cx: 0.75, cy: 0.50, ax: 0.06, ay: 0.07, fx: 0.07, fy: 0.05, px: 1.8, py: 0.4,
    r: 210, color: '59, 130, 246', alpha: 0.14 }, // bleu 2
];

const STAR_COUNT = 200;
const LIVE_PARTICLE_COUNT = 35;
const CONSTELLATION_COUNT = 8;

function pickStarColor(): { color: string; bright: boolean } {
  const r = Math.random();
  if (r < 0.70) return { color: '255, 255, 255', bright: r < 0.07 };
  if (r < 0.82) return { color: '236, 72, 153', bright: false };
  if (r < 0.91) return { color: '168, 85, 247', bright: false };
  if (r < 0.97) return { color: '59, 130, 246', bright: false };
  return { color: '34, 211, 238', bright: false };
}

function pickLiveColor(): string {
  const r = Math.random();
  if (r < 0.35) return '236, 72, 153';
  if (r < 0.65) return '168, 85, 247';
  if (r < 0.85) return '59, 130, 246';
  return '34, 211, 238';
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
    let constellations: Constellation[] = [];
    let shootings: Shooting[] = [];
    let live: LiveParticle[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let lastTs = performance.now();
    let lastShootingSpawn = 0;
    let startTs = 0;

    function rebuild() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const { color, bright } = pickStarColor();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? 1.2 + Math.random() * 1.0 : 0.3 + Math.random() * 0.9,
          baseAlpha: bright ? 0.7 + Math.random() * 0.25 : 0.25 + Math.random() * 0.45,
          twinkleSpeed: 0.25 + Math.random() * 0.8,
          twinklePhase: Math.random() * Math.PI * 2,
          color, bright,
        });
      }

      // Constellations (chaque constellation = 3-5 étoiles proches)
      constellations = [];
      const used = new Set<number>();
      for (let i = 0; i < CONSTELLATION_COUNT; i++) {
        let pivotIdx = -1;
        for (let tries = 0; tries < 30; tries++) {
          const c = Math.floor(Math.random() * stars.length);
          if (!used.has(c)) { pivotIdx = c; break; }
        }
        if (pivotIdx === -1) continue;
        const pivot = stars[pivotIdx];
        const candidates = stars
          .map((s, idx) => ({ idx, dist: (s.x - pivot.x) ** 2 + (s.y - pivot.y) ** 2 }))
          .filter((c) => c.idx !== pivotIdx && !used.has(c.idx))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2 + Math.floor(Math.random() * 3));
        const group = [pivotIdx, ...candidates.map((c) => c.idx)];
        group.forEach((idx) => used.add(idx));
        constellations.push({
          starIndices: group,
          cycleStart: -Math.random() * 8000, // décalage initial
          cycleDuration: 7000 + Math.random() * 4000,
          color: Math.random() < 0.5 ? '168, 85, 247' : '236, 72, 153',
        });
      }

      // Particules vives (accent visible)
      live = [];
      for (let i = 0; i < LIVE_PARTICLE_COUNT; i++) {
        live.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 0.6 + Math.random() * 1.6,
          color: pickLiveColor(),
          alpha: 0.45 + Math.random() * 0.45,
          twinkle: Math.random() * Math.PI * 2,
        });
      }

      shootings = [];
      lastShootingSpawn = performance.now();
      startTs = performance.now();
    }

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    function maybeSpawnShootingStar(now: number) {
      if (reduce) return;
      if (shootings.length >= 4) return;
      // Plus fréquent : 3-6s
      if (now - lastShootingSpawn < 3000 + Math.random() * 3000) return;
      lastShootingSpawn = now;

      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? -50 : w + 50;
      const y = Math.random() * (h * 0.85);
      const angle = fromLeft
        ? Math.PI / 6 + Math.random() * 0.35
        : Math.PI - Math.PI / 6 - Math.random() * 0.35;
      const speed = 0.9 + Math.random() * 0.7;
      shootings.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl: 4500, maxTtl: 4500,
      });
    }

    function drawOrbs(t: number) {
      ctx!.globalCompositeOperation = 'lighter';
      for (const o of ORBS) {
        const x = (o.cx + Math.sin(t * o.fx + o.px) * o.ax) * w;
        const y = (o.cy + Math.cos(t * o.fy + o.py) * o.ay) * h;
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, o.r);
        grad.addColorStop(0, `rgba(${o.color},${o.alpha})`);
        grad.addColorStop(1, `rgba(${o.color},0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(x - o.r, y - o.r, o.r * 2, o.r * 2);
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawSonarPulse(now: number) {
      // 2 pulses qui s'expansent depuis le centre, décalés de 50 %
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(w, h) * 0.6;
      const period = 6500;
      for (let i = 0; i < 2; i++) {
        const phase = (((now + i * period / 2) % period) / period);
        const r = phase * maxR;
        const alpha = (1 - phase) * 0.18;
        if (alpha <= 0.01) continue;
        ctx!.strokeStyle = i === 0
          ? `rgba(236,72,153,${alpha})`
          : `rgba(168,85,247,${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function drawStars(ts: number) {
      ctx!.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const a = reduce
          ? s.baseAlpha
          : Math.max(0.08, s.baseAlpha * (0.45 + 0.55 * Math.sin(ts * s.twinkleSpeed + s.twinklePhase)));
        if (s.bright) {
          const haloR = s.r * 5;
          const halo = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
          halo.addColorStop(0, `rgba(${s.color},${a * 0.6})`);
          halo.addColorStop(1, `rgba(${s.color},0)`);
          ctx!.fillStyle = halo;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, haloR, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `rgba(${s.color},${a})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawConstellations(now: number) {
      ctx!.globalCompositeOperation = 'lighter';
      for (const c of constellations) {
        const elapsed = now - c.cycleStart;
        if (elapsed < 0) continue;
        const phase = (elapsed % c.cycleDuration) / c.cycleDuration;
        // 0 → 0.25 = tracé progressif, 0.25 → 0.6 = full, 0.6 → 0.85 = fade out
        let drawProgress = 0;
        let alpha = 0;
        if (phase < 0.25) {
          drawProgress = phase / 0.25;
          alpha = drawProgress * 0.5;
        } else if (phase < 0.6) {
          drawProgress = 1;
          alpha = 0.5;
        } else if (phase < 0.85) {
          drawProgress = 1;
          alpha = 0.5 * (1 - (phase - 0.6) / 0.25);
        } else {
          continue;
        }

        ctx!.strokeStyle = `rgba(${c.color},${alpha})`;
        ctx!.lineWidth = 0.7;
        ctx!.setLineDash([2, 5]);

        // Draw progressif : on calcule la longueur totale et on n'en trace qu'une portion
        const points: { x: number; y: number }[] = c.starIndices.map((i) => stars[i]);
        const segLengths: number[] = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
          const dx = points[i + 1].x - points[i].x;
          const dy = points[i + 1].y - points[i].y;
          const l = Math.sqrt(dx * dx + dy * dy);
          segLengths.push(l);
          total += l;
        }
        const target = total * drawProgress;
        ctx!.beginPath();
        let drawn = 0;
        ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const segL = segLengths[i];
          if (drawn + segL <= target) {
            ctx!.lineTo(points[i + 1].x, points[i + 1].y);
            drawn += segL;
          } else {
            const remain = target - drawn;
            const ratio = remain / segL;
            const ex = points[i].x + (points[i + 1].x - points[i].x) * ratio;
            const ey = points[i].y + (points[i + 1].y - points[i].y) * ratio;
            ctx!.lineTo(ex, ey);
            break;
          }
        }
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function updateAndDrawLiveParticles(dt: number, ts: number) {
      ctx!.globalCompositeOperation = 'lighter';
      for (const p of live) {
        if (!reduce) {
          // Petit steering pour rendre le mouvement organique
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vy += (Math.random() - 0.5) * 0.04;
          const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (sp > 1) { p.vx = p.vx / sp; p.vy = p.vy / sp; }
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -5) p.x = w + 5;
          else if (p.x > w + 5) p.x = -5;
          if (p.y < -5) p.y = h + 5;
          else if (p.y > h + 5) p.y = -5;
        }
        const a = p.alpha * (0.6 + 0.4 * Math.sin(ts * 1.6 + p.twinkle));
        const haloR = p.r * 4;
        const halo = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        halo.addColorStop(0, `rgba(${p.color},${a * 0.55})`);
        halo.addColorStop(1, `rgba(${p.color},0)`);
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, haloR, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = `rgba(${p.color},${a})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      void dt;
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawShootings(dt: number) {
      ctx!.globalCompositeOperation = 'lighter';
      for (let i = shootings.length - 1; i >= 0; i--) {
        const sh = shootings[i];
        if (!reduce) {
          sh.x += sh.vx * dt * 0.7;
          sh.y += sh.vy * dt * 0.7;
          sh.ttl -= dt;
        }
        if (sh.ttl <= 0 || sh.x < -200 || sh.x > w + 200 || sh.y < -200 || sh.y > h + 200) {
          shootings.splice(i, 1);
          continue;
        }
        const trailLen = 90;
        const tailX = sh.x - sh.vx * trailLen;
        const tailY = sh.y - sh.vy * trailLen;
        const life = Math.min(1, sh.ttl / sh.maxTtl);
        const lineGrad = ctx!.createLinearGradient(sh.x, sh.y, tailX, tailY);
        lineGrad.addColorStop(0, `rgba(255,255,255,${life})`);
        lineGrad.addColorStop(0.4, `rgba(236,72,153,${life * 0.7})`);
        lineGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx!.strokeStyle = lineGrad;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(sh.x, sh.y);
        ctx!.lineTo(tailX, tailY);
        ctx!.stroke();
        const headGrad = ctx!.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 9);
        headGrad.addColorStop(0, `rgba(255,255,255,${life * 0.95})`);
        headGrad.addColorStop(1, 'rgba(236,72,153,0)');
        ctx!.fillStyle = headGrad;
        ctx!.beginPath();
        ctx!.arc(sh.x, sh.y, 9, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function step(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(50, now - lastTs);
      lastTs = now;
      const t = (now - startTs) * 0.001;
      const ts = now * 0.001;

      // CLEAR TOTAL — pas de trail global (le fond reste noir net)
      ctx.clearRect(0, 0, w, h);

      drawOrbs(t);
      drawSonarPulse(now);
      drawStars(ts);
      drawConstellations(now);
      updateAndDrawLiveParticles(dt, ts);
      maybeSpawnShootingStar(now);
      drawShootings(dt);

      if (!reduce) raf = requestAnimationFrame(step);
    }

    if (reduce) requestAnimationFrame(step);
    else raf = requestAnimationFrame(step);

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
