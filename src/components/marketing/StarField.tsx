'use client';

import { useEffect, useRef } from 'react';

/**
 * Fond étoilé minimaliste — fond noir + 110 petites étoiles blanches
 * discrètes qui scintillent doucement. Aucun gradient coloré, aucune
 * comète, aucune nébuleuse. Sobre, premium, pas voyant.
 *
 * À monter en position fixed, z-index 0, derrière tout le contenu.
 * Léger : ~110 ops par frame. Respecte prefers-reduced-motion.
 */
type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
};

const STAR_COUNT = 110;

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
          r: Math.random() * 1.0 + 0.4,
          baseAlpha: 0.25 + Math.random() * 0.45,
          twinkleSpeed: 0.3 + Math.random() * 1.2,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    rebuild();
    const onResize = () => rebuild();
    window.addEventListener('resize', onResize);

    function frame(now: number) {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, w, h);

      const ts = now * 0.001;
      for (const s of stars) {
        const a = reduce
          ? s.baseAlpha
          : Math.max(
              0.05,
              s.baseAlpha * (0.5 + 0.5 * Math.sin(ts * s.twinkleSpeed + s.twinklePhase)),
            );
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduce) raf = requestAnimationFrame(frame);
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
        background: '#05060c',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
