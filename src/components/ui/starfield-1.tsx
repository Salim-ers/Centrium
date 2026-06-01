'use client';

import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Starfield "warp" — Canvas 2D, étoiles qui foncent vers le viewer
 * (effet Star Trek hyperspace). Composant fourni par le brief 21st.dev,
 * adapté en TypeScript strict (le projet est en TS strict, le code
 * original utilisait PropTypes uniquement).
 */

type StarfieldProps = {
  starColor?: string;
  bgColor?: string;
  mouseAdjust?: boolean;
  tiltAdjust?: boolean;
  easing?: number;
  clickToWarp?: boolean;
  hyperspace?: boolean;
  warpFactor?: number;
  opacity?: number;
  speed?: number;
  quantity?: number;
};

// 0: x, 1: y, 2: z, 3: screenX, 4: screenY, 5: prevScreenX, 6: prevScreenY, 7: shouldDraw
type Star = [number, number, number, number, number, number, number, boolean];

type SceneData = {
  w: number;
  h: number;
  ctx: CanvasRenderingContext2D | null;
  cw: number;
  ch: number;
  x: number;
  y: number;
  z: number;
  star: { colorRatio: number; arr: Star[] };
  prevTime: number;
};

// Fast UUID generator, RFC4122 version 4 compliant
const generateUUID = (): string => {
  const lut: string[] = Array.from({ length: 256 }, (_, i) =>
    (i < 16 ? '0' : '') + i.toString(16),
  );
  const d0 = (Math.random() * 0xffffffff) | 0;
  const d1 = (Math.random() * 0xffffffff) | 0;
  const d2 = (Math.random() * 0xffffffff) | 0;
  const d3 = (Math.random() * 0xffffffff) | 0;
  return (
    lut[d0 & 0xff] + lut[(d0 >> 8) & 0xff] + lut[(d0 >> 16) & 0xff] + lut[(d0 >> 24) & 0xff] + '-' +
    lut[d1 & 0xff] + lut[(d1 >> 8) & 0xff] + '-' + lut[((d1 >> 16) & 0x0f) | 0x40] + lut[(d1 >> 24) & 0xff] + '-' +
    lut[(d2 & 0x3f) | 0x80] + lut[(d2 >> 8) & 0xff] + '-' + lut[(d2 >> 16) & 0xff] + lut[(d2 >> 24) & 0xff] +
    lut[d3 & 0xff] + lut[(d3 >> 8) & 0xff] + lut[(d3 >> 16) & 0xff] + lut[(d3 >> 24) & 0xff]
  );
};

