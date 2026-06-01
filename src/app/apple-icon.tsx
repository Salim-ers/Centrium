import { ImageResponse } from 'next/og';

/**
 * Apple touch icon 180×180 — utilisé quand l'utilisateur ajoute le
 * site à l'écran d'accueil iOS.
 */
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
          background: '#000000',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(225,29,116,0.4), rgba(168,85,247,0.2), #000 70%)',
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            backgroundImage: 'linear-gradient(135deg, #f9a8d4, #ec4899, #c4b5fd)',
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
