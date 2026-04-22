'use client';

import { useEffect, useRef } from 'react';

/**
 * Réseau corporate animé en Canvas — particules + liens dynamiques, néon rose.
 * Sert de fallback tant que /videos/hero.mp4 n'est pas fourni.
 */
export function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 48;
    const MAX_DIST = 130;
    type P = { x: number; y: number; vx: number; vy: number; r: number; phase: number };
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 0.8 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
    }));

    // Paquets de données qui voyagent le long de certaines arêtes
    type Packet = { from: number; to: number; t: number; speed: number };
    const packets: Packet[] = Array.from({ length: 6 }, () => ({
      from: Math.floor(Math.random() * COUNT),
      to: Math.floor(Math.random() * COUNT),
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.005,
    }));

    let raf = 0;
    let t0 = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(32, now - t0);
      t0 = now;
      const time = now / 1000;

      ctx.clearRect(0, 0, width, height);

      // Update particles
      for (const p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      // Draw connections
      ctx.lineWidth = 0.6;
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST * MAX_DIST) {
            const alpha = (1 - Math.sqrt(d2) / MAX_DIST) * 0.55;
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, `rgba(225,29,116,${alpha})`);
            gradient.addColorStop(1, `rgba(139,92,246,${alpha * 0.7})`);
            ctx.strokeStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles (with glow)
      for (const p of particles) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + p.phase);
        ctx.shadowBlur = 14 * pulse + 6;
        ctx.shadowColor = '#e11d74';
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw travelling packets
      for (const pk of packets) {
        pk.t += pk.speed * (dt / 16);
        if (pk.t >= 1) {
          pk.from = pk.to;
          pk.to = Math.floor(Math.random() * COUNT);
          pk.t = 0;
          pk.speed = 0.003 + Math.random() * 0.005;
        }
        const a = particles[pk.from];
        const b = particles[pk.to];
        const x = a.x + (b.x - a.x) * pk.t;
        const y = a.y + (b.y - a.y) * pk.t;
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ec4899';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
