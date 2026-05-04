import type { OrgBranding } from '@/lib/auth/context';

export type CVBrand = {
  logoUrl: string | null;
  brandName: string;
  footerTagline: string;
  primary: string;
  accent: string;
  /**
   * URL d'un QR code "carte de visite" affiché à côté du logo sur le CV.
   * - Pour QuadCore : on sert un PNG statique embarqué dans /public/brand/.
   * - Pour les autres orgs : null tant qu'on n'a pas câblé l'upload côté
   *   /settings/branding.
   */
  qrCodeUrl: string | null;
};

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_ACCENT = '#e11d74';
const DEFAULT_BRAND = 'QuadCore';
const DEFAULT_TAGLINE = 'IT Services & Consulting';
const QUADCORE_VCARD_QR = '/brand/quadcore-vcard-qr.png';

export function resolveBrand(b: OrgBranding | null | undefined): CVBrand {
  const brandName = (b?.brandName?.trim() || b?.name?.trim()) ?? DEFAULT_BRAND;
  const isQuadCore = brandName.toLowerCase().includes('quadcore');
  return {
    logoUrl: b?.logoUrl ?? null,
    brandName,
    footerTagline: b?.footerTagline?.trim() || DEFAULT_TAGLINE,
    primary: b?.primaryColor?.trim() || DEFAULT_PRIMARY,
    accent: b?.accentColor?.trim() || DEFAULT_ACCENT,
    qrCodeUrl: isQuadCore ? QUADCORE_VCARD_QR : null,
  };
}
