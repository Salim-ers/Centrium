'use client';

/**
 * Overlay plein-écran qui dessine un curseur SVG coloré + le nom du peer
 * à chaque position broadcastée. Pas d'interception clic (pointer-events:none).
 *
 * Le curseur est positionné en `position: absolute` dans un parent fixed,
 * avec coords (x, y) en page space → reste fidèle même si le peer scrolle
 * sa propre page (on convertit en viewport coords ici, en soustrayant
 * notre propre scrollY).
 */

import { useEffect, useState } from 'react';
import { useOrgCursors, type PeerCursor } from '@/hooks/useOrgCursors';

export function OrgCursorsOverlay() {
  const cursors = useOrgCursors();

  // On force un re-render au scroll pour que les curseurs suivent : nos
  // coords sont en page space, mais on les rend en viewport space.
  const [, force] = useState(0);
  useEffect(() => {
    const onScroll = () => force((n) => n + 1);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (cursors.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {cursors.map((c) => (
        <Cursor key={c.user.userId} cursor={c} />
      ))}
    </div>
  );
}

function Cursor({ cursor }: { cursor: PeerCursor }) {
  const vx = cursor.x - (typeof window !== 'undefined' ? window.scrollX : 0);
  const vy = cursor.y - (typeof window !== 'undefined' ? window.scrollY : 0);
  const { color, displayName, initials } = cursor.user;

  // Couleurs en CSS car Tailwind ne sait pas interpoler les valeurs.
  // On reprend la "glow" rgba qui est déjà définie côté palette.
  return (
    <div
      className="absolute transition-[transform] duration-75 ease-linear will-change-transform"
      style={{
        transform: `translate(${vx}px, ${vy}px)`,
      }}
    >
      {/* Pointeur SVG style Figma */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 2px 4px ${color.glow})` }}
      >
        <path
          d="M3 2.5l5.5 14 2.3-5.5L16.5 9 3 2.5z"
          fill={color.glow.replace('0.55', '1')}
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Label nom (offset à droite/bas du pointeur) */}
      <div
        className={`absolute top-5 left-4 rounded-md px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-lg ${color.bg} ${color.text}`}
        style={{ boxShadow: `0 2px 8px -2px ${color.glow}` }}
      >
        <span className="opacity-80 mr-1">{initials}</span>
        {displayName}
      </div>
    </div>
  );
}
