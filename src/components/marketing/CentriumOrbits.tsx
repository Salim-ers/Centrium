'use client';

/**
 * Visuel signature du Hero — "système Centrium".
 *
 * Métaphore : Centrium est le **centre** qui orchestre. Tout (consultants,
 * missions, CV, factures) gravite autour. Visualisé en système solaire
 * stylisé / mission control :
 *
 *   - 4 anneaux orbitaux concentriques (SVG circles, stroke white/12 %)
 *   - Sur chaque anneau, 2-3 "satellites" (cercles remplis) qui tournent
 *     à vitesses différentes — informatique + espace
 *   - Quelques arcs lumineux qui pulsent → data en transit
 *   - Au centre, un noyau "C" lumineux qui pulse doucement
 *   - Tout en blanc / argenté avec accents rose magenta très sobres
 *
 * Implémentation : SVG 100% (~5 ko parsed). Pas de Canvas, pas de WebGL.
 * Animations CSS keyframes pour les rotations + pulses. Respecte
 * prefers-reduced-motion.
 *
 * Composition : pensée pour rester lisible derrière le texte du hero
 * (transparence forte sur les éléments, vignette douce pour préserver
 * la lisibilité au centre).
 */

const ORBITS = [
  { r: 110, speed: 38, dir: 1 },
  { r: 175, speed: 52, dir: -1 },
  { r: 245, speed: 70, dir: 1 },
  { r: 320, speed: 92, dir: -1 },
];

const SATELLITES = [
  { orbit: 0, angle: 0, size: 3.5, accent: false },
  { orbit: 0, angle: 200, size: 2.5, accent: false },
  { orbit: 1, angle: 60, size: 4, accent: true },
  { orbit: 1, angle: 220, size: 3, accent: false },
  { orbit: 2, angle: 30, size: 3, accent: false },
  { orbit: 2, angle: 150, size: 3.5, accent: false },
  { orbit: 2, angle: 280, size: 2.5, accent: true },
  { orbit: 3, angle: 20, size: 4.5, accent: false },
  { orbit: 3, angle: 110, size: 2.5, accent: false },
  { orbit: 3, angle: 200, size: 3, accent: false },
  { orbit: 3, angle: 300, size: 3.5, accent: true },
];

