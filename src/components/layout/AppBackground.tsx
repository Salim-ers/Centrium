'use client';

import { useEffect, useState } from 'react';

import { Starfield } from '@/components/ui/starfield-1';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTheme } from '@/hooks/useTheme';
import { getStarfieldIntensity, type StarfieldIntensity } from '@/hooks/useAppearance';

const STARFIELD_KEY = 'centrium-starfield-intensity';

/**
 * Fond conditionnel pour l'app interne :
 *   - DARK + starfield != off  : Starfield warp (mêmes éléments que la vitrine)
 *   - DARK + starfield == off  : fond noir uniforme (perf max)
 *   - LIGHT                    : null (juste le bg crème natif)
 *
 * Intensité réglable depuis /settings/appearance :
 *   - off    : aucun canvas (0 GPU)
 *   - subtle : 120 particules, vitesse 0.4 (discret)
 *   - normal : 420 desktop / 180 mobile, vitesse 0.6 (défaut vitrine)
 *
 * Écoute l'event 'storage' pour se mettre à jour quand l'utilisateur
 * change l'intensité dans les settings sans rechargement.
 */
export function AppBackground() {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const [intensity, setIntensity] = useState<StarfieldIntensity>('normal');

  useEffect(() => {
    setIntensity(getStarfieldIntensity());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STARFIELD_KEY) {
        setIntensity(getStarfieldIntensity());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (theme !== 'dark') return null;

  // Dark + off : juste un fond noir uniforme, pas de canvas
  if (intensity === 'off') {
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: '#000' }}
      />
    );
  }

  // Quantité + vitesse selon intensité
  const quantity =
    intensity === 'subtle' ? (isMobile ? 70 : 120) : isMobile ? 180 : 420;
  const speed = intensity === 'subtle' ? 0.35 : isMobile ? 0.45 : 0.6;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#000' }}
    >
      <Starfield speed={speed} quantity={quantity} />
    </div>
  );
}