const Starfield = ({
  starColor = 'rgba(255,255,255,1)',
  bgColor = 'rgba(0,0,0,1)',
  mouseAdjust = false,
  tiltAdjust = false,
  easing = 1,
  clickToWarp = false,
  hyperspace = false,
  warpFactor = 10,
  opacity = 0.1,
  speed = 1,
  quantity = 512,
}: StarfieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState({
    init: true,
    canvas: true,
    start: true,
    stop: false,
    destroy: false,
    reset: false,
    uid: generateUUID(),
    running: false,
  });
  const mouse = useRef({ x: 0, y: 0 });
  const cursor = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const sd = useRef<SceneData>({
    w: 0,
    h: 0,
    ctx: null,
    cw: 0,
    ch: 0,
    x: 0,
    y: 0,
    z: 0,
    star: { colorRatio: 0, arr: [] },
    prevTime: 0,
  });

  const colors = {
    fill: hyperspace ? `rgba(0,0,0,${opacity})` : bgColor,
  };

  const compSpeed = hyperspace ? speed * warpFactor : speed;
  const ratio = quantity / 2;

  const measureViewport = () => {
    const el = canvasRef.current?.parentElement;
    if (el) {
      sd.current.w = el.clientWidth;
      sd.current.h = el.clientHeight;
      sd.current.x = Math.round(sd.current.w / 2);
      sd.current.y = Math.round(sd.current.h / 2);
      sd.current.z = (sd.current.w + sd.current.h) / 2;
      sd.current.star.colorRatio = 1 / sd.current.z;

      if (cursor.current.x === 0 || cursor.current.y === 0) {
        cursor.current.x = sd.current.x;
        cursor.current.y = sd.current.y;
      }
      if (mouse.current.x === 0 || mouse.current.y === 0) {
        mouse.current.x = cursor.current.x - sd.current.x;
        mouse.current.y = cursor.current.y - sd.current.y;
      }
    }
  };

  const setupCanvas = () => {
    measureViewport();
    const canvas = canvasRef.current;
    if (canvas) {
      sd.current.ctx = canvas.getContext('2d');
      canvas.width = sd.current.w;
      canvas.height = sd.current.h;
      if (sd.current.ctx) {
        sd.current.ctx.fillStyle = colors.fill;
        sd.current.ctx.strokeStyle = starColor;
      }
    }
  };

  const bigBang = () => {
    if (sd.current.star.arr.length !== quantity) {
      sd.current.star.arr = Array.from({ length: quantity }, (): Star => [
        Math.random() * sd.current.w * 2 - sd.current.x * 2,
        Math.random() * sd.current.h * 2 - sd.current.y * 2,
        Math.round(Math.random() * sd.current.z),
        0,
        0,
        0,
        0,
        true,
      ]);
    }
  };

  const resize = () => {
    const oldStar = { arr: sd.current.star.arr.map((s) => [...s] as Star) };
    measureViewport();
    if (!sd.current.ctx) return;
    sd.current.cw = sd.current.ctx.canvas.width;
    sd.current.ch = sd.current.ctx.canvas.height;

    if (sd.current.cw !== sd.current.w || sd.current.ch !== sd.current.h) {
      sd.current.x = Math.round(sd.current.w / 2);
      sd.current.y = Math.round(sd.current.h / 2);
      sd.current.z = (sd.current.w + sd.current.h) / 2;
      sd.current.star.colorRatio = 1 / sd.current.z;

      const rw = sd.current.w / sd.current.cw;
      const rh = sd.current.h / sd.current.ch;

      sd.current.ctx.canvas.width = sd.current.w;
      sd.current.ctx.canvas.height = sd.current.h;

      if (!sd.current.star.arr.length) {
        bigBang();
      } else {
        sd.current.star.arr = sd.current.star.arr.map((star, i): Star => {
          const newStar = [...star] as Star;
          newStar[0] = (oldStar.arr[i]?.[0] ?? 0) * rw;
          newStar[1] = (oldStar.arr[i]?.[1] ?? 0) * rh;
          newStar[3] = sd.current.x + (newStar[0] / newStar[2]) * ratio;
          newStar[4] = sd.current.y + (newStar[1] / newStar[2]) * ratio;
          return newStar;
        });
      }

      sd.current.ctx.fillStyle = colors.fill;
      sd.current.ctx.strokeStyle = starColor;
    }
  };

  const update = () => {
    mouse.current.x = (cursor.current.x - sd.current.x) / easing;
    mouse.current.y = (cursor.current.y - sd.current.y) / easing;

    if (sd.current.star.arr.length > 0) {
      sd.current.star.arr = sd.current.star.arr.map((star): Star => {
        const newStar = [...star] as Star;
        newStar[7] = true;
        newStar[5] = newStar[3];
        newStar[6] = newStar[4];
        newStar[0] += mouse.current.x >> 4;

        if (newStar[0] > sd.current.x << 1) {
          newStar[0] -= sd.current.w << 1;
          newStar[7] = false;
        }
        if (newStar[0] < -sd.current.x << 1) {
          newStar[0] += sd.current.w << 1;
          newStar[7] = false;
        }

        newStar[1] += mouse.current.y >> 4;
        if (newStar[1] > sd.current.y << 1) {
          newStar[1] -= sd.current.h << 1;
          newStar[7] = false;
        }
        if (newStar[1] < -sd.current.y << 1) {
          newStar[1] += sd.current.h << 1;
          newStar[7] = false;
        }

        newStar[2] -= compSpeed;
        if (newStar[2] > sd.current.z) {
          newStar[2] -= sd.current.z;
          newStar[7] = false;
        }
        if (newStar[2] < 0) {
          newStar[2] += sd.current.z;
          newStar[7] = false;
        }

        newStar[3] = sd.current.x + (newStar[0] / newStar[2]) * ratio;
        newStar[4] = sd.current.y + (newStar[1] / newStar[2]) * ratio;
        return newStar;
      });
    }
  };

  const draw = () => {
    const ctx = sd.current.ctx;
    if (!ctx) return;
    ctx.fillStyle = colors.fill;
    ctx.fillRect(0, 0, sd.current.w, sd.current.h);
    ctx.strokeStyle = starColor;

    sd.current.star.arr.forEach((star) => {
      if (
        star[5] > 0 &&
        star[5] < sd.current.w &&
        star[6] > 0 &&
        star[6] < sd.current.h &&
        star[7]
      ) {
        ctx.lineWidth = (1 - sd.current.star.colorRatio * star[2]) * 2;
        ctx.beginPath();
        ctx.moveTo(star[5], star[6]);
        ctx.lineTo(star[3], star[4]);
        ctx.stroke();
        ctx.closePath();
      }
    });
  };

  const animate = () => {
    if (sd.current.prevTime === 0) {
      sd.current.prevTime = Date.now();
    }
    resize();
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const init = () => {
    measureViewport();
    setupCanvas();
    bigBang();
    animate();
    setState((prev) => ({ ...prev, running: true }));
  };

  const stop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      setState((prev) => ({ ...prev, running: false }));
    }
  };

  const reset = () => {
    stop();
    sd.current.star.arr = [];
    init();
  };

  const destroy = () => {
    stop();
    sd.current = {
      w: 0,
      h: 0,
      ctx: null,
      cw: 0,
      ch: 0,
      x: 0,
      y: 0,
      z: 0,
      star: { colorRatio: 0, arr: [] },
      prevTime: 0,
    };
  };

  const mouseHandler = (event: MouseEvent) => {
    const el = canvasRef.current?.parentElement;
    if (el) {
      cursor.current.x = event.pageX || event.clientX + el.scrollLeft - el.clientLeft;
      cursor.current.y = event.pageY || event.clientY + el.scrollTop - el.clientTop;
    }
  };

  const tiltHandler = (event: DeviceOrientationEvent) => {
    if (event.beta !== null && event.gamma !== null) {
      const x = event.gamma;
      const y = event.beta;
      cursor.current.x = sd.current.w / 2 + x * 5;
      cursor.current.y = sd.current.h / 2 + y * 5;
    }
  };

  const clickHandler = (event: MouseEvent) => {
    if (event.type === 'mousedown') {
      setState((prev) => ({ ...prev, hyperspace: true }));
    }
    if (event.type === 'mouseup') {
      setState((prev) => ({ ...prev, hyperspace: false }));
    }
  };

  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (mouseAdjust && el) {
      el.addEventListener('mousemove', mouseHandler);
    }
    if (tiltAdjust) {
      window.addEventListener('deviceorientation', tiltHandler);
    }
    if (clickToWarp && el) {
      el.addEventListener('mousedown', clickHandler);
      el.addEventListener('mouseup', clickHandler);
    }

    // Au resize (incluant le zoom navigateur Ctrl+/-) ou au changement
    // de visualViewport (pinch zoom mobile), on remet à plat les
    // dimensions du canvas pour qu'il suive le viewport actuel.
    // Sinon le buffer interne reste figé et l'image part "en cacahuète".
    let resizeRaf = 0;
    const onResize = () => {
      // Debounce léger via rAF pour ne pas reflow à chaque event
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        measureViewport();
        canvas.width = sd.current.w;
        canvas.height = sd.current.h;
        sd.current.cw = canvas.width;
        sd.current.ch = canvas.height;
        if (sd.current.ctx) {
          sd.current.ctx.fillStyle = colors.fill;
          sd.current.ctx.strokeStyle = starColor;
        }
        // Recentre le cursor sur le nouveau centre
        cursor.current.x = sd.current.x;
        cursor.current.y = sd.current.y;
        // Re-bigBang : redistribue les étoiles selon les nouvelles dimensions
        sd.current.star.arr = [];
        bigBang();
      });
    };

    window.addEventListener('resize', onResize, { passive: true });
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
    }

    init();

    return () => {
      destroy();
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onResize);
      if (vv) {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      }
      if (mouseAdjust && el) {
        el.removeEventListener('mousemove', mouseHandler);
      }
      if (tiltAdjust) {
        window.removeEventListener('deviceorientation', tiltHandler);
      }
      if (clickToWarp && el) {
        el.removeEventListener('mousedown', clickHandler);
        el.removeEventListener('mouseup', clickHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouseAdjust, tiltAdjust, clickToWarp]);

  useEffect(() => {
    if (state.reset) {
      reset();
      setState((prev) => ({ ...prev, reset: false }));
    }
    if (state.stop) {
      stop();
      setState((prev) => ({ ...prev, stop: false }));
    }
    if (state.start) {
      init();
      setState((prev) => ({ ...prev, start: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reset, state.stop, state.start]);

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

Starfield.propTypes = {
  starColor: PropTypes.string,
  bgColor: PropTypes.string,
  mouseAdjust: PropTypes.bool,
  tiltAdjust: PropTypes.bool,
  easing: PropTypes.number,
  clickToWarp: PropTypes.bool,
  hyperspace: PropTypes.bool,
  warpFactor: PropTypes.number,
  opacity: PropTypes.number,
  speed: PropTypes.number,
  quantity: PropTypes.number,
};

export { Starfield };
