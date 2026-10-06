import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

import { SYMBOL_PATH } from '@/components/brand/logo-paths';

/**
 * Icônes d'installation (manifeste) : 192 et 512 px, symbole blanc sur
 * terracotta. `?maskable=1` : symbole réduit dans la zone de sécurité
 * (cercle de 80 %) pour les icônes adaptatives Android. Servies hors
 * middleware (préfixe « icon »), donc accessibles sans session.
 */
export const runtime = 'edge';

const SIZES = new Set([192, 512]);

export async function GET(req: NextRequest, { params }: { params: { size: string } }) {
  const size = Number(params.size);
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 });
  const maskable = req.nextUrl.searchParams.get('maskable') === '1';
  const symbol = Math.round(size * (maskable ? 0.5 : 0.68));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#9D4432',
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={symbol} height={symbol} viewBox="0 0 512 512">
          <path d={SYMBOL_PATH} fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=604800, immutable' } },
  );
}
