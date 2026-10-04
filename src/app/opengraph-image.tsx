import { ImageResponse } from 'next/og';

/**
 * Image Open Graph (1200×630) partagée sur LinkedIn, Slack, X…
 * Identité V2 : blanc chaud, terracotta, typographie sobre.
 */
export const runtime = 'edge';
export const alt = 'Centrium — Pilotez votre ESN. Pas vos tableurs.';
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
          justifyContent: 'space-between',
          background: '#FBFAF8',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#C65F46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 22, height: 22, borderRadius: 11, border: '4px solid #FBFAF8', display: 'flex' }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: '#191817', letterSpacing: -0.5 }}>Centrium</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: '#191817', letterSpacing: -2, lineHeight: 1.05 }}>Pilotez votre ESN.</div>
          <div style={{ fontSize: 76, fontWeight: 700, color: '#C65F46', letterSpacing: -2, lineHeight: 1.05 }}>Pas vos tableurs.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#706A66', lineHeight: 1.35 }}>
            CRM, staffing, consultants, missions, CRA et rentabilité réunis dans un seul espace.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #E8E1DB', paddingTop: 24, fontSize: 24, color: '#706A66' }}>
          <span>Le cockpit de gestion des ESN et cabinets de conseil</span>
          <span>centrium-platform.com</span>
        </div>
      </div>
    ),
    size,
  );
}
