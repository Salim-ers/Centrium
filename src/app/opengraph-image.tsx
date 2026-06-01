import { ImageResponse } from 'next/og';

/**
 * Open Graph image générée dynamiquement (Edge runtime) à la
 * compilation. Visible sur LinkedIn, Twitter/X, Slack, iMessage,
 * WhatsApp, etc. quand quelqu'un partage un lien Centrium.
 *
 * Identité visuelle :
 *   - Fond noir profond (cohérent avec le site)
 *   - Halo radial rose→violet (logo Centrium)
 *   - Wordmark CENTRIUM en gradient
 *   - Tagline en italique éditorial
 *
 * Format Open Graph standard : 1200×630, ratio 1.91:1.
 */
export const runtime = 'edge';
export const alt = 'Centrium — la plateforme métier des ESN';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(225,29,116,0.32) 0%, rgba(168,85,247,0.18) 30%, transparent 60%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 32,
            zIndex: 1,
          }}
        >
          {/* C logo monogram simplifié — cercle ouvert gradient */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '6px solid transparent',
              backgroundImage:
                'linear-gradient(#000,#000), linear-gradient(135deg, #ec4899, #a855f7)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              backgroundImage:
                'linear-gradient(90deg, #f9a8d4 0%, #ec4899 50%, #c4b5fd 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            CENTRIUM
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 40,
            color: 'rgba(255,255,255,0.95)',
            fontStyle: 'italic',
            fontWeight: 300,
            marginBottom: 14,
            zIndex: 1,
            display: 'flex',
          }}
        >
          La plateforme métier des ESN.
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 400,
            letterSpacing: '0.02em',
            zIndex: 1,
            display: 'flex',
          }}
        >
          Consultants · CV IA · Matching · CRA · Facturation · Hébergement EU
        </div>

        {/* Footer mention */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          by QuadCore
        </div>
      </div>
    ),
    { ...size },
  );
}
