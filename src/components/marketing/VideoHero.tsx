'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { NetworkCanvas } from './NetworkCanvas';

/**
 * Bloc visuel du hero : tente de lire /videos/hero.mp4 en fond.
 * Si le fichier est absent ou ne peut pas jouer, bascule sur un réseau
 * corporate animé (NetworkCanvas) en rose néon — rendu identique au feeling
 * "vidéo dynamique de fond".
 *
 * Pour utiliser une vraie vidéo :
 *   1. Dépose un .mp4 H.264 (silencieux, loop-friendly) dans public/videos/hero.mp4
 *   2. Recharge — le composant la détecte automatiquement.
 */
export function VideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setVideoOk(true);
    const onError = () => setVideoOk(false);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square scale-[1.25] md:scale-[1.35] lg:scale-[1.45] origin-center">
      {/* Aura rose ambiante, large, qui déborde pour fondre dans la section */}
      <div className="absolute inset-[-25%] bg-[radial-gradient(circle_at_center,rgba(225,29,116,0.32),transparent_65%)] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="relative h-full w-full overflow-hidden"
        style={{
          // Masque radial : le rendu est net au centre et fond vers transparent en bord
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 75% at 50% 50%, #000 50%, transparent 100%)',
          maskImage:
            'radial-gradient(ellipse 75% 75% at 50% 50%, #000 50%, transparent 100%)',
        }}
      >
        {/* Fallback canvas : toujours rendu, masqué si la vidéo joue */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${videoOk ? 'opacity-0' : 'opacity-100'}`}
        >
          <NetworkCanvas />
        </div>

        {/* Vidéo : invisible tant qu'elle n'est pas jouable */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoOk ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
          <source src="/videos/hero.webm" type="video/webm" />
        </video>
      </motion.div>
    </div>
  );
}
