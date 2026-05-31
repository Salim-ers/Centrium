'use client';

import { Suspense, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type * as THREE from 'three';

/**
 * Scène 3D du hero — react-three-fiber + drei.
 *
 * Pas d'humains, pas d'objets reconnaissables : un icosaèdre liquide
 * qui se déforme (MeshDistortMaterial) + lumières roses/violettes,
 * environnement studio, particules distantes en fond.
 *
 * Lourd à charger côté client : import dynamique pour ne pas plomber
 * le LCP, fallback gradient pendant le chargement, SSR off.
 *
 * Réactivité pointer : la sphère tourne légèrement vers la souris.
 * Désactivé en prefers-reduced-motion.
 */

// On charge tout le bundle R3F côté client only (Three.js + R3F + drei
// ≈ 200 ko gzip — pas pour le SSR critical path).
const SceneInner = dynamic(() => import('./HeroScene3DInner').then((m) => m.SceneInner), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.25),transparent_60%),radial-gradient(ellipse_at_70%_30%,rgba(236,72,153,0.18),transparent_60%)]"
    />
  );
}

export function HeroScene3D({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Suspense fallback={<SceneFallback />}>
        <SceneInner />
      </Suspense>

      {/* Voile bas pour fondre la scène dans la section suivante */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background"
      />
      {/* Vignette latérale subtile pour focus central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 65% at 50% 45%, transparent 50%, rgba(10,11,20,0.55) 100%)',
        }}
      />
    </div>
  );
}

// Helper pour shader uniforms — exporté pour réutilisation potentielle.
export function useStableUniforms<T extends Record<string, { value: unknown }>>(uniforms: T) {
  const ref = useRef<T>(uniforms);
  return useMemo(() => ref.current, []);
}

// Re-export du type THREE pour les consumers (TypeScript)
export type { THREE };
