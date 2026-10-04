import { ImageResponse } from 'next/og';

/** Icône d'écran d'accueil iOS (180×180). */
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#C65F46',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 200 200">
          <path d="M143.1 63.8A56 56 0 1 0 143.1 136.2" fill="none" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" />
          <circle cx="100" cy="100" r="18" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
