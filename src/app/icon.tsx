import { ImageResponse } from 'next/og';

/** Favicon 32×32 : symbole Centrium (anneau ouvert + point central). */
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 200 200">
        <rect width="200" height="200" rx="48" fill="#C65F46" />
        <path d="M143.1 63.8A56 56 0 1 0 143.1 136.2" fill="none" stroke="#FFFFFF" strokeWidth="20" strokeLinecap="round" />
        <circle cx="100" cy="100" r="19" fill="#FFFFFF" />
      </svg>
    ),
    { ...size },
  );
}
