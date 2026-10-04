import { ImageResponse } from 'next/og';

import { SYMBOL_PATH } from '@/components/brand/logo-paths';

/** Favicon 32×32 : symbole Centrium blanc sur terracotta. */
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="112" fill="#9D4432" />
        <path d={SYMBOL_PATH} fill="#FFFFFF" transform="translate(51 51) scale(0.8)" />
      </svg>
    ),
    { ...size },
  );
}
