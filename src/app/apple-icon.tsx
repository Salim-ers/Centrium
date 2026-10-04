import { ImageResponse } from 'next/og';

import { SYMBOL_PATH } from '@/components/brand/logo-paths';

/** Icône d'écran d'accueil iOS (180×180) : symbole blanc sur terracotta. */
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#9D4432' }}>
        <svg width="124" height="124" viewBox="0 0 512 512">
          <path d={SYMBOL_PATH} fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
