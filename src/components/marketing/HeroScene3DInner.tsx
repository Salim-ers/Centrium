'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Float,
  Icosahedron,
  MeshDistortMaterial,
  Environment,
  Sparkles,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';

/**
 * Scène 3D interne — react-three-fiber.
 *
 * Composition :
 *   - Icosaèdre central avec MeshDistortMaterial (effet "liquide vivant"),
 *     couleur magenta-violet, métalness/roughness équilibrés pour catch
 *     les highlights des lights
 *   - Float wrapper : oscillation très douce verticale + rotation
 *   - Sparkles ambiants (drei) — étoiles distantes, palette claire
 *   - Anneau orbital en wireframe — second élément visuel pour la profondeur
 *   - Environment "studio" pour highlights réalistes
 *   - 2 PointLights colorées (rose + violet) qui tournent lentement
 *   - PerspectiveCamera + parallax au pointer
 */
export function SceneInner() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 4.5]} fov={45} />

      {/* Lumières */}
      <ambientLight intensity={0.35} />
      <RotatingLights />

      {/* Objet principal */}
      <PointerParallax>
        <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
          <LiquidIcosahedron />
        </Float>

        <Float speed={0.6} rotationIntensity={0.3} floatIntensity={0.5}>
          <OrbitRing />
        </Float>
      </PointerParallax>

      {/* Particules distantes — étoiles néon */}
      <Sparkles
        count={120}
        size={2.5}
        speed={0.4}
        scale={[8, 5, 4]}
        color="#ec4899"
        opacity={0.55}
      />
      <Sparkles
        count={80}
        size={1.8}
        speed={0.25}
        scale={[10, 7, 5]}
        color="#a855f7"
        opacity={0.4}
      />

      {/* Environment studio pour highlights */}
      <Environment preset="city" environmentIntensity={0.35} />
    </Canvas>
  );
}

/**
 * Wrapper qui translate légèrement la scène en fonction de la souris,
 * pour créer un effet parallax 3D. Désactivé en reduce-motion.
 */
function PointerParallax({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (reducedMotion) return;
    function onMove(e: PointerEvent) {
      // Normalise -1..1
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  useFrame(() => {
    if (!group.current || reducedMotion) return;
    // Lissage exponentiel vers la cible
    group.current.rotation.x += (target.current.y * 0.15 - group.current.rotation.x) * 0.04;
    group.current.rotation.y += (target.current.x * 0.25 - group.current.rotation.y) * 0.04;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Icosaèdre principal avec material distortion (effet liquide / morph).
 * Distort/speed varient avec le temps pour un effet "vivant".
 */
function LiquidIcosahedron() {
  return (
    <Icosahedron args={[1.35, 6]}>
      <MeshDistortMaterial
        color="#ec4899"
        emissive="#a855f7"
        emissiveIntensity={0.25}
        metalness={0.55}
        roughness={0.18}
        distort={0.42}
        speed={2.2}
        envMapIntensity={1.1}
      />
    </Icosahedron>
  );
}

/**
 * Anneau orbital en wireframe — donne de la profondeur, suggère l'idée
 * de "système" sans rien représenter de concret.
 */
function OrbitRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += dt * 0.18;
    ref.current.rotation.x += dt * 0.05;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.6, 0, 0]}>
      <torusGeometry args={[2.3, 0.012, 16, 220]} />
      <meshBasicMaterial color="#f472b6" transparent opacity={0.55} />
    </mesh>
  );
}

/**
 * 2 PointLights colorées qui tournent autour de l'objet pour faire
 * danser les highlights — effet "spot show" boîte de nuit ultra-chic.
 */
function RotatingLights() {
  const pink = useRef<THREE.PointLight>(null);
  const violet = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const r = 3.2;
    if (pink.current) {
      pink.current.position.x = Math.cos(t.current * 0.7) * r;
      pink.current.position.z = Math.sin(t.current * 0.7) * r;
      pink.current.position.y = Math.sin(t.current * 0.4) * 0.8;
    }
    if (violet.current) {
      violet.current.position.x = Math.cos(t.current * 0.55 + Math.PI) * r;
      violet.current.position.z = Math.sin(t.current * 0.55 + Math.PI) * r;
      violet.current.position.y = Math.cos(t.current * 0.3) * 0.8;
    }
  });
  return (
    <>
      <pointLight ref={pink} color="#ec4899" intensity={3.5} distance={9} />
      <pointLight ref={violet} color="#a855f7" intensity={3} distance={9} />
      {/* directional doux pour rim light */}
      <directionalLight position={[3, 4, 5]} intensity={0.4} color="#ffffff" />
    </>
  );
}

// Évite le warning unused
void useState;
