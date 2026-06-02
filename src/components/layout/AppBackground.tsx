'use client';

import { Starfield } from '@/components/ui/starfield-1';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTheme } from '@/hooks/useTheme';

/**
 * Fond conditionnel pour l'app interne :
 *   - DARK : Starfield warp (mêmes éléments noir + étoiles que la vitrine)
 *     + fond noir profond #000
 *   - LIGHT : aucun canvas (perf), juste le bg crème natif du body
 *
 * Le canvas ne monte qu'en dark — économise CPU/GPU en light. Sync avec
 * le ThemeToggle via mutation observer sur .dark.
 */
export function AppBackground() {
  const theme = useTheme();
  const isMobile = useIsMobile();

  if (theme !== 'dark') {
    return null;
  }

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#000' }}
    >
      <Starfield
        speed={isMobile ? 0.45 : 0.6}
        quantity={isMobile ? 180 : 420}
      />
    </div>
  );
}
