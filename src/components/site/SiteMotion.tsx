'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Respecte la préférence « mouvement réduit » du système pour toutes les
 * animations framer-motion du site (translations et échelles coupées,
 * fondus conservés).
 */
export function SiteMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
