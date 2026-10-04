'use client';

import { useEffect, useState } from 'react';

/**
 * Intro cinématographique au premier chargement de la page d'accueil :
 *
 *   1. (0 → 250 ms) Flash blanc bref — type tube cathodique qui s'allume
 *   2. (250 → 600 ms) Scan lines horizontales descendent
 *   3. (600 → 1400 ms) Console BIOS qui apparaît ligne par ligne en
 *      texte mono (CENTRIUM v1.0 / INITIALIZING / READY)
 *   4. (1400 → 2200 ms) ZOOM IN spectaculaire dans l'écran (scale 1 → 7
 *      avec fade out + filter blur croissant) → on arrive sur la home
 *   5. Disparaît
 *
 * Affiché UNIQUEMENT au premier mount de la session (localStorage flag).
 * Peut être skippé en cliquant n'importe où.
 * Respecte prefers-reduced-motion (intro raccourcie à un fade simple).
 */

const SESSION_KEY = 'centrium-boot-shown';

const BIOS_LINES = [
  { delay: 700,  text: 'CENTRIUM v1.0 // BOOT' },
  { delay: 820,  text: '> INITIALIZING CORE...' },
  { delay: 920,  text: '> LOADING MODULES........... [OK]' },
  { delay: 1020, text: '> NETWORK SYNC.............. [OK]' },
  { delay: 1120, text: '> AUTH GATEWAY.............. [OK]' },
  { delay: 1220, text: '> READY' },
];

type Phase = 'flash' | 'scan' | 'bios' | 'zoom' | 'done';

export function BootIntro() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>('flash');
  const [linesShown, setLinesShown] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === '1';
    if (alreadyShown) return;

    setShow(true);
    if (reduce) {
      // En reduce-motion : flash bref puis on dégage en 400 ms
      const t = setTimeout(() => {
        setPhase('done');
        setShow(false);
        window.sessionStorage.setItem(SESSION_KEY, '1');
      }, 400);
      return () => clearTimeout(t);
    }

    const timers: number[] = [];

    timers.push(window.setTimeout(() => setPhase('scan'), 250));
    timers.push(window.setTimeout(() => setPhase('bios'), 600));

    // Apparition des lignes BIOS une par une
    for (let i = 0; i < BIOS_LINES.length; i++) {
      timers.push(window.setTimeout(() => setLinesShown(i + 1), BIOS_LINES[i].delay));
    }

    timers.push(window.setTimeout(() => setPhase('zoom'), 1400));
    timers.push(
      window.setTimeout(() => {
        setPhase('done');
        setShow(false);
        window.sessionStorage.setItem(SESSION_KEY, '1');
      }, 2300),
    );

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  // Skip on click anywhere
  function skip() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    }
    setPhase('done');
    setShow(false);
  }

  if (!show) return null;

  const zooming = phase === 'zoom';
  const showFlash = phase === 'flash';
  const showScan = phase === 'scan' || phase === 'bios' || phase === 'zoom';
  const showBios = phase === 'bios' || phase === 'zoom';

  return (
    <div
      role="dialog"
      aria-label="Centrium boot screen"
      onClick={skip}
      className="fixed inset-0 z-[200] bg-foreground cursor-pointer overflow-hidden"
      style={{
        transition: 'opacity 800ms ease-out, filter 800ms ease-out',
        opacity: zooming ? 0 : 1,
        filter: zooming ? 'blur(14px)' : 'blur(0)',
      }}
    >
      {/* Conteneur "écran" qui zoom in */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transition: 'transform 900ms cubic-bezier(0.85, 0, 0.6, 1)',
          transform: zooming ? 'scale(7)' : 'scale(1)',
          transformOrigin: '50% 50%',
        }}
      >
        {/* Cadre style écran CRT */}
        <div className="relative w-full max-w-3xl aspect-[16/10] mx-6 rounded-[24px] border border-border bg-foreground overflow-hidden boot-screen">
          {/* Flash blanc bref */}
          {showFlash && (
            <div
              aria-hidden
              className="absolute inset-0 bg-white"
              style={{
                animation: 'boot-flash 250ms ease-out forwards',
              }}
            />
          )}

          {/* Gradient cosmique de fond une fois "allumé" */}
          {showScan && (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(236,72,153,0.18), transparent 65%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(168,85,247,0.12), transparent 70%)',
              }}
            />
          )}

          {/* Scan lines horizontales */}
          {showScan && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
              }}
            />
          )}

          {/* Scan beam qui descend */}
          {phase === 'scan' && (
            <div
              aria-hidden
              className="absolute left-0 right-0 h-24 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, transparent, rgba(236,72,153,0.6), transparent)',
                animation: 'boot-scan 350ms ease-out forwards',
              }}
            />
          )}

          {/* Contenu BIOS */}
          {showBios && (
            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-center font-mono text-[12px] md:text-[14px] text-primary">
              {/* En-tête CENTRIUM */}
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full bg-primary"
                  style={{ animation: 'boot-blink 0.9s steps(2) infinite' }}
                />
                <span className="text-foreground tracking-[0.2em] text-[11px]">
                  CENTRIUM // QUADCORE
                </span>
              </div>

              <div className="space-y-1.5 text-muted-foreground">
                {BIOS_LINES.slice(0, linesShown).map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.text.endsWith('READY')
                        ? 'text-success font-semibold'
                        : ''
                    }
                  >
                    {l.text}
                  </div>
                ))}
                {/* Curseur blink */}
                {linesShown < BIOS_LINES.length && (
                  <span
                    className="inline-block w-2 h-3 bg-primary align-middle"
                    style={{ animation: 'boot-blink 0.6s steps(2) infinite' }}
                  />
                )}
              </div>

              {/* Coin coordonnées style mission control */}
              <div className="absolute bottom-4 right-6 text-[10px] text-muted-foreground tracking-[0.18em]">
                SKIP — CLICK ANYWHERE
              </div>
            </div>
          )}

          {/* Lueur intérieure périmétrique pour effet "tube cathodique chaud" */}
          {showScan && (
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 80px rgba(236,72,153,0.25)',
              }}
            />
          )}
        </div>

        {/* Halo extérieur du moniteur (effet lumineux) */}
        <div
          aria-hidden
          className="absolute inset-x-0 mx-auto h-32 w-[80%] max-w-3xl rounded-full pointer-events-none"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            background:
              'radial-gradient(ellipse at center, rgba(236,72,153,0.18), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes boot-flash {
          0%   { opacity: 0; }
          30%  { opacity: 0.95; }
          100% { opacity: 0; }
        }
        @keyframes boot-scan {
          0%   { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
        @keyframes boot-blink {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .boot-screen {
          box-shadow:
            0 0 80px -10px rgba(236, 72, 153, 0.5),
            0 0 200px -20px rgba(168, 85, 247, 0.35);
        }
      `}</style>
    </div>
  );
}
