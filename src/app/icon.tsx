import { ImageResponse } from 'next/og';

/**
 * Favicon dynamique 32×32 — monogramme C avec gradient signature.
 * Servi à /icon par Next.js — pas besoin de fichier .ico.
 */
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          borderRadius: 4,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            backgroundImage: 'linear-gradient(135deg, #ec4899, #a855f7)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
            lineHeight: 1,
          }}
        >
          C
        </div>
      </div>
    ),
    { ...size },
  );
}
