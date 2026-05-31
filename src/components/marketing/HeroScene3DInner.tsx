'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Scène 3D "Network Galaxy" — réseau de talents + voie lactée.
 *
 * Métaphore visuelle : Centrium connecte des consultants (nœuds) à
 * travers une galaxie de talents. Pas d'humains, abstraction tech +
 * spatiale.
 *
 * Composition :
 *   1. GalaxyField : ~4500 étoiles distribuées en spirale 3D (BufferGeometry
 *      pour la perf), couleurs blanc/rose/violet, scintillation aléatoire
 *   2. NetworkNodes : 26 sphères "nœuds" flottant dans une zone moyenne,
 *      animées en orbites circulaires lentes
 *   3. NetworkLinks : lignes lumineuses entre nœuds proches, opacité
 *      qui pulse selon la distance — l'effet "réseau qui respire"
 *   4. CoreLight : lumière centrale rose qui pulse doucement
 *   5. Parallax pointer : toute la scène tourne légèrement vers la souris
 *
 * Performance : ~5k vertices total, 1 draw call par groupe, 60 fps
 * confortable sur GPU intégré. DPR cappé 1.5.
 */
export function SceneInner() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={55} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} color="#ec4899" intensity={2.4} distance={12} />

      <PointerParallax>
        <Float speed={0.4} rotationIntensity={0.15} floatIntensity={0.3}>
          <GalaxyField />
        </Float>
        <NetworkSystem />
        <CoreLight />
      </PointerParallax>
    </Canvas>
  );
}

/**
 * Wrapper parallax : la scène tourne doucement vers la souris.
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
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  useFrame(() => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.x += (target.current.y * 0.12 - group.current.rotation.x) * 0.03;
    group.current.rotation.y += (target.current.x * 0.18 - group.current.rotation.y) * 0.03;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Voie lactée en spirale 3D.
 * 4500 points distribués selon une fonction de spirale logarithmique,
 * couleur dégradée du blanc au violet vers l'extérieur.
 */
function GalaxyField() {
  const ref = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const count = 4500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const branches = 4;
    const radiusMax = 8.5;
    const spin = 1.2;
    const randomness = 0.7;
    const innerColor = new THREE.Color('#ffffff');
    const outerColor = new THREE.Color('#a855f7');
    const accentColor = new THREE.Color('#ec4899');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 1.6) * radiusMax;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = r * spin;
      const rx = (Math.random() - 0.5) * randomness * (r * 0.4 + 0.2);
      const ry = (Math.random() - 0.5) * randomness * (r * 0.15 + 0.1);
      const rz = (Math.random() - 0.5) * randomness * (r * 0.4 + 0.2);

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx;
      positions[i3 + 1] = ry;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz;

      // Couleur : interpolation entre 3 stops selon le rayon
      const t = r / radiusMax;
      const c = new THREE.Color();
      if (t < 0.5) {
        c.lerpColors(innerColor, accentColor, t * 2);
      } else {
        c.lerpColors(accentColor, outerColor, (t - 0.5) * 2);
      }
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      sizes[i] = Math.random() * 0.04 + 0.012;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.03;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/**
 * Système "réseau" : nœuds en orbite + liens entre nœuds proches.
 * Les positions sont calculées chaque frame puis les liens sont
 * reconstruits si la distance est sous un seuil.
 */
const NODE_COUNT = 26;
const LINK_DISTANCE = 2.1;
const NODE_RADIUS = 0.06;

type NodeState = {
  radius: number;
  speed: number;
  phase: number;
  yPhase: number;
  yAmp: number;
};

function NetworkSystem() {
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const linksRef = useRef<THREE.LineSegments>(null);
  const positionsRef = useRef<Float32Array>(new Float32Array(NODE_COUNT * 3));

  const nodeStates = useMemo<NodeState[]>(() => {
    const arr: NodeState[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      arr.push({
        radius: 1.4 + Math.random() * 2.6,
        speed: 0.12 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        yPhase: Math.random() * Math.PI * 2,
        yAmp: 0.4 + Math.random() * 0.8,
      });
    }
    return arr;
  }, []);

  // Geometry et material des nœuds
  const nodeGeo = useMemo(() => new THREE.SphereGeometry(NODE_RADIUS, 12, 12), []);
  const nodeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ec4899',
        emissive: '#ec4899',
        emissiveIntensity: 1.3,
        toneMapped: false,
      }),
    [],
  );

  // Geometry des liens : on alloue le max possible (chaque paire x 2 vertices)
  // mais on n'utilise qu'une portion à chaque frame.
  const maxLinks = (NODE_COUNT * (NODE_COUNT - 1)) / 2;
  const linkGeo = useMemo(() => {
    const positions = new Float32Array(maxLinks * 2 * 3);
    const colors = new Float32Array(maxLinks * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [maxLinks]);
  const linkMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const linkColor = useMemo(() => new THREE.Color('#ec4899'), []);

  useFrame((state) => {
    if (!nodesRef.current || !linksRef.current) return;
    const t = state.clock.elapsedTime;
    const positions = positionsRef.current;

    // 1) Mise à jour des positions des nœuds (orbites circulaires + oscillation Y)
    for (let i = 0; i < NODE_COUNT; i++) {
      const s = nodeStates[i];
      const a = s.phase + t * s.speed;
      const x = Math.cos(a) * s.radius;
      const z = Math.sin(a) * s.radius;
      const y = Math.sin(s.yPhase + t * 0.6) * s.yAmp;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      dummy.position.set(x, y, z);
      // léger pulse de taille
      const scale = 0.85 + 0.3 * Math.sin(t * 1.5 + s.phase);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodesRef.current.setMatrixAt(i, dummy.matrix);
    }
    nodesRef.current.instanceMatrix.needsUpdate = true;

    // 2) Reconstruction des liens (paires de nœuds proches)
    const linkPos = linkGeo.attributes.position.array as Float32Array;
    const linkCol = linkGeo.attributes.color.array as Float32Array;
    let linkIdx = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < LINK_DISTANCE) {
          const off = linkIdx * 6;
          linkPos[off] = positions[i * 3];
          linkPos[off + 1] = positions[i * 3 + 1];
          linkPos[off + 2] = positions[i * 3 + 2];
          linkPos[off + 3] = positions[j * 3];
          linkPos[off + 4] = positions[j * 3 + 1];
          linkPos[off + 5] = positions[j * 3 + 2];

          // Opacité par couleur — fade selon distance
          const alpha = 1 - dist / LINK_DISTANCE;
          linkCol[off] = linkColor.r * alpha;
          linkCol[off + 1] = linkColor.g * alpha;
          linkCol[off + 2] = linkColor.b * alpha;
          linkCol[off + 3] = linkColor.r * alpha;
          linkCol[off + 4] = linkColor.g * alpha;
          linkCol[off + 5] = linkColor.b * alpha;

          linkIdx++;
        }
      }
    }
    linkGeo.setDrawRange(0, linkIdx * 2);
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={nodesRef}
        args={[nodeGeo, nodeMat, NODE_COUNT]}
        frustumCulled={false}
      />
      <lineSegments ref={linksRef} geometry={linkGeo} material={linkMat} />
    </group>
  );
}

/**
 * Petit point lumineux central qui pulse — "cœur" de la galaxie.
 */
function CoreLight() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 1.4) * 0.15;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.13, 18, 18]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  );
}