export function CentriumOrbits({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* Vignette très douce pour préserver lisibilité texte */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 45% at 50% 50%, transparent 35%, rgba(5,6,12,0.55) 75%)',
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="-360 -360 720 720"
          className="w-[min(95vw,820px)] h-[min(95vw,820px)] max-h-[90vh] centrium-orbits-svg"
        >
          <defs>
            <radialGradient id="cent-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#fce7f3" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#ec4899" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cent-halo" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cent-arc" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id="cent-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          {/* === Anneaux orbitaux (cercles statiques très subtils) === */}
          {ORBITS.map((o, i) => (
            <g key={`orbit-${i}`}>
              <circle
                cx="0"
                cy="0"
                r={o.r}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.8"
                strokeDasharray={i % 2 === 0 ? '0' : '2 4'}
              />
              {/* Tick lumineux sur chaque anneau qui tourne avec lui — petit segment lumineux */}
              <g
                className={`cent-orbit-rotate cent-orbit-${i}`}
                style={{
                  animationDuration: `${o.speed}s`,
                  animationDirection: o.dir === 1 ? 'normal' : 'reverse',
                }}
              >
                <path
                  d={`M ${o.r} 0 A ${o.r} ${o.r} 0 0 1 ${o.r * Math.cos(0.45)} ${o.r * Math.sin(0.45)}`}
                  fill="none"
                  stroke="url(#cent-arc)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          ))}

          {/* === Satellites (qui orbitent) === */}
          {SATELLITES.map((sat, i) => {
            const orbit = ORBITS[sat.orbit];
            const startRad = (sat.angle * Math.PI) / 180;
            return (
              <g
                key={`sat-${i}`}
                className={`cent-orbit-rotate cent-orbit-${sat.orbit}`}
                style={{
                  animationDuration: `${orbit.speed}s`,
                  animationDirection: orbit.dir === 1 ? 'normal' : 'reverse',
                  transformOrigin: '0 0',
                }}
              >
                <g
                  transform={`translate(${orbit.r * Math.cos(startRad)} ${orbit.r * Math.sin(startRad)})`}
                >
                  {/* halo discret */}
                  <circle
                    r={sat.size * 3}
                    fill={sat.accent ? '#ec4899' : '#ffffff'}
                    opacity={sat.accent ? 0.18 : 0.08}
                    filter="url(#cent-glow)"
                  />
                  {/* point principal */}
                  <circle
                    r={sat.size}
                    fill={sat.accent ? '#ec4899' : '#ffffff'}
                    opacity={sat.accent ? 0.95 : 0.85}
                  />
                  {/* pulse */}
                  <circle
                    r={sat.size}
                    fill="none"
                    stroke={sat.accent ? '#ec4899' : '#ffffff'}
                    strokeWidth="0.6"
                    opacity="0.4"
                    className="cent-pulse"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  />
                </g>
              </g>
            );
          })}

          {/* === Lignes pointillées qui connectent quelques nodes (data flow) === */}
          {/* Représentation visuelle de connexions inter-satellites — purement décoratif */}
          <g opacity="0.5">
            <line
              x1="0"
              y1="0"
              x2="175"
              y2="0"
              stroke="rgba(236,72,153,0.35)"
              strokeWidth="0.5"
              strokeDasharray="2 5"
              className="cent-orbit-rotate cent-orbit-1"
              style={{
                animationDuration: `${ORBITS[1].speed}s`,
                animationDirection: 'normal',
              }}
            />
            <line
              x1="0"
              y1="0"
              x2="-245"
              y2="0"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.5"
              strokeDasharray="2 8"
              className="cent-orbit-rotate cent-orbit-2"
              style={{
                animationDuration: `${ORBITS[2].speed}s`,
                animationDirection: 'reverse',
              }}
            />
          </g>

          {/* === Cœur central : C lumineux pulsant === */}
          <g>
            <circle cx="0" cy="0" r="70" fill="url(#cent-halo)" className="cent-core-pulse" />
            <circle cx="0" cy="0" r="32" fill="url(#cent-core)" />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-instrument-serif), Georgia, serif"
              fontSize="38"
              fontStyle="italic"
              fontWeight="400"
              fill="#0a0b14"
              style={{ letterSpacing: '-0.04em' }}
            >
              C
            </text>
          </g>

          {/* === Coordonnées style "mission control" en coin (haut-gauche) === */}
          <g className="cent-coords" opacity="0.35">
            <text x="-340" y="-330" fill="#ffffff" fontFamily="monospace" fontSize="9" letterSpacing="0.1em">
              CENTRIUM // SYSTEM 01
            </text>
            <text x="-340" y="-316" fill="#ffffff" fontFamily="monospace" fontSize="8" letterSpacing="0.1em">
              ORBITS: 4 · NODES: 11 · STATE: NOMINAL
            </text>
          </g>
          <g className="cent-coords" opacity="0.35">
            <text x="240" y="330" fill="#ffffff" fontFamily="monospace" fontSize="8" letterSpacing="0.1em" textAnchor="end">
              UPLINK · 99.97 %
            </text>
            <text x="340" y="330" fill="#ffffff" fontFamily="monospace" fontSize="8" letterSpacing="0.1em" textAnchor="end">
              SYNCED
            </text>
          </g>
        </svg>
      </div>

      <style jsx>{`
        :global(.cent-orbit-rotate) {
          animation-name: cent-rotate;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform-origin: 0 0;
          transform-box: fill-box;
        }
        @keyframes cent-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.cent-pulse) {
          animation: cent-pulse 3.4s ease-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes cent-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(4.5); opacity: 0; }
        }
        :global(.cent-core-pulse) {
          animation: cent-core 4s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes cent-core {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.cent-orbit-rotate),
          :global(.cent-pulse),
          :global(.cent-core-pulse) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
